// ГЛОБАЛЬНЫЕ НАСТРОЙКИ ПРИЛОЖЕНИЯ
window.PASS_THRESHOLD = 70; // Замени 3.5 на свой реальный проходной балл (например, 3, 4 или 70)

let currentNav = 'dashboard', currentLab = 1, currentAttempt = 0, currentGroup = null, gradingFio = null, tempLevels = {};

window.saveDB = function() {
    console.log("🔄 Старый код вызвал saveDB! Перехватываем и пускаем по новым рельсам...");
    if (typeof window.updateDb === 'function') {
        window.updateDb(window.db); // Обновляем стейт и перерисовываем Дашборд
    }
    if (typeof window.saveToServer === 'function') {
        window.saveToServer(window.db); // Отправляем в PostgreSQL
    }
};

// Навигация
function navTo(page, labNum = null) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(el => el.classList.remove('active'));
    document.getElementById('labTopInputs').style.display = 'none';

    if (page === 'dashboard') {
        document.getElementById('nav-dashboard').classList.add('active');
        document.getElementById('panel-dashboard').classList.add('active');
        document.getElementById('topbarTitle').innerText = "Дашборд (Общая сводка)";
        updateGroupFilters(); renderDashboard();
    } else if (page === 'expelled') {
        document.getElementById('nav-expelled').classList.add('active');
        document.getElementById('panel-expelled').classList.add('active');
        document.getElementById('topbarTitle').innerText = "Отчисленные";
        renderExpelled();
    } else if (page === 'import') {
        document.getElementById('nav-import').classList.add('active');
        document.getElementById('panel-import').classList.add('active');
        document.getElementById('topbarTitle').innerText = "Загрузка списков";
    } else if (page === 'reports') {
        document.getElementById('nav-reports').classList.add('active');
        document.getElementById('panel-reports').classList.add('active');
        document.getElementById('topbarTitle').innerText = "Отчёты и Графики";
        updateGroupFilters(); renderCharts(); // Функция находится в io.js
    } else if (page === 'settings') {
        document.getElementById('nav-settings').classList.add('active');
        document.getElementById('panel-settings').classList.add('active');
        document.getElementById('topbarTitle').innerText = "Настройки и Шаблоны";
        updateTemplateStatus(); // Функция находится в io.js
    } else if (page === 'lab') {
        currentLab = labNum;
        document.getElementById(`nav-lab-${labNum}`).classList.add('active');
        document.getElementById('panel-lab').classList.add('active');
        document.getElementById('topbarTitle').innerText = `ЛПР №${labNum}`;
        document.getElementById('labTopInputs').style.display = 'flex';
        document.getElementById('inpTopic').value = db.labs_meta[labNum].topic;
        document.getElementById('inpMonth').value = db.labs_meta[labNum].month;
        renderLabTabs();
    }
    currentNav = page;
}

// Глобальная карточка
function openGlobalCard(fio) {
    gradingFio = fio; let s = db.students[fio];
    document.getElementById('modalGlobalFio').innerText = fio; document.getElementById('modalGlobalGroup').innerText = s.group;
    let html = '';
    for(let i=1; i<=10; i++) {
        let lab = s.labs[i], maxScore = getStudentMaxScoreForLab(fio, i);
        let hasAttempt = lab.attempts.some(a => a.legacy_score || Object.keys(a.levels).length > 0 || a.absent || a.status);
        let bg = hasAttempt ? (maxScore >= 70 ? '#f0fdf4' : '#fef2f2') : 'transparent';
        let remHtml = lab.remarks.map(r => `<div class="rem-item"><span class="rem-text">${r}</span><button onclick="this.parentElement.remove()">×</button></div>`).join('');
        
        let inputsHtml = [0,1,2,3].map(aIdx => {
            let att = lab.attempts[aIdx], val = att.legacy_score;
            let st = att.status || (att.absent ? "Н" : "");
            let crit = db.labs_meta[i].criteria;
            
            if(st) {
                val = st;
            } else if(val === undefined || val === null || val === "") {
                let isFullyAssessed = false;
                if (crit && crit.length > 0) {
                    let gradedCount = 0;
                    let gradableCount = 0;
                    crit.forEach(c => { 
                        if (c.max_points > 0) {
                            gradableCount++;
                            if (att.levels[c.name] !== undefined) gradedCount++; 
                        }
                    });
                    if (gradableCount > 0 && gradedCount === gradableCount) isFullyAssessed = true;
                    else if (gradableCount === 0 && crit.length > 0) isFullyAssessed = false;
                } else if (Object.keys(att.levels).length > 0) {
                    isFullyAssessed = true;
                }
                
                if (isFullyAssessed) {
                    let calc = calcScore(att, crit);
                    val = (calc > 0) ? calc : '';
                } else {
                    val = ''; 
                }
            }
            return `<input type="text" id="glab_${i}_${aIdx}" value="${val}" placeholder="-">`;
        }).join('');

        html += `<div class="lab-row" style="background:${bg};"><div style="width:30px; font-weight:bold;">${i}</div>${inputsHtml}<div class="remarks-box"><div id="grem_${i}">${remHtml}</div><button class="add-rem-btn" onclick="addGlobalRemark(${i})">+ Замечание</button></div></div>`;
    }
    document.getElementById('globalLabsContainer').innerHTML = html; document.getElementById('globalStudentModal').style.display = 'flex';
}

