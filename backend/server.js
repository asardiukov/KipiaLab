const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();

// 1. Настройки подключения к PostgreSQL
const pool = new Pool({
    user: 'kiplab_user',
    host: 'db', 
    database: 'kiplab_data',
    password: 'super_secret_password',
    port: 5432,
});

// Автоматическое создание таблицы комнат при запуске сервера (если её нет)
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                room_name VARCHAR(255) PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                data JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Таблица rooms готова к работе!');
    } catch (err) {
        console.error('❌ Ошибка инициализации БД:', err);
    }
};
initDB();

// 2. Настройки сервера (Middleware)
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

const dataFolder = path.join(__dirname, 'DATA');
if (!fs.existsSync(dataFolder)){
    fs.mkdirSync(dataFolder);
}

// ВРЕМЕННЫЙ МАРШРУТ ДЛЯ ВОССТАНОВЛЕНИЯ БАЗЫ
app.get('/api/restore', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'DATA', 'database.json');
        
        // Проверяем, жив ли старый бэкап
        if (!fs.existsSync(filePath)) {
            return res.send("❌ Старый файл database.json не найден в папке DATA!");
        }
        
        // Читаем старую базу
        const oldData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Записываем её в комнату КИПиА
        await pool.query(
            `UPDATE rooms SET data = $1 WHERE room_name = 'КИПиА'`, 
            [oldData]
        );
        
        res.send("✅ УРА! База успешно восстановлена из database.json в комнату КИПиА!");
    } catch (err) {
        res.status(500).send("Ошибка: " + err.message);
    }
});


// 3. МАРШРУТЫ (API)

// --- НОВЫЙ МАРШРУТ: АВТОРИЗАЦИЯ И СОЗДАНИЕ КОМНАТЫ ---
app.post('/api/auth', async (req, res) => {
    const { roomName, password } = req.body;

    if (!roomName || !password) {
        return res.status(400).json({ error: "Введите направление и пароль!" });
    }

    try {
        const result = await pool.query('SELECT password FROM rooms WHERE room_name = $1', [roomName]);

        if (result.rows.length === 0) {
            // Комнаты нет? Создаем новую! (Пустая база внутри)
            const emptyData = { students: {} };
            await pool.query(
                'INSERT INTO rooms (room_name, password, data) VALUES ($1, $2, $3)', 
                [roomName, password, emptyData]
            );
            console.log(`🏠 Создана новая комната: ${roomName}`);
            return res.json({ status: "created", message: "Направление успешно создано!" });
        } else {
            // Комната есть, проверяем пароль
            if (result.rows[0].password === password) {
                console.log(`🔑 Успешный вход в комнату: ${roomName}`);
                return res.json({ status: "success", message: "Успешный вход!" });
            } else {
                console.log(`🚨 Неверный пароль для комнаты: ${roomName}`);
                return res.status(401).json({ error: "Неверный пароль!" });
            }
        }
    } catch (err) {
        console.error("Ошибка при авторизации:", err);
        res.status(500).json({ error: "Ошибка сервера при входе" });
    }
});

// ГЛАВНЫЙ МАРШРУТ: СОХРАНЕНИЕ
app.post('/api/save', async (req, res) => {
    const { roomName, data } = req.body; // Теперь ждем название комнаты и сами данные

    if (!roomName || !data) {
        return res.status(400).json({ error: "Нет названия комнаты или данных для сохранения" });
    }

    try {
        // А. Сохраняем в PostgreSQL (обновляем только нужную комнату)
        await pool.query(`
            UPDATE rooms 
            SET data = $1, updated_at = CURRENT_TIMESTAMP
            WHERE room_name = $2
        `, [data, roomName]);

        // Б. Дублируем в JSON-файл (у каждой комнаты теперь свой файл бэкапа!)
        const safeRoomName = roomName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_'); // Защита от спецсимволов в имени файла
        const filePath = path.join(dataFolder, `backup_${safeRoomName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

        console.log(`✅ Данные комнаты [${roomName}] сохранены!`);
        res.json({ status: "success", message: "Данные синхронизированы" });

    } catch (err) {
        console.error(`❌ Ошибка сохранения для [${roomName}]:`, err);
        res.status(500).json({ error: "Ошибка сохранения на сервере" });
    }
});

// ЗАГРУЗКА ДАННЫХ
app.get('/api/load', async (req, res) => {
    // Теперь передаем название комнаты через параметры (например: /api/load?room=КИПиА)
    const roomName = req.query.room; 

    if (!roomName) {
        return res.status(400).json({ error: "Не указана комната для загрузки!" });
    }

    try {
        const result = await pool.query('SELECT data FROM rooms WHERE room_name = $1', [roomName]);
        
        if (result.rows.length > 0) {
            let appData = result.rows[0].data || {}; 
            
            let studentsArray = appData.students || (appData.groups && appData.groups[0] && appData.groups[0].students) || appData;
            
            if (Array.isArray(studentsArray)) {
                studentsArray.sort((a, b) => {
                    const scoreA = parseFloat(a.averageScore || a.avg || a.score) || 0;
                    const scoreB = parseFloat(b.averageScore || b.avg || b.score) || 0;
                    return scoreB - scoreA;
                });
                appData.sortedStudents = studentsArray;
            } else {
                appData.sortedStudents = []; 
            }

            res.json(appData);
        } else {
            // Если комната вдруг исчезла
            res.json({ students: {}, sortedStudents: [] }); 
        }
    } catch (err) {
        console.error(`🔥 ОШИБКА ЗАГРУЗКИ [${roomName}]:`, err);
        res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
    }
});

// 4. ЗАПУСК СЕРВЕРА
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Сервер KipLab запущен на порту ${PORT}`);
});
