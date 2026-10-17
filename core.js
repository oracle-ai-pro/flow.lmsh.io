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
    userContext: 'lmsh_user_context',
    provider: 'lmsh_provider',
    model: 'lmsh_model',
    searchMode: 'lmsh_search_mode',
    uiRadius: 'lmsh_ui_radius',
    stories: 'lmsh_stories',
    activeStory: 'lmsh_active_story',
    publicLinks: 'lmsh_public_links',
    readerSeen: 'lmsh_reader_seen'
};

let currentFlowId = null;
let contextTargetFlowId = null;
let recognition = null;
let isRecording = false;
let attachedFiles = []; 
let currentAbortController = null;
let isTempChat = false; // Временный чат — не пишется в localStorage
let tempHistory = []; // История только в памяти

document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    initFlows();
    renderChatHistory(currentFlowId);
    initSpeechRecognition();
    initContextMenuEvents();
    initMobileLayout();
    showLimitsAgreementModal();
    updateReaderNoveltyBadge();
    initModelPickers();
});

function initMobileLayout() {
    // Backdrop for sidebar overlay
    if (!document.querySelector('.sidebar-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        backdrop.onclick = () => {
            document.querySelector('.app-wrapper')?.classList.add('sidebar-collapsed');
        };
        document.querySelector('.app-wrapper')?.appendChild(backdrop);
    }

    // On mobile — start with sidebar collapsed
    if (window.innerWidth <= 768) {
        document.querySelector('.app-wrapper')?.classList.add('sidebar-collapsed');
    }

    // Close sidebar after selecting a chat on mobile
    const origSwitch = window.switchFlow;
    // handled below in switchFlow itself
}

function applySavedTheme() {
    const accent = localStorage.getItem(KEYS.accentColor);
    if (accent) document.documentElement.style.setProperty('--accent-color', accent);
    
    const radius = localStorage.getItem(KEYS.uiRadius);
    if (radius) document.documentElement.style.setProperty('--ui-radius', radius);

    const theme = localStorage.getItem('lmsh_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    
    updateSearchModeIndicator();
}

function updateSearchModeIndicator() {
    const isOn = localStorage.getItem(KEYS.searchMode) === 'true';
    const titleEl = document.getElementById('current-chat-title');
    if (!titleEl) return;
    
    const oldBadge = document.getElementById('search-mode-badge');
    if (oldBadge) oldBadge.remove();
    
    if (isOn) {
        const badge = document.createElement('span');
        badge.id = 'search-mode-badge';
        badge.className = 'search-mode-badge';
        badge.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">travel_explore</span> Поиск';
        titleEl.parentNode.appendChild(badge);
    }
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
    if (currentAbortController) stopGeneration();
    exitTempChatMode();
    currentFlowId = flowId;
    localStorage.setItem(KEYS.activeFlow, flowId);
    renderSidebarFlows();
    renderChatHistory(currentFlowId);
    // На мобилке закрываем сайдбар после выбора чата
    if (window.innerWidth <= 768) {
        document.querySelector('.app-wrapper')?.classList.add('sidebar-collapsed');
    }
}

function createNewChat() {
    if (currentAbortController) stopGeneration();
    exitTempChatMode();
    currentFlowId = null;
    localStorage.removeItem(KEYS.activeFlow);
    renderSidebarFlows();
    renderChatHistory(null);
    if (window.innerWidth <= 768) {
        document.querySelector('.app-wrapper')?.classList.add('sidebar-collapsed');
    }
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
        sendBtn.title = 'Остановить запрос';
        sendBtn.classList.add('stop-mode');
    } else {
        sendBtn.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
        sendBtn.title = 'Отправить сообщение';
        sendBtn.classList.remove('stop-mode');
    }
}