function addGlobalRemark(labNum) {
    let text = prompt("Замечание:"); if (!text || !text.trim()) return;
    
    // Получаем сегодняшнюю дату в формате ДД.ММ.ГГГГ
    let dateStr = new Date().toLocaleDateString('ru-RU');
    
    let div = document.createElement('div'); div.className = 'rem-item';
    div.innerHTML = `<span class="rem-text">${dateStr} - ${text.trim()}</span><button onclick="this.parentElement.remove()">×</button>`;
    document.getElementById(`grem_${labNum}`).appendChild(div);
}

function saveGlobalCard() {
    let s = db.students[gradingFio];
    for(let i=1; i<=10; i++) {
        for(let a=0; a<4; a++) {
            let val = document.getElementById(`glab_${i}_${a}`).value.trim().toUpperCase();
            let att = s.labs[i].attempts[a];
            if(val === 'Н' || val === 'Б' || val === 'К') { 
                att.status = val; 
                att.absent = (val === 'Н'); 
                att.legacy_score = ''; 
            } else { 
                att.status = '';
                att.absent = false; 
                att.legacy_score = val; 
            }
        }
        s.labs[i].remarks = Array.from(document.querySelectorAll(`#grem_${i} .rem-text`)).map(e => e.innerText);
    }
    saveDB(); closeModal('globalStudentModal'); renderDashboard();
}

function expelStudentFromCard() {
    if(confirm(`Отчислить ${gradingFio}?`)) { db.students[gradingFio].status = 'expelled'; saveDB(); closeModal('globalStudentModal'); renderDashboard(); }
}

function renderExpelled() {
    let c = document.getElementById('expelledContainer'); c.innerHTML = ''; let groups = {};
    for(let fio in db.students) { if(db.students[fio].status === 'expelled') { let g = db.students[fio].group; if(!groups[g]) groups[g]=[]; groups[g].push(fio); } }
    if(Object.keys(groups).length===0) { c.innerHTML = "<p>Нет отчисленных</p>"; return; }
    for(let g in groups) {
        let ul = `<h3>${g}</h3><ul>`;
        groups[g].forEach(fio => ul += `<li>${fio} - <button class="btn btn-outline" style="padding:2px 5px; font-size:12px;" onclick="restoreStudent('${fio}')">Восстановить</button></li>`);
        c.innerHTML += ul + "</ul>";
    }
}

function restoreStudent(fio) { db.students[fio].status = 'active'; saveDB(); renderExpelled(); }

// Лабораторные
function saveLabMeta() { db.labs_meta[currentLab].topic = document.getElementById('inpTopic').value; db.labs_meta[currentLab].month = document.getElementById('inpMonth').value; saveDB(); }

function switchAttempt(idx) { currentAttempt = idx; document.querySelectorAll('#attemptTabs .tab').forEach((t, i) => t.classList.toggle('active', i === idx)); renderLabTabs(); }

function renderLabTabs() {
    let groups = new Set(); for(let fio in db.students) if(db.students[fio].status==='active') groups.add(db.students[fio].group);
    let gArr = Array.from(groups).sort(), c = document.getElementById('groupTabs'); c.innerHTML = '';
    if(gArr.length===0) { document.getElementById('labTbody').innerHTML='<tr><td colspan="3">Нет студентов</td></tr>'; return; }
    if(!gArr.includes(currentGroup)) currentGroup = gArr[0];
    gArr.forEach(g => {
        let div = document.createElement('div'); div.className = `sub-tab ${g===currentGroup?'active':''}`; div.innerText = g; div.onclick = () => { currentGroup = g; renderLabTabs(); }; c.appendChild(div);
    }); renderLabTable();
}

