const https = require('https');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const token = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_MAPBOX_TOKEN=')).split('=')[1].trim();

const url1 = `https://api.mapbox.com/geocoding/v5/mapbox.places/supermaxi.json?access_token=${token}&country=ec&types=poi`;
https.get(url1, res => {
  let data = ''; res.on('data', c => data += c);
  res.on('end', () => console.log('Mapbox POI:', JSON.parse(data).features.map(f=>f.place_name)));
});
