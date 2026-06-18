const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'bdd', 'EVEcuador_Mapa_Puntos_Carga.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['🌊 Costa'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log(JSON.stringify(data.slice(0, 5), null, 2));
