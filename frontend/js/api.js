// js/api.js
import { state, updateDb } from './state.js';
import { config } from './config.js';

// js/api.js

// НОВАЯ ФУНКЦИЯ: Авторизация комнаты
export async function authRoom(roomName, password) {
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomName, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            return true; // Успех!
        } else {
            alert(data.error || "Ошибка входа");
            return false;
        }
    } catch (e) {
        console.error("Ошибка авторизации:", e);
        alert("Нет связи с сервером. Проверьте сеть.");
        return false;
    }
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ: Загрузка с учетом комнаты
export async function loadDBFromServer(roomName) {
    try {
        // Передаем параметр ?room=...
        const response = await fetch(`/api/load?room=${encodeURIComponent(roomName)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error("❌ Ошибка загрузки базы:", e);
        return null;
    }
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ: Сохранение с учетом комнаты
export async function saveToServer(data) {
    // Берем текущую комнату из памяти браузера
    const roomName = localStorage.getItem('kiplab_room');
    if (!roomName) {
        console.error("Попытка сохранить данные без авторизации!");
        return false;
    }

    try {
        const response = await fetch(`/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomName, data }) // Отправляем и комнату, и данные
        });
        return response.ok;
    } catch (e) {
        console.error("❌ Ошибка сохранения:", e);
        return false;
    }
}
