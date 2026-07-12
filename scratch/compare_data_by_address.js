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
    .replace(/avenida|av|calle|via|km|norte|sur|este|oeste/g, '') // remove common street words
    .trim();
}

function calculateSimilarity(s1, s2) {
  const words1 = s1.split(/\s+/).filter(w => w.length > 2);
  const words2 = s2.split(/\s+/).filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matches = 0;
  for (let w of words1) {
    if (words2.includes(w)) matches++;
  }
  return matches / Math.max(words1.length, words2.length);
}

async function run() {
  const wb = xlsx.readFile('electromaps_ecuador.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const electromapsData = xlsx.utils.sheet_to_json(ws);
  
  const { data: supabaseData, error } = await supabase.from('charging_points').select('*');
  if (error) {
    console.error("Supabase Error:", error);
    return;
  }
  
  const notRegistered = [];
  const matchesByAddress = [];
  
  for (const em of electromapsData) {
    const emAddress = normalizeStr(em.Ubicacion);
    const emName = normalizeStr(em.Estacion);
    
    let bestMatch = null;
    let highestScore = 0;
    
    for (const sb of supabaseData) {
      const sbAddress = normalizeStr(sb.address || sb.city_or_canton || '');
      const sbName = normalizeStr(sb.name);
      
      // Calculate address similarity
      let addrScore = calculateSimilarity(emAddress, sbAddress);
      
      // Give a small bonus if the names also loosely match, but heavily weigh address
      let nameScore = calculateSimilarity(emName, sbName);
      
      let finalScore = (addrScore * 0.8) + (nameScore * 0.2);
      
      if (finalScore > highestScore) {
        highestScore = finalScore;
        bestMatch = sb;
      }
    }
    
    if (highestScore < 0.35 || !bestMatch) {
      notRegistered.push(em);
    } else {
      matchesByAddress.push({
        em,
        sb: bestMatch,
        score: highestScore
      });
    }
  }
  
  // Save reports
  const report = {
    totalElectromaps: electromapsData.length,
    notRegistered,
    matchesByAddress
  };
  fs.writeFileSync('scratch/comparison_address_report.json', JSON.stringify(report, null, 2));
  console.log("Comparison by address done.");
}

run();
