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
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  const url = 'https://maps.app.goo.gl/F2TgyEFGJw1hRH716';
  const resolved = await resolveUrl(url);
  console.log(`Resolved: ${resolved}`);
  const html = await fetchHtml(resolved);
  
  // Look for !3d and !4d
  const latMatch = html.match(/!3d(-?\d+\.\d+)/);
  const lngMatch = html.match(/!4d(-?\d+\.\d+)/);
  
  if (latMatch && lngMatch) {
    console.log(`Found via !3d/!4d: ${latMatch[1]}, ${lngMatch[1]}`);
  } else {
    console.log('Not found via !3d/!4d');
  }

  // Look for [null,null,lat,lng] but specific to the place
  // Google Maps often has the place coords in a large JSON array
  const allCoords = [];
  const regex = /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    allCoords.push({ lat: parseFloat(m[1]), lng: parseFloat(m[2]) });
  }
  console.log('All [null,null,lat,lng] matches:', allCoords);
}

test();
