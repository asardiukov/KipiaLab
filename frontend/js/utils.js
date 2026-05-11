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

export function getStudentStats(s, fio) {
    let totalScore = 0, remarksCount = 0, count = 0; 
    for (let i = 1; i <= 10; i++) {
        let hasAttempt = s.labs[i].attempts.some(a => Object.keys(a.levels).length > 0 || a.legacy_score || a.absent || a.status);
        if (hasAttempt) { totalScore += getStudentMaxScoreForLab(fio, i); count++; }
        remarksCount += s.labs[i].remarks.length;
    }
    return { avgScore: count > 0 ? (totalScore / count).toFixed(1) : "—", totalRemarks: remarksCount, submitted: count };
}

export function hasParticipated(s, labNum) {
    if (!s.labs || !s.labs[labNum]) return false;
    return s.labs[labNum].attempts.some(a => Object.keys(a.levels).length > 0 || a.legacy_score || a.absent || a.status);
}
// js/utils.js
// ... твои функции ...

// МОСТ ДЛЯ СТАРОГО КОДА (ui.js, io.js)
window.getStudentStats = getStudentStats;
window.calcScore = calcScore;
window.hasParticipated = hasParticipated;
window.getStudentMaxScoreForLab = getStudentMaxScoreForLab;
window.cleanStr = cleanStr;
