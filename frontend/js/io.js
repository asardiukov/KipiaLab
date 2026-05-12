// --- ОТЧЕТЫ И ГРАФИКИ ---
function exportLprCSV() {
    let lNum = document.getElementById('exportLprSelect').value, csv = "ФИО;Группа;Осн. сдача;Пересдача;Комиссия;По характеристике;Макс. балл;Замечания\n";
    let getVal = (att, crit) => {
        let st = att.status || (att.absent ? "Н" : "");
        return st ? st : calcScore(att, crit);
    };
    for(let fio in db.students) {
        let s = db.students[fio]; if(s.status !== 'active') continue;
        let a = s.labs[lNum].attempts, r = s.labs[lNum].remarks.join(" | "), max = getStudentMaxScoreForLab(fio, lNum);
        let s0 = getVal(a[0], db.labs_meta[lNum].criteria), s1 = getVal(a[1], db.labs_meta[lNum].criteria), s2 = getVal(a[2], db.labs_meta[lNum].criteria), s3 = getVal(a[3], db.labs_meta[lNum].criteria);
        csv += `${fio};${s.group};${s0||""};${s1||""};${s2||""};${s3||""};${max};"${r}"\n`;
    }
    downloadCSV(csv, `Отчет_ЛПР_${lNum}.csv`);
}

function exportGroupCSV() {
    let g = document.getElementById('exportGroupSelect').value, csv = "ФИО;Статус;Группа;ЛПР 1;ЛПР 2;ЛПР 3;ЛПР 4;ЛПР 5;ЛПР 6;ЛПР 7;ЛПР 8;ЛПР 9;ЛПР 10\n";
    for(let fio in db.students) {
        let s = db.students[fio]; if(g !== 'all' && s.group !== g) continue;
        let row = `${fio};${s.status==='active'?'Активен':'Отчислен'};${s.group}`;
        for(let i=1; i<=10; i++) row += `;${getStudentMaxScoreForLab(fio, i)}`;
        csv += row + "\n";
    }
    downloadCSV(csv, g === 'all' ? 'Отчет_Все_Группы.csv' : `Отчет_Группа_${g}.csv`);
}

function downloadCSV(csv, name) {
    let link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = name; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

window.printStudentReport = function(passedFio) {
    // 1. Ищем ФИО. Если аргумент - строка, берем его. 
    // Если нет (например, клик без аргументов) - берем глобальную переменную gradingFio
    let rawFio = (typeof passedFio === 'string') ? passedFio : window.gradingFio;
    
    // Подстраховка, если переменная не прокинута в window
    if (!rawFio && typeof gradingFio !== 'undefined') {
        rawFio = gradingFio;
    }

    // Если всё равно пусто
    if (!rawFio) {
        alert("Ошибка: Непонятно, для кого делать отчет. ФИО не найдено!");
        return;
    }

    const fio = rawFio.trim(); 
    const reportText = getStudentTextData(fio);

    if (reportText.includes("не найден")) {
        alert("Ошибка: Студент '" + fio + "' не найден в базе!");
        return;
    }

    // --- СОЗДАЕМ ВСПЛЫВАЮЩЕЕ ОКНО (OVERLAY) ---
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const modal = document.createElement('div');
    modal.style.backgroundColor = 'var(--bg-color, #2b2b2b)';
    modal.style.color = 'var(--text-color, #eee)';
    modal.style.padding = '20px';
    modal.style.borderRadius = '8px';
    modal.style.width = '90%';
    modal.style.maxWidth = '600px';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '15px';

    const title = document.createElement('h3');
    title.innerText = 'Отчет: ' + fio;
    title.style.margin = '0';
    title.style.borderBottom = '1px solid #555';
    title.style.paddingBottom = '10px';

    const textarea = document.createElement('textarea');
    textarea.value = reportText;
    textarea.readOnly = true;
    textarea.style.width = '100%';
    textarea.style.height = '300px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.backgroundColor = '#1e1e1e';
    textarea.style.color = '#00ffcc';
    textarea.style.border = '1px solid #444';
    textarea.style.borderRadius = '4px';
    textarea.style.padding = '10px';
    textarea.style.resize = 'vertical';

    const btnPanel = document.createElement('div');
    btnPanel.style.display = 'flex';
    btnPanel.style.justifyContent = 'flex-end';
    btnPanel.style.gap = '10px';

    const copyBtn = document.createElement('button');
    copyBtn.innerText = '📋 Скопировать текст';
    copyBtn.className = 'btn btn-primary'; 
    copyBtn.style.padding = '8px 16px';
    copyBtn.onclick = function() {
        navigator.clipboard.writeText(reportText).then(() => {
            copyBtn.innerText = '✅ Скопировано!';
            copyBtn.style.backgroundColor = 'var(--success, #28a745)';
            setTimeout(() => {
                copyBtn.innerText = '📋 Скопировать текст';
                copyBtn.style.backgroundColor = '';
            }, 2000);
        });
    };

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Закрыть';
    closeBtn.className = 'btn btn-outline';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.color = '#fff'; // Делаем текст белым
    closeBtn.style.borderColor = '#888'; // Делаем рамку светло-серой
    closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#444'; // Эффект при наведении
    closeBtn.onmouseout = () => closeBtn.style.backgroundColor = 'transparent';
    closeBtn.onclick = function() {
        document.body.removeChild(overlay);
    };

    btnPanel.appendChild(copyBtn);
    btnPanel.appendChild(closeBtn);
    
    modal.appendChild(title);
    modal.appendChild(textarea);
    modal.appendChild(btnPanel);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
};

// --- НАСТРОЙКИ, ИМПОРТ, ЭКСПОРТ ---
function importTemplate(e, type) {
    const reader = new FileReader(); reader.onload = function(event) {
        let b64 = event.target.result.split(',')[1];
        if (type === 'vedomost') db.tpl_vedomost = b64; if (type === 'protocol') db.tpl_protocol = b64;
        saveDB(); updateTemplateStatus(); alert("Шаблон загружен!"); e.target.value = '';
    }; reader.readAsDataURL(e.target.files[0]);
}
function updateTemplateStatus() {
    const db = window.db; // <--- ДОБАВЬ ЭТУ СТРОКУ
    if (!db) return;      // <--- Защита
    if(document.getElementById('statusVedomost')) { document.getElementById('statusVedomost').innerText = db.tpl_vedomost ? "✅ Загружен" : "❌ Нет шаблона"; }
    if(document.getElementById('statusProtocol')) { document.getElementById('statusProtocol').innerText = db.tpl_protocol ? "✅ Загружен" : "❌ Нет шаблона"; }
}

function exportDB() {
    const dl = document.createElement('a'); dl.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)));
    dl.setAttribute("download", `kipia_db_backup_${new Date().toLocaleDateString('ru-RU')}.json`); dl.click();
}

