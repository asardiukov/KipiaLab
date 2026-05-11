// js/components/charts.js
import { state } from '../state.js';
import { config } from '../config.js';
import { hasParticipated, getStudentMaxScoreForLab, calcScore } from '../utils.js';

// Храним инстансы графиков на уровне модуля
let chart1 = null, chart2 = null, chart3 = null, chart4 = null;

export function initCharts() {
    renderCharts();
}

export function renderCharts() {
    // Поддерживаем и новый стейт, и старую переменную
    const database = state.db || window.db;
    
    // Если базы нет, рисовать нечего
    if (!database || !database.students) return;

    let groupFilterEl = document.getElementById('reportGroupFilter');
    let gFilter = groupFilterEl ? groupFilterEl.value : 'all';
    
    let totalAct = 0, totalExp = 0;
    let sumAll = 0, countAll = 0;
    let labAvgs = {}; 
    
    let labelsLab = ["ЛПР 1","ЛПР 2","ЛПР 3","ЛПР 4","ЛПР 5","ЛПР 6","ЛПР 7","ЛПР 8","ЛПР 9","ЛПР 10"];
    let funnelActive = [], funnelExpelled = [];
    let structPass1 = [], structPassRetake = [], structFail = [], structExcused = [];
    let qual90 = 0, qual80 = 0, qual70 = 0, qualFail = 0;
    let groupSums = {}, groupCounts = {};

    // 1. Подсчет общих статусов
    for(let fio in database.students) {
        let s = database.students[fio];
        if (gFilter !== 'all' && s.group !== gFilter) continue;
        if (s.status === 'active') totalAct++;
        if (s.status === 'expelled') totalExp++;
    }

    // 2. Сбор статистики по каждой лаборатории
    for(let i=1; i<=10; i++) {
        let actCount = 0, expCount = 0;
        let p1 = 0, pRet = 0, fail = 0, exc = 0;
        let labSum = 0, labCnt = 0;
        
        for(let fio in database.students) {
            let s = database.students[fio];
            if (gFilter !== 'all' && s.group !== gFilter) continue;
            
            if (hasParticipated(s, i)) {
                if (s.status === 'active') actCount++;
                if (s.status === 'expelled') expCount++;
                
                let maxScore = getStudentMaxScoreForLab(fio, i);
                let att0 = s.labs[i].attempts[0];
                let criteria = database.labs_meta[i] ? database.labs_meta[i].criteria : [];
                let sc0 = calcScore(att0, criteria);
                let st0 = att0.status || (att0.absent ? "Н" : "");
                
                // --- БЛОК СТРУКТУРЫ ---
                if (sc0 >= config.PASS_THRESHOLD) { p1++; } 
                else if (maxScore >= config.PASS_THRESHOLD) { pRet++; } 
                else if (st0 === 'Б' || st0 === 'К') { exc++; } 
                else { fail++; }
                
                // --- БЛОК КАЧЕСТВА (Здесь была ошибка, мы восстановили if) ---
                if (maxScore >= 90) { qual90++; }
                else if (maxScore >= 80) { qual80++; }
                else if (maxScore >= config.PASS_THRESHOLD) { qual70++; }
                else { qualFail++; } 
                
                // --- ПОДСЧЕТ СРЕДНЕГО БАЛЛА ---
                if (!(maxScore === 0 && (st0 === 'Б' || st0 === 'К' || st0 === 'Н'))) {
                    labSum += maxScore;
                    labCnt++;
                    sumAll += maxScore;
                    countAll++;
                    
                    if (!groupSums[s.group]) { groupSums[s.group] = 0; groupCounts[s.group] = 0; }
                    groupSums[s.group] += maxScore;
                    groupCounts[s.group]++;
                }
            }
        }
        
        funnelActive.push(actCount);
        funnelExpelled.push(expCount);
        structPass1.push(p1);
        structPassRetake.push(pRet);
        structFail.push(fail);
        structExcused.push(exc);
        
        labAvgs[i] = labCnt > 0 ? (labSum / labCnt) : null;
    }

    // 3. Обновление текстовых метрик в HTML
    let statActEl = document.getElementById('statActive');
    let statExpEl = document.getElementById('statExpelled');
    let statAvgEl = document.getElementById('statOverallAvg');
    let statProbEl = document.getElementById('statProblemLab');

    if (statActEl) statActEl.innerText = totalAct;
    if (statExpEl) statExpEl.innerText = totalExp;
    if (statAvgEl) statAvgEl.innerText = countAll > 0 ? (sumAll/countAll).toFixed(1) : "0.0";
    
    let minAvg = 100, probLab = "-";
    for(let i=1; i<=10; i++) {
        if (labAvgs[i] !== null && labAvgs[i] < minAvg) {
            minAvg = labAvgs[i];
            probLab = `ЛПР ${i} (${minAvg.toFixed(1)})`;
        }
    }
    if (statProbEl) statProbEl.innerText = probLab;

    // 4. Отрисовка графиков Chart.js
    if(chart1) chart1.destroy(); if(chart2) chart2.destroy(); if(chart3) chart3.destroy(); if(chart4) chart4.destroy();
    
    let ctx1 = document.getElementById('chartFunnel')?.getContext('2d');
    if (ctx1) {
        chart1 = new Chart(ctx1, {
            type: 'bar',
            data: { labels: labelsLab, datasets: [
                { label: 'Активные', data: funnelActive, backgroundColor: '#3b82f6' },
                { label: 'Отчисленные (но сдавали)', data: funnelExpelled, backgroundColor: '#ef4444' }
            ]},
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
        });
    }

    let ctx2 = document.getElementById('chartStructure')?.getContext('2d');
    if (ctx2) {
        chart2 = new Chart(ctx2, {
            type: 'bar',
            data: { labels: labelsLab, datasets: [
                { label: 'Сдали сразу', data: structPass1, backgroundColor: '#10b981' },
                { label: 'С пересдач', data: structPassRetake, backgroundColor: '#f59e0b' },
                { label: 'Должники', data: structFail, backgroundColor: '#ef4444' },
                { label: 'Ув. причина (Б/К)', data: structExcused, backgroundColor: '#94a3b8' }
            ]},
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
        });
    }

    let ctx3 = document.getElementById('chartQuality')?.getContext('2d');
    if (ctx3) {
        chart3 = new Chart(ctx3, {
            type: 'doughnut',
            data: { labels: ['Отлично (90-100)', 'Хорошо (80-89)', 'Удовл. (70-79)', 'Не сдали (<70)'], datasets: [{
                data: [qual90, qual80, qual70, qualFail],
                backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444']
            }]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }

    let ctx4 = document.getElementById('chartGroups')?.getContext('2d');
    if (ctx4) {
        let gNames = Object.keys(groupSums).sort();
        let gAvgs = gNames.map(g => (groupSums[g]/groupCounts[g]).toFixed(1));
        chart4 = new Chart(ctx4, {
            type: 'bar',
            data: { labels: gNames, datasets: [{ label: 'Средний балл', data: gAvgs, backgroundColor: '#8b5cf6' }]},
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { min: 0, max: 100 } } }
        });
    }
}

// Проброс в window для старого меню навигации
window.initCharts = initCharts;
window.renderCharts = renderCharts;
console.log("✅ Модуль Графиков (charts.js) успешно загружен!");
