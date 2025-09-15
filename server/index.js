// server/index.js
const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const { randomUUID } = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Вставь свои ключи VAPID
const vapidKeys = {
  publicKey: 'BBbhbH5c8G4Xuma9EgaF3zK89dEi__WzF-3UGO3anMhtp4lqVWiwoyhXMLtkZ9BhaoQPRQuRIajXAlsgr4el0QM',
  privateKey: 'rpRtMLZdjdlzugvtW-okgZmI_vaY8uL2LLrQ5M6Z6bc'
};

webpush.setVapidDetails(
  'mailto:you@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Хранилище подписок: userToken -> subscription
const subscriptionsByUser = new Map();

// GET /vapidPublicKey
app.get('/vapidPublicKey', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// POST /create-user
app.post('/create-user', (req, res) => {
  const userToken = randomUUID();
  res.json({ userToken });
});

// POST /register-subscription
app.post('/register-subscription', (req, res) => {
  const { userToken, subscription } = req.body;
  if (!userToken || !subscription) return res.status(400).json({ error: 'userToken and subscription required' });
  subscriptionsByUser.set(userToken, subscription);
  res.json({ ok: true });
});

// POST /add-item — отправка пушей и автоматическое удаление устаревших подписок
app.post('/add-item', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const payload = { title: 'New Item Added', body: message };

  for (let [userToken, subscription] of subscriptionsByUser) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Подписка устарела или отписалась → удалить
        console.log(`Subscription for user ${userToken} expired. Removing.`);
        subscriptionsByUser.delete(userToken);
      } else {
        console.error('Push send error', err);
      }
    }
  }

  res.json({ ok: true });
});

// GET /test-user — проверить сервер
app.get('/test-user', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Сервер работает! Попробуй POST /create-user для генерации userToken.'
  });
});
// GET /list-subs — показать все userToken для отладки
app.get('/list-subs', (req, res) => {
    const arr = Array.from(subscriptionsByUser.keys());
    res.json({ users: arr });
  });
  

const PORT = 4000;
const HOST = '0.0.0.0'; // слушать все интерфейсы локальной сети
app.listen(PORT, HOST, () => console.log(`Push server running on ${HOST}:${PORT}`));

