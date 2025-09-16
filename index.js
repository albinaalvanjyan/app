const express = require("express");
const bodyParser = require("body-parser");
const webpush = require("web-push");
const { randomUUID } = require("crypto");
const cors = require("cors");
const fetch = require("node-fetch"); // для запросов в FCM
require('dotenv').config();

// ====== Firebase Admin (для iOS/Android через FCM) ======
const admin = require("firebase-admin");

// Загружаем service account из env
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ====== VAPID (для Web Push) ======
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

webpush.setVapidDetails(
  "mailto:you@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Хранилища
const subscriptionsByUser = new Map(); // userToken → WebPush
const fcmTokensByUser = new Map();     // userToken → FCM token

// ====== API ======

// Получить VAPID ключ
app.get("/vapidPublicKey", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Новый пользователь
app.post("/create-user", (req, res) => {
  const userToken = randomUUID();
  res.json({ userToken });
});

// Web Push подписка
app.post("/register-subscription", (req, res) => {
  const { userToken, subscription } = req.body;
  if (!userToken || !subscription)
    return res.status(400).json({ error: "userToken and subscription required" });
  subscriptionsByUser.set(userToken, subscription);
  res.json({ ok: true });
});

// FCM токен (iOS/Android)
app.post("/register-fcm", (req, res) => {
  const { userToken, fcmToken } = req.body;
  if (!userToken || !fcmToken)
    return res.status(400).json({ error: "userToken and fcmToken required" });
  fcmTokensByUser.set(userToken, fcmToken);
  res.json({ ok: true });
});

// Отправить пуш (WebPush + FCM)
app.post("/add-item", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const payload = { title: "New Item Added", body: message };

  // ====== Web Push ======
  for (let [userToken, subscription] of subscriptionsByUser) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`Web subscription expired: ${userToken}`);
        subscriptionsByUser.delete(userToken);
      } else {
        console.error("Push send error", err);
      }
    }
  }

  // ====== FCM (iOS/Android) через Firebase Admin SDK ======
  for (let [userToken, fcmToken] of fcmTokensByUser) {
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title: payload.title, body: payload.body },
      });
    } catch (err) {
      console.error("FCM send error", err);
    }
  }

  res.json({ ok: true });
});

// Тест
app.get("/test-user", (req, res) => {
  res.json({ status: "ok", message: "Server is working!" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Push server running on :${PORT}`));
