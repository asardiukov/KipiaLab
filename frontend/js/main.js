// js/main.js
import { state } from './state.js'; // Важно! Импортируем сам стейт
import { initCharts } from './components/charts.js';
import { renderDashboard, updateGroupFilters, initDashboardEvents } from './components/dashboard.js';
import { loadDBFromServer, saveToServer } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Инициализация архитектуры KipLab...");

    // 1. Привязываем события (фильтры, поиск) СРАЗУ. 
    // Им не нужны данные, чтобы просто "слушать" изменения.
    initDashboardEvents();

    // 2. Пытаемся стянуть данные
    const isServerDataLoaded = await loadDBFromServer();
    
    if (isServerDataLoaded) {
        console.log("💎 Данные из PostgreSQL получены");
        
        // Синхронизируем: если api.js положил данные в window.db, 
        // прокидываем их в наш импортированный стейт
        if (window.db) {
            state.db = window.db;
        }

        // 3. Прямой вызов импортированных функций (без window!)
        console.log("📊 Запуск первичной отрисовки...");
        updateGroupFilters(); 
        renderDashboard();
        
        // Инициализируем графики
        initCharts();
    } else {
        console.warn("⚠️ Работаем в офлайн-режиме или база пуста");
    }

    // 4. Глобальные кнопки (Excel и т.д.)
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
        import('./services/excel.js').then(m => m.exportToExcel());
    });
});
