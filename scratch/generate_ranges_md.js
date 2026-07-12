const fs = require('fs'); 
const data = JSON.parse(fs.readFileSync('./src/lib/vehicles.json', 'utf8')); 
let md = '# Catálogo de Vehículos Eléctricos en ChargeWay\n\n';
md += 'A continuación se presenta la lista de marcas y modelos actualmente configurados en la plataforma, junto con su **Autonomía WLTP** (utilizada para los cálculos del sistema) y una **Estimación Matemática del ciclo NEDC/CLTC**.\n\n';
md += '> [!NOTE]\n> **Nota sobre el NEDC:** Como nuestra base de datos (`vehicles.json`) actualmente solo guarda el valor estricto `wltp_range_km`, los valores de la columna NEDC en esta tabla han sido calculados matemáticamente sumándole un ~15-18% al valor WLTP, que es la diferencia estándar promedio entre ambas homologaciones. Para que sean exactos a los del concesionario, deberíamos ingresar el dato comercial manual de cada uno.\n\n';
md += '| Marca | Modelo | Autonomía (WLTP) | Autonomía Comercial (NEDC/CLTC Estimado) |\n';
md += '|-------|--------|-----------------|-----------------------------------------|\n'; 
data.sort((a,b)=>a.brand.localeCompare(b.brand)).forEach(v => { 
  const wltp = v.specs.wltp_range_km;
  const nedc = wltp ? Math.round(wltp / 0.85) : 'N/D';
  md += `| **${v.brand}** | ${v.model} | ${wltp || 'N/D'} km | ~${nedc} km |\n`; 
}); 
fs.writeFileSync('C:/Users/boris/.gemini/antigravity-ide/brain/09f28612-0c7c-4d67-832f-cb541cec67ea/vehicle_ranges.md', md);
console.log('Done');
