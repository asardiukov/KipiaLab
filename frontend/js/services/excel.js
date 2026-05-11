// js/services/excel.js
import { state, updateDb } from '../state.js';

// --- ЭКСПОРТ (ExcelJS) ---
export async function exportToExcel() {
    console.log("Формируем Excel ведомость...");
    
    // ExcelJS доступен глобально через CDN
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ведомость');

    worksheet.columns = [
        { header: 'ФИО Студента', key: 'fio', width: 30 },
        { header: 'Группа', key: 'group', width: 15 },
        { header: 'Балл', key: 'score', width: 10 }
    ];

    // Берем данные строго из state
    Object.entries(state.db.students).forEach(([fio, info]) => {
        worksheet.addRow({ fio: fio, group: info.group, score: 5 /* тут твоя функция из utils */ });
    });

    // Сохранение файла
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Vedomost.xlsx';
    link.click();
}

// --- ИМПОРТ (XLSX) ---
export function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        // XLSX доступен глобально через CDN
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        console.log("Данные из Excel:", jsonData);
        // ... логика добавления студентов в базу ...
        
        // После изменения базы не забываем обновить state!
        // updateDb(state.db);
    };
    reader.readAsArrayBuffer(file);
}
