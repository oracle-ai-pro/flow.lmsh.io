<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Настройки Штаба | LMSH Flow 2.5</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Material+Symbols+Outlined" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <style>
        /* Разрешаем скролл для страницы настроек */
        body {
            overflow-y: auto !important;
            height: auto !important;
            min-height: 100dvh;
        }

        /* Всплывающая шапка (Floating Header) */
        .floating-header {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 60px;
            background-color: var(--bg-sidebar);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            z-index: 1000;
            transform: translateY(-100%);
            opacity: 0;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
        }

        .floating-header.visible {
            transform: translateY(0);
            opacity: 1;
        }

        .floating-header h3 {
            font-size: 1.1rem;
            color: var(--text-main);
            margin: 0;
        }

        /* Сетка карточек */
        .settings-grid {
            display: grid;
            gap: 20px;
            max-width: 700px;
            margin: 40px auto;
            width: 100%;
            padding: 0 20px;
        }

        .settings-card {
            background-color: var(--bg-sidebar);
            border: 1px solid var(--border-color);
            padding: 25px;
            border-radius: var(--ui-radius, 12px);
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .settings-card h3 {
            font-size: 1.1rem;
            color: var(--text-main);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 10px;
            margin-bottom: 5px;
        }

        .setting-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .setting-group label {
            font-size: 0.9rem;
            color: var(--text-muted);
        }

        .setting-group input, 
        .setting-group select, 
        .setting-group textarea {
            background-color: var(--bg-input);
            border: 1px solid var(--border-color);
            border-radius: var(--ui-radius, 8px);
            padding: 12px;
            color: var(--text-main);
            font-size: 0.9rem;
            outline: none;
            width: 100%;
        }

        .setting-group textarea {
            resize: vertical;
            min-height: 80px;
        }

        .row-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .checkbox-row {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            color: var(--text-main);
            font-size: 0.95rem;
        }

        .checkbox-row input {
            width: 18px;
            height: 18px;
            accent-color: var(--accent-color);
            cursor: pointer;
        }

        @media (max-width: 600px) {
            .row-group {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>

    <!-- Всплывающая панель при скролле -->
    <div id="floating-header" class="floating-header">
        <h3>Панель управления Штабом</h3>
        <button class="menu-btn" onclick="window.location.href='index.html'">
            <span class="material-symbols-outlined">arrow_back</span> В Штаб
        </button>
    </div>

    <div class="settings-grid">
        
        <!-- Главный заголовок (триггер скролла) -->
        <div id="main-header" style="display: flex; align-items: center; justify-content: space-between;">
            <h2>Панель управления Штабом</h2>
            <button class="menu-btn" onclick="window.location.href='index.html'">
                <span class="material-symbols-outlined">arrow_back</span> В Штаб
            </button>
        </div>

        <!-- 1. Основное (Провайдер и Ключ) -->
        <div class="settings-card">
            <h3>Подключение ИИ</h3>
            <div class="setting-group">
                <label>Основной провайдер ИИ</label>
                <select id="provider-select">
                    <option value="gemini">Google Gemini (API Studio)</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="gpt">OpenAI ChatGPT</option>
                    <option value="grok">xAI Grok</option>
                </select>
            </div>
            <div class="setting-group">
                <label>API-ключ доступа</label>
                <input type="password" id="api-key-input" placeholder="Вставьте ваш секретный ключ здесь...">
                <small style="color: var(--text-muted); font-size: 0.8rem;">Ключ хранится локально в localStorage браузера.</small>
            </div>
        </div>

        <!-- 2. Гиперпараметры генерации -->
        <div class="settings-card">
            <h3>Гиперпараметры генерации</h3>
            <div class="row-group">
                <div class="setting-group">
                    <label>Температура (<span id="temp-value">0.7</span>)</label>
                    <input type="range" id="temperature-input" min="0" max="1" step="0.05" value="0.7" oninput="document.getElementById('temp-value').innerText = this.value">
                </div>
                <div class="setting-group">
                    <label>Максимум токенов</label>
                    <input type="number" id="max-tokens-input" value="2048" placeholder="2048">
                </div>
            </div>
        </div>

        <!-- 3. Интерфейс и UX -->
        <div class="settings-card">
            <h3>Интерфейс и UX</h3>
            <div class="row-group">
                <div class="setting-group">
                    <label>Цветовой акцент</label>
                    <select id="accent-color-select">
                        <option value="#3b82f6">Фирменный синий</option>
                        <option value="#10b981">Кибер-зеленый</option>
                        <option value="#8b5cf6">Ультрафиолет</option>
                        <option value="#f59e0b">Янтарный</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label>Состояние скруглений углов</label>
                    <select id="ui-radius-select">
                        <option value="0px">Нету (Строгий / Старый)</option>
                        <option value="8px">Обычные (Стандартные)</option>
                        <option value="20px">Максимальные (Плавные / Pills)</option>
                    </select>
                </div>
            </div>
            <div class="setting-group" style="margin-top: 5px;">
                <label class="checkbox-row">
                    <input type="checkbox" id="sound-effects-toggle">
                    Включить звуковые эффекты интерфейса
                </label>
            </div>
        </div>

        <!-- 4. Персонажи Штаба ЛМСХ -->
        <div class="settings-card">
            <h3>Системные роли Штаба ЛМСХ</h3>
            <div class="setting-group">
                <label>ЛАМИРК (Главный инженер — мужской профиль)</label>
                <textarea id="prompt-lamirk" placeholder="Системный промпт для Ламирка..."></textarea>
            </div>
            <div class="setting-group">
                <label>МУРЗИК (Верная Помощница — женский профиль)</label>
                <textarea id="prompt-murzik" placeholder="Системный промпт для Мурзика..."></textarea>
            </div>
            <div class="setting-group">
                <label>СНЕЖИНКА (Женский вокал)</label>
                <textarea id="prompt-sneginka" placeholder="Системный промпт для Снежинки..."></textarea>
            </div>
            <div class="setting-group">
                <label>ХАХМИ (Мужской вокал)</label>
                <textarea id="prompt-haxmi" placeholder="Системный промпт для Хахми..."></textarea>
            </div>
        </div>

        <!-- 5. Данные и сброс -->
        <div class="settings-card">
            <h3>Управление данными</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="menu-btn" onclick="exportConfig()">Экспорт конфига (JSON)</button>
                <button class="menu-btn" onclick="document.getElementById('import-file').click()">Импорт конфига</button>
                <input type="file" id="import-file" style="display: none;" onchange="importConfig(event)">
                <button class="menu-btn" style="border-color: #ef4444; color: #ef4444;" onclick="resetSystem()">Сбросить систему</button>
            </div>
        </div>

        <!-- Кнопка сохранения -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
            <button class="menu-btn primary" onclick="saveSettings()" style="padding: 12px 24px; font-size: 1rem;">Сохранить все настройки</button>
        </div>

    </div>

    <script>
        // Трекинг видимости главного заголовка для вызова floating header
        const mainHeader = document.getElementById('main-header');
        const floatingHeader = document.getElementById('floating-header');

        const headerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    floatingHeader.classList.add('visible');
                } else {
                    floatingHeader.classList.remove('visible');
                }
            });
        }, { threshold: 0 });

        headerObserver.observe(mainHeader);

        // Загрузка настроек при открытии
        document.addEventListener('DOMContentLoaded', () => {
            if (localStorage.getItem('lmsh_api_key')) document.getElementById('api-key-input').value = localStorage.getItem('lmsh_api_key');
            if (localStorage.getItem('lmsh_provider')) document.getElementById('provider-select').value = localStorage.getItem('lmsh_provider');
            if (localStorage.getItem('lmsh_temperature')) {
                const temp = localStorage.getItem('lmsh_temperature');
                document.getElementById('temperature-input').value = temp;
                document.getElementById('temp-value').innerText = temp;
            }
            if (localStorage.getItem('lmsh_max_tokens')) document.getElementById('max-tokens-input').value = localStorage.getItem('lmsh_max_tokens');
            if (localStorage.getItem('lmsh_accent_color')) document.getElementById('accent-color-select').value = localStorage.getItem('lmsh_accent_color');
            if (localStorage.getItem('lmsh_ui_radius')) document.getElementById('ui-radius-select').value = localStorage.getItem('lmsh_ui_radius');
            if (localStorage.getItem('lmsh_sounds') === 'true') document.getElementById('sound-effects-toggle').checked = true;

            // Загрузка промптов Штаба
            document.getElementById('prompt-lamirk').value = localStorage.getItem('lmsh_prompt_lamirk') || '';
            document.getElementById('prompt-murzik').value = localStorage.getItem('lmsh_prompt_murzik') || '';
            document.getElementById('prompt-sneginka').value = localStorage.getItem('lmsh_prompt_sneginka') || '';
            document.getElementById('prompt-haxmi').value = localStorage.getItem('lmsh_prompt_haxmi') || '';
        });

        // Сохранение настроек
        function saveSettings() {
            localStorage.setItem('lmsh_api_key', document.getElementById('api-key-input').value.trim());
            localStorage.setItem('lmsh_provider', document.getElementById('provider-select').value);
            localStorage.setItem('lmsh_temperature', document.getElementById('temperature-input').value);
            localStorage.setItem('lmsh_max_tokens', document.getElementById('max-tokens-input').value);
            localStorage.setItem('lmsh_accent_color', document.getElementById('accent-color-select').value);
            localStorage.setItem('lmsh_ui_radius', document.getElementById('ui-radius-select').value);
            localStorage.setItem('lmsh_sounds', document.getElementById('sound-effects-toggle').checked);

            localStorage.setItem('lmsh_prompt_lamirk', document.getElementById('prompt-lamirk').value);
            localStorage.setItem('lmsh_prompt_murzik', document.getElementById('prompt-murzik').value);
            localStorage.setItem('lmsh_prompt_sneginka', document.getElementById('prompt-sneginka').value);
            localStorage.setItem('lmsh_prompt_haxmi', document.getElementById('prompt-haxmi').value);

            alert('[Штаб]: Все настройки успешно сохранены в ядро системы!');
            window.location.href = 'index.html';
        }

        // Экспорт конфигурации
        function exportConfig() {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('lmsh_')) {
                    data[key] = localStorage.getItem(key);
                }
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'lmsh_flow_config.json';
            a.click();
        }

        // Импорт конфигурации
        function importConfig(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    for (const key in data) {
                        if (key.startsWith('lmsh_')) {
                            localStorage.setItem(key, data[key]);
                        }
                    }
                    alert('[Штаб]: Конфигурация успешно загружена! Перезагрузка...');
                    location.reload();
                } catch (err) {
                    alert('Ошибка при чтении JSON-файла.');
                }
            };
            reader.readAsText(file);
        }

        // Сброс системы
        function resetSystem() {
            if (confirm('Внимание! Все локальные данные, ключи и промпты будут удалены. Продолжить?')) {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('lmsh_')) keysToRemove.push(key);
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                alert('[Штаб]: Система сброшена к заводским настройкам.');
                location.reload();
            }
        }
    </script>
</body>
</html>
