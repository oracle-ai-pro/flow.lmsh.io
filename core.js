// ==========================================
// LMSH Flow 2.5 — Core Engine (core.js)
// ==========================================

const KEYS = {
    apiKey: 'lmsh_api_key',
    provider: 'lmsh_provider',
    temperature: 'lmsh_temperature',
    maxTokens: 'lmsh_max_tokens',
    accentColor: 'lmsh_accent_color',
    uiRadius: 'lmsh_ui_radius',
    flows: 'lmsh_flows',
    activeFlow: 'lmsh_active_flow'
};

let currentFlowId = 'default';
let recognition = null;
let isRecording = false;

// Инициализация ядра при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    initFlows();
    renderChatHistory(currentFlowId);
    initSpeechRecognition();
});

// ==========================================
// 1. Применение настроек UI и темы
// ==========================================
function applySavedTheme() {
    const accent = localStorage.getItem(KEYS.accentColor);
    const radius = localStorage.getItem(KEYS.uiRadius);

    if (accent) document.documentElement.style.setProperty('--accent-color', accent);
    if (radius) document.documentElement.style.setProperty('--ui-radius', radius);
}

// ==========================================
// 2. Управление Flow и боковым меню
// ==========================================
function getFlows() {
    const defaultFlows = [{ id: 'default', name: 'Общий поток', prompt: 'Ты — официальный ИИ-ассистент Штаба ЛМСХ.' }];
    const saved = localStorage.getItem(KEYS.flows);
    return saved ? JSON.parse(saved) : defaultFlows;
}

function initFlows() {
    const savedActive = localStorage.getItem(KEYS.activeFlow);
    if (savedActive) currentFlowId = savedActive;
    renderSidebarFlows();
}

function renderSidebarFlows() {
    const chatList = document.getElementById('chat-list');
    if (!chatList) return;

    const flows = getFlows();
    chatList.innerHTML = '';

    flows.forEach(flow => {
        const item = document.createElement('div');
        item.className = `menu-item ${flow.id === currentFlowId ? 'active' : ''}`;
        item.onclick = () => switchFlow(flow.id, item);

        const title = document.createElement('span');
        title.innerText = flow.name;
        item.appendChild(title);

        // Кнопка удаления для кастомных потоков
        if (flow.id !== 'default') {
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-flow-btn';
            delBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">delete</span>';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteFlow(flow.id);
            };
            item.appendChild(delBtn);
        }

        chatList.appendChild(item);
    });
}

function switchFlow(flowId, element) {
    currentFlowId = flowId;
    localStorage.setItem(KEYS.activeFlow, flowId);

    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        renderSidebarFlows();
    }

    renderChatHistory(currentFlowId);
}

