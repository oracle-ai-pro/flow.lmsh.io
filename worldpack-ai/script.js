// --- Инициализация и переменные ---
let packData = {};

document.addEventListener('DOMContentLoaded', () => {
    init();
});

// --- Основная инициализация ---
async function init() {
    try {
        const res = await fetch('db.json');
        packData = await res.json();
        
        // Рендеринг FAQ чипсов
        const faqGroup = document.getElementById('faq-group');
        packData.faq.forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerText = item.q;
            chip.onclick = () => handleAnswer(item.a);
            faqGroup.appendChild(chip);
        });
    } catch (e) {
        console.error("Ошибка загрузки db.json:", e);
    }
}

// --- Логика обработки запросов ---
function handleAnswer(answer) {
    const chat = document.getElementById('chat-window');
    chat.innerHTML = `
        <p>${answer}</p>
        <div class="feedback-box">
            <span class="material-symbols-rounded" onclick="feedback(this, 'like')">thumb_up</span>
            <span class="material-symbols-rounded" onclick="feedback(this, 'report')">report</span>
        </div>
    `;
}

async function processUserQuery() {
    const input = document.getElementById('user-input');
    const query = input.value.trim();
    const chat = document.getElementById('chat-window');
    
    if (!query) return;

    // 1. Фильтр релевантности
    const isRelevant = ["kosmo", "уровень", "пак", "игра", "комната", "механика"].some(word => query.toLowerCase().includes(word));
    
    if (!isRelevant) {
        chat.innerHTML = `<p style="color:var(--error);"><span class="material-symbols-rounded">error</span> Ваш запрос не связан с паком.</p>`;
        return;
    }

    // 2. Проверка API ключа
    const apiKey = localStorage.getItem('gemini_api_key');
    
    if (apiKey) {
        chat.innerHTML = `<p>⏳ ИИ анализирует через API...</p>`;
        // Здесь в будущем будет вызов fetch к Gemini API
        // const response = await callGeminiAPI(query, apiKey);
        // handleAnswer(response);
    } else {
        // Поиск в локальном JSON если API нет
        const found = packData.faq.find(item => item.q.toLowerCase().includes(query.toLowerCase()));
        handleAnswer(found ? found.a : "Я не нашел точного ответа в базе, но я работаю над этим!");
    }
    
    input.value = '';
}

// --- Фидбек (Лайк/Репорт) ---
function feedback(el, type) {
    // Убираем старые классы, если они были
    el.parentElement.querySelectorAll('.material-symbols-rounded').forEach(span => span.classList.remove('liked', 'reported'));
    
    // Добавляем класс текущему
    el.classList.add(type === 'like' ? 'liked' : 'reported');
    
    const message = type === 'like' ? "Спасибо за отзыв!" : "Отчет об ошибке отправлен.";
    alert(message);
}

// --- Настройки ---
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
}

function saveKey() {
    const key = document.getElementById('api-key-input').value;
    localStorage.setItem('gemini_api_key', key);
    alert("API ключ сохранен!");
    toggleSettings();
}

// --- Слушатели событий ---
document.getElementById('user-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') processUserQuery();
});
