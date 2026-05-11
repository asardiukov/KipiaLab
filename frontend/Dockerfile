# 1. Берем готовый образ Nginx на базе крошечного Alpine Linux
FROM nginx:alpine

# 2. Копируем наш кастомный конфиг (мост для API) поверх стандартного
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 3. Копируем все файлы твоего проекта KipLab (HTML, JS, CSS)
# в ту папку, откуда Nginx по умолчанию раздает сайты
COPY . /usr/share/nginx/html

# 4. Говорим, что контейнер будет отдавать трафик по стандартному 80 порту
EXPOSE 80
