import React, { useState } from 'react';
import { registerServiceWorkerAndSubscribe } from './pushManager';

const SERVER_BASE = 'http://192.168.101.9:4000'; // замени на свой локальный IP

function App() {
  const [userToken, setUserToken] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function initPushFlow() {
    try {
      let token = userToken;
      if (!token) {
        const res = await fetch(`${SERVER_BASE}/create-user`, { method: 'POST' });
        const json = await res.json();
        token = json.userToken;
        setUserToken(token);
      }

      const vkRes = await fetch(`${SERVER_BASE}/vapidPublicKey`);
      const { publicKey } = await vkRes.json();

      const { subscription } = await registerServiceWorkerAndSubscribe(publicKey);

      await fetch(`${SERVER_BASE}/register-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: token, subscription })
      });

      setStatus('Subscribed');
      alert('Subscribed for push!');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  async function addItem() {
    if (!message) return alert('Enter message');
    await fetch(`${SERVER_BASE}/add-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    setMessage('');
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Mini Push Demo</h1>
      <p>Status: {status}</p>
      <button onClick={initPushFlow}>Subscribe for Push</button>
      <div style={{ marginTop: 12 }}>
        <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message" />
        <button onClick={addItem}>Add Item + Push</button>
      </div>
    </div>
  );
}

export default App;
