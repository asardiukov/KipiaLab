// js/ui.js

// 1. НАСТРОЙКИ
window.PASS_THRESHOLD = 70;
const ATTEMPT_NAMES = ["1 сдача", "2 сдача", "3 сдача", "4 сдача"];

let currentNav = 'dashboard', currentLab = 1, currentAttempt = 0, currentGroup = null, gradingFio = null, tempLevels = {};

// 2. СИСТЕМНЫЕ ФУНКЦИИ
window.saveDB = function() {
    if (typeof window.saveToServer === 'function') {
        window.saveToServer(window.db); 
    }
};

function closeModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none'; 
}

// 3. НАВИГАЦИЯ
function navTo(page, labNum = null) {
    const db = window.db;
    if (!db) return;

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(el => el.classList.remove('active'));
    
    const labInputs = document.getElementById('labTopInputs');
    if (labInputs) labInputs.style.display = 'none';

    if (page === 'dashboard') {
        document.getElementById('nav-dashboard')?.classList.add('active');
        document.getElementById('panel-dashboard')?.classList.add('active');
        document.getElementById('topbarTitle').innerText = "Дашборд (Общая сводка)";
        if (window.updateGroupFilters) window.updateGroupFilters(); 
        if (window.renderDashboard) window.renderDashboard();
    } else if (page === 'lab') {
        currentLab = labNum;
        document.getElementById(`nav-lab-${labNum}`)?.classList.add('active');
        document.getElementById('panel-lab')?.classList.add('active');
        document.getElementById('topbarTitle').innerText = `ЛПР №${labNum}`;
        if (labInputs) labInputs.style.display = 'flex';
        
        if (db.labs_meta && db.labs_meta[labNum]) {
            document.getElementById('inpTopic').value = db.labs_meta[labNum].topic || "";
            document.getElementById('inpMonth').value = db.labs_meta[labNum].month || "";
        }
        renderLabTabs();
    } else if (page === 'expelled') {
        document.getElementById('nav-expelled')?.classList.add('active');
        document.getElementById('panel-expelled')?.classList.add('active');
        document.getElementById('topbarTitle').innerText = "Отчисленные";
        renderExpelled();
    }
    currentNav = page;
}

// 4. ЛОГИКА ТАБЛИЦ
function renderLabTabs() {
    const db = window.db;
    if (!db) return;
    let groups = new Set();
    for (let fio in db.students) {
        let s = db.students[fio];
        if (!s.status || s.status === 'active') groups.add(s.group);
    }
    let gArr = Array.from(groups).sort();
    let c = document.getElementById('groupTabs'); 
    if (!c) return;
    c.innerHTML = '';
    if (gArr.length === 0) return;
    if (!currentGroup || !gArr.includes(currentGroup)) currentGroup = gArr[0];
    gArr.forEach(g => {
        let div = document.createElement('div');
        div.className = `sub-tab ${g === currentGroup ? 'active' : ''}`;
        div.innerText = g;
        div.onclick = () => { currentGroup = g; renderLabTabs(); };
        c.appendChild(div);
    });
    renderLabTable();
}

function renderLabTable() {
    const db = window.db;
    let tbody = document.getElementById('labTbody'); 
    if (!tbody || !db) return;
    tbody.innerHTML = '';
    
    for (let fio in db.students) {
        let s = db.students[fio];
        if (s.group !== currentGroup || (s.status && s.status !== 'active')) continue;
        if (window.shouldShowInLabAttempt && !window.shouldShowInLabAttempt(s, currentLab, currentAttempt)) continue;

        let att = s.labs[currentLab].attempts[currentAttempt];
        let score = (att.score !== undefined && att.score !== "") ? att.score : (att.legacy_score || "");
        let st = att.status || (att.absent ? "Н" : "");

        let stHtml = score !== "" ? (parseFloat(score) >= window.PASS_THRESHOLD ? '<span style="color:var(--pass); font-weight:bold;">Сдал</span>' : '<span style="color:var(--fail); font-weight:bold;">Не сдал</span>') : '—';
        if (st === 'Н') stHtml = '<span style="color:var(--fail); font-weight:bold;">Н</span>';

        tbody.innerHTML += `
            <tr class="clickable-row" onclick="window.openGradeModal('${fio}')">
                <td>${fio}</td>
                <td style="text-align:center; font-weight:bold;">${st || score || "—"}</td>
                <td style="text-align:center;">${stHtml}</td>
            </tr>`;
    }
}

function switchAttempt(idx) {
    currentAttempt = idx;
    document.querySelectorAll('#attemptTabs .tab').forEach((t, i) => t.classList.toggle('active', i === idx));
    renderLabTable();
}

// 5. МОДАЛКИ И КАРТОЧКИ
function openGradeModal(fio) {
    const db = window.db;
    gradingFio = fio;
    let sLab = db.students[fio].labs[currentLab];
    let att = sLab.attempts[currentAttempt];
    let crit = db.labs_meta[currentLab].criteria || [];
    
    tempLevels = {};
    crit.forEach(c => { if(c.max_points > 0) tempLevels[c.name] = att.levels[c.name] ?? null; });

    document.getElementById('modalGradeFio').innerText = fio;
    document.getElementById('modalGradeStatus').value = att.status || (att.absent ? "Н" : "");
    renderCriteriaTable();
    document.getElementById('gradeModal').style.display = 'flex';
}

