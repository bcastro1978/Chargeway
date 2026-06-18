const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const https = require('https');
const http = require('http');

const oldExcelPath = path.join(__dirname, '..', 'bdd', 'EVEcuador_Mapa_Puntos_Carga.xlsx');
const newExcelPath = path.join(__dirname, 'new_data.xlsx');
const textPath = path.join(__dirname, 'raw_text.txt');
const appendSqlPath = path.join(__dirname, 'append_seed2.sql');

function resolveUrl(url) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return resolve(url);
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolveUrl(res.headers.location).then(resolve).catch(reject);
      } else {
        resolve(url);
      }
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.abort();
      resolve(url);
    });
  });
}

function extractCoords(url) {
  if (!url) return null;
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) return { lat: match[1], lng: match[2] };
  const matchQ = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (matchQ) return { lat: matchQ[1], lng: matchQ[2] };
  return null;
}

const escapeStr = (str) => {
  if (str === null || str === undefined || str === '') return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
};

async function main() {
  const existingSet = new Set();
  
  // Load old excel
  const oldWb = xlsx.readFile(oldExcelPath);
  for (const sheetName of oldWb.SheetNames) {
    if (sheetName === '📋 Inicio' || sheetName === '➕ Reportar Punto') continue;
    const data = xlsx.utils.sheet_to_json(oldWb.Sheets[sheetName], { header: 1 });
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][9]) existingSet.add(data[i][9].trim());
    }
  }

  // Load new excel (which we downloaded before)
  if (fs.existsSync(newExcelPath)) {
    const newWb = xlsx.readFile(newExcelPath);
    for (const sheetName of newWb.SheetNames) {
      if (sheetName === '📋 Inicio' || sheetName === '➕ Reportar Punto') continue;
      const data = xlsx.utils.sheet_to_json(newWb.Sheets[sheetName], { header: 1 });
      for (let i = 1; i < data.length; i++) {
        if (data[i] && data[i][9]) existingSet.add(data[i][9].trim());
      }
    }
  }
  
  // Also add the two new points from previous append manually since we don't have their exact original source link easily in the set if they weren't in new_data.xlsx in the 9th column.
  // Actually, new_data.xlsx had them.
  
  console.log("Total existing links:", existingSet.size);

  const rawText = fs.readFileSync(textPath, 'utf8');
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const newItems = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('http')) {
      const gps = line;
      if (!existingSet.has(gps)) {
        // found a new link! let's try to extract its info by reading the 4 lines above it
        const name = i - 4 >= 0 ? lines[i - 4] : '';
        const charger_type = i - 3 >= 0 ? lines[i - 3] : '';
        const power = i - 2 >= 0 ? lines[i - 2] : '';
        const schedule = i - 1 >= 0 ? lines[i - 1] : '';
        
        newItems.push({
          name,
          charger_type,
          power,
          schedule,
          gps_link: gps
        });
      }
    }
  }

  console.log(`Found ${newItems.length} missing items in text.`);

  if (newItems.length === 0) {
    console.log("No new items found.");
    return;
  }

  const sqlStatements = [];
  sqlStatements.push('BEGIN;');

  for (const item of newItems) {
    let lat = 'NULL';
    let lng = 'NULL';

    try {
      const finalUrl = await resolveUrl(item.gps_link);
      const coords = extractCoords(finalUrl);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    } catch (e) {
      console.error(`Failed to resolve ${item.gps_link}`);
    }

    const sql = `INSERT INTO public.charging_points (region, province, city_or_canton, name, speed, charger_type, power, schedule, cost_type, gps_link, lat, lng) VALUES ('Desconocida', 'Desconocida', 'Desconocida', ${escapeStr(item.name)}, 'Desconocida', ${escapeStr(item.charger_type)}, ${escapeStr(item.power)}, ${escapeStr(item.schedule)}, 'Desconocido', ${escapeStr(item.gps_link)}, ${lat}, ${lng});`;
    sqlStatements.push(sql);
  }

  sqlStatements.push('COMMIT;');
  
  fs.writeFileSync(appendSqlPath, sqlStatements.join('\n'), 'utf8');
  console.log(`Generated ${appendSqlPath}`);
}

main().catch(console.error);
