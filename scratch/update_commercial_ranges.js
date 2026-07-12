const fs = require('fs');
const path = './src/lib/vehicles.json';
let data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Mapa de autonomía comercial anunciada en fichas técnicas de Ecuador
const commercialRanges = {
  'BYD Yuan Plus (Atto 3)': { range: 480, std: 'NEDC' },
  'BYD Yuan Pro': { range: 401, std: 'NEDC' },
  'BYD Dolphin (44.9 kWh)': { range: 405, std: 'NEDC' },
  'BYD Seagull (30 kWh)': { range: 305, std: 'NEDC' },
  'BYD Seagull (38.8 kWh)': { range: 405, std: 'NEDC' },
  'BYD Seal AWD': { range: 650, std: 'CLTC' },
  'BYD Sealion 7 AWD': { range: 610, std: 'CLTC' },
  'BYD Han EV AWD': { range: 610, std: 'CLTC' },
  'BYD Tang EV': { range: 635, std: 'CLTC' },
  'BYD Song Plus EV': { range: 520, std: 'CLTC' },
  'Kia EV3 Long Range': { range: 600, std: 'WLTP' },
  'Kia EV5 (64.2 kWh)': { range: 530, std: 'NEDC' },
  'Kia EV6 (77.4 kWh) RWD': { range: 528, std: 'WLTP' },
  'Kia Niro EV (64 kWh)': { range: 460, std: 'NEDC' },
  'Kia EV9 GT-Line (99.8 kWh)': { range: 505, std: 'WLTP' },
  'Renault Kwid E-Tech': { range: 298, std: 'WLTP' },
  'Renault Megane E-Tech': { range: 450, std: 'WLTP' },
  'Hyundai Ioniq 5 (77.4 kWh) AWD': { range: 480, std: 'NEDC' },
  'Hyundai Kona EV (64 kWh)': { range: 484, std: 'WLTP' },
  'MG ZS EV Long Range': { range: 440, std: 'WLTP' },
  'MG Marvel R AWD': { range: 370, std: 'WLTP' },
  'Audi e-tron 55 quattro': { range: 436, std: 'WLTP' },
  'Audi e-tron GT quattro': { range: 488, std: 'WLTP' },
  'Porsche Taycan 4S (Plus)': { range: 463, std: 'WLTP' },
  'Nissan Leaf (40 kWh)': { range: 378, std: 'NEDC' },
  'Tesla Model 3 RWD': { range: 438, std: 'EPA' },
  'Geely Geometry C': { range: 460, std: 'WLTP' },
  'GAC Aion Y Plus': { range: 510, std: 'NEDC' },
  'Volvo EX30 Ultra Single Motor': { range: 476, std: 'WLTP' },
  'Chevrolet Bolt EUV': { range: 397, std: 'EPA' },
  'Geely EX2': { range: 322, std: 'NEDC' },
  'Geely EX5': { range: 530, std: 'CLTC' },
  'Geely Starray EM-i (PHEV)': { range: 150, std: 'CLTC' },
  'JAC E30X': { range: 505, std: 'CLTC' },
  'Leapmotor T03': { range: 403, std: 'CLTC' },
  'Leapmotor C10 EV': { range: 530, std: 'CLTC' },
  'Chevrolet Equinox EV FWD': { range: 513, std: 'EPA' },
  'GAC Aion UT': { range: 600, std: 'CLTC' },
  'GAC Aion ES': { range: 460, std: 'NEDC' },
  'GAC Aion V': { range: 600, std: 'NEDC' },
  'Chevrolet Blazer EV RS': { range: 521, std: 'EPA' },
  'Chevrolet Spark EUV': { range: 360, std: 'NEDC' },
  'Chevrolet Captiva EV': { range: 400, std: 'CLTC' },
  'Skyworth EV6 II': { range: 620, std: 'CLTC' },
  'Dongfeng Mage EV': { range: 500, std: 'CLTC' },
  'Skywell BE11': { range: 520, std: 'CLTC' },
  'Wuling Bingo': { range: 333, std: 'CLTC' },
  'Wuling Bingo S': { range: 410, std: 'CLTC' },
  'Omoda E5': { range: 450, std: 'CLTC' },
  'Jaecoo J7 (PHEV)': { range: 90, std: 'WLTP' }
};

data.forEach(v => {
  const modelName = v.brand + ' ' + v.model;
  const match = commercialRanges[modelName] || commercialRanges[v.model] || commercialRanges[v.brand + ' ' + v.model.replace(' (Plus)','')];
  if (match) {
    v.specs.commercial_range_km = match.range;
    v.specs.commercial_standard = match.std;
  } else {
    // Fallback if name mismatches slightly
    const est = Math.round((v.specs.wltp_range_km || 400) / 0.85);
    v.specs.commercial_range_km = est;
    v.specs.commercial_standard = 'CLTC (Est)';
  }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));

// Generate the artifact table
let md = '# Catálogo de Vehículos Eléctricos en ChargeWay (Fichas Técnicas Ecuador)\n\n';
md += 'A continuación se presenta la lista con la **Autonomía WLTP real** utilizada para cálculos en la app, y la **Autonomía Comercial** oficial de ficha técnica.\n\n';
md += '| Marca | Modelo | Autonomía Cálculo (WLTP) | Autonomía Comercial | Estándar Publicitado |\n';
md += '|-------|--------|--------------------------|---------------------|----------------------|\n'; 

data.sort((a,b)=>a.brand.localeCompare(b.brand)).forEach(v => { 
  md += `| **${v.brand}** | ${v.model} | ${v.specs.wltp_range_km || 'N/D'} km | **${v.specs.commercial_range_km} km** | ${v.specs.commercial_standard} |\n`; 
}); 

fs.writeFileSync('C:/Users/boris/.gemini/antigravity-ide/brain/09f28612-0c7c-4d67-832f-cb541cec67ea/vehicle_ranges_actualizado.md', md);
console.log('Actualizado y generado.');
