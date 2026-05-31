// core.js
const STORAGE_KEY = 'LMSH_FLOW_KEY';
const TG_TOKEN = '8608018012:AAGXq5u1vgW3tbuq5bKB2p2gM5ubJFn_01A';
const TG_CHAT_ID = '5365364862';

// 1. "КПП" для защиты ключа Gemini
function getApiKey() {
    let key = localStorage.getItem(STORAGE_KEY);
    if (!key) {
        key = prompt("[LMSH_FLOW_2.2]: Система заблокирована. Введите ключ:");
        if (key) localStorage.setItem(STORAGE_KEY, key);
    }
    return key;
}

// 2. Линия связи со Штабом в ТГ
async function notifyLMSH(event) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text: `[ШТАБ]: ${event}` })
    });
}

// 3. Главный обработчик запросов
async function sendCommand(text) {
    const key = getApiKey();
    if (!key) return;

    // Уведомляем себя в ТГ о начале работы
    notifyLMSH(`Начата обработка: "${text}"`);
    
    // Здесь будет вызов Gemini API с использованием key
    console.log("[LMSH_FLOW_2.2]: Запрос отправлен в Gemini.");
}
