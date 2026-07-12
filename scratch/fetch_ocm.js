const https = require('https');
const url = 'https://api.openchargemap.io/v3/poi?key=432e0365-bb32-4c25-a991-7655d10ad0d2&countrycode=EC&maxresults=1000';

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const types = {};
      data.forEach(poi => {
        if(poi.Connections) {
          poi.Connections.forEach(c => {
            const t = c.ConnectionType ? c.ConnectionType.Title : 'Unknown';
            types[t] = (types[t] || 0) + 1;
          });
        }
      });
      console.log('Total stations found:', data.length);
      console.log('Charger Types Distribution:');
      Object.entries(types).sort((a,b) => b[1] - a[1]).forEach(([t, count]) => console.log(`- ${t}: ${count} conectores`));
    } catch(e) {
      console.error('Error parsing:', e);
    }
  });
}).on('error', e => console.error(e));
