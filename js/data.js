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

function saveDB() { localStorage.setItem('kipia_v4_db', JSON.stringify(db)); }
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