// Активация нового Service Worker без ожидания
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Прием Push-уведомлений от сервера
self.addEventListener('push', (event) => {
    let data = { 
        title: 'Штаб ЛМСХ', 
        body: 'Новое уведомление!', 
        url: '/flow.lmsh.io/' 
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        data: { url: data.url || '/flow.lmsh.io/' },
        vibrate: [100, 50, 100]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/flow.lmsh.io/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Если вкладка уже открыта — фокусируемся на ней
            for (const client of clientList) {
                if (client.url.includes('/flow.lmsh.io/') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Иначе открываем новую
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
