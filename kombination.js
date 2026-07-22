// ==========================================
// LMSH Flow 2.5 — Hotkeys Controller (kombination.js)
// ==========================================

document.addEventListener('keydown', (e) => {
    // Получаем клавишу в верхнем регистре для универсальности
    const key = e.key.toUpperCase();

    // CTRL + SHIFT + O (Новый чат) — O / Щ
    if (e.ctrlKey && e.shiftKey && (key === 'O' || key === 'Щ')) {
        e.preventDefault();
        if (typeof createNewChat === 'function') {
            createNewChat();
        }
    }

    // CTRL + SHIFT + F (Поиск чатов/цепочек) — F / А
    if (e.ctrlKey && e.shiftKey && (key === 'F' || key === 'А')) {
        e.preventDefault();
        if (typeof focusSearchInput === 'function') {
            focusSearchInput();
        }
    }

    // CTRL + SHIFT + S (Разделенный режим / Split View) — S / Ы
    if (e.ctrlKey && e.shiftKey && (key === 'S' || key === 'Ы')) {
        e.preventDefault();
        if (typeof toggleSplitView === 'function') {
            toggleSplitView();
        }
    }
});
