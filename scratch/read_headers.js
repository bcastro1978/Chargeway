const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('c:', 'PERSONAL', 'IA', 'ChargeWay', 'bdd', 'EVEcuador_Mapa_Puntos_Carga.xlsx');
try {
  const workbook = xlsx.readFile(filePath);
  const result = {};

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    // Read the sheet data as json
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length > 0) {
      // Find the first row that looks like a header (has multiple strings)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (row && row.length > 2 && row.some(cell => typeof cell === 'string')) {
          headerRowIndex = i;
          break;
        }
      }
      
      const headers = data[headerRowIndex];
      const sample = data[headerRowIndex + 1];
      result[sheetName] = {
        headers,
        sample
      };
    } else {
      result[sheetName] = "Empty or unreadable";
    }
  });

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Error reading file:", error.message);
}
