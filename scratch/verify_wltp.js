const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./src/lib/vehicles.json', 'utf8'));

let md = '# Comparativa y Verificación de Valores WLTP\n\n';
md += 'He calculado el valor WLTP esperado basándome en el estándar comercial (CLTC, NEDC o EPA) y lo he comparado con el valor WLTP que actualmente tiene el sistema.\n\n';
md += '> **Fórmulas utilizadas:**\n';
md += '> - De **CLTC a WLTP**: Se multiplicó por 0.85 (CLTC es ~15% más optimista)\n';
md += '> - De **NEDC a WLTP**: Se multiplicó por 0.85 (NEDC es ~15% más optimista)\n';
md += '> - De **EPA a WLTP**: Se multiplicó por 1.11 (EPA es ~11% más estricto)\n\n';

md += '| Vehículo | Comercial | Estándar | WLTP Actual (JSON) | WLTP Calculado | Diferencia |\n';
md += '|----------|-----------|----------|-------------------|----------------|------------|\n';

let differencesFound = 0;

data.sort((a,b)=>a.brand.localeCompare(b.brand)).forEach(v => {
  const comm = v.specs.commercial_range_km;
  const std = v.specs.commercial_standard;
  const currentWltp = v.specs.wltp_range_km || 0;
  
  let calcWltp = currentWltp;
  
  if (std === 'CLTC' || std === 'CLTC (Est)') {
    calcWltp = Math.round(comm * 0.85);
  } else if (std === 'NEDC') {
    calcWltp = Math.round(comm * 0.85);
  } else if (std === 'EPA') {
    calcWltp = Math.round(comm * 1.11);
  } else if (std === 'WLTP') {
    calcWltp = comm;
  }

  const diff = calcWltp - currentWltp;
  
  let diffStr = diff === 0 ? '✅ Ninguna' : (diff > 0 ? `+${diff} km` : `${diff} km`);
  
  if (Math.abs(diff) > 15) {
    diffStr = `⚠️ **${diffStr}**`;
    differencesFound++;
  }

  md += `| ${v.brand} ${v.model} | ${comm} km | ${std} | ${currentWltp} km | **${calcWltp} km** | ${diffStr} |\n`;
});

md += `\n**Total de vehículos con diferencias significativas (>15 km):** ${differencesFound}`;

fs.writeFileSync('C:/Users/boris/.gemini/antigravity-ide/brain/09f28612-0c7c-4d67-832f-cb541cec67ea/wltp_verification.md', md);
console.log('Verification completed');