function openFlowBuilder() {
    const modal = document.getElementById('flow-builder-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeFlowBuilder() {
    const modal = document.getElementById('flow-builder-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('flow-name').value = '';
    document.getElementById('flow-prompt').value = '';
}

function saveCustomFlow() {
    const name = document.getElementById('flow-name').value.trim();
    const prompt = document.getElementById('flow-prompt').value.trim();

    if (!name) {
        alert('Укажите название Flow!');
        return;
    }

    const flows = getFlows();
    const newFlow = {
        id: 'flow_' + Date.now(),
        name: name,
        prompt: prompt
    };

    flows.push(newFlow);
    localStorage.setItem(KEYS.flows, JSON.stringify(flows));

    closeFlowBuilder();
    switchFlow(newFlow.id);
}

function deleteFlow(flowId) {
    if (confirm('Удалить выбранный Flow и его историю?')) {
        let flows = getFlows().filter(f => f.id !== flowId);
        localStorage.setItem(KEYS.flows, JSON.stringify(flows));
        localStorage.removeItem(`lmsh_chat_history_${flowId}`);

        if (currentFlowId === flowId) currentFlowId = 'default';
        initFlows();
    }
}

// ==========================================
// 3. Хранение и отрисовка истории сообщений
// ==========================================
function getChatHistory(flowId) {
    const history = localStorage.getItem(`lmsh_chat_history_${flowId}`);
    return history ? JSON.parse(history) : [];
}

function saveMessageToHistory(flowId, sender, text) {
    const history = getChatHistory(flowId);
    history.push({ sender, text, timestamp: new Date().toISOString() });
    localStorage.setItem(`lmsh_chat_history_${flowId}`, JSON.stringify(history));
}

function renderChatHistory(flowId) {
    const container = document.getElementById('messages-left');
    if (!container) return;

    container.innerHTML = '';
    const history = getChatHistory(flowId);

    if (history.length === 0) {
        // Если история пуста — выводим приветственный экран
        container.innerHTML = `
            <div id="welcome-screen" class="welcome-container">
                <div class="welcome-icon">
                    <span class="material-symbols-outlined">psychology</span>
                </div>
                <h2>Начните диалог сейчас</h2>
                <p>Штаб ЛМСХ готов к работе. Выберите быстрый запрос или введите команду ниже.</p>
                <div class="quick-chips">
                    <button class="quick-chip" onclick="sendQuickPrompt('Привет')">👋 Привет</button>
                    <button class="quick-chip" onclick="sendQuickPrompt('Что делаете?')">💡 Что делаете?</button>
                    <button class="quick-chip" onclick="sendQuickPrompt('Статус систем')">⚡ Статус систем</button>
                </div>
            </div>
        `;
    } else {
        history.forEach(msg => appendMessageUI('left', msg.sender, msg.text, false));
    }
}

// ==========================================
// 4. Обработка ввода и запросов к ИИ
// ==========================================
function handleInput() {
    const input = document.getElementById('master-input');
    const text = input.value.trim();
    if (!text) return;

    // Прячем приветствие при первом сообщении
    const welcome = document.getElementById('welcome-screen');
    if (welcome) welcome.style.display = 'none';

    // Отображаем и сохраняем сообщение пользователя
    appendMessageUI('left', 'Вы', text, true);
    saveMessageToHistory(currentFlowId, 'Вы', text);

    input.value = '';
    autoResizeTextarea(input);

    // Запускаем генерацию ответа ИИ
    processCoreResponse(text);
}

async function processCoreResponse(userText) {
    const apiKey = localStorage.getItem(KEYS.apiKey);
    const flows = getFlows();
    const activeFlow = flows.find(f => f.id === currentFlowId) || flows[0];

    // Показываем индикатор печати
    const typingId = appendTypingIndicator('left');

    let aiResponse = "";

    if (apiKey) {
        // Элемент 1: Отправка запроса в Google Gemini API
        try {
            aiResponse = await fetchGeminiResponse(apiKey, activeFlow.prompt, userText);
        } catch (err) {
            console.error('API Error:', err);
            aiResponse = `[Ошибка API]: Не удалось получить ответ. Проверьте ключ в настройках. (${err.message})`;
        }
    } else {
        // Элемент 0: Локальные ответы Штаба без API
        await new Promise(res => setTimeout(res, 600)); // Имитация задержки
        aiResponse = generateLocalResponse(userText, activeFlow.name);
    }

    removeTypingIndicator('left', typingId);
    appendMessageUI('left', activeFlow.name, aiResponse, true);
    saveMessageToHistory(currentFlowId, activeFlow.name, aiResponse);
}

// Запрос к Google Gemini REST API
async function fetchGeminiResponse(apiKey, systemPrompt, userMessage) {
    const temp = parseFloat(localStorage.getItem(KEYS.temperature) || '0.7');
    const maxTokens = parseInt(localStorage.getItem(KEYS.maxTokens) || '2048');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const bodyData = {
        contents: [
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ],
        generationConfig: {
            temperature: temp,
            maxOutputTokens: maxTokens
        }
    };

    if (systemPrompt) {
        bodyData.systemInstruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || `Status code ${res.status}`);
    }

    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
}

// Резервный локальный процессор команд
function generateLocalResponse(text, flowName) {
    const lower = text.toLowerCase();

    if (lower.includes('привет') || lower.includes('здравствуй')) {
        return `Приветствую! Штаб ЛМСХ на связи. Канал [${flowName}] готов к приему команд.`;
    } else if (lower.includes('статус') || lower.includes('состояние')) {
        return `[Штаб ЛМСХ]: Все системы Core Node 2.5 функционируют нормально. Подключение к API: ${localStorage.getItem(KEYS.apiKey) ? 'АКТИВНО' : 'НЕ НАСТРОЕНО'}.`;
    } else if (lower.includes('что делаете') || lower.includes('чем занят')) {
        return `Ламирк проектирует архитектуру, Мурзик ведет учет данных, Снежинка и Хахми на вокале. Все при деле!`;
    } else {
        return `[Штаб (${flowName})]: Запрос принят локально. Для подключения реального нейро-интеллекта добавьте API-ключ в настройках!`;
    }
}

// ==========================================
// 5. Вспомогательные функции UI
// ==========================================
function appendMessageUI(panelId, sender, text, autoScroll = true) {
    const container = document.getElementById(`messages-${panelId}`);
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'Вы' ? 'user' : 'bot'}`;
    messageDiv.style.margin = '10px 0';
    messageDiv.style.padding = '12px 16px';
    messageDiv.style.borderRadius = 'var(--ui-radius, 8px)';
    messageDiv.style.backgroundColor = sender === 'Вы' ? 'var(--bg-input)' : 'var(--bg-sidebar)';
    messageDiv.style.border = '1px solid var(--border-color)';
    messageDiv.style.lineHeight = '1.5';

    messageDiv.innerHTML = `<strong style="color: var(--accent-color);">${sender}:</strong> ${escapeHTML(text)}`;
    container.appendChild(messageDiv);

    if (autoScroll) {
        container.scrollTop = container.scrollHeight;
    }
}

function appendTypingIndicator(panelId) {
    const container = document.getElementById(`messages-${panelId}`);
    if (!container) return null;

    const id = 'typing_' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message bot';
    div.style.padding = '10px 14px';
    div.style.color = 'var(--text-muted)';
    div.style.fontStyle = 'italic';
    div.innerText = 'Штаб генерирует ответ...';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTypingIndicator(panelId, typingId) {
    if (!typingId) return;
    const el = document.getElementById(typingId);
    if (el) el.remove();
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleInput();
    }
}

function sendQuickPrompt(text) {
    const input = document.getElementById('master-input');
    if (input) {
        input.value = text;
        handleInput();
    }
}

function toggleSidebar() {
    document.querySelector('.app-wrapper')?.classList.toggle('sidebar-collapsed');
    document.querySelector('.app-wrapper')?.classList.toggle('sidebar-mobile-open');
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// ==========================================
// 6. Распознавание речи (Микрофон)
// ==========================================
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('master-input');
        if (input) {
            input.value += (input.value ? ' ' : '') + transcript;
            autoResizeTextarea(input);
        }
    };

    recognition.onend = () => {
        isRecording = false;
        document.getElementById('mic-btn')?.classList.remove('recording');
    };

    recognition.onerror = () => {
        isRecording = false;
        document.getElementById('mic-btn')?.classList.remove('recording');
    };
}

function toggleSpeechRecognition() {
    if (!recognition) {
        alert('Ваш браузер не поддерживает голосовой ввод.');
        return;
    }

    const micBtn = document.getElementById('mic-btn');
    if (isRecording) {
        recognition.stop();
        isRecording = false;
        micBtn?.classList.remove('recording');
    } else {
        recognition.start();
        isRecording = true;
        micBtn?.classList.add('recording');
    }
}
// ==========================================
// 7. Новый чат и Поиск по цепочкам
// ==========================================

// Начать новый диалог в текущем Flow (очистить историю)
function createNewChat() {
    const history = getChatHistory(currentFlowId);
    if (history.length === 0) return;

    if (confirm('Начать новый диалог? История текущего потока будет очищена.')) {
        localStorage.removeItem(`lmsh_chat_history_${currentFlowId}`);
        renderChatHistory(currentFlowId);
        console.log(`[Core Node]: Чат ${currentFlowId} сброшен.`);
    }
}

// Показать/скрыть поле поиска
function toggleSearch() {
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('sidebar-search-input');
    
    if (searchContainer) {
        searchContainer.classList.toggle('hidden');
        if (!searchContainer.classList.contains('hidden') && searchInput) {
            searchInput.focus();
        } else if (searchInput) {
            searchInput.value = '';
            filterFlows(''); // Сброс фильтра при закрытии
        }
    }
}

// Фокусировка на поиске (для горячих клавиш)
function focusSearchInput() {
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('sidebar-search-input');
    
    if (searchContainer && searchInput) {
        searchContainer.classList.remove('hidden');
        searchInput.focus();
        searchInput.select();
    }
}

// Фильтрация списка чатов/Flows по поисковому запросу
function filterFlows(query) {
    const cleanQuery = query.toLowerCase().trim();
    const items = document.querySelectorAll('#chat-list .menu-item');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(cleanQuery)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}
