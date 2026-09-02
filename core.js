// ==========================================
// Flow LMSH 2.6 — Core Engine
// ==========================================

const KEYS = {
    apiKey: 'lmsh_api_key',
    temperature: 'lmsh_temperature',
    maxTokens: 'lmsh_max_tokens',
    accentColor: 'lmsh_accent_color',
    flows: 'lmsh_flows',
    activeFlow: 'lmsh_active_flow',
    userContext: 'lmsh_user_context'
};

let currentFlowId = null;
let contextTargetFlowId = null;
let recognition = null;
let isRecording = false;
let attachedFiles = []; 
let currentAbortController = null; // Контроллер для отмены текущего запроса

document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    initFlows();
    renderChatHistory(currentFlowId);
    initSpeechRecognition();
    initContextMenuEvents();
});

function applySavedTheme() {
    const accent = localStorage.getItem(KEYS.accentColor);
    if (accent) document.documentElement.style.setProperty('--accent-color', accent);
}

// ==========================================
// 1. Управление чатами (Flows)
// ==========================================
function getFlows() {
    const saved = localStorage.getItem(KEYS.flows);
    return saved ? JSON.parse(saved) : [];
}

function saveFlows(flows) {
    localStorage.setItem(KEYS.flows, JSON.stringify(flows));
}

function initFlows() {
    const flows = getFlows();
    const savedActive = localStorage.getItem(KEYS.activeFlow);

    if (savedActive && flows.some(f => f.id === savedActive)) {
        currentFlowId = savedActive;
    } else if (flows.length > 0) {
        currentFlowId = flows[0].id;
    } else {
        currentFlowId = null;
    }

    renderSidebarFlows();
}

function renderSidebarFlows(filteredFlows = null) {
    const chatList = document.getElementById('chat-list');
    if (!chatList) return;

    const flows = getFlows();
    const flowsToRender = filteredFlows !== null ? filteredFlows : flows;

    chatList.innerHTML = '';

    // Если чатов вообще нет
    if (flows.length === 0) {
        chatList.innerHTML = `<div class="sidebar-empty-state">Создайте первый чат</div>`;
        updateHeaderTitle();
        return;
    }

    // Если поиск ничего не нашел
    if (flowsToRender.length === 0) {
        chatList.innerHTML = `<div class="sidebar-empty-state">Не найдено</div>`;
        return;
    }

    flowsToRender.forEach(flow => {
        const item = document.createElement('div');
        item.className = `menu-item ${flow.id === currentFlowId ? 'active' : ''}`;
        item.onclick = () => switchFlow(flow.id);
        item.oncontextmenu = (e) => showContextMenu(e, flow.id);

        const title = document.createElement('span');
        title.innerText = flow.name;
        item.appendChild(title);

        chatList.appendChild(item);
    });

    updateHeaderTitle();
}

function updateHeaderTitle() {
    const titleEl = document.getElementById('current-chat-title');
    if (!titleEl) return;
    const flows = getFlows();
    const active = flows.find(f => f.id === currentFlowId);
    titleEl.innerText = active ? active.name : 'Новый чат';
}

function switchFlow(flowId) {
    if (currentAbortController) stopGeneration(); // Остановка при переключении
    currentFlowId = flowId;
    localStorage.setItem(KEYS.activeFlow, flowId);
    renderSidebarFlows();
    renderChatHistory(currentFlowId);
}

function createNewChat() {
    if (currentAbortController) stopGeneration();
    currentFlowId = null;
    localStorage.removeItem(KEYS.activeFlow);
    renderSidebarFlows();
    renderChatHistory(null);
}

// ==========================================
// 2. Файлы и Превью
// ==========================================
async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    for (const file of files) {
        const base64 = await fileToBase64(file);
        attachedFiles.push({
            name: file.name,
            type: file.type,
            data: base64.split(',')[1]
        });
    }

    renderFilePreviews();
    event.target.value = '';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function removeFile(index) {
    attachedFiles.splice(index, 1);
    renderFilePreviews();
}

