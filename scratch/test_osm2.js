const https = require('https');
const q = 'supermaxi san gabri';
const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=ec&format=json&limit=5`;
https.get(url, { headers: { 'User-Agent': 'ChargeWay-App' } }, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).map(x=>x.display_name)));
});