function handleInput() {
    const input = document.getElementById('master-input');
    const text = input.value.trim();
    if (!text && attachedFiles.length === 0) return;

    if (!currentFlowId && !isTempChat) {
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
        appendMessageUI('left', 'bot', formattedResponse, true, true, aiResponse);
        saveMessageToHistory(currentFlowId, 'bot', formattedResponse);

    } catch (err) {
        removeTypingIndicator('left', typingId);

        if (err.name === 'AbortError') {
            appendStoppedMessageUI('left', userText, files);
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
    const maxTokens = parseInt(localStorage.getItem(KEYS.maxTokens) || '8192');
    const userContext = localStorage.getItem(KEYS.userContext) || '';
    const model = localStorage.getItem(KEYS.model) || 'gemini-2.5-flash';
    const searchMode = localStorage.getItem(KEYS.searchMode) === 'true';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

    // РЕЖИМ ПОИСКА — Google Search Grounding
    if (searchMode) {
        bodyData.tools = [{ google_search: {} }];
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
        signal: signal
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Статус ошибки: ${res.status}`);
    }

    const data = await res.json();
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const grounding = data.candidates?.[0]?.groundingMetadata;
    if (grounding && grounding.groundingChunks && grounding.groundingChunks.length > 0) {
        const sources = grounding.groundingChunks
            .filter(c => c.web?.uri)
            .map((c, i) => `${i + 1}. [${c.web.title || 'Источник'}](${c.web.uri})`)
            .join('\n');
        
        if (sources) {
            text += `\n\n---\n**Источники (Google Search):**\n${sources}`;
        }
    }
    
    return text;
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
    if (isTempChat) {
        tempHistory.push({ role, text, timestamp: new Date().toISOString() });
        return;
    }
    if (!flowId) return;
    const history = getChatHistory(flowId);
    history.push({ role, text, timestamp: new Date().toISOString() });
    localStorage.setItem(`lmsh_chat_history_${flowId}`, JSON.stringify(history));
}

function appendMessageUI(panelId, role, content, autoScroll = true, isHtml = false, rawTextForActions = null) {
    const container = document.getElementById(`messages-${panelId}`);
    if (!container) return;

    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user' : 'bot'}`;
    
    if (isHtml) {
        div.innerHTML = content;
    } else {
        div.innerText = content;
    }

    // Панель действий под ответом ИИ
    if (role === 'bot' && !div.classList.contains('error-message') && !div.classList.contains('typing-indicator')) {
        const actions = document.createElement('div');
        actions.className = 'msg-actions';
        const plain = rawTextForActions || (isHtml ? stripHtml(content) : content);
        actions.innerHTML = `
            <button class="msg-action-btn" title="Копировать" onclick="copyBotMessage(this)">
                <span class="material-symbols-outlined">content_copy</span>
            </button>
            <button class="msg-action-btn" title="Нравится" onclick="rateBotMessage(this, 1)">
                <span class="material-symbols-outlined">thumb_up</span>
            </button>
            <button class="msg-action-btn" title="Не нравится" onclick="rateBotMessage(this, -1)">
                <span class="material-symbols-outlined">thumb_down</span>
            </button>
            <button class="msg-action-btn" title="Повторить" onclick="retryLastUserMessage()">
                <span class="material-symbols-outlined">refresh</span>
            </button>
            <button class="msg-action-btn" title="Озвучить" onclick="speakBotMessage(this)">
                <span class="material-symbols-outlined">volume_up</span>
            </button>
            <button class="msg-action-btn" title="Поделиться" onclick="shareBotMessage(this)">
                <span class="material-symbols-outlined">ios_share</span>
            </button>
        `;
        actions.dataset.plain = plain;
        div.appendChild(actions);
    }

    container.appendChild(div);
    if (autoScroll) scrollToBottom();
}

function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.innerText || '';
}

function copyBotMessage(btn) {
    const actions = btn.closest('.msg-actions');
    const text = actions?.dataset.plain || '';
    navigator.clipboard.writeText(text).then(() => showToast('Скопировано', 'success'));
}

function rateBotMessage(btn, value) {
    const actions = btn.closest('.msg-actions');
    if (!actions) return;
    actions.querySelectorAll('.msg-action-btn').forEach(b => b.classList.remove('active-up', 'active-down'));
    btn.classList.add(value > 0 ? 'active-up' : 'active-down');
    showToast(value > 0 ? 'Отмечено: нравится' : 'Отмечено: не нравится', 'info');
}

function speakBotMessage(btn) {
    const text = btn.closest('.msg-actions')?.dataset.plain || '';
    if (!text || !window.speechSynthesis) {
        showToast('Озвучка недоступна', 'error');
        return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 1500));
    u.lang = 'ru-RU';
    window.speechSynthesis.speak(u);
}

function shareBotMessage(btn) {
    const text = btn.closest('.msg-actions')?.dataset.plain || '';
    if (navigator.share) {
        navigator.share({ text }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => showToast('Текст скопирован для отправки', 'success'));
    }
}

function retryLastUserMessage() {
    // Берём последнее user-сообщение из DOM или истории
    let lastUser = null;
    if (isTempChat) {
        for (let i = tempHistory.length - 1; i >= 0; i--) {
            if (tempHistory[i].role === 'user') { lastUser = tempHistory[i].text; break; }
        }
    } else if (currentFlowId) {
        const hist = getChatHistory(currentFlowId);
        for (let i = hist.length - 1; i >= 0; i--) {
            if (hist[i].role === 'user') { lastUser = hist[i].text; break; }
        }
    }
    if (!lastUser) {
        showToast('Нет сообщения для повтора', 'info');
        return;
    }
    // plain text from HTML user message
    const d = document.createElement('div');
    d.innerHTML = lastUser;
    const plain = d.innerText || lastUser;
    processCoreResponse(plain, []);
}

function appendErrorMessageUI(panelId, userText, files, errorMessage) {
    const container = document.getElementById(`messages-${panelId}`);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'message bot error-message';
    
    const encodedFiles = encodeURIComponent(JSON.stringify(files));
    const safeText = escapeHTML(userText).replace(/'/g, "\'");
    
    div.innerHTML = `
        <div style="margin-bottom: 8px;">${escapeHTML(errorMessage)}</div>
        <button class="retry-btn" onclick="retryQuery('${safeText}', '${encodedFiles}')">
            <span class="material-symbols-outlined">refresh</span> Повторить
        </button>
    `;

    container.appendChild(div);
    scrollToBottom();
}

function appendStoppedMessageUI(panelId, userText, files) {
    const container = document.getElementById(`messages-${panelId}`);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'message bot error-message stopped-message';

    const encodedFiles = encodeURIComponent(JSON.stringify(files || []));
    const safeText = escapeHTML(userText || '').replace(/'/g, "\'");

    div.innerHTML = `
        <div class="stopped-error-title">
            <span class="material-symbols-outlined" style="font-size:20px;vertical-align:middle;margin-right:6px">error</span>
            <strong>Ошибка пользователя</strong>
        </div>
        <div style="margin: 6px 0 12px; color: var(--text-muted); font-size: 0.9rem;">
            Запрос был остановлен
        </div>
        <div class="stopped-actions">
            <button class="retry-btn edit-req-btn" onclick="editStoppedRequest('${safeText}')">
                <span class="material-symbols-outlined">edit</span> Изменить запрос
            </button>
            <button class="retry-btn" onclick="retryQuery('${safeText}', '${encodedFiles}')">
                <span class="material-symbols-outlined">refresh</span> Повторить
            </button>
        </div>
    `;

    container.appendChild(div);
    scrollToBottom();
}

function editStoppedRequest(text) {
    const input = document.getElementById('master-input');
    if (!input) return;
    // decode basic entities if needed
    const ta = document.createElement('textarea');
    ta.innerHTML = text;
    input.value = ta.value || text;
    autoResizeTextarea(input);
    input.focus();
    // scroll input into view
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Запрос загружен в поле ввода', 'info');
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

async function deleteCurrentContextMenuChat() {
    if (!contextTargetFlowId) return;
    hideContextMenu();
    const ok = await showConfirmModal({
        title: 'Удалить чат?',
        message: 'История этого чата будет удалена без возможности восстановления.',
        confirmText: 'Удалить',
        danger: true
    });
    if (!ok) return;

    const flowId = contextTargetFlowId;
    // Удаляем связанные публичные ссылки
    const links = getPublicLinks();
    Object.keys(links).forEach(k => {
        if (links[k].flowId === flowId) delete links[k];
    });
    savePublicLinks(links);

    let flows = getFlows().filter(f => f.id !== flowId);
    saveFlows(flows);
    localStorage.removeItem(`lmsh_chat_history_${flowId}`);

    if (currentFlowId === flowId) {
        createNewChat();
    } else {
        renderSidebarFlows();
    }
    showToast('Чат удалён', 'success');
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
    const wrap = document.querySelector('.app-wrapper');
    if (!wrap) return;
    wrap.classList.toggle('sidebar-collapsed');
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


// ==========================================
// Модальное окно: Новое соглашение лимитов (с 1 ноября)
// ==========================================
function showLimitsAgreementModal() {
    const KEY = 'lmsh_limits_agreement_nov2026';
    if (localStorage.getItem(KEY) === 'accepted') return;

    // Уже есть в DOM?
    if (document.getElementById('limits-agreement-modal')) {
        document.getElementById('limits-agreement-modal').classList.add('visible');
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'limits-agreement-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-header">
                <div class="modal-icon">
                    <span class="material-symbols-outlined" style="font-size:26px">info</span>
                </div>
                <div>
                    <h2 id="modal-title">С 1 ноября изменяется система лимитов</h2>
                    <p>Новое соглашение Штаба ЛМСХ</p>
                </div>
            </div>
            <div class="modal-body">
                <p>С <strong>1 ноября</strong> лимиты считаются <strong>по группам нагрузки</strong>, а не по «выдуманным» равным запросам.</p>
                <p style="margin-top:10px;color:var(--text-muted);font-size:0.88rem;line-height:1.5;">
                    Раньше каждый запрос списывался одинаково — короткое «привет» и генерация игры тратили лимит одинаково. Это было несправедливо и не отражало реальную нагрузку на модель.
                    Теперь система делит запросы на группы: лёгкие сообщения, поиск в интернете, картинки, код и сложные проекты. Так лимит честнее распределяется между обычным общением и тяжёлыми задачами, а Штаб может стабильно работать для всех.
                </p>
                <p style="margin-top:12px;"><strong>Группы расхода:</strong></p>
                
                <div class="limit-rules">
                    <div class="limit-rule">
                        <span>Сообщение ≤ 50 символов</span>
                        <span>0,5%</span>
                    </div>
                    <div class="limit-rule">
                        <span>Сообщение 50–150 символов</span>
                        <span>1%</span>
                    </div>
                    <div class="limit-rule">
                        <span>Сообщение 150–400 символов</span>
                        <span>2–3%</span>
                    </div>
                    <div class="limit-rule">
                        <span>Длинный текст / анализ</span>
                        <span>4–8%</span>
                    </div>
                    <div class="limit-rule warning">
                        <span>Интернет-поиск (известная тема)</span>
                        <span>~5%</span>
                    </div>
                    <div class="limit-rule warning">
                        <span>Интернет-поиск (новая информация)</span>
                        <span>~10%</span>
                    </div>
                    <div class="limit-rule danger">
                        <span>Генерация изображений</span>
                        <span>15–30%</span>
                    </div>
                    <div class="limit-rule danger">
                        <span>Код, игры, сложные проекты</span>
                        <span>30–50%</span>
                    </div>
                </div>

                <p class="modal-note">
                    <strong>Зачем это нужно:</strong> чтобы лёгкие диалоги не «съедали» весь лимит тяжёлыми генерациями, и наоборот — чтобы сложные задачи оплачивались по своей группе нагрузки.
                    Перед отправкой появится шкала с приблизительной тратой. После <strong>100%</strong> отправка блокируется до сброса (время будет над полем ввода и в настройках).
                </p>

                <div class="modal-details" id="modal-details-block">
                    <p><strong>Подробнее — логика групп:</strong></p>
                    <ul style="margin: 8px 0 0 18px; padding: 0;">
                        <li><strong>Группа «Диалог»</strong> — короткие и средние сообщения. Минимальный расход, чтобы обычное общение оставалось доступным.</li>
                        <li><strong>Группа «Поиск»</strong> — Режим Поиска и актуальные данные из интернета. Отдельный коэффициент 5–10%, потому что это отдельный инструмент API.</li>
                        <li><strong>Группа «Медиа»</strong> — изображения (если модель умеет). 15–30% из‑за высокой стоимости генерации.</li>
                        <li><strong>Группа «Проект»</strong> — код, игры, длинные отчёты, архитектура. 30–50%: максимальная нагрузка на модель и токены.</li>
                        <li>Лимит общий на все чаты, сброс раз в 4 часа (время видно над полем ввода и в настройках).</li>
                        <li>После 100% отправка блокируется до сброса — это защита от перерасхода, а не «наказание».</li>
                        <li>Шкала перед отправкой показывает прогноз по группе, чтобы вы видели цену запроса заранее.</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-btn" onclick="toggleModalDetails()">
                    <span class="material-symbols-outlined" style="font-size:18px">expand_more</span>
                    Подробнее
                </button>
                <button class="modal-btn primary" onclick="acceptLimitsAgreement()">
                    <span class="material-symbols-outlined" style="font-size:18px">check</span>
                    Принять
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Показать с небольшой задержкой для анимации
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
    });
}

function toggleModalDetails() {
    const block = document.getElementById('modal-details-block');
    if (!block) return;
    block.classList.toggle('open');
    const btn = block.closest('.modal-card')?.querySelector('.modal-btn:not(.primary)');
    if (btn) {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (block.classList.contains('open')) {
            if (icon) icon.textContent = 'expand_less';
            btn.childNodes[btn.childNodes.length - 1].textContent = ' Свернуть';
        } else {
            if (icon) icon.textContent = 'expand_more';
            btn.childNodes[btn.childNodes.length - 1].textContent = ' Подробнее';
        }
    }
}

function acceptLimitsAgreement() {
    localStorage.setItem('lmsh_limits_agreement_nov2026', 'accepted');
    const overlay = document.getElementById('limits-agreement-modal');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 320);
    }
}


// ==========================================
// Reader Mode — Истории
// ==========================================
let currentStoryId = null;
let storySaveTimer = null;
const STORY_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

function getStories() {
    try {
        const raw = localStorage.getItem(KEYS.stories || 'lmsh_stories');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveStories(stories) {
    localStorage.setItem(KEYS.stories || 'lmsh_stories', JSON.stringify(stories));
}

function enterReaderMode() {
    const el = document.getElementById('reader-mode');
    if (!el) return;
    // Снять пометку «Новинка»
    localStorage.setItem(KEYS.readerSeen || 'lmsh_reader_seen', '1');
    document.querySelectorAll('.reader-novelty').forEach(n => n.remove());
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    currentStoryId = localStorage.getItem(KEYS.activeStory || 'lmsh_active_story') || null;
    renderStoriesList();
    if (currentStoryId && getStories().some(s => s.id === currentStoryId)) {
        openStory(currentStoryId);
    } else {
        showReaderWelcome();
    }
    // На мобилке закрываем chat-sidebar
    if (window.innerWidth <= 768) {
        document.querySelector('.app-wrapper')?.classList.add('sidebar-collapsed');
    }
}

function exitReaderMode() {
    // Автосохранение перед выходом
    if (currentStoryId) saveCurrentStory(true);
    const el = document.getElementById('reader-mode');
    if (el) el.classList.add('hidden');
    document.body.style.overflow = '';
    el?.classList.remove('reader-sidebar-open');
}

function showReaderWelcome() {
    currentStoryId = null;
    localStorage.removeItem(KEYS.activeStory || 'lmsh_active_story');
    document.getElementById('reader-welcome')?.classList.remove('hidden');
    document.getElementById('reader-editor')?.classList.add('hidden');
    renderStoriesList();
}

function renderStoriesList() {
    const list = document.getElementById('stories-list');
    if (!list) return;
    const stories = getStories();
    list.innerHTML = '';

    if (stories.length === 0) {
        list.innerHTML = '<div class="sidebar-empty-state">Нет историй</div>';
        return;
    }

    stories.forEach(story => {
        const item = document.createElement('div');
        item.className = 'story-item' + (story.id === currentStoryId ? ' active' : '');
        item.onclick = () => openStory(story.id);

        const dot = document.createElement('span');
        dot.className = 'story-item-dot';
        dot.style.background = story.color || '#3b82f6';

        const name = document.createElement('span');
        name.className = 'story-item-name';
        name.textContent = story.title || 'Без названия';

        const del = document.createElement('button');
        del.className = 'story-item-delete';
        del.title = 'Удалить';
        del.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">delete</span>';
        del.onclick = (e) => {
            e.stopPropagation();
            deleteStory(story.id);
        };

        item.appendChild(dot);
        item.appendChild(name);
        item.appendChild(del);
        list.appendChild(item);
    });
}

function createNewStory() {
    const stories = getStories();
    const id = 'story_' + Date.now();
    const story = {
        id,
        title: '',
        content: '',
        color: STORY_COLORS[0],
        updatedAt: new Date().toISOString()
    };
    stories.unshift(story);
    saveStories(stories);
    openStory(id);
}

function openStory(id) {
    const stories = getStories();
    const story = stories.find(s => s.id === id);
    if (!story) {
        showReaderWelcome();
        return;
    }

    // Сохраняем предыдущую
    if (currentStoryId && currentStoryId !== id) {
        saveCurrentStory(true);
    }

    currentStoryId = id;
    localStorage.setItem(KEYS.activeStory || 'lmsh_active_story', id);

    document.getElementById('reader-welcome')?.classList.add('hidden');
    const editor = document.getElementById('reader-editor');
    editor?.classList.remove('hidden');

    const titleInput = document.getElementById('story-title-input');
    const content = document.getElementById('story-content');
    if (titleInput) titleInput.value = story.title || '';
    if (content) content.innerHTML = story.content || '';

    // Color swatches
    document.querySelectorAll('.color-swatch').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === (story.color || '#3b82f6'));
    });

    setSaveStatus('saved');
    renderStoriesList();
    bindStoryEditorEvents();

    // На мобилке закрыть sidebar reader
    document.getElementById('reader-mode')?.classList.remove('reader-sidebar-open');
}

async function deleteStory(id) {
    const ok = await showConfirmModal({
        title: 'Удалить историю?',
        message: 'Текст истории будет удалён безвозвратно.',
        confirmText: 'Удалить',
        danger: true
    });
    if (!ok) return;
    let stories = getStories().filter(s => s.id !== id);
    saveStories(stories);
    if (currentStoryId === id) {
        currentStoryId = null;
        localStorage.removeItem(KEYS.activeStory || 'lmsh_active_story');
        if (stories.length > 0) {
            openStory(stories[0].id);
        } else {
            showReaderWelcome();
        }
    } else {
        renderStoriesList();
    }
    showToast('История удалена', 'success');
}

function saveCurrentStory(silent = false) {
    if (!currentStoryId) return;
    const stories = getStories();
    const idx = stories.findIndex(s => s.id === currentStoryId);
    if (idx === -1) return;

    const titleInput = document.getElementById('story-title-input');
    const content = document.getElementById('story-content');
    const activeSwatch = document.querySelector('.color-swatch.active');

    stories[idx].title = (titleInput?.value || '').trim();
    stories[idx].content = content?.innerHTML || '';
    stories[idx].color = activeSwatch?.dataset.color || stories[idx].color || '#3b82f6';
    stories[idx].updatedAt = new Date().toISOString();

    saveStories(stories);
    if (!silent) setSaveStatus('saved');
    renderStoriesList();
}

function scheduleStorySave() {
    setSaveStatus('saving');
    clearTimeout(storySaveTimer);
    storySaveTimer = setTimeout(() => saveCurrentStory(), 600);
}

function setSaveStatus(state) {
    const el = document.getElementById('story-save-status');
    if (!el) return;
    el.classList.remove('saving', 'saved');
    if (state === 'saving') {
        el.textContent = 'Сохранение…';
        el.classList.add('saving');
    } else {
        el.textContent = 'Сохранено';
        el.classList.add('saved');
    }
}

let storyEventsBound = false;
function bindStoryEditorEvents() {
    if (storyEventsBound) return;
    storyEventsBound = true;

    const titleInput = document.getElementById('story-title-input');
    const content = document.getElementById('story-content');

    titleInput?.addEventListener('input', scheduleStorySave);
    content?.addEventListener('input', scheduleStorySave);

    document.querySelectorAll('.color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            scheduleStorySave();
        });
    });
}

