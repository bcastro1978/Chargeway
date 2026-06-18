const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const excelPath = path.join(__dirname, '..', 'bdd', 'EVEcuador_Mapa_Puntos_Carga.xlsx');
const sqlPath = path.join(__dirname, 'seed_full.sql');

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
    // Timeout to prevent hanging
    req.setTimeout(5000, () => {
      req.abort();
      resolve(url);
    });
  });
}

function extractCoords(url) {
  if (!url) return null;
  // Match @lat,lng
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: match[1], lng: match[2] };
  }
  // Match query param ll=lat,lng or q=lat,lng
  const matchQ = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (matchQ) return { lat: matchQ[1], lng: matchQ[2] };
  
  return null;
}

const escapeStr = (str) => {
  if (str === null || str === undefined || str === '') return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
};

async function main() {
  console.log("Reading Excel file...");
  const wb = xlsx.readFile(excelPath);
  
  const sqlStatements = [];
  sqlStatements.push('-- Script para recrear la tabla con 154 puntos y coordenadas');
  sqlStatements.push('DROP TABLE IF EXISTS public.charging_points;');
  sqlStatements.push(`
CREATE TABLE public.charging_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    region TEXT,
    province TEXT,
    city_or_canton TEXT NOT NULL,
    name TEXT NOT NULL,
    speed TEXT,
    charger_type TEXT,
    power TEXT,
    schedule TEXT,
    cost_type TEXT,
    gps_link TEXT,
    lat NUMERIC,
    lng NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.charging_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura pública de puntos de carga" ON public.charging_points FOR SELECT USING (true);
  `);
  
  sqlStatements.push('BEGIN;');

  let totalProcessed = 0;

  for (const sheetName of wb.SheetNames) {
    if (sheetName === '📋 Inicio' || sheetName === '➕ Reportar Punto') continue;
    
    let region = '';
    if (sheetName.includes('Costa')) region = 'Costa';
    else if (sheetName.includes('Sierra')) region = 'Sierra';
    else if (sheetName.includes('Amazonía')) region = 'Amazonía';
    else if (sheetName.includes('Ruta')) region = 'Ruta Q-G';
    else region = sheetName;

    const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    
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

      let lat = 'NULL';
      let lng = 'NULL';

      if (enlace_gps && enlace_gps.startsWith('http')) {
        try {
          const finalUrl = await resolveUrl(enlace_gps);
          const coords = extractCoords(finalUrl);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          }
        } catch (e) {
          console.error(`Failed to resolve URL ${enlace_gps}: ${e.message}`);
        }
      }

      const sql = `INSERT INTO public.charging_points (region, province, city_or_canton, name, speed, charger_type, power, schedule, cost_type, gps_link, lat, lng) VALUES (${escapeStr(region)}, ${escapeStr(provincia)}, ${escapeStr(canton)}, ${escapeStr(nombre)}, ${escapeStr(velocidad)}, ${escapeStr(tipo_cargador)}, ${escapeStr(potencia)}, ${escapeStr(horario)}, ${escapeStr(costo)}, ${escapeStr(enlace_gps)}, ${lat}, ${lng});`;
      
      sqlStatements.push(sql);
      totalProcessed++;
      
      if (totalProcessed % 20 === 0) {
        console.log(`Processed ${totalProcessed} items...`);
      }
    }
  }

  sqlStatements.push('COMMIT;');
  
  fs.writeFileSync(sqlPath, sqlStatements.join('\n'), 'utf8');
  console.log(`Finished processing. Total items: ${totalProcessed}`);
  console.log(`Generated ${sqlPath}`);
}

main().catch(console.error);
