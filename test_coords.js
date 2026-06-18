const https = require('https');

function resolveUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.headers.location || url);
    }).on('error', () => resolve(url));
  });
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const finalUrl = await resolveUrl('https://maps.app.goo.gl/F2TgyEFGJw1hRH716');
  const html = await fetchHtml(finalUrl);
  
  // Look for coordinates in the HTML, usually something like [null,null,lat,lng] or meta tags
  const match1 = html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  const match2 = html.match(/content="https:\/\/maps\.google\.com\/maps\/api\/staticmap\?center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
  const match3 = html.match(/APP_INITIALIZATION_STATE=\[\[\[(?:.+?),(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  
  console.log('Final URL:', finalUrl);
  console.log('Match 1 (null,null):', match1 ? `${match1[1]}, ${match1[2]}` : 'Not found');
  console.log('Match 2 (staticmap):', match2 ? `${match2[1]}, ${match2[2]}` : 'Not found');
  console.log('Match 3 (init_state):', match3 ? `${match3[1]}, ${match3[2]}` : 'Not found');
}
run();