function renderCriteriaTable() {
    const db = window.db;
    let crit = db.labs_meta[currentLab].criteria || [];
    let container = document.getElementById('criteriaContainer'); 
    if (!container) return;
    container.innerHTML = '';
    
    let total = 0, allGraded = true, displayIndex = 1;
    crit.forEach(c => {
        if (c.max_points === 0) {
            container.innerHTML += `<tr class="crit-header-row"><td colspan="4" class="crit-header-text">${c.name}</td></tr>`;
        } else {
            let lvl = tempLevels[c.name], max = c.max_points, half = Math.ceil(max / 2);
            if (lvl === null) allGraded = false;
            else { if(lvl===1) total += half; else if(lvl===2) total += max; }
            
            let btns = `<button class="btn-score ${lvl===0?'active-zero':''}" onclick="window.setLvl('${c.name}',0)">0</button>`;
            if (max > 1) btns += `<button class="btn-score ${lvl===1?'active-half':''}" onclick="window.setLvl('${c.name}',1)">${half}</button>`;
            btns += `<button class="btn-score ${lvl===2?'active-max':''}" onclick="window.setLvl('${c.name}',2)">${max}</button>`;

            container.innerHTML += `<tr><td>${displayIndex++}</td><td>${c.name}</td><td><div class="btn-group">${btns}</div></td><td>${max}</td></tr>`;
        }
    });
    document.getElementById('modalTotalScore').innerText = allGraded ? total : "Не оценено";
}

function setLvl(n, v) { tempLevels[n] = v; renderCriteriaTable(); }

function saveGrade() {
    let s = window.db.students[gradingFio];
    let att = s.labs[currentLab].attempts[currentAttempt];
    att.levels = { ...tempLevels };
    att.score = document.getElementById('modalTotalScore').innerText;
    window.saveDB();
    closeModal('gradeModal');
    renderLabTable();
}

window.openGlobalCard = function(fio) {
    const db = window.db;
    gradingFio = fio; 
    let s = db.students[fio];
    
    document.getElementById('modalGlobalFio').innerText = fio;
    // Заодно починили вывод группы студента в карточке!
    document.getElementById('modalGlobalGroup').innerText = s.group || '—'; 

    let html = '';
    for(let i=1; i<=10; i++) {
        let lab = s.labs[i];
        
        // 1. Рисуем 4 инпута для оценок
        let inputsHtml = [0,1,2,3].map(aIdx => {
            let att = lab.attempts[aIdx];
            let val = att.score || att.legacy_score || "";
            return `<input type="text" id="glab_${i}_${aIdx}" value="${val}" placeholder="—" style="width: 100%; text-align:center;" onchange="window.saveGlobalCard()">`;
        }).join('');

        // 2. Достаем замечания (склеиваем их через запятую, если они есть)
        let remarks = lab.remarks ? lab.remarks.join(', ') : '';

        // 3. Строим строку на жесткой сетке (Grid), чтобы идеально совпадало с шапкой
        html += `
        <div style="display: grid; grid-template-columns: 30px 65px 65px 65px 65px 1fr; gap: 12px; align-items: center; margin-bottom: 8px;">
            <div style="font-weight:bold; color: var(--text-muted); font-size: 1.1em; padding-left: 5px;">${i}</div>
            ${inputsHtml}
            <input type="text" id="grem_${i}" value="${remarks}" placeholder="Введите замечание..." style="width: 100%;" onchange="window.saveGlobalCard()">
        </div>`;
    }
    document.getElementById('globalLabsContainer').innerHTML = html;
    document.getElementById('globalStudentModal').style.display = 'flex';
};

window.saveGlobalCard = function() {
    let s = window.db.students[gradingFio];
    for(let i=1; i<=10; i++) {
        // Сохраняем баллы
        for(let a=0; a<4; a++) {
            let val = document.getElementById(`glab_${i}_${a}`).value;
            s.labs[i].attempts[a].score = val;
        }
        
        // Сохраняем замечания
        let remVal = document.getElementById(`grem_${i}`).value;
        if (remVal.trim() !== '') {
            // Разбиваем по запятой и убираем лишние пробелы
            s.labs[i].remarks = remVal.split(',').map(r => r.trim()).filter(r => r !== '');
        } else {
            s.labs[i].remarks = [];
        }
    }
    window.saveDB();
};


function saveGlobalCard() {
    let s = window.db.students[gradingFio];
    for(let i=1; i<=10; i++) {
        for(let a=0; a<4; a++) {
            let val = document.getElementById(`glab_${i}_${a}`).value;
            s.labs[i].attempts[a].score = val;
        }
    }
    window.saveDB();
}

function renderExpelled() {
    const db = window.db;
    let c = document.getElementById('expelledContainer'); 
    if (!c) return;
    c.innerHTML = '';
    for(let fio in db.students) {
        if(db.students[fio].status === 'expelled') {
            c.innerHTML += `<div>${fio} <button onclick="window.restoreStudent('${fio}')">Восстановить</button></div>`;
        }
    }
}

function restoreStudent(fio) {
    window.db.students[fio].status = 'active';
    window.saveDB();
    renderExpelled();
}

// 6. ЭКСПОРТ В WINDOW
window.navTo = navTo;
window.openGradeModal = openGradeModal;
window.openGlobalCard = openGlobalCard;
window.saveGrade = saveGrade;
window.saveGlobalCard = saveGlobalCard;
window.setLvl = setLvl;
window.switchAttempt = switchAttempt;
window.closeModal = closeModal;
window.restoreStudent = restoreStudent;
window.renderLabTabs = renderLabTabs;
