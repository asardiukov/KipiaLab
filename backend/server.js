const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();

// 1. Настройки подключения к PostgreSQL
const pool = new Pool({
    user: 'kiplab_user',
    host: 'db', // имя сервиса из docker-compose
    database: 'kiplab_data',
    password: 'super_secret_password',
    port: 5432,
});

// 2. Настройки сервера (Middleware)
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Чтобы принимал большие базы

// Убедимся, что папка DATA для бэкапов существует
const dataFolder = path.join(__dirname, 'DATA');
if (!fs.existsSync(dataFolder)){
    fs.mkdirSync(dataFolder);
}

// 3. МАРШРУТЫ (API)

// Тестовый маршрут (для кнопки "Тестовый звонок")
app.get('/api/test', (req, res) => {
    res.json({ message: "Бэкенд на связи!", status: "success" });
});

// ГЛАВНЫЙ МАРШРУТ: СОХРАНЕНИЕ (И в SQL, и в Файл)
app.post('/api/save', async (req, res) => {
    const dbContent = req.body;

    try {
        console.log('Начинаю процесс сохранения...');

        // А. Сохраняем в PostgreSQL
        await pool.query(`
            INSERT INTO app_state (id, data, updated_at) 
            VALUES (1, $1, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = CURRENT_TIMESTAMP
        `, [dbContent]);

        // Б. Дублируем в JSON-файл (для страховки)
        const filePath = path.join(dataFolder, 'database.json');
        fs.writeFileSync(filePath, JSON.stringify(dbContent, null, 2), 'utf8');

        console.log('✅ Данные успешно сохранены везде!');
        res.json({ status: "success", message: "Данные синхронизированы с сервером" });

    } catch (err) {
        console.error("❌ Ошибка при сохранении:", err);
        res.status(500).json({ error: "Ошибка сохранения на сервере" });
    }
});

app.get('/api/load', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM app_state WHERE id = 1');
        
        if (result.rows.length > 0) {
            let appData = result.rows[0].data || {}; // Если пусто, делаем пустой объект
            
            // Защита от отсутствующего массива
            let studentsArray = appData.students || (appData.groups && appData.groups[0] && appData.groups[0].students) || appData;
            
            if (Array.isArray(studentsArray)) {
                studentsArray.sort((a, b) => {
                    const scoreA = parseFloat(a.averageScore || a.avg || a.score) || 0;
                    const scoreB = parseFloat(b.averageScore || b.avg || b.score) || 0;
                    return scoreB - scoreA;
                });
                appData.sortedStudents = studentsArray;
            } else {
                // Спасательный круг: если массива нет, отдаем хотя бы пустой массив
                appData.sortedStudents = []; 
                console.log("⚠️ Массив студентов не найден в базе, возвращаю пустой список");
            }

            res.json(appData);
        } else {
            // Если в таблице вообще нет ни одной записи
            res.json({ students: {}, sortedStudents: [] }); 
        }
    } catch (err) {
        // ТЕПЕРЬ ОШИБКА ТОЧНО БУДЕТ В ЛОГАХ
        console.error("🔥 КРИТИЧЕСКАЯ ОШИБКА В /api/load:", err);
        res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
    }
});

// 4. ЗАПУСК СЕРВЕРА
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Сервер KipLab запущен на порту ${PORT}`);
});
