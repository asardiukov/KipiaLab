const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Подключаем инструмент для работы с PostgreSQL

const app = express();

// Настройки подключения к базе (берем из твоего docker-compose)
const pool = new Pool({
    user: 'kiplab_user',
    host: 'db', // имя сервиса из docker-compose
    database: 'kiplab_data',
    password: 'super_secret_password',
    port: 5432,
});

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Позволяем принимать большие JSON (твоя база может вырасти)

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    res.json({ message: "Бэкенд на связи!", status: "success" });
});

// 1. СОХРАНЕНИЕ
app.post('/api/save', async (req, res) => {
    try {
        const dbContent = req.body;
        await pool.query(`
            INSERT INTO app_state (id, data, updated_at) 
            VALUES (1, $1, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = CURRENT_TIMESTAMP
        `, [dbContent]);
        
        res.json({ status: "success", message: "Данные синхронизированы с PostgreSQL" });
    } catch (err) {
        console.error("Ошибка сохранения:", err);
        res.status(500).json({ error: "Ошибка сохранения" });
    }
});

// 2. ЗАГРУЗКА
app.get('/api/load', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM app_state WHERE id = 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0].data);
        } else {
            res.status(404).json({ message: "База в PostgreSQL пока пуста" });
        }
    } catch (err) {
        console.error("Ошибка загрузки:", err);
        res.status(500).json({ error: "Ошибка загрузки" });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Сервер KipLab запущен на порту ${PORT}`);
});
