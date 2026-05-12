// 1. ЖЕЛЕЗОБЕТОННЫЙ ПРЕДОХРАНИТЕЛЬ
window.isDataLoadedFromServer = false;
import { state } from './state.js';
// 2. ФУНКЦИЯ СОХРАНЕНИЯ
window.saveToServer = async function(data) {
    if (window.isDataLoadedFromServer !== true) {
        console.warn("⚠️ Блокировка сохранения: данные не загружены с сервера!");
        return { status: "blocked" };
    }

    try {
        console.log("Отправляем данные на сервер...");
        const res = await fetch('/api/save', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("❌ Ошибка при сохранении:", err);
        throw err; 
    }
};

// ... в функции loadDBFromServer не забудь поменять на:
// window.isDataLoadedFromServer = true;

let chart1 = null, chart2 = null, chart3 = null, chart4 = null;
let importPreviewData = null;

// Инициализация и миграция базы (ТЕПЕРЬ ВЕЗДЕ V5)
let db = JSON.parse(localStorage.getItem('kipia_v5_db'));

if (!db) {
    let oldDbV4 = JSON.parse(localStorage.getItem('kipia_v4_db')); // Пытаемся достать прошлую версию
    
    if (oldDbV4) { 
        db = oldDbV4; 
    } else {
        db = { students: {}, labs_meta: {}, tpl_vedomost: null, tpl_protocol: null };
        for(let i=1; i<=10; i++) db.labs_meta[i] = { topic: "", month: "", criteria: [] };
    }
    saveDB(); // Сразу пересохраняем в v5
}

// Функция-обертка для совместимости со старым кодом
async function saveDB() {
    await window.saveToServer(db);
}

// 3. Тестовый звонок
window.testBackendConnection = async function() {
    console.log("Проверяем связь с бэкендом...");
    try {
        const response = await fetch('/api/test'); // ОТНОСИТЕЛЬНЫЙ ПУТЬ
        const data = await response.json();
        if (response.ok) {
            alert(`Бэкенд на связи! Ответ: ${data.message} 🚀`);
        }
    } catch (error) {
        console.error('Ошибка связи:', error);
        alert('Бэкенд НЕ отвечает. Проверь Docker и Nginx!');
    }
};

// Вспомогательные функции расчетов
function cleanStr(s) { return s ? String(s).trim() : ""; }

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

export function shouldShowInLabAttempt(student, labNum, attemptIdx) {
    // 1. Проверяем, есть ли вообще студент и его лабы
    if (!student || !student.labs || !student.labs[labNum]) {
        return false;
    }

    const lab = student.labs[labNum];

    // 2. Проверяем, есть ли массив попыток и нужная нам попытка
    if (!lab.attempts || !Array.isArray(lab.attempts) || !lab.attempts[attemptIdx]) {
        return false;
    }

    const attempt = lab.attempts[attemptIdx];

    // 3. БЕЗОПАСНАЯ ПРОВЕРКА СТАТУСА
    // Если статуса нет (старая база), но есть баллы — считаем, что можно показывать
    const status = attempt.status || ''; 
    
    // Тут твоя логика фильтрации (обычно проверка, не отчислен ли или не скрыт)
    // Добавляем защиту: если attempt существует, берем статус
    return attempt !== undefined; 
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
window.shouldShowInLabAttempt = shouldShowInLabAttempt;