function renderFilePreviews() {
    const container = document.getElementById('file-previews');
    if (!container) return;

    container.innerHTML = '';
    if (attachedFiles.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    attachedFiles.forEach((file, index) => {
        const chip = document.createElement('div');
        chip.className = 'file-chip';
        chip.innerHTML = `
            <span class="material-symbols-outlined file-icon">description</span>
            <span class="file-name">${escapeHTML(file.name)}</span>
            <button class="remove-file-btn" onclick="removeFile(${index})">&times;</button>
        `;
        container.appendChild(chip);
    });
}

// ==========================================
// 3. Форматирование Markdown & Code
// ==========================================
function formatAIResponse(rawText) {
    if (!rawText) return '';

    if (typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true, gfm: true });

        let parsedHtml = marked.parse(rawText);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = parsedHtml;

        tempDiv.querySelectorAll('pre').forEach((preBlock) => {
            const codeElement = preBlock.querySelector('code');
            const rawCode = codeElement ? codeElement.innerText : preBlock.innerText;

            let language = 'code';
            if (codeElement) {
                codeElement.classList.forEach(className => {
                    if (className.startsWith('language-')) {
                        language = className.replace('language-', '');
                    }
                });
            }

            const codeWrapper = document.createElement('div');
            codeWrapper.className = 'code-window';

            codeWrapper.innerHTML = `
                <div class="code-window-header">
                    <span class="code-language">${escapeHTML(language)}</span>
                    <button class="copy-code-btn" onclick="copyCodeToClipboard(this)">
                        <span class="material-symbols-outlined">content_copy</span>
                        <span>Копировать</span>
                    </button>
                </div>
                <div class="code-window-body">
                    <pre><code>${escapeHTML(rawCode)}</code></pre>
                </div>
            `;

            preBlock.replaceWith(codeWrapper);
        });

        return tempDiv.innerHTML;
    } 

    return escapeHTML(rawText).replace(/\n/g, '<br>');
}

function copyCodeToClipboard(button) {
    const codeContainer = button.closest('.code-window')?.querySelector('code');
    if (!codeContainer) return;

    navigator.clipboard.writeText(codeContainer.innerText).then(() => {
        const span = button.querySelector('span:not(.material-symbols-outlined)');
        const icon = button.querySelector('.material-symbols-outlined');
        
        if (span) span.innerText = 'Скопировано!';
        if (icon) icon.innerText = 'check';
        button.classList.add('copied');

        setTimeout(() => {
            if (span) span.innerText = 'Копировать';
            if (icon) icon.innerText = 'content_copy';
            button.classList.remove('copied');
        }, 2000);
    });
}

// ==========================================
// 4. Отправка, Остановка и Retry
// ==========================================
function handleSendClick() {
    if (currentAbortController) {
        stopGeneration();
    } else {
        handleInput();
    }
}

function stopGeneration() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
}

function toggleSendButtonState(isGenerating) {
    const sendBtn = document.getElementById('send-btn');
    if (!sendBtn) return;

    if (isGenerating) {
        sendBtn.innerHTML = '<span class="material-symbols-outlined">stop</span>';
        sendBtn.title = 'Остановить генерацию';
        sendBtn.classList.add('stop-mode');
    } else {
        sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
        sendBtn.title = 'Отправить сообщение';
        sendBtn.classList.remove('stop-mode');
    }
}

