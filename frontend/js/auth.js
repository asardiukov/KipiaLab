// js/auth.js
import { authRoom } from './api.js';

export function showLoginScreen() {
    // Темный фон на весь экран
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:#1a1a1a; z-index:99999; display:flex; justify-content:center; align-items:center;';
    
    // Карточка входа
    const form = document.createElement('div');
    form.style.cssText = 'background:var(--bg-color, #2b2b2b); padding:40px; border-radius:12px; width:320px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.8); border: 1px solid #444;';
    
    form.innerHTML = `
        <h2 style="margin-bottom:25px; color:var(--primary, #00ffcc); font-family:sans-serif;">Алабуга Политех: Лабораторные работы</h2>
        
        <input type="text" id="authRoom" placeholder="Направление (например: КИПиА)" 
               style="width:100%; padding:12px; margin-bottom:15px; background:#1e1e1e; border:1px solid #555; color:#fff; border-radius:6px; box-sizing:border-box;">
               
        <input type="password" id="authPass" placeholder="Пароль" 
               style="width:100%; padding:12px; margin-bottom:25px; background:#1e1e1e; border:1px solid #555; color:#fff; border-radius:6px; box-sizing:border-box;">
               
        <button id="authBtn" style="width:100%; padding:12px; background:var(--primary, #007bff); color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:16px;">
            Войти / Создать
        </button>
    `;
    
    overlay.appendChild(form);
    document.body.appendChild(overlay);

    // Логика нажатия кнопки
    document.getElementById('authBtn').onclick = async () => {
        const room = document.getElementById('authRoom').value.trim();
        const pass = document.getElementById('authPass').value.trim();
        
        if (!room || !pass) {
            alert("Пожалуйста, введите направление и пароль!");
            return;
        }
        
        // Кнопка в режим загрузки
        const btn = document.getElementById('authBtn');
        btn.innerText = 'Подключение...';
        btn.style.opacity = '0.7';

        const isSuccess = await authRoom(room, pass);
        
        if (isSuccess) {
            // Запоминаем комнату в памяти браузера
            localStorage.setItem('kiplab_room', room);
            // Перезагружаем страницу, чтобы всё загрузилось легально
            window.location.reload(); 
        } else {
            // Возвращаем кнопку в исходное состояние при ошибке
            btn.innerText = 'Войти / Создать';
            btn.style.opacity = '1';
        }
    };
}

 // js/auth.js
    export function logout() {
    const confirmExit = confirm("Вы уверены, что хотите выйти из комнаты?");
    if (confirmExit) {
        // Удаляем комнату из памяти
        localStorage.removeItem('kiplab_room');
        // Перезагружаем страницу (нас встретит экран входа)
        window.location.reload();
    }
  }

