# Берем легкий образ с Node.js
FROM node:22-alpine

# Создаем рабочую папку внутри контейнера
WORKDIR /app

# Копируем список зависимостей и устанавливаем их
COPY package*.json ./
RUN npm install

# Копируем остальные файлы
COPY . .

# Запускаем наш скрипт "dev" (через nodemon)
CMD ["npm", "run", "dev"]