function importDB(e) {
    const reader = new FileReader(); 
    reader.onload = function(event) {
        let parsed;
        
        // 1. Безопасно парсим JSON (изолированный try-catch только для парсинга)
        try {
            parsed = JSON.parse(event.target.result);
        } catch(err) { 
            console.error("❌ Ошибка парсинга JSON:", err);
            alert("Файл поврежден или не является валидным JSON!"); 
            return; // Прерываем выполнение
        }

        // 2. Если парсинг прошел успешно, обновляем архитектуру
        try {
            // Обновляем State и триггерим db-ready (Дашборд перерисуется сам!)
            if (typeof window.updateDb === 'function') {
                window.updateDb(parsed); 
            } else {
                // Фолбэк на всякий случай
                window.db = parsed;
                window.dispatchEvent(new Event('db-ready'));
            }

            // 3. Отправляем восстановленную базу в PostgreSQL
            if (typeof window.saveToServer === 'function') {
                window.saveToServer(parsed);
            }

            // Очищаем input, чтобы можно было загрузить тот же файл еще раз, если нужно
            e.target.value = '';
            
            alert("✅ База данных успешно восстановлена и отправлена на сервер!");
            
        } catch(err) {
            console.error("❌ Ошибка при применении базы:", err);
            alert("Ошибка при сохранении базы. Смотри консоль.");
        }
    }; 
    
    // Запускаем чтение файла
    if (e.target.files[0]) {
        reader.readAsText(e.target.files[0]);
    }
}

function initNewStudent(fio, group) {
    if(!db.students[fio]) {
        db.students[fio] = { group: group, status: 'active', labs: {} };
        for(let i=1; i<=10; i++) db.students[fio].labs[i] = { attempts: [{levels:{}, absent:false},{levels:{}, absent:false},{levels:{}, absent:false},{levels:{}, absent:false}], remarks: [] };
    }
}
function importStudentsFile(e) {
    const reader = new FileReader(); reader.onload = function(event) {
        try {
            const workbook = XLSX.read(new Uint8Array(event.target.result), {type: 'array'}), json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {defval: ""});
            let c=0; json.forEach(row => {
                let keys = Object.keys(row).reduce((acc, k) => { acc[k.toLowerCase()] = k; return acc; }, {});
                let fio = cleanStr(row[keys['фио']||keys['студент']]), grp = cleanStr(row[keys['группа']]);
                if(fio && grp && !db.students[fio]) { initNewStudent(fio, grp); c++; }
            }); saveDB(); alert(`Загружено: ${c}`);
        } catch(err) { alert("Ошибка Excel"); } e.target.value = '';
    }; reader.readAsArrayBuffer(e.target.files[0]);
}
function importStudentsText() {
    let lines = document.getElementById('importText').value.split('\n'), c=0;
    lines.forEach(l => {
        let pts = l.trim().split(/[\t\s]{2,}/);
        if(pts.length >= 2) { let fio=pts[0].trim(), grp=pts[1].trim(); if(fio && grp && !db.students[fio]) { initNewStudent(fio, grp); c++; } }
    }); saveDB(); document.getElementById('importText').value=''; alert(`Загружено: ${c}`);
}

function importCriteria(e) {
    const reader = new FileReader(); reader.onload = function(event) {
        try {
            const wb = XLSX.read(new Uint8Array(event.target.result), {type: 'array'}), json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval: ""});
            let newCrit = []; json.forEach(row => {
                let keys = Object.keys(row).reduce((acc, k) => { acc[cleanStr(k).toLowerCase()] = k; return acc; }, {});
                let name = cleanStr(row[keys['критерий']||keys['название']]), max = parseFloat(row[keys['макс']||keys['макс балл']]) || 0;
                if(name && !newCrit.find(c=>c.name===name)) newCrit.push({name:name, max_points:max});
            });
            if(newCrit.length>0) { db.labs_meta[currentLab].criteria = newCrit; saveDB(); renderLabTabs(); alert(`Загружено критериев: ${newCrit.length}`); } else alert("Колонки не найдены");
        } catch(err) { alert("Ошибка файла"); } e.target.value = '';
    }; reader.readAsArrayBuffer(e.target.files[0]);
}

