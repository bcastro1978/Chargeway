const fs = require('fs');
const https = require('https');
const env = fs.readFileSync('.env.local', 'utf8');
const token = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_MAPBOX_TOKEN=')).split('=')[1].trim();

const queries = ['supermaxi', 'supermaxi san gabri', 'quito'];
queries.forEach(query => {
  const url1 = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&autocomplete=true&limit=5&country=ec`;
  const url2 = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + ' Ecuador')}.json?access_token=${token}&autocomplete=true&limit=5`;
  
  https.get(url1, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const json = JSON.parse(data);
      console.log('URL1 (country=ec):', query, '\n', json.features ? json.features.map(f => f.place_name) : 'No features');
    });
  });
  https.get(url2, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const json = JSON.parse(data);
      console.log('URL2 (+ Ecuador):', query, '\n', json.features ? json.features.map(f => f.place_name) : 'No features');
    });
  });
});
