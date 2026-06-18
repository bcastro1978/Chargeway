const https = require('https');
require('dotenv').config({ path: '.env.local' });

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const query = 'supermaxi san gabri';
const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=ec&autocomplete=true`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.features.forEach(f => {
      console.log(f.text, '|', f.place_name);
    });
  });
});
