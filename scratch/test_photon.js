const https = require('https');
const queries = ['supermaxi', 'supermaxi san ga', 'supermaxi san gabriel', 'supermaxi, san ga'];
queries.forEach(q => {
  https.get(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=-0.1807&lon=-78.5249&limit=5`, res => {
    let data = ''; res.on('data', c => data += c);
    res.on('end', () => {
      try {
        console.log('Photon [', q, ']:', JSON.parse(data).features.map(f => f.properties.name + ', ' + (f.properties.city || f.properties.state)));
      } catch (e) {
        console.error('Error for', q, e.message);
      }
    });
  });
});
