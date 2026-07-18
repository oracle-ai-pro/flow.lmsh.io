self.addEventListener('push', (event) => {
    // Резерв для push-сервера
});

// Слушаем событие клика по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // Указываем точный путь к твоей папке на GitHub Pages
    event.waitUntil(clients.openWindow('/flow.lmsh.io/')); 
});