function handleInput() {
    const input = document.getElementById('master-input');
    const text = input.value.trim();
    if (!text && attachedFiles.length === 0) return;

    if (!currentFlowId) {
        const flows = getFlows();
        const autoName = text ? (text.length > 25 ? text.substring(0, 25) + '...' : text) : 'Анализ файлов';
        const newFlow = { id: 'flow_' + Date.now(), name: autoName };
        
        flows.unshift(newFlow);
        saveFlows(flows);
        
        currentFlowId = newFlow.id;
        localStorage.setItem(KEYS.activeFlow, currentFlowId);
        renderSidebarFlows();
    }

    const welcome = document.getElementById('welcome-screen');
    if (welcome) welcome.style.display = 'none';

    let displayHtml = escapeHTML(text);
    if (attachedFiles.length > 0) {
        const filesHtml = attachedFiles.map(f => `<div class="msg-attached-file"><span class="material-symbols-outlined">attach_file</span> ${escapeHTML(f.name)}</div>`).join('');
        displayHtml = filesHtml + (displayHtml ? `<div style="margin-top:8px;">${displayHtml}</div>` : '');
    }

    appendMessageUI('left', 'user', displayHtml, true, true);
    saveMessageToHistory(currentFlowId, 'user', displayHtml);

    const currentFiles = [...attachedFiles];
    
    input.value = '';
    attachedFiles = [];
    renderFilePreviews();
    autoResizeTextarea(input);

    processCoreResponse(text, currentFiles);
}

async function processCoreResponse(userText, files = []) {
    const rawApiKey = localStorage.getItem(KEYS.apiKey);
    const apiKey = validateAndCleanApiKey(rawApiKey);
    const typingId = appendTypingIndicator('left');

    if (!apiKey) {
        removeTypingIndicator('left', typingId);
        const warning = `[Система]: API-ключ не найден. Пожалуйста, укажите его в настройках.`;
        appendMessageUI('left', 'bot', warning, true, false);
        saveMessageToHistory(currentFlowId, 'bot', warning);
        return;
    }

    // Инициализируем контроллер отмены
    currentAbortController = new AbortController();
    toggleSendButtonState(true);

    try {
        const aiResponse = await fetchGeminiResponse(apiKey, userText, files, currentAbortController.signal);
        removeTypingIndicator('left', typingId);
        
        const formattedResponse = formatAIResponse(aiResponse);
        appendMessageUI('left', 'bot', formattedResponse, true, true);
        saveMessageToHistory(currentFlowId, 'bot', formattedResponse);

    } catch (err) {
        removeTypingIndicator('left', typingId);

        if (err.name === 'AbortError') {
            appendErrorMessageUI('left', userText, files, 'Генерация остановлена пользователем.');
        } else {
            appendErrorMessageUI('left', userText, files, err.message);
        }
    } finally {
        currentAbortController = null;
        toggleSendButtonState(false);
    }
}

function validateAndCleanApiKey(rawKey) {
    return rawKey ? rawKey.trim() : '';
}