function exportGroupGrades() {
    if (!currentGroup) { alert("Сначала выберите группу."); return; }
    let studentsList = [];
    for (let fio in db.students) {
        let s = db.students[fio];
        if (s.status === 'active' && s.group === currentGroup) {
            let attempt = s.labs[currentLab].attempts[currentAttempt];
            studentsList.push({
                fio: fio,
                absent: attempt.absent,
                status: attempt.status || "",
                levels: { ...attempt.levels },
                legacy_score: attempt.legacy_score !== undefined ? attempt.legacy_score : ""
            });
        }
    }
    if (studentsList.length === 0) { alert("Нет активных студентов."); return; }
    let exportData = {
        version: 1,
        timestamp: new Date().toISOString(),
        labNumber: currentLab,
        attemptIndex: currentAttempt,
        groupName: currentGroup,
        criteria: db.labs_meta[currentLab].criteria,
        students: studentsList
    };
    let jsonStr = JSON.stringify(exportData, null, 2);
    let dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    let fileName = `grades_LPR${currentLab}_${currentGroup}_attempt${currentAttempt+1}_${dateStr}.json`;
    let blob = new Blob([jsonStr], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
}

function importGroupGrades() {
    if (!currentGroup) { alert("Сначала выберите группу."); return; }
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        let file = e.target.files[0];
        if (!file) return;
        let reader = new FileReader();
        reader.onload = (ev) => {
            try {
                let importData = JSON.parse(ev.target.result);
                if (importData.version !== 1) if (!confirm("Версия файла не 1. Продолжить?")) return;
                if (importData.labNumber !== currentLab) if (!confirm(`Файл для ЛПР №${importData.labNumber}, текущая ЛПР №${currentLab}. Продолжить?`)) return;
                if (importData.attemptIndex !== currentAttempt) if (!confirm(`Файл для попытки "${ATTEMPT_NAMES[importData.attemptIndex]}", текущая "${ATTEMPT_NAMES[currentAttempt]}". Продолжить?`)) return;
                if (importData.groupName !== currentGroup) if (!confirm(`Файл для группы "${importData.groupName}", текущая группа "${currentGroup}". Продолжить?`)) return;
                let currentCriteria = db.labs_meta[currentLab].criteria;
                let importCriteria = importData.criteria || [];
                if (currentCriteria.length !== importCriteria.length) {
                    if (!confirm("Количество критериев не совпадает. Продолжить?")) return;
                } else {
                    let mismatch = false;
                    for (let i = 0; i < currentCriteria.length; i++) {
                        if (currentCriteria[i].name !== importCriteria[i].name || currentCriteria[i].max_points !== importCriteria[i].max_points) {
                            mismatch = true;
                            break;
                        }
                    }
                    if (mismatch && !confirm("Критерии отличаются от текущих. Продолжить?")) return;
                }
                let existingMap = new Map();
                for (let fio in db.students) {
                    let s = db.students[fio];
                    if (s.status === 'active' && s.group === currentGroup) existingMap.set(fio, s);
                }
                let previewRows = [];
                for (let imp of importData.students) {
                    let fio = imp.fio;
                    let existing = existingMap.get(fio);
                    let currentState = existing ? getStateDescription(fio, currentLab, currentAttempt, db.labs_meta[currentLab].criteria) : "Студент не найден";
                    let newState = formatGradeFromImport(imp, db.labs_meta[currentLab].criteria);
                    previewRows.push({
                        fio: fio,
                        exists: !!existing,
                        currentState: currentState,
                        newState: newState,
                        importData: imp,
                        selected: !!existing
                    });
                }
                importPreviewData = { rows: previewRows, importData: importData };
                renderImportPreview(importPreviewData);
                document.getElementById('importPreviewModal').style.display = 'flex';
            } catch(err) { alert("Ошибка чтения JSON: " + err.message); }
        };
        reader.readAsText(file);
    };
    input.click();
}

function renderImportPreview(previewData) {
    let tbody = document.getElementById('importPreviewTable').querySelector('tbody');
    tbody.innerHTML = '';
    let messageDiv = document.getElementById('importPreviewMessage');
    let notFoundCount = previewData.rows.filter(r => !r.exists).length;
    if (notFoundCount > 0) messageDiv.innerHTML = `Внимание: ${notFoundCount} студент(ов) не найдены в текущей группе. Они будут пропущены при импорте.`;
    else messageDiv.innerHTML = '';
    for (let row of previewData.rows) {
        let tr = document.createElement('tr');
        let isDifferent = row.currentState !== row.newState;
        if (isDifferent) tr.classList.add('import-diff-row');
        let cbTd = document.createElement('td');
        cbTd.className = 'selected-checkbox';
        let cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = row.selected;
        cb.disabled = !row.exists;
        cbTd.appendChild(cb);
        tr.appendChild(cbTd);
        let fioTd = document.createElement('td');
        fioTd.innerText = row.fio;
        tr.appendChild(fioTd);
        let curTd = document.createElement('td');
        curTd.innerText = row.currentState;
        tr.appendChild(curTd);
        let newTd = document.createElement('td');
        newTd.innerText = row.newState;
        if (isDifferent) newTd.classList.add('import-diff-cell');
        tr.appendChild(newTd);
        tr.setAttribute('data-fio', row.fio);
        tr.setAttribute('data-exists', row.exists);
        tr.setAttribute('data-import-index', previewData.rows.indexOf(row));
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            let fio = tr.getAttribute('data-fio');
            let importDataRow = row.importData;
            showCriteriaComparison(fio, importDataRow);
        });
        tbody.appendChild(tr);
    }
    let selectAll = document.getElementById('selectAllPreview');
    selectAll.checked = false;
    selectAll.onchange = (e) => {
        let checked = e.target.checked;
        document.querySelectorAll('#importPreviewTable tbody tr').forEach(tr => {
            let cb = tr.querySelector('input[type="checkbox"]');
            if (cb && !cb.disabled) cb.checked = checked;
        });
    };
}

