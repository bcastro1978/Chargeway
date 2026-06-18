const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'bdd', 'EVEcuador_Mapa_Puntos_Carga.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = '🌊 Costa';
const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Headers:', rows[1]);
console.log('Row 2:', rows[2]);
console.log('Row 3:', rows[3]);
console.log('Row 4:', rows[4]);
