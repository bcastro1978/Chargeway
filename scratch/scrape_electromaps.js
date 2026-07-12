const fs = require('fs');
const https = require('https');

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function run() {
  const html = await fetchUrl('https://www.electromaps.com/es/puntos-carga/ecuador');
  const matches = html.match(/href="\/es\/puntos-carga\/ecuador\/[^"]+"/g);
  const links = [...new Set(matches)];
  console.log('Found province links:', links);
}
run();
