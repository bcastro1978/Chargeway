// Firebase Cloud Messaging Service Worker para ChargeWay
// Gestiona notificaciones push en segundo plano para Conductores y Anfitriones EV

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Configuración básica (se autocompleta con las variables de Firebase del proyecto)
const firebaseConfig = {
  apiKey: "TU_FIREBASE_API_KEY",
  authDomain: "chargeway-ec.firebaseapp.com",
  projectId: "chargeway-ec",
  storageBucket: "chargeway-ec.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

try {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Mensaje en segundo plano recibido: ', payload);

    const notificationTitle = payload.notification?.title || 'ChargeWay Ecuador ⚡';
    const notificationOptions = {
      body: payload.notification?.body || 'Tienes una nueva actualización en tu carga o reserva.',
      icon: '/icon.png',
      badge: '/apple-icon.png',
      data: payload.data || {},
      vibrate: [200, 100, 200],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.warn('Firebase Service Worker initialization skipped:', e);
}

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === clickAction && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
