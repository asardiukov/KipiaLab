// js/api.js
import { state, updateDb } from './state.js';
import { config } from './config.js';

export async function loadDBFromServer() {
    try {
        const response = await fetch(`${config.API_URL}/load`);
        if (response.ok) {
            const remoteDb = await response.json();
            if (remoteDb && Object.keys(remoteDb).length > 0) {
                // Вызов updateDb сам обновит state, window.db и крикнет 'db-ready'
                updateDb(remoteDb); 
                
                state.isDataLoadedFromServer = true; 
                window.isDataLoadedFromServer = true; // Мост для старого кода
                
                console.log("📦 База данных успешно загружена из PostgreSQL (через api.js)");
                return true;
            }
        } else {
            console.error(`❌ Сервер ответил ошибкой при загрузке: ${response.status}`);
        }
    } catch (error) {
        console.warn("⚠️ Не удалось достучаться до сервера", error);
    }
    return false;
}

// Экспортируем функцию сохранения (забираем её из data.js)
export async function saveToServer(data) {
    if (!state.isDataLoadedFromServer) {
        console.warn("⚠️ Блокировка сохранения: данные не загружены с сервера!");
        return { status: "blocked" };
    }
    try {
        console.log("Отправляем данные на сервер...");
        const res = await fetch(`${config.API_URL}/save`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("❌ Ошибка при сохранении:", err);
        throw err; 
    }
}