function showCriteriaComparison(fio, importStudent) {
    let currentAttemptData = db.students[fio].labs[currentLab].attempts[currentAttempt];
    let criteria = db.labs_meta[currentLab].criteria;
    if (!criteria || criteria.length === 0) { alert("Критерии не загружены."); return; }
    let tbody = document.getElementById('criteriaCompareTable').querySelector('tbody');
    tbody.innerHTML = '';
    document.getElementById('compareModalFio').innerText = fio;
    let warningDiv = document.getElementById('compareModalWarning');
    warningDiv.innerHTML = '';
    let matchCount = 0;
    let totalCriteria = criteria.length;
    let importLevels = importStudent.levels || {};
    let importAbsent = importStudent.absent || false;
    let importStatus = importStudent.status || (importAbsent ? "Н" : "");
    let importLegacy = importStudent.legacy_score && importStudent.legacy_score !== "" ? importStudent.legacy_score : null;
    let currentLegacy = currentAttemptData.legacy_score && currentAttemptData.legacy_score !== "" ? currentAttemptData.legacy_score : null;
    
    let useLegacyComparison = (currentLegacy !== null) || (importLegacy !== null);
    if (useLegacyComparison) {
        warningDiv.innerHTML = '<strong>Внимание:</strong> Одна из попыток использует устаревший общий балл (legacy_score). Детальное сравнение по критериям невозможно. Показаны итоговые баллы.';
        let currentTotal = calcScore(currentAttemptData, criteria);
        let importTotal = 0;
        if (importLegacy !== null) importTotal = parseFloat(importLegacy);
        else if (!importStatus) {
            criteria.forEach(c => {
                let lvl = importLevels[c.name] || 0;
                if (lvl === 1) importTotal += Math.ceil(c.max_points / 2);
                else if (lvl === 2) importTotal += c.max_points;
            });
        }
        let curSt = currentAttemptData.status || (currentAttemptData.absent ? "Н" : "");
        let currentDisp = curSt ? curSt : currentTotal;
        let importDisp = importStatus ? importStatus : importTotal;
        let match = (currentDisp === importDisp);
        tbody.innerHTML = `<tr class="${match ? 'match-row' : 'mismatch-row'}"><td colspan="2"><strong>Общий балл</strong></td><td><strong>${currentDisp}</strong></td><td><strong>${importDisp}</strong></td><td>${match ? '✓' : '✗'}</td></tr>`;
        document.getElementById('compareModalSummary').innerHTML = `Совпадение: ${match ? 'Да' : 'Нет'}`;
        document.getElementById('criteriaCompareModal').style.display = 'flex';
        return;
    }
    let hasExtraCriteria = false;
    let curSt = currentAttemptData.status || (currentAttemptData.absent ? "Н" : "");
    
    for (let crit of criteria) {
        let max = crit.max_points;
        let currentPoints = 0;
        let currentDisplay = "—";
        if (curSt === "Н" || curSt === "Б" || curSt === "К") {
            currentDisplay = curSt;
            currentPoints = null;
        } else {
            let lvl = currentAttemptData.levels[crit.name];
            if (lvl === 1) { currentPoints = Math.ceil(max / 2); currentDisplay = currentPoints; }
            else if (lvl === 2) { currentPoints = max; currentDisplay = currentPoints; }
            else if (lvl === 0) { currentPoints = 0; currentDisplay = "0"; }
            else { currentDisplay = "—"; currentPoints = null; }
        }
        let importPoints = 0;
        let importDisplay = "—";
        if (importStatus === "Н" || importStatus === "Б" || importStatus === "К") {
            importDisplay = importStatus;
            importPoints = null;
        } else {
            let lvl = importLevels[crit.name];
            if (lvl === 1) { importPoints = Math.ceil(max / 2); importDisplay = importPoints; }
            else if (lvl === 2) { importPoints = max; importDisplay = importPoints; }
            else if (lvl === 0) { importPoints = 0; importDisplay = "0"; }
            else { importDisplay = "— (нет в импорте)"; importPoints = null; }
        }
        let isMatch = (currentDisplay === importDisplay && currentPoints === importPoints);
        if (isMatch) matchCount++;
        
        let tr = document.createElement('tr');
        if (!isMatch) tr.classList.add('mismatch-row');
        else tr.classList.add('match-row');
        
        tr.innerHTML = `<td>${crit.name}</td><td>${currentDisplay}</td><td>${importDisplay}</td><td>${isMatch ? '✓' : '✗'}</td>`;
        tbody.appendChild(tr);
    }
    
    hasExtraCriteria = false;
    for (let impCritName in importLevels) {
        if (!criteria.some(c => c.name === impCritName)) { 
            hasExtraCriteria = true; 
            break; 
        }
    }
    
    if (hasExtraCriteria) {
        warningDiv.innerHTML = '<strong>Внимание:</strong> Импортируемый файл содержит критерии, отсутствующие в текущей ЛПР. Они будут проигнорированы.';
    }
    
    document.getElementById('compareModalSummary').innerHTML = `Совпало критериев: ${matchCount} из ${totalCriteria}`;
    document.getElementById('criteriaCompareModal').style.display = 'flex';
}

function applyImportPreview() {
    if (!importPreviewData) return;
    let rows = document.querySelectorAll('#importPreviewTable tbody tr');
    let updatedCount = 0;
    for (let i = 0; i < rows.length; i++) {
        let tr = rows[i];
        let cb = tr.querySelector('input[type="checkbox"]');
        if (!cb || !cb.checked) continue;
        let fio = tr.getAttribute('data-fio');
        let exists = tr.getAttribute('data-exists') === 'true';
        if (!exists) continue;
        let importRow = importPreviewData.rows.find(r => r.fio === fio);
        if (!importRow) continue;
        let student = db.students[fio];
        if (!student || student.status !== 'active') continue;
        let att = student.labs[currentLab].attempts[currentAttempt];
        let imp = importRow.importData;
        
        att.status = imp.status || (imp.absent ? "Н" : "");
        att.absent = (att.status === "Н");
        att.levels = imp.levels ? { ...imp.levels } : {};
        att.legacy_score = (imp.legacy_score !== undefined && imp.legacy_score !== null && imp.legacy_score !== "") ? imp.legacy_score : "";
        
        let criteria = db.labs_meta[currentLab].criteria;
        if (criteria && criteria.length > 0) {
            criteria.forEach(c => {
                if (att.levels[c.name] === undefined) att.levels[c.name] = 0;
            });
        }
        updatedCount++;
    }
    if (updatedCount > 0) { saveDB(); renderLabTable(); alert(`Импорт завершён. Обновлено записей: ${updatedCount}`); }
    else alert("Нет выбранных записей для обновления.");
    closeModal('importPreviewModal');
    importPreviewData = null;
}

