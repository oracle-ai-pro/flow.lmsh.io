document.addEventListener('keydown', (e) => {
    // CTRL + SHIFT + O (Новый чат)
    if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        createNewChat();
    }
    // CTRL + SHIFT + S (Split View)
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        toggleSplitView();
    }
});
