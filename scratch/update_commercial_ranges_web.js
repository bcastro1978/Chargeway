const fs = require('fs');
const path = './src/lib/vehicles.json';
let data = JSON.parse(fs.readFileSync(path, 'utf8'));

const updates = {
  'GAC Aion Y Plus': { commercial: 490, std: 'NEDC' },
  'Leapmotor T03': { commercial: 418, std: 'CLTC' },
  'JAC E30X': { commercial: 405, std: 'CLTC' },
  'Dongfeng Mage EV': { commercial: 445, std: 'CLTC' },
  'Geely Geometry C': { commercial: 550, std: 'NEDC' }
};

let changes = 0;
data.forEach(v => {
  const modelName = v.brand + ' ' + v.model;
  if (updates[modelName]) {
    v.specs.commercial_range_km = updates[modelName].commercial;
    v.specs.commercial_standard = updates[modelName].std;
    changes++;
  }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));

// Update the markdown
let md = '# Catálogo de Vehículos Eléctricos en ChargeWay (Fichas Técnicas Ecuador)\n\n';
md += 'A continuación se presenta la lista con la **Autonomía WLTP real** utilizada para cálculos en la app, y la **Autonomía Comercial** oficial de ficha técnica de Ecuador.\n\n';
md += '| Marca | Modelo | Autonomía Cálculo (WLTP) | Autonomía Comercial | Estándar Publicitado |\n';
md += '|-------|--------|--------------------------|---------------------|----------------------|\n'; 

data.sort((a,b)=>a.brand.localeCompare(b.brand)).forEach(v => { 
  md += `| **${v.brand}** | ${v.model} | ${v.specs.wltp_range_km || 'N/D'} km | **${v.specs.commercial_range_km} km** | ${v.specs.commercial_standard} |\n`; 
}); 
fs.writeFileSync('C:/Users/boris/.gemini/antigravity-ide/brain/09f28612-0c7c-4d67-832f-cb541cec67ea/vehicle_ranges_actualizado.md', md);
console.log('Updated ' + changes + ' vehicles based on Ecuadorian web verification.');
