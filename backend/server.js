// Подключаем установленные библиотеки
const express = require('express');
const cors = require('cors');

// Создаем само приложение (нашего кладовщика)
const app = express();
app.use(cors()); // Разрешаем отвечать на запросы из браузера

// Учим кладовщика отвечать на простой запрос
// Если кто-то постучится по адресу /api/test, мы отдадим ему JSON
app.get('/api/test', (req, res) => {
    res.json({ 
        message: "Привет! Я твой новый бэкенд на Node.js", 
        status: "success" 
    });
});

// Запускаем кладовщика на порту 3001
app.listen(3001, () => {
    console.log('Бэкенд успешно запущен на http://localhost:3001');
});
