const fs = require('fs');
const xlsx = require('xlsx');

function run() {
  // Read reports
  const rName = JSON.parse(fs.readFileSync('scratch/comparison_report.json', 'utf8'));
  const rAddress = JSON.parse(fs.readFileSync('scratch/comparison_address_report.json', 'utf8'));

  const wb = xlsx.utils.book_new();

  // Sheet 1: No Registrados (Cruce por Nombre)
  const wsNoRegName = xlsx.utils.json_to_sheet(rName.notRegistered.map(x => ({
    'Provincia': x.Provincia,
    'Estación (Electromaps)': x.Estacion,
    'Dirección (Electromaps)': x.Ubicacion,
    'Tipo Cargador': x.TipoCargador,
    'URL': x.URL
  })));
  xlsx.utils.book_append_sheet(wb, wsNoRegName, "Faltantes (x Nombre)");

  // Sheet 2: Diferente Dirección
  const wsDiffAddr = xlsx.utils.json_to_sheet(rName.differentAddress.map(x => ({
    'Estación': x.em.Estacion,
    'Dirección Electromaps': x.em.Ubicacion,
    'Dirección Supabase': x.sb.address || x.sb.city_or_canton || 'N/A'
  })));
  xlsx.utils.book_append_sheet(wb, wsDiffAddr, "Dif. Dirección");

  // Sheet 3: Diferente Tipo
  const wsDiffType = xlsx.utils.json_to_sheet(rName.differentType.map(x => ({
    'Estación': x.em.Estacion,
    'Tipo Electromaps': x.em.TipoCargador,
    'Tipo Supabase': x.sb.charger_type || 'N/A'
  })));
  xlsx.utils.book_append_sheet(wb, wsDiffType, "Dif. Tipo Cargador");

  // Sheet 4: No Registrados (Cruce por Dirección)
  const wsNoRegAddr = xlsx.utils.json_to_sheet(rAddress.notRegistered.map(x => ({
    'Provincia': x.Provincia,
    'Estación (Electromaps)': x.Estacion,
    'Dirección (Electromaps)': x.Ubicacion,
    'Tipo Cargador': x.TipoCargador
  })));
  xlsx.utils.book_append_sheet(wb, wsNoRegAddr, "Faltantes (x Dirección)");

  // Save the file
  const filePath = 'C:\\PERSONAL\\IA\\ChargeWay\\cruce_electromaps_supabase.xlsx';
  xlsx.writeFile(wb, filePath);
  console.log("Excel generated:", filePath);
}

run();
