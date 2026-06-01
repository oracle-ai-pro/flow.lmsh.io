// sw.js
self.addEventListener('push', (event) => {
    // В будущем здесь можно обрабатывать серверные push-уведомления
});

// Слушаем событие клика по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/')); // Открывает главную страницу
});
