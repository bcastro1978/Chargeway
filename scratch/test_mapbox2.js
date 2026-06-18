const https = require('https');
require('dotenv').config({ path: '.env.local' });

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const queries = ['supermaxi', 'supermaxi san gabri', 'quito'];

queries.forEach(query => {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&autocomplete=true&limit=5&country=ec&types=poi,address,place,neighborhood`;
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`\nResults for "${query}":`, json.features ? json.features.length : 'Error', json.message || '');
        if (json.features) {
          json.features.forEach(f => {
            console.log(' -', f.text, '|', f.place_name, '|', f.place_type);
          });
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    });
  });
});
