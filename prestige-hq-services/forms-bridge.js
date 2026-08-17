// Функция записи поста в localStorage из любой формы
function saveUserPost(type, text) {
    const posts = JSON.parse(localStorage.getItem('lmsh-user-posts')) || [];
    
    const newPost = {
        id: Date.now(), // Уникальный ID
        type: type,     // "Вопрос", "Идея", "Отзыв", "Предрегистрация"
        text: text,
        date: new Date().toLocaleDateString('ru-RU'),
        devReply: null  // Заполняется разработчиком через дашборд
    };

    posts.unshift(newPost);
    localStorage.setItem('lmsh-user-posts', JSON.stringify(posts));
}
