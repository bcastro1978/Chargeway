const https = require('https');
const http = require('http');

function resolveUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolveUrl(res.headers.location).then(resolve).catch(reject);
      } else {
        resolve(url);
      }
    }).on('error', reject);
  });
}

resolveUrl('https://maps.app.goo.gl/TxtHtmJr1eAE1btV8').then(finalUrl => {
  console.log('Final URL:', finalUrl);
  const match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    console.log('Lat:', match[1], 'Lng:', match[2]);
  } else {
    console.log('No coordinates found in URL');
  }
}).catch(console.error);
