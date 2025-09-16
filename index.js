const express = require("express");
const bodyParser = require("body-parser");
const webpush = require("web-push");
const { randomUUID } = require("crypto");
const cors = require("cors");
require("dotenv").config();
const admin = require("firebase-admin");
const fetch = require("node-fetch"); // для FCM


const app = express();
app.use(cors());
app.use(bodyParser.json());

// ====== Инициализация Firebase Admin ======
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// ====== VAPID для Web Push ======
webpush.setVapidDetails(
  "mailto:you@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Хранилища подписок
const subscriptionsByUser = new Map(); // userToken → WebPush
const fcmTokensByUser = new Map();     // userToken → FCM

// ====== API ======
app.get("/vapidPublicKey", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post("/create-user", (req, res) => {
  const userToken = randomUUID();
  res.json({ userToken });
});

app.post("/register-subscription", (req, res) => {
  const { userToken, subscription } = req.body;
  if (!userToken || !subscription)
    return res.status(400).json({ error: "userToken and subscription required" });
  subscriptionsByUser.set(userToken, subscription);
  res.json({ ok: true });
});

app.post("/register-fcm", (req, res) => {
  const { userToken, fcmToken } = req.body;
  if (!userToken || !fcmToken)
    return res.status(400).json({ error: "userToken and fcmToken required" });
  fcmTokensByUser.set(userToken, fcmToken);
  res.json({ ok: true });
});

app.post("/add-item", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const payload = { title: "New Item Added", body: message };

  // ===== Web Push =====
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

  // ===== FCM Push =====
  for (let [userToken, token] of fcmTokensByUser) {
    try {
      await admin.messaging().send({
        token,
        notification: payload,
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



