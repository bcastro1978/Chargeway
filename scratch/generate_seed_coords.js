const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'ecuador-chargers.json');
const sqlPath = path.join(__dirname, 'seed_with_coords.sql');

try {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const sqlStatements = [];
  sqlStatements.push('-- Script para recrear la tabla con latitud y longitud');
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
  
  data.forEach(item => {
    // "id" is string like "excel-Costa-2", let's extract region if possible or just guess
    let region = 'Costa';
    if (item.id && item.id.includes('Sierra')) region = 'Sierra';
    if (item.id && item.id.includes('Amazonia')) region = 'Amazonía';
    if (item.id && item.id.includes('Ruta')) region = 'Ruta Q-G';

    const escapeStr = (str) => {
      if (str === null || str === undefined || str === '') return 'NULL';
      return "'" + String(str).replace(/'/g, "''") + "'";
    };
    
    const lat = item.lat || 'NULL';
    const lng = item.lng || 'NULL';

    const sql = `INSERT INTO public.charging_points (region, province, city_or_canton, name, speed, charger_type, power, schedule, cost_type, gps_link, lat, lng) VALUES (${escapeStr(region)}, ${escapeStr(item.provincia)}, ${escapeStr(item.canton)}, ${escapeStr(item.nombre)}, ${escapeStr(item.velocidad)}, ${escapeStr(item.tipo_cargador)}, ${escapeStr(item.potencia)}, ${escapeStr(item.horario)}, ${escapeStr(item.costo)}, ${escapeStr(item.enlace_gps)}, ${lat}, ${lng});`;
    
    sqlStatements.push(sql);
  });
  
  sqlStatements.push('COMMIT;');
  
  fs.writeFileSync(sqlPath, sqlStatements.join('\n'), 'utf8');
  console.log(`Generated ${sqlPath}`);
} catch (err) {
  console.error("Error:", err);
}
