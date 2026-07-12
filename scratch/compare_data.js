const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig('./');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function normalizeStr(s) {
  if (!s) return '';
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, '') // remove special chars
    .trim();
}

function calculateSimilarity(s1, s2) {
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  let matches = 0;
  for (let w of words1) {
    if (w.length > 2 && words2.includes(w)) matches++;
  }
  return matches / Math.max(words1.length, words2.length);
}

async function run() {
  // 1. Read Excel
  const wb = xlsx.readFile('electromaps_ecuador.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const electromapsData = xlsx.utils.sheet_to_json(ws);
  
  // 2. Fetch Supabase Data
  const { data: supabaseData, error } = await supabase.from('charging_points').select('*');
  if (error) {
    console.error("Supabase Error:", error);
    return;
  }
  
  const notRegistered = [];
  const differentAddress = [];
  const differentType = [];
  
  // 3. Compare
  for (const em of electromapsData) {
    const emName = normalizeStr(em.Estacion);
    const emAddress = normalizeStr(em.Ubicacion);
    const emType = normalizeStr(em.TipoCargador);
    
    // Find best match in Supabase
    let bestMatch = null;
    let highestScore = 0;
    
    for (const sb of supabaseData) {
      const sbName = normalizeStr(sb.name);
      // Basic check
      let score = calculateSimilarity(emName, sbName);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = sb;
      }
    }
    
    // Threshold for match (e.g. > 0.4)
    if (highestScore < 0.4 || !bestMatch) {
      notRegistered.push(em);
    } else {
      // Match found, check for differences
      const sbAddress = normalizeStr(bestMatch.address || bestMatch.city_or_canton || '');
      const sbType = normalizeStr(bestMatch.charger_type);
      
      // Address comparison (allow partial matches)
      if (emAddress && sbAddress && !emAddress.includes(sbAddress) && !sbAddress.includes(emAddress) && calculateSimilarity(emAddress, sbAddress) < 0.3) {
        differentAddress.push({
          em,
          sb: bestMatch
        });
      }
      
      // Type comparison (e.g. "ccs2" vs "cs2")
      // Since parsing is tricky, we just look for major keyword differences
      if (emType !== 'desconocido' && sbType !== 'desconocido') {
        const emTypeKeys = emType.split(' ').filter(x => x.length > 2);
        let typeMatch = false;
        for (let k of emTypeKeys) {
          if (sbType.includes(k) || (k === 'ccs2' && sbType.includes('cs2'))) {
            typeMatch = true;
          }
        }
        // If no keyword matched
        if (!typeMatch && emTypeKeys.length > 0) {
          differentType.push({
            em,
            sb: bestMatch
          });
        }
      }
    }
  }
  
  // Save reports
  const report = {
    totalElectromaps: electromapsData.length,
    totalSupabase: supabaseData.length,
    notRegistered,
    differentAddress,
    differentType
  };
  fs.writeFileSync('scratch/comparison_report.json', JSON.stringify(report, null, 2));
  console.log("Comparison done. Check scratch/comparison_report.json");
}

run();
