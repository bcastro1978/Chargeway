const fs = require('fs');
const path = require('path');

const filePath = 'c:\\\\PERSONAL\\\\IA\\\\ChargeWay\\\\src\\\\lib\\\\vehicles.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let markdownTable = '| Marca | Modelo | Estándar Comercial | Autonomía Comercial (km) | Nuevo WLTP Estimado (km) |\n';
markdownTable += '|---|---|---|---|---|\n';

let updatedCount = 0;

for (const vehicle of data) {
  if (vehicle.specs.certificado_wltp === 'no' && vehicle.specs.commercial_range_km) {
    const oldWltp = vehicle.specs.wltp_range_km;
    const newWltp = Math.round(vehicle.specs.commercial_range_km * 0.85);
    
    vehicle.specs.wltp_range_km = newWltp;
    
    markdownTable += `| ${vehicle.brand} | ${vehicle.model} | ${vehicle.specs.commercial_standard} | ${vehicle.specs.commercial_range_km} | **${newWltp}** (antes ${oldWltp}) |\n`;
    updatedCount++;
  } else if (vehicle.specs.certificado_wltp === 'si' || !vehicle.specs.commercial_range_km) {
    // If it's already WLTP, just add it to the table without changes
    const wltp = vehicle.specs.wltp_range_km || 'N/A';
    const comm = vehicle.specs.commercial_range_km || 'N/A';
    const std = vehicle.specs.commercial_standard || 'WLTP';
    // Let's only include updated ones in the summary table to avoid a massive table, or maybe include all?
    // The user asked for "la tabla de marcas y modelos como queda despues de la actualizacion".
    // It's probably better to show all, or maybe just a clean table of all models.
  }
}

// Let's build a clean table of ALL models for the final output.
let fullTable = '| Marca | Modelo | Estándar Comercial | Rango Comercial | Rango WLTP (Usado en App) |\n';
fullTable += '|---|---|---|---|---|\n';

for (const vehicle of data) {
  const comm = vehicle.specs.commercial_range_km ? `${vehicle.specs.commercial_range_km} km` : '-';
  const std = vehicle.specs.commercial_standard || 'WLTP';
  const wltp = vehicle.specs.wltp_range_km ? `${vehicle.specs.wltp_range_km} km` : '-';
  let isEstimated = vehicle.specs.certificado_wltp === 'no' ? ' *(Estimado 0.85)*' : '';
  
  if (vehicle.specs.certificado_wltp === 'no' && !vehicle.specs.commercial_range_km) {
      isEstimated = '';
  }

  fullTable += `| **${vehicle.brand}** | ${vehicle.model} | ${std} | ${comm} | **${wltp}**${isEstimated} |\n`;
}


fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log(`\nUpdated ${updatedCount} vehicles.\n`);
console.log('--- FULL TABLE ---');
console.log(fullTable);
