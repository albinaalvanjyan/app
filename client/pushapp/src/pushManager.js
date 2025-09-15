function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }
  
  export async function registerServiceWorkerAndSubscribe(vapidPublicKey) {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker not supported');
    if (!('PushManager' in window)) throw new Error('Push not supported');
  
    const reg = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permission not granted');
  
    // Удаляем старую подписку (если есть)
    const existingSubscription = await reg.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
      console.log('Старая подписка удалена');
    }
  
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
  
    return { registration: reg, subscription };
  }
  