function renderLabTable() {
    let tbody = document.getElementById('labTbody'); tbody.innerHTML = '';
    let criteria = db.labs_meta[currentLab].criteria;
    let hasS = false;
    for(let fio in db.students) {
        let s = db.students[fio]; if(s.group !== currentGroup || !shouldShowInLabAttempt(fio, currentLab, currentAttempt)) continue;
        hasS = true; let att = s.labs[currentLab].attempts[currentAttempt];
        
        let st = att.status || (att.absent ? "Н" : "");
        
        // --- ПРОВЕРКА: Все ли критерии оценены (исключая заголовки)? ---
        let isFullyAssessed = false;
        
        if (st || att.legacy_score) {
            isFullyAssessed = true; // Если есть статус или старый балл
        } else if (criteria && criteria.length > 0) {
            let gradedCount = 0;
            let gradableCount = 0;
            criteria.forEach(c => {
                if (c.max_points > 0) {
                    gradableCount++;
                    if (att.levels[c.name] !== undefined && att.levels[c.name] !== null) gradedCount++;
                }
            });
            if (gradableCount > 0 && gradedCount === gradableCount) isFullyAssessed = true;
            else if (gradableCount === 0) isFullyAssessed = true; // Только заголовки?
        } else if (Object.keys(att.levels).length > 0) {
            isFullyAssessed = true;
        }

        let score = calcScore(att, criteria), stHtml = "";
        
        if(!isFullyAssessed) {
            stHtml = '<span style="color:#94a3b8;">Не оценено</span>';
        } else if(st === 'Н') {
            stHtml = '<span style="color:var(--fail); font-weight:bold;">Н</span>';
        } else if(st === 'Б') {
            stHtml = '<span style="color:#f59e0b; font-weight:bold;">Б</span>';
        } else if(st === 'К') {
            stHtml = '<span style="color:#3b82f6; font-weight:bold;">К</span>';
        } else if(score >= PASS_THRESHOLD) {
            stHtml = '<span style="color:var(--pass); font-weight:bold;">Сдал</span>';
        } else {
            stHtml = '<span style="color:var(--fail); font-weight:bold;">Не сдал</span>';
        }
        
        let displayVal = (st === 'Н' || st === 'Б' || st === 'К') ? st : (isFullyAssessed ? score : "—");
        
        tbody.innerHTML += `<tr class="clickable-row" onclick="openGradeModal('${fio}')"><td>${fio}</td><td style="text-align:center; font-weight:bold;">${displayVal}</td><td style="text-align:center;">${stHtml}</td></tr>`;
    }
    if(!hasS) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b;">Нет студентов в этом шлюзе</td></tr>`;
}

// Окно оценки
function openGradeModal(fio) {
    gradingFio = fio;
    
    // Получаем все данные по ЛПР (включая замечания)
    let studentLab = db.students[fio].labs[currentLab];
    let att = studentLab.attempts[currentAttempt];
    let criteria = db.labs_meta[currentLab].criteria;
    let newLevels = {};
    
    if (criteria && criteria.length > 0) {
        criteria.forEach(c => {
            // Инициализируем только пункты с весом. Заголовки (max_points == 0) игнорируем
            if (c.max_points > 0) {
                newLevels[c.name] = (att.levels[c.name] !== undefined) ? att.levels[c.name] : null; 
            }
        });
    } else {
        newLevels = { ...att.levels };
    }
    tempLevels = newLevels;
    
    document.getElementById('modalGradeFio').innerText = fio;
    document.getElementById('modalGradeAttempt').innerText = `${ATTEMPT_NAMES[currentAttempt]}`;
    
    let st = att.status || (att.absent ? "Н" : "");
    document.getElementById('modalGradeStatus').value = st;

    // --- ВЫВОД ЗАМЕЧАНИЙ В ОКНО ОЦЕНКИ ---
    let remarksContainer = document.getElementById('modalGradeRemarksContainer');
    let remarksList = document.getElementById('modalGradeRemarksList');
    
    if (studentLab.remarks && studentLab.remarks.length > 0) {
        remarksList.innerHTML = studentLab.remarks.map(r => `&bull; ${r}`).join('<br>');
        remarksContainer.style.display = 'block';
    } else {
        remarksContainer.style.display = 'none';
        remarksList.innerHTML = '';
    }
    // ------------------------------------
    
    renderCriteriaTable();
    document.getElementById('gradeModal').style.display = 'flex';
}

