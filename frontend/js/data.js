// Глобальные константы и переменные состояния
const ATTEMPT_NAMES = ["Основа", "Пересдача", "Комиссия", "Характеристика"];
const PASS_THRESHOLD = 70.0;

let chart1 = null, chart2 = null, chart3 = null, chart4 = null;
let currentNav = 'dashboard', currentLab = 1, currentAttempt = 0, currentGroup = null, gradingFio = null, tempLevels = {};
let importPreviewData = null;

// Инициализация и миграция базы
let db = JSON.parse(localStorage.getItem('kipia_v4_db'));

if (!db) {
    let oldDbV1 = JSON.parse(localStorage.getItem('lpr_db'));
    let oldDbV3 = JSON.parse(localStorage.getItem('kipia_v3_db'));
    
    if (oldDbV3) { db = oldDbV3; } 
    else {
        db = { students: {}, labs_meta: {}, tpl_vedomost: null, tpl_protocol: null };
        for(let i=1; i<=10; i++) db.labs_meta[i] = { topic: "", month: "", criteria: [] };
        if (oldDbV1) {
            for (let fio in oldDbV1) {
                let o = oldDbV1[fio]; if(typeof o !== 'object' || !o.group) continue;
                let newS = { group: o.group, status: o.status || 'active', labs: {} };
                for(let i=1; i<=10; i++) {
                    let oldL = o.labs[i] || {scores:['','','',''], remarks:[]};
                    newS.labs[i] = {
                        attempts: [0,1,2,3].map(a => ({ levels: {}, absent: oldL.scores[a]==='Н', legacy_score: oldL.scores[a]==='Н'?'':oldL.scores[a] })),
                        remarks: oldL.remarks || []
                    };
                }
                db.students[fio] = newS;
            }
        }
    }
    saveDB();
}

async function saveDB() {
    // 1. По-прежнему сохраняем локально (локальный бэкап на случай, если сервер упадет)
    localStorage.setItem('kipia_v5_db', JSON.stringify(db));

    // 2. Отправляем на наш Бэкенд в Докере
    try {
        const response = await fetch('http://localhost:3001/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(db) // Отправляем весь твой объект db
        });

        if (response.ok) {
            console.log("✅ Данные успешно синхронизированы с PostgreSQL");
        } else {
            console.error("⚠️ Сервер принял запрос, но ответил ошибкой");
        }
    } catch (error) {
        // Если докер выключен или нет сети, ты увидишь это в консоли
        console.error("❌ Не удалось связаться с Бэкендом:", error);
    }
}
async function loadDBFromServer() {
    try {
        const response = await fetch('http://localhost:3001/api/load');
        if (response.ok) {
            const remoteDb = await response.json();
            if (remoteDb) {
                db = remoteDb;
                console.log("📦 База данных успешно загружена из PostgreSQL");
                return true;
            }
        }
    } catch (error) {
        console.warn("⚠️ Не удалось загрузить данные с сервера, использую локальную копию");
    }
    return false;
}
function cleanStr(s) { return s ? String(s).trim() : ""; }

// Расчет баллов
function calcScore(att, criteria) {
    let st = att.status || (att.absent ? "Н" : "");
    if (st === "Н" || st === "Б" || st === "К") return 0;
    
    if (att.legacy_score !== undefined && att.legacy_score !== null && String(att.legacy_score).trim() !== "") {
        let sc = parseFloat(att.legacy_score);
        return isNaN(sc) ? 0 : sc;
    }
    let total = 0;
    if(criteria && criteria.length > 0) {
        criteria.forEach(c => {
            let lvl = att.levels[c.name] || 0;
            if (lvl === 1) total += Math.ceil(c.max_points / 2);
            else if (lvl === 2) total += c.max_points;
        });
    }
    return total;
}

function getStateDescription(fio, labNum, attemptIdx, criteria) {
    let s = db.students[fio];
    if (!s || s.status !== 'active') return "Неактивен";
    let att = s.labs[labNum].attempts[attemptIdx];
    let st = att.status || (att.absent ? "Н" : "");
    if (st === "Н") return "Н (отсутствовал)";
    if (st === "Б") return "Б (больничный)";
    if (st === "К") return "К (командировка)";
    
    if (att.legacy_score && att.legacy_score !== "") return `Балл: ${att.legacy_score}`;
    if (criteria && criteria.length > 0) {
        let allKeysPresent = criteria.every(c => att.levels.hasOwnProperty(c.name));
        if (allKeysPresent || Object.keys(att.levels).length > 0) {
            let score = calcScore(att, criteria);
            return `Балл: ${score}`;
        }
    }
    return "Не оценено";
}

function formatGradeFromImport(importStudent, criteria) {
    let st = importStudent.status || (importStudent.absent ? "Н" : "");
    if (st === "Н" || st === "Б" || st === "К") return `Статус: ${st}`;
    
    if (importStudent.legacy_score && importStudent.legacy_score !== "") {
        return `Балл: ${importStudent.legacy_score}`;
    }
    if (importStudent.levels && Object.keys(importStudent.levels).length > 0) {
        let total = 0;
        if (criteria && criteria.length > 0) {
            criteria.forEach(c => {
                let lvl = importStudent.levels[c.name] || 0;
                if (lvl === 1) total += Math.ceil(c.max_points / 2);
                else if (lvl === 2) total += c.max_points;
            });
        }
        return `Балл: ${total}`;
    }
    return "Не оценено";
}

function getStudentMaxScoreForLab(fio, labNum) {
    let s = db.students[fio]; if (!s || !s.labs[labNum]) return 0;
    let max = 0, criteria = db.labs_meta[labNum].criteria;
    for(let i=0; i<4; i++) {
        let att = s.labs[labNum].attempts[i];
        if (Object.keys(att.levels).length > 0 || att.legacy_score || att.absent || att.status) {
            let sc = calcScore(att, criteria);
            if (sc > max) max = sc;
        }
    }
    return max;
}

function shouldShowInLabAttempt(fio, labNum, attemptIndex) {
    let s = db.students[fio]; if (s.status !== 'active') return false;
    if (labNum > 1 && getStudentMaxScoreForLab(fio, labNum - 1) < PASS_THRESHOLD) return false; 
    let criteria = db.labs_meta[labNum].criteria;
    for (let i = 0; i < attemptIndex; i++) { 
        let att = s.labs[labNum].attempts[i];
        let st = att.status || (att.absent ? "Н" : "");
        if (st !== "Н" && st !== "Б" && st !== "К" && calcScore(att, criteria) >= PASS_THRESHOLD) return false; 
    }
    return true;
}

function getStudentStats(s, fio) {
    let totalScore = 0, remarksCount = 0, count = 0; 
    for (let i = 1; i <= 10; i++) {
        let hasAttempt = s.labs[i].attempts.some(a => Object.keys(a.levels).length > 0 || a.legacy_score || a.absent || a.status);
        if (hasAttempt) { totalScore += getStudentMaxScoreForLab(fio, i); count++; }
        remarksCount += s.labs[i].remarks.length;
    }
    return { avgScore: count > 0 ? (totalScore / count).toFixed(1) : "—", totalRemarks: remarksCount, submitted: count };
}

function hasParticipated(s, labNum) {
    if (!s.labs || !s.labs[labNum]) return false;
    return s.labs[labNum].attempts.some(a => Object.keys(a.levels).length > 0 || a.legacy_score || a.absent || a.status);
}

// Функция отправки данных на сервер
async function saveToServer(data) {
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        console.log('Данные успешно синхронизированы с сервером.');
        alert('Изменения сохранены!'); // Позже можно заменить на красивое всплывающее уведомление

    } catch (error) {
        console.error('Ошибка при сохранении данных:', error);
        alert('Сбой сети или сервер недоступен. Данные не сохранены.');
    }
}

// 1. Исправленный тестовый звонок (на порт 3001)
window.testBackendConnection = async function() {
    console.log("Проверяем связь с бэкендом на порту 3001...");
    try {
        // Указываем полный путь к бэкенду
        const response = await fetch('http://localhost:3001/api/test'); 
        const data = await response.json();
        
        if (response.ok) {
            alert(`Бэкенд на связи! Ответ: ${data.message} 🚀`);
        }
    } catch (error) {
        console.error('Ошибка связи:', error);
        alert('Бэкенд на порту 3001 НЕ отвечает. Проверь Docker!');
    }
};

// 2. Исправленное сохранение (на порт 3001)
window.saveToServer = async function(data) {
    console.log("Отправка данных на http://localhost:3001/api/save...");
    try {
        const response = await fetch('http://localhost:3001/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('✅ Синхронизировано с PostgreSQL и файлом!');
        } else {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('❌ Ошибка: Бэкенд не принял данные. Проверь консоль Докера.');
    }
};

// 3. ЧИСТКА: Найди и УДАЛИ старый кусок кода (примерно на 209 строке),
// который содержит слово appData. Он больше не нужен!// 3. ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
window.addEventListener('DOMContentLoaded', async () => {
    // Сначала оживляем кнопку "Сохранить"
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.onclick = () => {
            console.log("Кнопка 'Сохранить на сервер' нажата. Отправляю переменную db...");
            
            // Проверяем существование переменной db
            if (typeof db !== 'undefined' && db !== null) {
                window.saveToServer(db); 
            } else {
                alert("Ошибка: Переменная 'db' не инициализирована.");
            }
        };
    }
    // Затем грузим данные с сервера для отображения
    const isLoaded = await loadDBFromServer();
    
    if (isLoaded) {
        console.log("🚀 Данные получены. Обновляю интерфейс...");
        renderLabTabs(); 
        renderLabTable(); 
        renderCharts(); 
        console.log("✨ Интерфейс синхронизирован!");
    } else {
        console.log("🏠 Работаем на локальных данных");
        renderLabTabs();
        renderLabTable();
        renderCharts();
    }
});
