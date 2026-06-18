const https = require('https');

function resolveUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.headers.location || url);
    }).on('error', () => resolve(url));
  });
}

resolveUrl('https://maps.app.goo.gl/F2TgyEFGJw1hRH716').then(loc => console.log('Resolved to:', loc));
