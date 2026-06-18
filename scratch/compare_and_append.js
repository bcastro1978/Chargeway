const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const oldExcelPath = path.join(__dirname, '..', 'bdd', 'EVEcuador_Mapa_Puntos_Carga.xlsx');
const newExcelPath = path.join(__dirname, 'new_data.xlsx');
const appendSqlPath = path.join(__dirname, 'append_seed.sql');

function resolveUrl(url) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) {
      resolve(url);
      return;
    }
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
  console.log("Reading old Excel file...");
  const oldWb = xlsx.readFile(oldExcelPath);
  const oldSet = new Set();

  for (const sheetName of oldWb.SheetNames) {
    if (sheetName === '📋 Inicio' || sheetName === '➕ Reportar Punto') continue;
    const data = xlsx.utils.sheet_to_json(oldWb.Sheets[sheetName], { header: 1 });
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3 || !row[0] || !row[1]) continue;
      // Use nombre (row[3]) and gps_link (row[9]) as unique identifier
      const nombre = row[3] || '';
      const gps = row[9] || '';
      oldSet.add(nombre.trim() + '|' + gps.trim());
    }
  }

  console.log("Reading new Excel file...");
  const newWb = xlsx.readFile(newExcelPath);
  const newItems = [];
  
  for (const sheetName of newWb.SheetNames) {
    if (sheetName === '📋 Inicio' || sheetName === '➕ Reportar Punto') continue;
    
    let region = '';
    if (sheetName.includes('Costa')) region = 'Costa';
    else if (sheetName.includes('Sierra')) region = 'Sierra';
    else if (sheetName.includes('Amazonía')) region = 'Amazonía';
    else if (sheetName.includes('Ruta')) region = 'Ruta Q-G';
    else region = sheetName;

    const data = xlsx.utils.sheet_to_json(newWb.Sheets[sheetName], { header: 1 });
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3 || !row[0] || !row[1]) continue;

      const [
        num,
        provincia,
        canton,
        nombre,
        velocidad,
        tipo_cargador,
        potencia,
        horario,
        costo,
        enlace_gps,
        aprox_km
      ] = row;

      const idString = (nombre || '').trim() + '|' + (enlace_gps || '').trim();
      
      if (!oldSet.has(idString)) {
        newItems.push({
          region, provincia, canton, nombre, velocidad, tipo_cargador, potencia, horario, costo, enlace_gps, aprox_km
        });
      }
    }
  }

  console.log(`Found ${newItems.length} new items to add.`);

  if (newItems.length === 0) {
    console.log("No new items found. Exiting.");
    return;
  }

  const sqlStatements = [];
  sqlStatements.push('-- Script para agregar nuevos puntos desde el Excel actualizado');
  sqlStatements.push('BEGIN;');

  for (const item of newItems) {
    let lat = 'NULL';
    let lng = 'NULL';

    if (item.enlace_gps && item.enlace_gps.startsWith('http')) {
      try {
        const finalUrl = await resolveUrl(item.enlace_gps);
        const coords = extractCoords(finalUrl);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      } catch (e) {
        console.error(`Failed to resolve URL ${item.enlace_gps}: ${e.message}`);
      }
    }

    const sql = `INSERT INTO public.charging_points (region, province, city_or_canton, name, speed, charger_type, power, schedule, cost_type, gps_link, lat, lng) VALUES (${escapeStr(item.region)}, ${escapeStr(item.provincia)}, ${escapeStr(item.canton)}, ${escapeStr(item.nombre)}, ${escapeStr(item.velocidad)}, ${escapeStr(item.tipo_cargador)}, ${escapeStr(item.potencia)}, ${escapeStr(item.horario)}, ${escapeStr(item.costo)}, ${escapeStr(item.enlace_gps)}, ${lat}, ${lng});`;
    
    sqlStatements.push(sql);
  }

  sqlStatements.push('COMMIT;');
  
  fs.writeFileSync(appendSqlPath, sqlStatements.join('\n'), 'utf8');
  console.log(`Generated ${appendSqlPath}`);
}

main().catch(console.error);
