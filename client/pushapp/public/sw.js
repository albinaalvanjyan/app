self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : { title: 'No title', body: 'No body' };
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon.png'
      })
    );
  });
  
  self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
  });
  