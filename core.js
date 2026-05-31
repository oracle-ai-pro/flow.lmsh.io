const STORAGE_KEY = 'LMSH_FLOW_KEY';

function getApiKey() {
    let key = localStorage.getItem(STORAGE_KEY);
    if (!key) {
        key = prompt("[LMSH_FLOW_2.2]: Система заблокирована. Введите ключ доступа:");
        if (key) localStorage.setItem(STORAGE_KEY, key);
    }
    return key;
}

function toggleSplitView() {
    const container = document.getElementById('main-container');
    const rightPanel = document.getElementById('chat-right');
    container.classList.toggle('split-active');
    rightPanel.classList.toggle('hidden');
}

function createNewChat() {
    console.log("[LMSH_FLOW_2.2]: Инициализация нового потока...");
    // Логика очистки чатов
}
