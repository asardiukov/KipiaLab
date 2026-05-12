import { state } from './state.js';
import { loadDBFromServer } from './api.js';
import { updateGroupFilters, renderDashboard } from './components/dashboard.js';
import { initCharts } from './components/charts.js';
import { showLoginScreen, logout } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Инициализация архитектуры KipLab...");

    // 1. Проверка комнаты
    const currentRoom = localStorage.getItem('kiplab_room');
    
    if (!currentRoom) {
        console.log("🔒 Доступ закрыт. Ожидание входа пользователя...");
        showLoginScreen(); 
        return; 
    }

    console.log(`🔑 Авторизован в комнате: ${currentRoom}. Загрузка данных...`);

    // 2. Загрузка данных с сервера
    const dbData = await loadDBFromServer(currentRoom);
    
    if (dbData && dbData.students) {
        console.log("💎 Данные из PostgreSQL получены");
        
        window.db = dbData;
        state.db = dbData;
        window.isDataLoadedFromServer = true; // Было isServerDataLoaded. Теперь совпадает с data.js!
        // 3. Первичная отрисовка
        console.log("📊 Запуск первичной отрисовки...");
        updateGroupFilters(); 
        renderDashboard();
        initCharts();
    } else {
        console.warn("⚠️ Работаем в офлайн-режиме или база пуста");
    }

    // 4. Кнопка Excel
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
        import('./services/excel.js').then(m => m.exportToExcel());
    });

    // 5. Логика выхода
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        // Отображаем название комнаты рядом с иконкой выхода
        const roomDisplay = document.getElementById('currentRoomDisplay');
        if (roomDisplay) roomDisplay.innerText = currentRoom;

        logoutBtn.addEventListener('click', logout);
    }
}); // <-- Скорее всего, эта закрывающая скобка и точка с запятой потерялись