async function fetchGeminiResponse(apiKey, userMessage, files = [], signal) {
    const temp = parseFloat(localStorage.getItem(KEYS.temperature) || '0.7');
    const maxTokens = parseInt(localStorage.getItem(KEYS.maxTokens) || '2048');
    const userContext = localStorage.getItem(KEYS.userContext) || '';
    
    // Актуальная рабочая модель Google Gemini 2.0
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const parts = [];
    
    let systemInstruction = null;
    if (userContext.trim()) {
        systemInstruction = {
            parts: [{ text: `Информация о пользователе (Память ИИ):\n${userContext}` }]
        };
    }
    
    files.forEach(file => {
        parts.push({
            inline_data: {
                mime_type: file.type || "application/octet-stream",
                data: file.data
            }
        });
    });

    if (userMessage) parts.push({ text: userMessage });

    const bodyData = {
        contents: [{ role: 'user', parts: parts }],
        generationConfig: { temperature: temp, maxOutputTokens: maxTokens }
    };

    if (systemInstruction) bodyData.systemInstruction = systemInstruction;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
        signal: signal // Передаем сигнал для возможности отмены
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Статус ошибки: ${res.status}`);
    }

    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
}

function retryQuery(text, filesJson) {
    let files = [];
    try {
        files = JSON.parse(decodeURIComponent(filesJson));
    } catch (e) {}
    processCoreResponse(text, files);
}

// ==========================================
// 5. Рендеринг и UI
// ==========================================
function renderChatHistory(flowId) {
    const container = document.getElementById('messages-left');
    if (!container) return;

    container.innerHTML = '';
    
    if (!flowId) {
        container.innerHTML = `
            <div id="welcome-screen" class="welcome-container">
                <div class="welcome-icon">
                    <span class="material-symbols-outlined">auto_awesome</span>
                </div>
                <h2>Flow LMSH 2.6</h2>
                <p>Начните диалог или прикрепите файлы для анализа.</p>
                <div class="quick-chips">
                    <button class="quick-chip" onclick="sendQuickPrompt('Привет, Штаб!')">👋 Привет</button>
                    <button class="quick-chip" onclick="sendQuickPrompt('Статус систем')">⚡ Статус</button>
                </div>
            </div>`;
        return;
    }

    const history = getChatHistory(flowId);
    history.forEach(msg => {
        appendMessageUI('left', msg.role, msg.text, false, true);
    });
    scrollToBottom();
}

function getChatHistory(flowId) {
    if (!flowId) return [];
    const history = localStorage.getItem(`lmsh_chat_history_${flowId}`);
    return history ? JSON.parse(history) : [];
}

function saveMessageToHistory(flowId, role, text) {
    if (!flowId) return;
    const history = getChatHistory(flowId);
    history.push({ role, text, timestamp: new Date().toISOString() });
    localStorage.setItem(`lmsh_chat_history_${flowId}`, JSON.stringify(history));
}

function appendMessageUI(panelId, role, content, autoScroll = true, isHtml = false) {
    const container = document.getElementById(`messages-${panelId}`);
    if (!container) return;

    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user' : 'bot'}`;
    
    if (isHtml) {
        div.innerHTML = content;
    } else {
        div.innerText = content;
    }

    container.appendChild(div);
    if (autoScroll) scrollToBottom();
}

function appendErrorMessageUI(panelId, userText, files, errorMessage) {
    const container = document.getElementById(`messages-${panelId}`);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'message bot error-message';
    
    const encodedFiles = encodeURIComponent(JSON.stringify(files));
    
    div.innerHTML = `
        <div style="margin-bottom: 8px;">${escapeHTML(errorMessage)}</div>
        <button class="retry-btn" onclick="retryQuery('${escapeHTML(userText)}', '${encodedFiles}')">
            <span class="material-symbols-outlined">refresh</span> Повторить (Retry)
        </button>
    `;

    container.appendChild(div);
    scrollToBottom();
}

function appendTypingIndicator(panelId) {
    const container = document.getElementById(`messages-${panelId}`);
    if (!container) return null;
    
    const id = 'typing_' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message bot typing-indicator';
    div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Модель генерирует ответ...</span>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(panelId, typingId) {
    const el = document.getElementById(typingId);
    if (el) el.remove();
}

function scrollToBottom() {
    const container = document.getElementById('messages-left');
    if (container) {
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }
}

// ==========================================
// 6. Контекстное меню и утилиты
// ==========================================
function showContextMenu(e, flowId) {
    e.preventDefault();
    contextTargetFlowId = flowId;

    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.style.top = `${e.clientY}px`;
    menu.style.left = `${e.clientX}px`;
    menu.classList.remove('hidden');
}

function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) menu.classList.add('hidden');
}

function initContextMenuEvents() {
    document.addEventListener('click', () => hideContextMenu());
}

function renameCurrentContextMenuChat() {
    if (!contextTargetFlowId) return;
    const flows = getFlows();
    const flow = flows.find(f => f.id === contextTargetFlowId);

    if (flow) {
        const newName = prompt('Переименовать чат:', flow.name);
        if (newName && newName.trim()) {
            flow.name = newName.trim();
            saveFlows(flows);
            renderSidebarFlows();
        }
    }
    hideContextMenu();
}

