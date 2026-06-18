const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '..', 'bdd', 'EVEcuador_Mapa_Puntos_Carga.xlsx');
const seedPath = path.join(__dirname, 'seed.sql');

try {
  const workbook = xlsx.readFile(filePath);
  const sqlStatements = [];

  sqlStatements.push('-- Importación de datos desde Excel');
  sqlStatements.push('BEGIN;');

  workbook.SheetNames.forEach(sheetName => {
    if (sheetName === '📋 Inicio' || sheetName === '➕ Reportar Punto') return;

    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Find header
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (row && row.length > 2 && row.some(cell => typeof cell === 'string')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) return;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      let region = sheetName.replace(/[^\w\s-]/gi, '').trim(); // Remove emojis
      let province = null;
      let city_or_canton = '';
      let name = '';
      let speed = null;
      let charger_type = null;
      let power = null;
      let schedule = null;
      let cost_type = null;
      let gps_link = null;
      let approx_km = null;

      if (sheetName === '🛣️ Ruta Q-G') {
        approx_km = row[0] || null;
        city_or_canton = row[1] || '';
        name = row[2] || '';
        speed = row[3] || null;
        power = row[4] || null;
        schedule = row[5] || null;
        cost_type = row[6] || null;
        gps_link = row[7] || null;
      } else {
        // Costa, Sierra, Amazonía
        province = row[1] || null;
        city_or_canton = row[2] || '';
        name = row[3] || '';
        speed = row[4] || null;
        charger_type = row[5] || null;
        power = row[6] || null;
        schedule = row[7] || null;
        cost_type = row[8] || null;
        gps_link = row[9] || null;
      }

      if (!name && !city_or_canton) continue;

      // Escape quotes for SQL
      const escapeStr = (str) => {
        if (str === null || str === undefined) return 'NULL';
        return "'" + String(str).replace(/'/g, "''") + "'";
      };

      const kmVal = approx_km !== null && !isNaN(approx_km) ? approx_km : 'NULL';

      const sql = `INSERT INTO public.charging_points (region, province, city_or_canton, name, speed, charger_type, power, schedule, cost_type, gps_link, approx_km) VALUES (${escapeStr(region)}, ${escapeStr(province)}, ${escapeStr(city_or_canton)}, ${escapeStr(name)}, ${escapeStr(speed)}, ${escapeStr(charger_type)}, ${escapeStr(power)}, ${escapeStr(schedule)}, ${escapeStr(cost_type)}, ${escapeStr(gps_link)}, ${kmVal});`;
      
      sqlStatements.push(sql);
    }
  });

  sqlStatements.push('COMMIT;');

  fs.writeFileSync(seedPath, sqlStatements.join('\n'), 'utf8');
  console.log(`Generated seed SQL at ${seedPath} with ${sqlStatements.length - 2} INSERT statements.`);
} catch (error) {
  console.error("Error:", error.message);
}
