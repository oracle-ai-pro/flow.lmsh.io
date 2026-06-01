let packData = {};

// Инициализация при загрузке
async function init() {
    const response = await fetch('db.json');
    packData = await response.json();
    
    // Создаем кнопки FAQ
    const faqGroup = document.getElementById('faq-group');
    packData.faq.forEach(item => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerText = item.q;
        chip.onclick = () => showAnswer(item.a);
        faqGroup.appendChild(chip);
    });
}

function showAnswer(answer) {
    document.getElementById('chat-window').innerHTML = 
        `<p>${answer}</p> <span class="material-symbols-rounded">thumb_up</span>`;
}

document.getElementById('user-input').onkeypress = function(e) {
    if(e.key === 'Enter') {
        showAnswer("ИИ анализирует: " + this.value + ". (Подключи Gemini API для реального ответа)");
    }
};

init();
