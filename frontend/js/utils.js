// js/utils.js
import { state } from './state.js';
import { config } from './config.js';

export function cleanStr(s) { return s ? String(s).trim() : ""; }

export function calcScore(att, criteria) {
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

export function getStudentMaxScoreForLab(fio, labNum) {
    let s = state.db.students[fio]; 
    if (!s || !s.labs[labNum]) return 0;
    let max = 0, criteria = state.db.labs_meta[labNum].criteria;
    for(let i=0; i<4; i++) {
        let att = s.labs[labNum].attempts[i];
        if (Object.keys(att.levels).length > 0 || att.legacy_score || att.absent || att.status) {
            let sc = calcScore(att, criteria);
            if (sc > max) max = sc;
        }
    }
    return max;
}

export function getStudentStats(student, fio) {
    if (!student) return { avgScore: 0, submitted: 0, totalRemarks: 0 };
    if (!student.labs) student.labs = {};

    let totalScore = 0;
    let submittedCount = 0;
    let remarksCount = 0;

    for (let i = 1; i <= 10; i++) {
        const lab = student.labs[i];
        let maxScore = 0;

        if (lab) {
            // Ищем попытки сдачи
            if (lab.attempts && Array.isArray(lab.attempts) && lab.attempts.length > 0) {
                // Магия: собираем все баллы, проверяем legacy_score и пустые строки ""
                const scores = lab.attempts.map(a => {
                    // Берем score, если нет - берем legacy_score. Если пусто - "0"
                    const val = a.score !== undefined ? a.score : (a.legacy_score || "0");
                    const parsed = parseFloat(val);
                    return isNaN(parsed) ? 0 : parsed;
                });
                
                // Находим максимальный балл среди всех попыток
                maxScore = Math.max(...scores, 0); 
            } 
            // Страховка на случай старых форматов
            else if (lab.score !== undefined || lab.legacy_score !== undefined) {
                maxScore = parseFloat(lab.score || lab.legacy_score) || 0;
            }

            // Плюсуем балл, если он больше 0 (значит лаба сдана)
            if (maxScore > 0) {
                totalScore += maxScore;
                submittedCount++;
            }

            // Считаем замечания
            if (lab.remarks && Array.isArray(lab.remarks)) {
                remarksCount += lab.remarks.length;
            }
        }
    }

    // Считаем среднее (оставляем 1 знак после запятой)
    const avgScore = submittedCount > 0 ? (totalScore / submittedCount).toFixed(1) : 0;

    // 🔥 ЗАПИСЫВАЕМ СРЕДНИЙ БАЛЛ ОБРАТНО В СТУДЕНТА ДЛЯ СОРТИРОВКИ!
    student.averageScore = parseFloat(avgScore);

    return {
        avgScore: avgScore,
        submitted: submittedCount,
        totalRemarks: remarksCount
    };
}

// Проверяет, сдал ли студент хотя бы одну работу
export function hasParticipated(student) {
    if (!student) return false;
    
    // Используем нашу новую мощную функцию подсчета
    const stats = getStudentStats(student); 
    
    // Если сдано больше 0 лаб — значит, участвовал
    return stats.submitted > 0; 
}
// js/utils.js
// ... твои функции ...

// МОСТ ДЛЯ СТАРОГО КОДА (ui.js, io.js)
window.getStudentStats = getStudentStats;
window.calcScore = calcScore;
window.hasParticipated = hasParticipated;
window.getStudentMaxScoreForLab = getStudentMaxScoreForLab;
window.cleanStr = cleanStr;
