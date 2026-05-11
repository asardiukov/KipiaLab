// js/config.js
export const config = {
    PASS_THRESHOLD: 70,
    API_URL: '/api',
    ATTEMPT_NAMES: ["Основа", "Пересдача", "Комиссия", "По характеристике"]
};
// МОСТ ДЛЯ СТАРОГО КОДА
window.config = config;
window.ATTEMPT_NAMES = config.ATTEMPT_NAMES;
