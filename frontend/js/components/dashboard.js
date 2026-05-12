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

// js/components/dashboard.js

export function renderDashboard() {
    const database = state.db || window.db; 
    if (!database || !database.students) return;

    let gFilter = document.getElementById('dashGroupFilter')?.value || 'all';
    let search = document.getElementById('dashSearch')?.value.toLowerCase() || '';
    let tbody = document.getElementById('dashTbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // 1. Превращаем объект в массив и СРАЗУ считаем статы для каждого студента
    // Это нужно, чтобы у нас были баллы для сортировки
    let studentsList = Object.entries(database.students).map(([fio, info]) => {
        const stats = getStudentStats(info, fio);
        return { fio, ...info, stats };
    });

    // 2. ЖЕСТКАЯ СОРТИРОВКА ПО СРЕДНЕМУ БАЛЛУ (от высшего к низшему)
    studentsList.sort((a, b) => {
        const scoreA = a.stats.avgScore === "—" ? -1 : parseFloat(a.stats.avgScore);
        const scoreB = b.stats.avgScore === "—" ? -1 : parseFloat(b.stats.avgScore);
        
        // Сначала по баллу
        if (scoreB !== scoreA) {
            return scoreB - scoreA;
        }
        // Если баллы равны — по алфавиту
        return a.fio.localeCompare(b.fio);
    });

    let renderedCount = 0;

    // 3. Отрисовываем уже отсортированный список
    studentsList.forEach(s => {
        const currentStatus = s.status || 'active';
        
        // Фильтрация
        if (currentStatus !== 'active' || 
           (gFilter !== 'all' && s.group !== gFilter) || 
           (search && !s.fio.toLowerCase().includes(search))) {
            return;
        }

        renderedCount++;
        let scoreVal = parseFloat(s.stats.avgScore);
        
        // Используем порог из конфига для цвета
        let color = (!isNaN(scoreVal) && scoreVal < config.PASS_THRESHOLD) ? 'var(--danger)' : 'var(--primary)';

        tbody.innerHTML += `
            <tr class="clickable-row" onclick="window.openGlobalCard('${s.fio}')">
                <td>${s.fio}</td>
                <td>${s.group || '—'}</td>
                <td style="font-weight:bold; color:${color};">${s.stats.avgScore}</td>
                <td>
                    <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="event.stopPropagation(); window.openGlobalCard('${s.fio}')">
                        Карточка студента
                    </button>
                </td>
            </tr>`;
    });

    // Обновляем счетчик для отладки
    console.log(`✅ Отрисовано студентов (отсортировано по баллу): ${renderedCount}`);
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
