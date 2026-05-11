import { state } from '../state.js';
import { getStudentStats } from '../utils.js';
import { config } from '../config.js';

export function updateGroupFilters() {
    // Используем window.db для совместимости со старым кодом загрузки
    const database = state.db || window.db; 
    if (!database || !database.students) return;

    let groups = new Set(); 
    let source = database.sortedStudents || Object.values(database.students);
    source.forEach(s => { if (s.group) groups.add(s.group); });

    let html = '<option value="all">Все группы</option>';
    Array.from(groups).sort().forEach(g => html += `<option value="${g}">${g}</option>`);
    
    ['dashGroupFilter', 'exportGroupSelect', 'reportGroupFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });
}

// js/components/dashboard.js

export function renderDashboard() {
    const database = state.db || window.db; 
    
    if (!database || !database.students) return;

    let gFilter = document.getElementById('dashGroupFilter')?.value || 'all';
    let search = document.getElementById('dashSearch')?.value.toLowerCase() || '';
    let tbody = document.getElementById('dashTbody'); 
    
    // Если таблицы физически нет на экране - уходим
    if (!tbody) {
        console.warn("⚠️ Элемент dashTbody не найден в HTML!");
        return;
    }
    
    tbody.innerHTML = '';

    // ИСПРАВЛЕНИЕ 1: Защита от пустого массива
    let source;
    if (database.sortedStudents && database.sortedStudents.length > 0) {
        source = database.sortedStudents;
    } else {
        source = Object.entries(database.students).map(([fio, info]) => ({ fio, ...info }));
    }
        // 👇 ДОБАВЬ ВОТ ЭТИ 3 СТРОКИ 👇
    console.log("🕵️ ДЕТЕКТИВ: Всего студентов в базе:", Object.keys(database.students).length);
    console.log("🕵️ ДЕТЕКТИВ: Готовы к отрисовке (source):", source.length);
    console.log("🕵️ ДЕТЕКТИВ: Текущие фильтры -> Группа:", gFilter, "| Поиск:", search);

    let renderedCount = 0;

    source.forEach(s => {
        const fio = s.fio || s.name;
        
        // ИСПРАВЛЕНИЕ 2: Если статуса нет, считаем его 'active' по умолчанию
        const currentStatus = s.status || 'active'; 

        // Фильтрация
        if (currentStatus !== 'active' || 
           (gFilter !== 'all' && s.group !== gFilter) || 
           (search && !fio.toLowerCase().includes(search))) {
            return; // Пропускаем
        }

        renderedCount++; // Увеличиваем счетчик

        let stats = getStudentStats(s, fio);
        let scoreVal = parseFloat(stats.avgScore);
        let color = (!isNaN(scoreVal) && scoreVal < config.PASS_THRESHOLD) ? 'var(--danger)' : 'var(--primary)';

        tbody.innerHTML += `
            <tr class="clickable-row" onclick="window.openGlobalCard('${fio}')">
                <td>${fio}</td>
                <td>${s.group || '—'}</td>
                <td style="font-weight:bold; color:${color};">${stats.avgScore}</td>
                <td>
                    <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="event.stopPropagation(); window.openGlobalCard('${fio}')">
                        Карточка студента
                    </button>
                </td>
            </tr>`;
    });

    console.log(`✅ Отрисовано студентов в таблице: ${renderedCount}`);
}
export function initDashboardEvents() {
    const groupFilter = document.getElementById('dashGroupFilter');
    const searchInput = document.getElementById('dashSearch');
    if (groupFilter) groupFilter.addEventListener('change', renderDashboard);
    if (searchInput) searchInput.addEventListener('input', renderDashboard);
}

// МОСТ ДЛЯ СТАРОГО КОДА (window)
window.updateGroupFilters = updateGroupFilters;
window.renderDashboard = renderDashboard;

console.log("✅ Модуль Дашборда загружен и проброшен в window");
// js/components/dashboard.js

// Этот слушатель сработает ровно тогда, когда данные реально прилетят из PostgreSQL
window.addEventListener('db-ready', () => {
    console.log("🔔 Дашборд получил сигнал о готовности данных. Начинаю рендер...");
    updateGroupFilters(); 
    renderDashboard();
});
