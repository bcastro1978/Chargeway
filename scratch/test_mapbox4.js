const fs = require('fs');
const https = require('https');
const env = fs.readFileSync('.env.local', 'utf8');
const token = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_MAPBOX_TOKEN=')).split('=')[1].trim();

const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=supermaxi&language=es&country=ec&session_token=test-123&access_token=${token}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('V2 API:', json.suggestions ? json.suggestions.map(s => s.name + ' - ' + s.place_formatted) : json);
  });
});