async function exportVedomostExcel() {
    if (!currentGroup) { alert("Выберите группу."); return; }
    if (!db.tpl_vedomost) { alert("Загрузите шаблон ведомости в настройках!"); return; }
    let criteria = db.labs_meta[currentLab].criteria;
    let bytes = new Uint8Array(window.atob(db.tpl_vedomost).split('').map(c => c.charCodeAt(0)));
    let workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer);
    let ws = workbook.worksheets[0];
    let passedCount = 0;
    let rowsData = [];
    let index = 1;
    for (let fio in db.students) {
        let s = db.students[fio];
        if (s.group === currentGroup && s.status === 'active') {
            let att = s.labs[currentLab].attempts[0];
            let isAss = Object.keys(att.levels).length > 0 || att.legacy_score || att.absent || att.status;
            let st = att.status || (att.absent ? "Н" : "");
            let sc = isAss ? (st ? st : calcScore(att, criteria)) : "";
            
            rowsData.push([index++, fio, sc]);
            if (getStudentMaxScoreForLab(fio, currentLab) >= PASS_THRESHOLD) passedCount++;
        }
    }
    let percent = rowsData.length > 0 ? (passedCount / rowsData.length) * 100 : 0;
    ws.eachRow((row) => {
        row.eachCell((cell) => {
            if (cell.type === ExcelJS.ValueType.String && cell.value) {
                let val = String(cell.value);
                val = val.replace(/{GROUP}/g, currentGroup).replace(/{TOPIC}/g, db.labs_meta[currentLab].topic).replace(/{MONTH}/g, db.labs_meta[currentLab].month).replace(/{ATTEMPT}/g, ATTEMPT_NAMES[currentAttempt]).replace(/{LAB_NUMBER}/g, currentLab).replace(/{DATE}/g, new Date().toLocaleDateString('ru-RU'));
                cell.value = val;
            }
        });
    });
    let startRow = 6, startCol = 1;
    ws.eachRow((r, rn) => {
        r.eachCell((c, cn) => {
            if (String(c.value).includes("ФИО")) { startRow = rn + 1; startCol = cn - 1 > 0 ? cn - 1 : 1; }
        });
    });
    let refRow = ws.getRow(startRow);
    rowsData.forEach((rData, i) => {
        let tr = ws.getRow(startRow + i);
        rData.forEach((val, cIdx) => {
            let cell = tr.getCell(startCol + cIdx);
            cell.value = val;
            let rc = refRow.getCell(startCol + cIdx);
            if (rc.border) cell.border = rc.border;
            if (rc.font) cell.font = rc.font;
            if (rc.alignment) cell.alignment = rc.alignment;
        });
        tr.commit();
    });
    let markerRow = null;
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        row.eachCell((cell) => {
            if (cell.value && typeof cell.value === 'string' && cell.value.includes('{END_STUDENTS}')) markerRow = rowNumber;
        });
    });
    let lastStudentRow = startRow + rowsData.length - 1;
    if (markerRow !== null) {
        if (lastStudentRow + 1 < markerRow) ws.spliceRows(lastStudentRow + 1, markerRow - (lastStudentRow + 1));
        let row = ws.getRow(lastStudentRow + 1);
        row.eachCell((cell) => {
            if (cell.value && typeof cell.value === 'string' && cell.value.includes('{END_STUDENTS}')) cell.value = cell.value.replace(/{END_STUDENTS}/g, '').trim();
        });
        row.commit();
    }
    ws.eachRow((row) => {
        row.eachCell((cell) => {
            if (cell.type === ExcelJS.ValueType.String && cell.value && cell.value.includes('{PASS_PERCENT}')) {
                cell.value = cell.value.replace(/{PASS_PERCENT}/g, Math.round(percent * 100) / 100);
            }
        });
    });
    const blob = new Blob([await workbook.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Ведомость_${currentGroup}_ЛПР${currentLab}.xlsx`;
    link.click();
}

function printProtocolsHtml() {
    if(!currentGroup) return; let criteria = db.labs_meta[currentLab].criteria; if(criteria.length === 0) { alert("Загрузите критерии!"); return; }
    let html = `<html><head><title>Протоколы - ${currentGroup}</title><style>body { margin: 0; padding: 0; font-family: "Times New Roman", serif; background: white; color: black; } @page { size: A4; margin: 10mm; } .protocol-page { width: 190mm; height: 277mm; overflow: hidden; page-break-after: always; box-sizing: border-box; } .protocol-page:last-child { page-break-after: auto; } .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; } .print-table th, .print-table td { border: 1px solid black; padding: 3px 5px; font-size: 11px; } .print-table th { background: #f0f0f0 !important; -webkit-print-color-adjust: exact; text-align: center; } h2 { font-size: 16px; text-align: center; margin-bottom: 10px; font-weight: bold; } .prot-header-table { width: 100%; border: none; font-size: 13px; margin-bottom: 10px; } .prot-header-table td { border: none; padding: 2px 0; } .line-bottom { border-bottom: 1px solid black; width: 100%; display: inline-block; }</style></head><body>`;
    let has = false;
    for(let fio in db.students) {
        let s = db.students[fio]; if(s.group === currentGroup && shouldShowInLabAttempt(fio, currentLab, currentAttempt)) {
            has = true; let att = s.labs[currentLab].attempts[currentAttempt];
            let st = att.status || (att.absent ? "Н" : "");
            let total = st ? st : calcScore(att, criteria), rows = '';
            
            criteria.forEach((c, i) => { 
                let pts = 0; 
                if(!st) { 
                    let lvl=att.levels[c.name]||0; 
                    if(lvl===1) pts=Math.ceil(c.max_points/2); 
                    else if(lvl===2) pts=c.max_points; 
                } 
                rows += `<tr><td style="text-align:center;">${i+1}</td><td>${c.name}</td><td style="text-align:center;">${c.max_points}</td><td style="text-align:center; font-weight:bold;">${st ? 0 : pts}</td></tr>`; 
            });
            
            html += `<div class="protocol-page"><h2>Протокол оценки<br>в рамках промежуточной аттестации<br>направления «КИПиА»</h2><table class="prot-header-table"><tr><td style="width: 30%;"><strong>Студент:</strong></td><td style="border-bottom: 1px solid black;">${fio}</td></tr><tr><td><strong>Группа:</strong></td><td style="border-bottom: 1px solid black;">${s.group}</td></tr><tr><td><strong>Лабораторная работа №:</strong></td><td style="border-bottom: 1px solid black;">${currentLab}</td></tr><tr><td><strong>Дата:</strong></td><td style="border-bottom: 1px solid black;">${new Date().toLocaleDateString('ru-RU')}</td></tr><tr><td><strong>Тема:</strong></td><td style="border-bottom: 1px solid black;">${db.labs_meta[currentLab].topic}</td></tr><tr><td><strong>Попытка:</strong></td><td style="border-bottom: 1px solid black;">${ATTEMPT_NAMES[currentAttempt]}</td></tr></table><table class="print-table"><thead><tr><th style="width:5%;">№</th><th>Описание критерия</th><th style="width:15%;">Макс. Балл</th><th style="width:15%;">Результат</th></tr></thead><tbody>${rows}<tr><td colspan="3" style="text-align:right; font-size: 14px; padding-right:15px;"><strong>Итого:</strong></td><td style="font-size: 14px; text-align:center;"><strong>${total}</strong></td></tr></tbody></table><div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 13px;"><div style="width: 45%;">Подпись преподавателя: <span class="line-bottom" style="width: 150px;"></span></div><div style="width: 45%;">Подпись студента: <span class="line-bottom" style="width: 150px;"></span></div></div></div>`;
        }
    }
    if(!has){ alert("Нет студентов для печати!"); return; }
    html += `</body></html>`;
    let printWin = window.open('', '', 'width=900,height=800'); if(!printWin) { alert("Разрешите всплывающие окна"); return; }
    printWin.document.open(); printWin.document.write(html); printWin.document.close(); printWin.focus(); setTimeout(() => { printWin.print(); }, 500);
}

function showSummaryDialog() {
    const c = document.getElementById('summaryGroups'); c.innerHTML = '';
    let groups = new Set();
    for(let fio in db.students) if(db.students[fio].status === 'active') groups.add(db.students[fio].group);
    Array.from(groups).sort().forEach(g => {
        let lbl = document.createElement('label'); lbl.style.display = 'block';
        lbl.innerHTML = `<input type="checkbox" value="${g}" checked> ${g}`; c.appendChild(lbl);
    });
    document.getElementById('summaryTextOutput').value = '';
    document.getElementById('summaryModal').style.display = 'flex';
}

function generateSummaryData() {
    let selectedGroups = Array.from(document.querySelectorAll('#summaryGroups input:checked')).map(i => i.value);
    let rows = [], tStud = 0, tPass1 = 0, tPassAfter = 0, criteria = db.labs_meta[currentLab].criteria;
    selectedGroups.forEach(g => {
        let studs = Object.keys(db.students).filter(fio => db.students[fio].group === g && db.students[fio].status === 'active');
        let n = studs.length; if(n === 0) return;
        let p1 = 0, pa = 0;
        studs.forEach(fio => {
            let s = db.students[fio];
            
            let att0 = s.labs[currentLab].attempts[0];
            let st0 = att0.status || (att0.absent ? "Н" : "");
            let sc0 = calcScore(att0, criteria);
            let passed0 = !st0 && sc0 >= PASS_THRESHOLD;
            if(passed0) p1++;
            
            let att1 = s.labs[currentLab].attempts[1];
            let st1 = att1.status || (att1.absent ? "Н" : "");
            let sc1 = calcScore(att1, criteria);
            let passed1 = !st1 && sc1 >= PASS_THRESHOLD;
            if(passed0 || passed1) pa++;
        });
        tStud += n; tPass1 += p1; tPassAfter += pa;
        rows.push({ g: g, p1_pct: (p1 / n) * 100, pa_pct: (pa / n) * 100 });
    });
    return { rows, t1_pct: tStud ? (tPass1 / tStud) * 100 : 0, ta_pct: tStud ? (tPassAfter / tStud) * 100 : 0, month: db.labs_meta[currentLab].month || "_____" };
}

function generateSummaryText() {
    let data = generateSummaryData();
    if(data.rows.length === 0) { document.getElementById('summaryTextOutput').value = "Нет данных."; return; }
    let fmt = (x) => x.toFixed(2).replace('.', ',');
    let p1_str = data.rows.map(r => `${r.g} - ${fmt(r.p1_pct)}%`).join("; ");
    let pa_str = data.rows.map(r => `${r.g} - ${fmt(r.pa_pct)}%`).join("; ");
    let text = `Цель выполнена. ЛПЗ по стандартам WorldSkills/Алабуги Политех за ${data.month} проведен. Ведомости составлены и подписаны в срок.\nРезультаты ЛПЗ после 1 сдачи: ${p1_str}. Общий процент после 1 сдачи, освоения по всем группам – ${fmt(data.t1_pct)}%.\nРезультаты ЛПЗ после 1 пересдачи: ${pa_str}. Общий процент после 1 пересдачи, освоения по всем группам – ${fmt(data.ta_pct)}%.`;
    let out = document.getElementById('summaryTextOutput'); out.value = text; out.select(); document.execCommand("copy"); alert("Текст скопирован в буфер обмена!");
}

function exportSummaryExcel() {
    let data = generateSummaryData(), aoa = [["Группа", "Сдали 1 сдача (%)", "Сдали после пересдачи (%)"]];
    data.rows.forEach(r => aoa.push([r.g, Math.round(r.p1_pct*100)/100, Math.round(r.pa_pct*100)/100]));
    aoa.push(["ИТОГО", Math.round(data.t1_pct*100)/100, Math.round(data.ta_pct*100)/100]);
    let wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Сводный отчет"); 
    XLSX.writeFile(wb, `Сводный_Отчет_ЛПР${currentLab}.xlsx`);
}

function getFailingStudents(type) {
    let criteria = db.labs_meta[currentLab].criteria;
    let list = [];
    for (let fio in db.students) {
        let s = db.students[fio];
        if (s.status !== 'active') continue;

        let att0 = s.labs[currentLab].attempts[0];
        let st0 = att0.status || (att0.absent ? "Н" : "");
        
        if (st0 === "Б" || st0 === "К") continue;

        let sc0 = calcScore(att0, criteria);
        let disp0 = st0 === "Н" ? "Н" : sc0;
        let failed0 = st0 === "Н" || (typeof sc0 === 'number' && sc0 < PASS_THRESHOLD);

        if (type === 'retake') {
            if (failed0) {
                list.push({ fio: fio, group: s.group, scoreText: disp0 });
            }
        } else if (type === 'commission') {
            let att1 = s.labs[currentLab].attempts[1];
            let isAtt1Assessed = Object.keys(att1.levels).length > 0 || att1.legacy_score || att1.absent || att1.status;
            let st1 = att1.status || (att1.absent ? "Н" : "");
            
            if (failed0) {
                if (st1 === "Б" || st1 === "К") continue;
                
                let sc1 = calcScore(att1, criteria);
                let disp1 = st1 === "Н" ? "Н" : sc1;
                let failed1 = st1 === "Н" || (typeof sc1 === 'number' && sc1 < PASS_THRESHOLD);
                
                if (failed1 && isAtt1Assessed) {
                    list.push({ fio: fio, group: s.group, scoreText: `${disp0}/${disp1}` });
                } else if (failed1 && !isAtt1Assessed) {
                    list.push({ fio: fio, group: s.group, scoreText: `${disp0}/—` });
                }
            }
        }
    }
    return list;
}

function updateGroupDateInputs() {
    let type = document.getElementById('orderType').value;
    let students = getFailingStudents(type);
    let groups = [...new Set(students.map(s => s.group))].sort();
    
    let container = document.getElementById('groupDatesContainer');
    container.innerHTML = '';
    
    if (groups.length === 0) {
        container.innerHTML = '<span style="font-size:0.85em; color:#ef4444; font-weight:bold;">Нет студентов для формирования приказа (все сдали или не оценены)</span>';
        return;
    }
    
    groups.forEach(g => {
        container.innerHTML += `
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; color: #475569; background: #f8fafc; padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border);">
                <span>Группа <strong>${g}</strong>:</span>
                <input type="date" id="gdate_${g}" style="width: 140px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px;">
            </label>
        `;
    });
}

function openOrderModal() {
    document.getElementById('orderModal').style.display = 'flex';
    let today = new Date().toISOString().split('T')[0];
    document.getElementById('orderDate').value = today;
    updateGroupDateInputs();
}
/**
 * Генерирует чистый текст отчета для одного студента с ровными столбиками
 */
function getStudentTextData(fio) {
    const database = window.db;
    const s = database.students[fio];
    if (!s) return `Студент ${fio} не найден.\n`;

    const stats = window.getStudentStats(s, fio);
    const config = window.config;

    let text = `=================================================\n`;
    text += `ОТЧЕТ ПО СТУДЕНТУ: ${fio}\n`;
    text += `Группа: ${s.group || '—'}\n`; 
    text += `=================================================\n\n`;

    text += `ОБЩАЯ СТАТИСТИКА:\n`;
    text += `- Средний балл: ${stats.avgScore}\n`;
    text += `- Пройдено ЛПР: ${stats.submitted} из 10\n`;
    text += `- Замечания: ${stats.totalRemarks}\n\n`;

    text += `ДЕТАЛИЗАЦИЯ ЛПР:\n`;
    text += `№ ЛПР`.padEnd(10, ' ') + `| Балл`.padEnd(10, ' ') + `| Статус\n`;
    text += `-------------------------------------------------\n`;

    // Выводим результаты ровными колонками с проверкой на "Не начато"
    for (let i = 1; i <= 10; i++) {
        let scoreStr = "—";
        let labStatus = "Не начато";

        // Проверяем, есть ли вообще у студента записи по этой ЛПР и есть ли попытки сдачи
        if (s.labs && s.labs[i] && s.labs[i].attempts && s.labs[i].attempts.length > 0) {
            const score = window.getStudentMaxScoreForLab(fio, i);
            scoreStr = score.toString();
            labStatus = score >= (config.PASS_THRESHOLD || 70) ? "Сдано" : "Не сдано/Долг";
        }
        
        const col1 = `ЛПР ${i}`.padEnd(9, ' ');
        const col2 = `| ${scoreStr}`.padEnd(9, ' ');
        const col3 = `| ${labStatus}`;
        
        text += `${col1} ${col2} ${col3}\n`;
    }

    // Собираем все замечания в один плоский массив
    let allRemarks = [];
    if (s.labs) {
        for (let i = 1; i <= 10; i++) {
            if (s.labs[i] && s.labs[i].remarks && s.labs[i].remarks.length > 0) {
                allRemarks.push(...s.labs[i].remarks);
            }
        }
    }

    // Выводим замечания с визуальным выделением
    text += `\n-------------------------------------------------\n`;
    text += `ЗАМЕЧАНИЯ:\n`;
    if (allRemarks.length > 0) {
        allRemarks.forEach(remark => {
            text += `• ${remark}\n`; 
        });
    } else {
        text += `Нет замечаний.\n`;
    }
    text += `-------------------------------------------------\n`;

    text += `\n\n`;
    return text;
}; 

/**
 * Массовый экспорт отчетов по отфильтрованным студентам
 */
window.exportBulkTextReports = function() {
    const database = window.db;
    const gFilter = document.getElementById('dashGroupFilter')?.value || 'all';
    const search = document.getElementById('dashSearch')?.value.toLowerCase() || '';

    let fullReport = `СВОДНЫЙ ОТЧЕТ ПО ГРУППЕ: ${gFilter.toUpperCase()}\n`;
    fullReport += `Дата формирования: ${new Date().toLocaleString()}\n`;
    fullReport += `------------------------------------------\n\n`;

    let count = 0;
    // Берем студентов, которые сейчас видны на дашборде (с учетом фильтров)
    for (let fio in database.students) {
        const s = database.students[fio];
        const currentStatus = s.status || 'active';

        if (currentStatus !== 'active' || 
           (gFilter !== 'all' && s.group !== gFilter) || 
           (search && !fio.toLowerCase().includes(search))) {
            continue;
        }

        fullReport += getStudentTextData(fio);
        count++;
    }

    if (count === 0) {
        alert("Нет студентов для экспорта с текущими фильтрами.");
        return;
    }

    // Скачиваем как .txt файл
    const blob = new Blob([fullReport], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Отчет_Группа_${gFilter}_${new Date().toLocaleDateString()}.txt`;
    link.click();
    
    console.log(`✅ Экспортировано отчетов: ${count}`);
};


function printOrder() {
    let type = document.getElementById('orderType').value;
    let oDateRaw = document.getElementById('orderDate').value;
    let oNum = document.getElementById('orderNum').value || '___';
    let sDateRaw = document.getElementById('orderStartDate').value;
    let eDateRaw = document.getElementById('orderEndDate').value;

    let formatDate = (d) => d ? d.split('-').reverse().join('.') : '"___" ______ 20__ г.';
    let oDate = formatDate(oDateRaw);
    let sDate = formatDate(sDateRaw);
    let eDate = formatDate(eDateRaw);
    let month = db.labs_meta[currentLab].month || "_______________";

    let studentsList = getFailingStudents(type);

    if (studentsList.length === 0) {
        alert("Нет студентов, удовлетворяющих условиям приказа (с баллом ниже 70).");
        return;
    }

    let getGroupDate = (g) => {
        let el = document.getElementById(`gdate_${g}`);
        let val = el ? el.value : '';
        return val ? val.split('-').reverse().join('.') : '';
    };

    studentsList.forEach(st => {
        st.retakeDate = getGroupDate(st.group);
    });

    studentsList.sort((a, b) => {
        if (a.group < b.group) return -1;
        if (a.group > b.group) return 1;
        return a.fio.localeCompare(b.fio);
    });

    let isComm = type === 'commission';
    let actType = isComm ? 'комиссионной пересдачи' : 'пересдачи';
    let actTypeDo = isComm ? 'комиссионной пересдаче' : 'пересдаче';

    let rowsHtml = '';
    studentsList.forEach((st, i) => {
        rowsHtml += `<tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${st.fio}</td>
            <td style="text-align:center;">${st.group}</td>
            <td style="text-align:center;">${st.retakeDate}</td>
            <td style="text-align:center;">${st.scoreText}</td>
        </tr>`;
    });

    let html = `
    <html><head><title>Приказ - ${isComm ? 'Комиссия' : 'Пересдача'}</title>
    <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 14pt; line-height: 1.15; color: black; background: white; margin: 0; padding: 0; }
        *, *:before, *:after { box-sizing: border-box; }
        @page { size: A4; margin: 20mm; }
        .page-container { width: 100%; max-width: 100%; margin: 0; padding: 0; }
        h1 { text-align: center; margin: 10px 0; font-weight: bold; font-size: 14pt; }
        h2 { text-align: center; margin: 10px 0; font-weight: bold; font-size: 14pt; }
        p { text-align: justify; text-indent: 1.25cm; margin: 5px 0; }
        .header-table { width: 100%; border: none; margin-bottom: 20px; font-size: 14pt; }
        .header-table td { padding: 0; border: none; }
        .sign-table { width: 100%; border: none; margin-top: 40px; }
        .sign-table td { padding: 0; border: none; vertical-align: bottom; }
        .content-table { width: 99%; border-collapse: collapse; margin-top: 15px; font-size: 12pt; table-layout: fixed; }
        .content-table th, .content-table td { border: 1pt solid black !important; padding: 5px; word-wrap: break-word; }
        .content-table th { text-align: center; font-weight: normal; }
        .page-break { page-break-before: always; }
        .app-header { text-align: left; font-weight: normal; font-size: 14pt; text-indent: 0; margin-bottom: 10px; }
    </style>
    </head><body>
    <div class="page-container">
        <h1>Акционерное общество «Особая экономическая зона промышленно-производственного типа «Алабуга»</h1>
        <h2>ПРИКАЗ</h2>
        <table class="header-table">
            <tr>
                <td style="width: 30%;">${oDate}</td>
                <td style="width: 40%; text-align: center;">г. Елабуга</td>
                <td style="width: 30%; text-align: right;">№ ${oNum}</td>
            </tr>
        </table>
        
        <p style="text-align: left; text-indent: 0; font-weight: normal; margin-bottom: 25px;">О допуске к промежуточной аттестации</p>
        
        <p>В целях ликвидации академической задолженности в соответствии с п.4.2. Положения о корпоративной программе производственно-образовательного центра «Алабуга Политех» за ${month} по корпоративной программе дополнительного профессионального образования «Промышленное оборудование. Контрольно-измерительные приборы и автоматика»</p>
        
        <p style="text-align: left; text-indent: 0; font-weight: normal; margin-top: 15px; margin-bottom: 15px;">ПРИКАЗЫВАЮ:</p>
        
        <p>1. Установить срок ${actType} лабораторно-практической работы за ${month} с ${sDate} - по ${eDate}</p>
        <p>2. Допустить к ${actTypeDo} студентов направления «Промышленное оборудование. Контрольно-измерительные приборы и автоматика» в соответствии с Приложением №1.</p>
        ${isComm ? `<p>3. Создать комиссию по проведению комиссионной промежуточной аттестации для обучающихся по программе дополнительного профессионального образования «КИПиА», имеющим академические задолженности за ${month} года в соответствии с Приложением №2.</p><p>4. Контроль за исполнением настоящего приказа оставляю за собой.</p>` : `<p>3. Контроль за исполнением настоящего приказа оставляю за собой.</p>`}
        
        <table class="sign-table">
            <tr>
                <td style="width: 60%; font-size: 14pt;">Начальник отдела – руководитель проекта 2 уровня</td>
                <td style="width: 15%;"></td>
                <td style="width: 25%; text-align: right; font-size: 14pt;">Яушев Э.А.</td>
            </tr>
        </table>

        <div class="page-break"></div>

        <div class="app-header">Приложение №1</div>
        <p style="text-indent: 0; text-align: left; font-weight: normal;">Список студентов, допущенных до ${actType} лабораторно-практической работы за ${month} года.</p>

        <table class="content-table">
            <thead>
                <tr>
                    <th style="width: 5%;">№</th>
                    <th style="width: 35%;">ФИО</th>
                    <th style="width: 20%;">Группа</th>
                    <th style="width: 20%;">Дата пересдачи</th>
                    <th style="width: 20%;">Балл за ЛПР</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        ${isComm ? `
        <div class="page-break"></div>
        <div class="app-header">Приложение №2</div>
        <p style="text-indent: 0; text-align: left; font-weight: normal;">Состав комиссии по проведению комиссионной промежуточной аттестации для обучающихся по программе дополнительного профессионального образования «КИПиА»</p>
        
        <table class="header-table" style="margin-top: 20px;">
            <tr>
                <td style="width: 40%; font-weight: normal;">Председатель комиссии:</td>
                <td>Яушев Э.А.</td>
            </tr>
            <tr>
                <td style="padding-top: 15px; font-weight: normal;">Члены комиссии:</td>
                <td style="padding-top: 15px;">Демидов А.И.</td>
            </tr>
            <tr><td></td><td>Чупашов В.Р.</td></tr>
            <tr><td></td><td>Ардюков А.С.</td></tr>
            <tr><td></td><td>Жданович С.В.</td></tr>
        </table>
        ` : ''}
    </div>
    </body></html>
    `;

    let printWin = window.open('', '', 'width=900,height=800');
    if (!printWin) { alert("Пожалуйста, разрешите всплывающие окна в браузере."); return; }
    printWin.document.open(); 
    printWin.document.write(html); 
    printWin.document.close();
    printWin.focus(); 
    setTimeout(() => { printWin.print(); }, 500);
}