function formatStory(command) {
    document.execCommand(command, false, null);
    document.getElementById('story-content')?.focus();
    scheduleStorySave();
}

function openStoriesArchive() {
    const stories = getStories();
    if (stories.length === 0) {
        showToast('Архив пуст. Создайте первую историю!', 'info');
        return;
    }
    // Просто фокус на список — на мобилке открываем sidebar
    if (window.innerWidth <= 768) {
        document.getElementById('reader-mode')?.classList.add('reader-sidebar-open');
    }
    renderStoriesList();
}

function showReaderHelp() {
    showConfirmModal({
        title: 'Обучение Reader',
        message: 'Создайте историю → выберите цвет метки → форматируйте текст (жирный, курсив, список). Всё сохраняется автоматически. Крестик — выход в чат.',
        confirmText: 'Понятно',
        cancelText: 'Закрыть'
    });
}

// Кнопка меню историй на мобилке (если нужна из тулбара — можно добавить)
function toggleReaderSidebar() {
    document.getElementById('reader-mode')?.classList.toggle('reader-sidebar-open');
}


// ==========================================
// Toast + Confirm Modal
// ==========================================
function ensureToastContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'toast-container';
        c.className = 'toast-container';
        document.body.appendChild(c);
    }
    return c;
}

function showAlert(title, message) {
    return showConfirmModal({
        title: title || 'Сообщение',
        message: message || '',
        confirmText: 'OK',
        cancelText: 'Закрыть'
    });
}

