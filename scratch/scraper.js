const fs = require('fs');
const https = require('https');
const cheerio = require('cheerio');
const xlsx = require('xlsx');

const BASE_URL = 'https://www.electromaps.com';

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchHtml(res.headers.location.startsWith('http') ? res.headers.location : BASE_URL + res.headers.location));
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching main page...');
  try {
    const mainHtml = await fetchHtml(BASE_URL + '/es/puntos-carga/ecuador');
    let $ = cheerio.load(mainHtml);
    
    // Webflow SEO pages usually link to provinces
    const provinceLinks = [];
    $('a[href*="/es/puntos-carga/ecuador/"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !provinceLinks.includes(href) && href.split('/').length === 5) {
        provinceLinks.push(href);
      }
    });
    console.log(`Found ${provinceLinks.length} province links.`);

    let allStations = [];

    for (let pLink of provinceLinks) {
      console.log('Fetching province:', pLink);
      const provHtml = await fetchHtml(BASE_URL + pLink);
      const $prov = cheerio.load(provHtml);
      
      const stationLinks = [];
      $prov('a[href*="/es/puntos-carga/ecuador/"]').each((i, el) => {
        const href = $prov(el).attr('href');
        // A station link usually has the province and then the station name
        if (href && href !== pLink && href.startsWith(pLink + '/') && !stationLinks.includes(href)) {
          stationLinks.push(href);
        }
      });
      
      for (let sLink of stationLinks) {
        console.log('  - Fetching station:', sLink);
        const stHtml = await fetchHtml(BASE_URL + sLink);
        const $st = cheerio.load(stHtml);
        
        const name = $st('h1').text().trim();
        const address = $st('.address-class').text().trim() || $st('address').text().trim() || 'Desconocido'; // Update selectors based on actual HTML
        // Extract basic text as a fallback since Webflow classes vary
        const textContent = $st('body').text().replace(/\s+/g, ' ');
        
        let typeMatch = textContent.match(/(Type 2|CCS2|CCS1|GB\/T|CHAdeMO|Schuko)/gi);
        let chargerTypes = typeMatch ? [...new Set(typeMatch)].join(', ') : 'Desconocido';

        allStations.push({
          Provincia: pLink.split('/').pop(),
          Estacion: name,
          Ubicacion: address,
          TipoCargador: chargerTypes,
          URL: BASE_URL + sLink
        });
      }
    }

    console.log('Extraction complete. Total stations:', allStations.length);
    
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(allStations);
    xlsx.utils.book_append_sheet(wb, ws, "Estaciones");
    
    const filePath = 'C:\\PERSONAL\\IA\\ChargeWay\\electromaps_ecuador.xlsx';
    xlsx.writeFile(wb, filePath);
    console.log('Saved to:', filePath);

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
