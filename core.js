// ==========================================
// LMSH Flow 2.5 — Core Logic (core.js)
// ==========================================

const STORAGE_KEYS = {
    flows: 'lmsh_custom_flows',
    apiKey: 'lmsh_api_key'
};

// Инициализация системы при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadCustomFlowsToSidebar();
    
    // Обработка нажатия Enter в поле ввода
    const inputField = document.getElementById('master-input');
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleInput();
            }
        });
    }
});

// ==========================================
// 1. Управление модальным окном Flow Builder
// ==========================================
function openFlowBuilder() {
    const modal = document.getElementById('flow-builder-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeFlowBuilder() {
    const modal = document.getElementById('flow-builder-modal');
    if (modal) modal.classList.add('hidden');
    
    // Очистка полей
    document.getElementById('flow-name').value = '';
    document.getElementById('flow-prompt').value = '';
}

// Сохранение кастомного Flow в localStorage
function saveCustomFlow() {
    const nameInput = document.getElementById('flow-name');
    const promptInput = document.getElementById('flow-prompt');
    
    const name = nameInput.value.trim();
    const systemPrompt = promptInput.value.trim();
    
    if (!name || !systemPrompt) {
        alert("Заполните все поля для создания Flow!");
        return;
    }
    
    const newFlow = {
        id: 'flow_' + Date.now(),
        name: name,
        prompt: systemPrompt,
        createdAt: new Date().toLocaleDateString()
    };
    
    // Достаем старые или создаем массив
    let flows = JSON.parse(localStorage.getItem(STORAGE_KEYS.flows)) || [];
    flows.push(newFlow);
    localStorage.setItem(STORAGE_KEYS.flows, JSON.stringify(flows));
    
    closeFlowBuilder();
    loadCustomFlowsToSidebar();
    
    console.log(`[Core Node 2.5]: Создан новый Flow -> ${name}`);
}

// Загрузка созданных Flow в боковое меню
function loadCustomFlowsToSidebar() {
    const chatList = document.getElementById('chat-list');
    if (!chatList) return;
    
    // Сохраняем дефолтный элемент, очищаем остальное
    chatList.innerHTML = `<div class="menu-item active" onclick="switchFlow('default', this)">Общий поток</div>`;
    
    let flows = JSON.parse(localStorage.getItem(STORAGE_KEYS.flows)) || [];
    
    flows.forEach(flow => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.innerText = flow.name;
        item.dataset.id = flow.id;
        item.onclick = () => switchFlow(flow.id, item);
        chatList.appendChild(item);
    });
}

// Переключение между потоками
function switchFlow(flowId, element) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    console.slog ? null : console.log(`[Core Node 2.5]: Переключено на поток: ${flowId}`);
}

// ==========================================
// 2. Обработка сообщений (Гибридное ядро)
// ==========================================
function handleInput() {
    const inputField = document.getElementById('master-input');
    const text = inputField.value.trim();
    
    if (!text) return;
    
    // Выводим сообщение пользователя в левую панель
    appendMessage('left', 'Вы', text);
    inputField.value = '';
    
    // Имитация ответа ядра (Гибридная логика: else if + задел под API)
    setTimeout(() => {
        processCoreResponse(text);
    }, 500);
}

function processCoreResponse(text) {
    const lowerText = text.toLowerCase();
    let response = "";
    
    // Level 0: Локальные команды (без API)
    if (lowerText.includes('привет') || lowerText.includes('здарова')) {
        response = "Штаб ЛМСХ на связи. Все системы Core Node 2.5 функционируют штатно.";
    } else if (lowerText.includes('статус') || lowerText.includes('состояние')) {
        response = "Память чиста, пинг стабильный, агенты готовы к работе.";
    } else if (lowerText.includes('кто ты')) {
        response = "Я корпоративный ассистент Штаба ЛМСХ, работающий на архитектуре Core Node 2.5.";
    } else {
        // Level 1: Если команда сложная, проверяем наличие ключа API
        const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
        if (!apiKey) {
            response = "[Система]: Для выполнения сложных запросов требуется подключить API в настройках или создать кастомный ИИ-агент.";
        } else {
            response = `[API-режим]: Запрос принят в обработку (эмуляция ответа нейросети для "${text}").`;
        }
    }
    
    appendMessage('left', 'Штаб', response);
}

// Отрисовка сообщения в интерфейсе
function appendMessage(panelId, sender, text) {
    const messagesContainer = document.getElementById(`messages-${panelId}`);
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'Вы' ? 'user' : 'bot'}`;
    messageDiv.style.margin = '10px 0';
    messageDiv.style.padding = '10px 14px';
    messageDiv.style.borderRadius = '8px';
    messageDiv.style.backgroundColor = sender === 'Вы' ? '#222736' : '#1b1f2b';
    messageDiv.style.border = '1px solid #2d3748';
    
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    messagesContainer.appendChild(messageDiv);
    
    // Автоскролл вниз
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
// Функция переключения/скрытия бокового меню
function toggleSidebar() {
    const wrapper = document.querySelector('.app-wrapper');
    if (window.innerWidth <= 768) {
        wrapper.classList.toggle('sidebar-mobile-open');
    } else {
        wrapper.classList.toggle('sidebar-collapsed');
    }
}

// Отправка быстрого запроса с приветственного экрана
function sendQuickPrompt(text) {
    const inputField = document.getElementById('master-input');
    if (inputField) {
        inputField.value = text;
        handleInput();
    }
}

// Улучшенная функция appendMessage с автоматическим скрытием приветствия
const originalAppendMessage = appendMessage;
appendMessage = function(panelId, sender, text, isAnalyzing = false) {
    // Удаляем приветственный экран при первом сообщении
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.style.opacity = '0';
        setTimeout(() => welcomeScreen.remove(), 300);
    }
    
    // Вызываем оригинальную отрисовку
    return originalAppendMessage(panelId, sender, text, isAnalyzing);
};