function showToast(message, type = 'info', duration = 3200) {
    const c = ensureToastContainer();
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    t.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px">${icons[type] || 'info'}</span><span>${message}</span>`;
    c.appendChild(t);
    setTimeout(() => {
        t.classList.add('out');
        setTimeout(() => t.remove(), 260);
    }, duration);
}

function showConfirmModal({ title, message, confirmText = 'Подтвердить', cancelText = 'Отмена', danger = false }) {
    return new Promise(resolve => {
        const existing = document.getElementById('confirm-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'confirm-modal';
        overlay.className = 'modal-overlay visible';
        overlay.innerHTML = `
            <div class="modal-card" style="max-width:400px">
                <div class="modal-header">
                    <div class="modal-icon" style="background:${danger ? 'linear-gradient(135deg,#ef4444,#f59e0b)' : 'linear-gradient(135deg,var(--accent-color),#8b5cf6)'}">
                        <span class="material-symbols-outlined" style="font-size:26px">${danger ? 'warning' : 'help'}</span>
                    </div>
                    <div>
                        <h2>${title || 'Подтверждение'}</h2>
                        <p style="margin:0;color:var(--text-muted);font-size:0.9rem;margin-top:6px">${message || ''}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn" data-act="cancel">${cancelText}</button>
                    <button class="modal-btn ${danger ? 'danger' : 'primary'}" data-act="ok">${confirmText}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const close = (val) => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 280);
            resolve(val);
        };
        overlay.querySelector('[data-act="cancel"]').onclick = () => close(false);
        overlay.querySelector('[data-act="ok"]').onclick = () => close(true);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    });
}

// ==========================================
// Public Links / Share Chat
// ==========================================
function getPublicLinks() {
    try {
        return JSON.parse(localStorage.getItem(KEYS.publicLinks || 'lmsh_public_links') || '{}');
    } catch (e) { return {}; }
}

function savePublicLinks(map) {
    localStorage.setItem(KEYS.publicLinks || 'lmsh_public_links', JSON.stringify(map));
}

function generateShareId() {
    return 'share_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function shareCurrentContextMenuChat() {
    if (!contextTargetFlowId) return;
    hideContextMenu();

    const flows = getFlows();
    const flow = flows.find(f => f.id === contextTargetFlowId);
    if (!flow) {
        showToast('Чат не найден', 'error');
        return;
    }

    const links = getPublicLinks();
    let entry = Object.values(links).find(l => l.flowId === contextTargetFlowId && !l.blocked);
    if (!entry) {
        const id = generateShareId();
        entry = {
            id,
            flowId: contextTargetFlowId,
            name: flow.name,
            createdAt: new Date().toISOString(),
            blocked: false
        };
        links[id] = entry;
        savePublicLinks(links);
    }

    // Локальная «ссылка» (без реального сервера — код для обмена)
    const shareCode = `lmsh://chat/${entry.id}`;
    showShareModal(entry, shareCode);
}

function showShareModal(entry, shareCode) {
    const existing = document.getElementById('share-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'share-modal';
    overlay.className = 'modal-overlay visible';
    overlay.innerHTML = `
        <div class="modal-card" style="max-width:440px">
            <div class="modal-header">
                <div class="modal-icon">
                    <span class="material-symbols-outlined" style="font-size:26px">link</span>
                </div>
                <div>
                    <h2>Поделиться чатом</h2>
                    <p style="margin:0;color:var(--text-muted);font-size:0.85rem;margin-top:4px">${escapeHTML(entry.name)}</p>
                </div>
            </div>
            <div class="modal-body">
                <p style="font-size:0.9rem;color:var(--text-muted)">Ссылка на чат:</p>
                <div class="share-link-box">
                    <span class="material-symbols-outlined">link</span>
                    <code id="share-code-text">${escapeHTML(shareCode)}</code>
                </div>
                <p class="modal-note">Скопируйте и отправьте. Вы управляете доступом. Ссылка активна, пока чат есть в истории и ссылка не заблокирована.</p>
            </div>
            <div class="modal-footer">
                <button class="modal-btn" id="share-block-btn">${entry.blocked ? 'Разблокировать' : 'Заблокировать ссылку'}</button>
                <button class="modal-btn primary" id="share-copy-btn">
                    <span class="material-symbols-outlined" style="font-size:18px">content_copy</span> Копировать
                </button>
                <button class="modal-btn" id="share-close-btn">Закрыть окно</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#share-close-btn').onclick = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 280);
    };
    overlay.querySelector('#share-copy-btn').onclick = () => {
        navigator.clipboard.writeText(shareCode).then(() => {
            showToast('Ссылка скопирована', 'success');
        }).catch(() => showToast('Не удалось скопировать', 'error'));
    };
    overlay.querySelector('#share-block-btn').onclick = () => {
        const links = getPublicLinks();
        if (links[entry.id]) {
            links[entry.id].blocked = !links[entry.id].blocked;
            savePublicLinks(links);
            entry.blocked = links[entry.id].blocked;
            overlay.querySelector('#share-block-btn').textContent = entry.blocked ? 'Разблокировать' : 'Заблокировать ссылку';
            showToast(entry.blocked ? 'Ссылка заблокирована' : 'Ссылка снова активна', 'info');
        }
    };
    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 280);
        }
    });
}

// Novelty badge on Reader button
function updateReaderNoveltyBadge() {
    const btn = document.getElementById('reader-btn');
    if (!btn) return;
    btn.querySelectorAll('.reader-novelty').forEach(n => n.remove());
    if (localStorage.getItem(KEYS.readerSeen || 'lmsh_reader_seen') === '1') return;
    const badge = document.createElement('span');
    badge.className = 'novelty-badge reader-novelty';
    badge.textContent = 'Новинка';
    btn.appendChild(badge);
}

// Hook into DOMContentLoaded


// ==========================================
// Временный чат (не сохраняется)
// ==========================================
function createTempChat() {
    if (currentAbortController) stopGeneration();
    isTempChat = true;
    tempHistory = [];
    currentFlowId = null;
    localStorage.removeItem(KEYS.activeFlow);

    // UI
    document.getElementById('temp-chat-indicator')?.classList.add('visible');
    document.getElementById('temp-chat-btn')?.classList.add('active');

    const titleEl = document.getElementById('current-chat-title');
    if (titleEl) titleEl.innerText = 'Временный чат';

    const container = document.getElementById('messages-left');
    if (container) {
        container.innerHTML = `
            <div id="welcome-screen" class="welcome-container">
                <div class="welcome-icon">
                    <span class="material-symbols-outlined">timelapse</span>
                </div>
                <h2>Временный чат</h2>
                <p>Сообщения не сохраняются. После закрытия или смены чата история исчезнет.</p>
            </div>`;
    }
    renderSidebarFlows();
    showToast('Временный чат — история не сохраняется', 'info');
    if (window.innerWidth <= 768) {
        document.querySelector('.app-wrapper')?.classList.add('sidebar-collapsed');
    }
}

function exitTempChatMode() {
    isTempChat = false;
    tempHistory = [];
    document.getElementById('temp-chat-indicator')?.classList.remove('visible');
    document.getElementById('temp-chat-btn')?.classList.remove('active');
}

// При переключении на обычный чат — сбрасываем temp


// ==========================================
// Model picker — в поле ввода, «Модели» + I.S.
// ==========================================
const MODEL_LABELS = {
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-3.6-flash': 'Gemini 3.6 Flash',
    'gemini-3.8-flash': 'Gemini 3.8 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro'
};

function initModelPickers() {
    const picker = document.getElementById('model-picker');
    if (!picker) return;

    const saved = localStorage.getItem(KEYS.model) || 'gemini-2.5-flash';
    setModelPickerValue(picker, saved);

    // I.S. checkbox
    const isCb = document.getElementById('model-is-checkbox');
    if (isCb) {
        isCb.checked = localStorage.getItem(KEYS.searchMode) === 'true';
        isCb.addEventListener('change', () => {
            localStorage.setItem(KEYS.searchMode, isCb.checked ? 'true' : 'false');
            updateSearchModeIndicator();
            if (typeof showToast === 'function') {
                showToast(isCb.checked ? 'I.S. поиск включён' : 'I.S. поиск выключен', 'info', 2000);
            }
        });
        // don't close dropdown when clicking the label
        document.getElementById('model-picker-is-toggle')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    const trigger = picker.querySelector('.model-picker-trigger');
    if (trigger && !trigger.dataset.bound) {
        trigger.dataset.bound = '1';
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            picker.classList.toggle('open');
        });
    }

    picker.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = opt.dataset.value;
            localStorage.setItem(KEYS.model, val);
            setModelPickerValue(picker, val);
            picker.classList.remove('open');
            if (typeof showToast === 'function') {
                showToast('Модель: ' + (MODEL_LABELS[val] || val), 'info', 2000);
            }
        });
    });

    document.addEventListener('click', () => {
        picker.classList.remove('open');
    });
}

function setModelPickerValue(picker, value) {
    if (!picker) return;
    picker.dataset.value = value;
    // Компактная подпись на кнопке всегда «Модели»
    const valEl = picker.querySelector('.custom-select-value');
    if (valEl) valEl.textContent = 'Модели';
    picker.querySelectorAll('.custom-select-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.value === value);
    });
}
