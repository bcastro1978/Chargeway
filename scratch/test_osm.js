const https = require('https');

const queries = ['supermaxi', 'supermaxi san gabriel', 'quito'];
queries.forEach(q => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=ec&format=json&limit=5`;
  https.get(url, { headers: { 'User-Agent': 'ChargeWay-App' } }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`OSM [${q}]:`, json.map(j => j.display_name));
      } catch (e) {
        console.error(e);
      }
    });
  });
});
