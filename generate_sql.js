const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf-8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  const sb = createClient(url, key);

  const { data: chargers, error } = await sb.from('charging_points').select('*');
  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  let sql = `-- LIMPIEZA DE DATOS GEOESPACIALES - PUNTOS DE CARGA\n-- Generado automáticamente para corregir provincias y cantones\n\n`;

  for (const c of chargers) {
    // 1. Delete header/invalid rows
    if (c.province === 'PROVINCIA' || c.province === 'CIUDAD / SECTOR' || c.name === 'NOMBRE DEL PUNTO' || c.name === 'VELOCIDAD') {
      sql += `-- Eliminar fila de encabezado inválida: ${c.name}\n`;
      sql += `DELETE FROM public.charging_points WHERE id = '${c.id}';\n\n`;
      continue;
    }

    // 2. Extract lat/lng from gps_link if missing
    let lat = c.lat;
    let lng = c.lng;

    if ((lat === null || lng === null) && c.gps_link) {
      const regex1 = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const regex2 = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
      const m1 = c.gps_link.match(regex1);
      const m2 = c.gps_link.match(regex2);
      if (m1) { lat = parseFloat(m1[1]); lng = parseFloat(m1[2]); }
      else if (m2) { lat = parseFloat(m2[1]); lng = parseFloat(m2[2]); }
    }

    let prov = c.province;
    let cant = c.city_or_canton;
    let needsUpdate = false;

    if (lat !== null && lng !== null) {
      // Out of bounds check for Ecuador roughly
      if (lat > 2 || lat < -6 || lng < -82 || lng > -75) {
         if (lng > 2 || lng < -6 || lat < -82 || lat > -75) {
             const temp = lat; lat = lng; lng = temp;
             needsUpdate = true;
         }
      }

      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`);
        const geo = await res.json();
        
        let apiProv = geo.principalSubdivision;
        let apiCant = geo.city || geo.locality;

        if (apiProv) {
          apiProv = apiProv.replace(' Province', '').replace('Provincia de ', '');
          if (apiProv === 'Santo Domingo de los Tsachilas') apiProv = 'Santo Domingo de los Tsáchilas';
        }

        if (apiProv && apiProv !== prov) {
          prov = apiProv; cant = apiCant || cant; needsUpdate = true;
        } else if (apiCant && apiCant !== cant && apiCant !== 'Ecuador') {
          cant = apiCant; needsUpdate = true;
        }

      } catch (err) {}
    } else {
      const map = {
        'Quito — Valle Chillos': { p: 'Pichincha', c: 'Quito' },
        'Cerca de Aloag': { p: 'Pichincha', c: 'Mejía' },
        'Latacunga': { p: 'Cotopaxi', c: 'Latacunga' },
        'Ambato — Mall de los Andes': { p: 'Tungurahua', c: 'Ambato' },
        'Pelileo': { p: 'Tungurahua', c: 'Pelileo' },
        'Pallatanga': { p: 'Chimborazo', c: 'Pallatanga' },
        'Bucay': { p: 'Guayas', c: 'Bucay' },
        'Patricia Pilar — Los Ríos': { p: 'Los Ríos', c: 'Buena Fe' },
        'Guayaquil — Parque Samanes': { p: 'Guayas', c: 'Guayaquil' },
        'Guayaquil — Salinas/Ceibos': { p: 'Guayas', c: 'Guayaquil' }
      };
      if (map[prov]) {
        cant = map[prov].c; prov = map[prov].p; needsUpdate = true;
      }
    }

    if (lat !== c.lat || lng !== c.lng) needsUpdate = true;

    if (needsUpdate) {
      let lVal = lat === null ? 'NULL' : lat;
      let lngVal = lng === null ? 'NULL' : lng;
      sql += `-- Corregir registro: ${c.name}\n`;
      sql += `UPDATE public.charging_points \nSET province = '${prov}', city_or_canton = '${cant}', lat = ${lVal}, lng = ${lngVal}\nWHERE id = '${c.id}';\n\n`;
    }
  }

  fs.writeFileSync('limpieza_provincias.sql', sql);
  console.log('SQL generado en limpieza_provincias.sql');
}

main().catch(console.error);