function deleteCurrentContextMenuChat() {
    if (!contextTargetFlowId) return;
    
    if (confirm('Удалить этот чат?')) {
        let flows = getFlows().filter(f => f.id !== contextTargetFlowId);
        saveFlows(flows);
        localStorage.removeItem(`lmsh_chat_history_${contextTargetFlowId}`);

        if (currentFlowId === contextTargetFlowId) {
            createNewChat();
        } else {
            renderSidebarFlows();
        }
    }
    hideContextMenu();
}

function sendQuickPrompt(text) {
    const input = document.getElementById('master-input');
    if (input) {
        input.value = text;
        handleInput();
    }
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendClick();
    }
}

function toggleSidebar() {
    document.querySelector('.app-wrapper')?.classList.toggle('sidebar-collapsed');
}

function escapeHTML(str) {
    return str ? str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)) : '';
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    
    recognition.onresult = (event) => {
        const input = document.getElementById('master-input');
        if (input) {
            input.value += (input.value ? ' ' : '') + event.results[0][0].transcript;
            autoResizeTextarea(input);
        }
    };
    recognition.onend = () => resetMicBtn();
    recognition.onerror = () => resetMicBtn();
}

function toggleSpeechRecognition() {
    if (!recognition) return alert('Браузер не поддерживает микрофон.');
    const micBtn = document.getElementById('mic-btn');
    
    if (isRecording) {
        recognition.stop();
        resetMicBtn();
    } else {
        recognition.start();
        isRecording = true;
        micBtn?.classList.add('recording');
    }
}
// Настройки лимитов (например, 20 запросов на 4 часа)
const LIMIT_CONFIG = {
    maxRequests: 20,
    cooldownHours: 4
};

function checkUserLimits() {
    const limitData = JSON.parse(localStorage.getItem('lmsh_limit_data') || '{"count": 0, "resetTime": null}');
    const now = Date.now();

    // Если время сброса прошло — обнуляем
    if (limitData.resetTime && now >= limitData.resetTime) {
        limitData.count = 0;
        limitData.resetTime = null;
        localStorage.setItem('lmsh_limit_data', JSON.stringify(limitData));
    }

    updateLimitUI(limitData);
    return limitData;
}

function registerRequestUse() {
    let limitData = checkUserLimits();
    const now = Date.now();

    if (limitData.count === 0) {
        // Устанавливаем время сброса через 4 часа от первого запроса
        limitData.resetTime = now + (LIMIT_CONFIG.cooldownHours * 60 * 60 * 1000);
    }

    limitData.count++;
    localStorage.setItem('lmsh_limit_data', JSON.stringify(limitData));
    updateLimitUI(limitData);
}

function updateLimitUI(limitData) {
    const percentage = Math.min(100, Math.round((limitData.count / LIMIT_CONFIG.maxRequests) * 100));
    
    // Обновляем прогресс-бар
    const fill = document.getElementById('limit-fill');
    const percentText = document.getElementById('limit-percent');
    if (fill) fill.style.width = `${percentage}%`;
    if (percentText) percentText.innerText = `${percentage}%`;

    // Если лимит исчерпан
    if (percentage >= 100) {
        blockChatInput(limitData.resetTime);
    } else {
        unblockChatInput();
    }
}

function blockChatInput(resetTime) {
    const inputWrapper = document.querySelector('.master-input-wrapper');
    if (!inputWrapper) return;

    const resetDate = new Date(resetTime);
    const timeString = resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    inputWrapper.innerHTML = `
        <div class="input-blocked-banner">
            Чат приостановлен. Вы много общались в данном чате, сброс лимита будет в ${timeString}, до этого момента вы не сможете общаться в чатах.
        </div>
    `;
}

function unblockChatInput() {
    // Возвращает стандартную форму ввода, если лимит снова доступен
}

function resetMicBtn() {
    isRecording = false;
    document.getElementById('mic-btn')?.classList.remove('recording');
}
