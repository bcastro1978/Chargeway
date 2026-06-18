const xlsx = require('xlsx');
const path = require('path');
const https = require('https');
const fs = require('fs');

// Helpers for HTTP requests
function resolveUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(url);
    https.get(url, (res) => {
      resolve(res.headers.location || url);
    }).on('error', () => resolve(url));
  });
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return resolve('');
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function extractCoordinates(html, finalUrl) {
  // 1. Try to get coordinates from the URL itself (e.g. !3dlat!4dlng or @lat,lng)
  const urlMatch1 = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (urlMatch1) {
    return { lat: parseFloat(urlMatch1[1]), lng: parseFloat(urlMatch1[2]) };
  }
  const urlMatch2 = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlMatch2) {
    return { lat: parseFloat(urlMatch2[1]), lng: parseFloat(urlMatch2[2]) };
  }

  // 2. Try to find the specific location coordinates in the HTML
  // Look for the pin position specifically, not just the map center
  const pinMatch = html.match(/\[\[\[(-?\d+\.\d+),(-?\d+\.\d+)\],\[(?:.+?)\]/);
  if (pinMatch) {
    // Google Maps usually has [lng, lat] in these structures
    const val1 = parseFloat(pinMatch[1]);
    const val2 = parseFloat(pinMatch[2]);
    if (Math.abs(val1) > Math.abs(val2)) {
      return { lat: val2, lng: val1 };
    } else {
      return { lat: val1, lng: val2 };
    }
  }

  // Fallback to the original logic but be wary of the generic Quito center
  const match2 = html.match(/content="https:\/\/maps\.google\.com\/maps\/api\/staticmap\?center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
  if (match2) {
    const lat = parseFloat(match2[1]);
    const lng = parseFloat(match2[2]);
    // -0.3080192, -78.4662528 is the generic center of Quito.
    // If we get this for a location outside Quito (e.g. Esmeraldas), it's likely a default fallback in the HTML.
    if (lat === -0.3080192 && lng === -78.4662528) {
      // Don't return this if it's likely a generic fallback
      return null;
    }
    return { lat, lng };
  }
  
  const match3 = html.match(/APP_INITIALIZATION_STATE=\[\[\[(?:.+?),(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  if (match3) {
    const val1 = parseFloat(match3[1]);
    const val2 = parseFloat(match3[2]);
    if (Math.abs(val1) > Math.abs(val2)) {
      return { lat: val2, lng: val1 };
    } else {
      return { lat: val1, lng: val2 };
    }
  }

  return null;
}

async function processRow(row, sheetName, index) {
  const [num, provincia, canton, nombre, velocidad, tipo, potencia, horario, costo, enlace] = row;
  
  const charger = {
    id: `excel-${sheetName}-${index}`,
    provincia: provincia || '',
    canton: canton || '',
    nombre: nombre || '',
    velocidad: velocidad || '',
    tipo_cargador: tipo || '',
    potencia: potencia || '',
    horario: horario || '',
    costo: costo || '',
    enlace_gps: enlace || '',
    lat: 0,
    lng: 0,
    fuente: 'Excel'
  };

  if (enlace && enlace.includes('maps.app.goo.gl')) {
    try {
      const finalUrl = await resolveUrl(enlace);
      const html = await fetchHtml(finalUrl);
      const coords = extractCoordinates(html, finalUrl);
      if (coords) {
        charger.lat = coords.lat;
        charger.lng = coords.lng;
        console.log(`[OK] Extracted coords for ${nombre}: ${coords.lat}, ${coords.lng}`);
      } else {
        console.log(`[WARN] Could not extract coords for ${nombre} from URL: ${finalUrl}`);
      }
    } catch (e) {
      console.log(`[ERROR] Failed to fetch coords for ${nombre}: ${e.message}`);
    }
  } else {
    // some might already be full coordinates in the excel or missing
    console.log(`[INFO] No maps.app.goo.gl link for ${nombre}, skipping coord extraction.`);
  }

  return charger;
}

async function run() {
  const filePath = path.join(__dirname, '..', 'bdd', 'EVEcuador_Mapa_Puntos_Carga.xlsx');
  const workbook = xlsx.readFile(filePath);
  
  const sheetsToProcess = ['🌊 Costa', '🏔️ Sierra', '🌳 Amazonía', '🛣️ Ruta Q-G'];
  let allChargers = [];

  for (const sheetName of sheetsToProcess) {
    if (!workbook.Sheets[sheetName]) {
      console.log(`[WARN] Sheet ${sheetName} not found.`);
      continue;
    }
    
    console.log(`\nProcessing sheet: ${sheetName}...`);
    const sheet = workbook.Sheets[sheetName];
    // header: 1 gives us an array of arrays
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Skip row 0 (title) and row 1 (headers)
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      // Skip empty rows
      if (!row || row.length === 0 || !row[1]) continue;
      
      const charger = await processRow(row, sheetName.replace(/[^a-zA-Z]/g, ''), i);
      allChargers.push(charger);
      
      // Delay to avoid rate limiting
      await delay(300);
    }
  }

  const outputPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'ecuador-chargers.json');
  fs.writeFileSync(outputPath, JSON.stringify(allChargers, null, 2));
  console.log(`\n[SUCCESS] Saved ${allChargers.length} chargers to ${outputPath}`);
}

run();
