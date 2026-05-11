// js/state.js
export const state = {
    db: null,
    isDataLoadedFromServer: false,
    
    // Состояние интерфейса
    ui: {
        currentNav: 'dashboard',
        currentLab: 1,
        currentAttempt: 0,
        currentGroup: null,
        gradingFio: null,
        tempLevels: {},
        importPreviewData: null
    }
};

// Функция первичной инициализации из localStorage
export function initLocalDb() {
    let localDb = JSON.parse(localStorage.getItem('kipia_v5_db'));
    
    if (!localDb) {
        let oldDbV4 = JSON.parse(localStorage.getItem('kipia_v4_db'));
        if (oldDbV4) { 
            localDb = oldDbV4; 
        } else {
            localDb = { students: {}, labs_meta: {}, tpl_vedomost: null, tpl_protocol: null };
            for(let i=1; i<=10; i++) localDb.labs_meta[i] = { topic: "", month: "", criteria: [] };
        }
        localStorage.setItem('kipia_v5_db', JSON.stringify(localDb));
    }
    
    state.db = localDb;
    
    // 👇 МОСТ ДЛЯ СТАРОГО КОДА (ui.js, io.js, data.js) 👇
    // Глобальная переменная db снова существует для старых скриптов
    window.db = localDb; 
}

// Функция для безопасного обновления базы (например, после загрузки с сервера)
export function updateDb(newData) {
    state.db = newData;
    
    // 👇 СИНХРОНИЗИРУЕМ СТАРЫЙ МИР 👇
    window.db = newData; 
    
    localStorage.setItem('kipia_v5_db', JSON.stringify(state.db));
    
    // 👇 КРИЧИМ ВСЕЙ СИСТЕМЕ: ДАННЫЕ ГОТОВЫ! 👇
    // Именно этот сигнал ждет твой dashboard.js, чтобы начать отрисовку
    window.dispatchEvent(new Event('db-ready'));
    console.log("📢 Стейт обновлен, сигнал db-ready отправлен!");
}
window.updateDb = updateDb;
