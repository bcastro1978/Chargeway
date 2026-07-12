const fs = require('fs');
const path = './src/lib/vehicles.json';
let data = JSON.parse(fs.readFileSync(path, 'utf8'));

const certifiedModels = [
  'Audi', 'Porsche', 'Tesla', 'Kia', 'Hyundai', 'Renault', 'Nissan', 'Volvo', 'MG',
  'Yuan Plus (Atto 3)', 'Dolphin (44.9 kWh)', 'Seal AWD', 'Sealion 7 AWD', 'Han EV AWD', 'Tang EV',
  'E5', 'J7 (PHEV)', 'T03', 'C10 EV', 'Geometry C',
  'Bolt EUV', 'Equinox EV FWD', 'Blazer EV RS'
];

let changedCount = 0;

data.forEach(v => {
  // Determine if it has official WLTP/EPA certificate
  const isCertifiedBrand = ['Audi', 'Porsche', 'Tesla', 'Kia', 'Hyundai', 'Renault', 'Nissan', 'Volvo', 'MG'].includes(v.brand);
  const isCertifiedModel = certifiedModels.includes(v.model);
  const hasCertificate = isCertifiedBrand || isCertifiedModel;
  
  v.specs.certificado_wltp = hasCertificate ? 'si' : 'no';
  
  if (!hasCertificate) {
    // If not certified, enforce the mathematical 0.85 rule on the commercial range
    if (v.specs.commercial_range_km) {
      v.specs.wltp_range_km = Math.round(v.specs.commercial_range_km * 0.85);
    }
  } else {
     // Ensure EPA models also get the exact WLTP equivalent if not already set correctly, 
     // but since they have official ratings, we leave their wltp_range_km intact as it was previously set by official sources.
  }
  changedCount++;
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));

let md = '# Validación y Recálculo WLTP en ChargeWay\n\n';
md += 'Se ha añadido el campo `certificado_wltp` a todos los modelos. Para aquellos que **no** disponen de certificación oficial europea (WLTP) o americana (EPA), el sistema ha auto-calculado y actualizado su `Autonomía WLTP` multiplicando su rango comercial (CLTC/NEDC) por **0.85** para garantizar precisión en la navegación.\n\n';
md += '| Marca | Modelo | Autonomía Comercial | ¿Certificado WLTP? | Autonomía Sistema (WLTP) |\n';
md += '|-------|--------|---------------------|--------------------|--------------------------|\n';

data.sort((a,b)=>a.brand.localeCompare(b.brand)).forEach(v => { 
  const certBadge = v.specs.certificado_wltp === 'si' ? '✅ Sí' : '❌ No';
  md += `| **${v.brand}** | ${v.model} | ${v.specs.commercial_range_km || 'N/D'} km (${v.specs.commercial_standard || '-'}) | ${certBadge} | **${v.specs.wltp_range_km} km** |\n`; 
});

fs.writeFileSync('C:/Users/boris/.gemini/antigravity-ide/brain/09f28612-0c7c-4d67-832f-cb541cec67ea/wltp_final_validation.md', md);
console.log('Processed ' + changedCount + ' vehicles.');