function renderCriteriaTable() {
    let criteria = db.labs_meta[currentLab].criteria;
    let st = document.getElementById('modalGradeStatus').value;
    let absent = (st === 'Н' || st === 'Б' || st === 'К');
    
    let c = document.getElementById('criteriaContainer'); c.innerHTML = '';
    if(criteria.length === 0) { c.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--fail);">Загрузите критерии из Excel!</td></tr>`; }
    
    let allGraded = true;
    let currentTempScore = 0;
    let displayIndex = 1; // Индекс только для оцениваемых критериев
    let hasGradable = false;

    criteria.forEach((cr) => {
        let max = cr.max_points;

        if (max === 0) {
            // РЕНДЕР ЗАГОЛОВКА
            c.innerHTML += `<tr style="background: #e2e8f0;"><td colspan="4" style="text-align:center; font-weight:bold; color: #334155; padding: 10px;">${cr.name}</td></tr>`;
        } else {
            // РЕНДЕР ОБЫЧНОГО КРИТЕРИЯ С КНОПКАМИ
            hasGradable = true;
            let half = Math.ceil(max/2);
            let lvl = tempLevels[cr.name]; 
            
            if(absent) lvl = 0;

            if (lvl === null || lvl === undefined) {
                allGraded = false; // Нашли неоцененный пункт
            } else if (!absent) {
                if (lvl === 1) currentTempScore += half;
                else if (lvl === 2) currentTempScore += max;
            }

            c.innerHTML += `<tr><td style="text-align:center;">${displayIndex++}</td><td style="${absent?'color:#94a3b8;':''}">${cr.name}</td><td><div class="btn-group">
                <button class="btn-score ${lvl===0 && !absent?'active-zero':''}" onclick="setLvl('${cr.name}',0)" ${absent?'disabled':''}>0</button>
                ${half<max ? `<button class="btn-score ${lvl===1 && !absent?'active-half':''}" onclick="setLvl('${cr.name}',1)" ${absent?'disabled':''}>${half}</button>` : ''}
                <button class="btn-score ${lvl===2 && !absent?'active-max':''}" onclick="setLvl('${cr.name}',2)" ${absent?'disabled':''}>${max}</button>
            </div></td><td style="text-align:center;">${max}</td></tr>`;
        }
    });
    
    if (!hasGradable) allGraded = true; // Заглушка, если критерии есть, но они все заголовки

    // Обновление итоговой оценки
    let totalScoreEl = document.getElementById('modalTotalScore');
    if (absent) {
        totalScoreEl.innerText = `0 (${st})`;
    } else {
        if (allGraded && criteria.length > 0) {
            totalScoreEl.innerText = currentTempScore;
        } else if (criteria.length === 0) {
            totalScoreEl.innerText = "0";
        } else {
            totalScoreEl.innerText = "Не оценено";
        }
    }
}

function setLvl(n, v) { tempLevels[n]=v; renderCriteriaTable(); }

function saveGrade() {
    let att = db.students[gradingFio].labs[currentLab].attempts[currentAttempt];
    let criteria = db.labs_meta[currentLab].criteria;
    
    let st = document.getElementById('modalGradeStatus').value;
    att.status = st;
    att.absent = (st === 'Н');
    
    att.levels = {};
    // Сохраняем только те критерии, по которым реально кликнули (не null и не заголовки)
    for (let key in tempLevels) {
        if (tempLevels[key] !== null && tempLevels[key] !== undefined) {
            att.levels[key] = tempLevels[key];
        }
    }
    
    att.legacy_score = ""; 
    
    // Проверяем, полностью ли оценена работа, перед тем как возможно отчислить
    let isFullyAssessed = false;
    if (st) {
        isFullyAssessed = true;
    } else if (criteria && criteria.length > 0) {
        let gradedCount = 0;
        let gradableCount = 0;
        criteria.forEach(c => {
            if (c.max_points > 0) {
                gradableCount++;
                if (att.levels[c.name] !== undefined) gradedCount++;
            }
        });
        if (gradableCount > 0 && gradedCount === gradableCount) isFullyAssessed = true;
        else if (gradableCount === 0) isFullyAssessed = true;
    }
    
    // Отчисляем только в случае, если попытка оценена ЦЕЛИКОМ, это 4-я сдача и балл ниже порога
    if (isFullyAssessed) {
        let sc = calcScore(att, criteria);
        if (currentAttempt === 3 && sc < PASS_THRESHOLD && !att.absent && !att.status) { 
            db.students[gradingFio].status = 'expelled'; 
            alert("Не набрал 70 баллов на 4 попытке. Отчислен."); 
        }
    }
    
    saveDB(); closeModal('gradeModal'); renderLabTabs();
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }
