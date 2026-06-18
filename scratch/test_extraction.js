const https = require('https');

function resolveUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Location Header: ${res.headers.location}`);
      resolve(res.headers.location || url);
    }).on('error', (e) => {
      console.error(e);
      resolve(url);
    });
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

function extractCoordinates(html) {
  // Static map match: center=lat%2Clng
  const match2 = html.match(/content="https:\/\/maps\.google\.com\/maps\/api\/staticmap\?center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
  if (match2) {
    console.log('Match 2 (staticmap) found');
    return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
  }
  
  // init_state match
  const match3 = html.match(/APP_INITIALIZATION_STATE=\[\[\[(?:.+?),(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  if (match3) {
    console.log('Match 3 (init_state) found');
    const val1 = parseFloat(match3[1]);
    const val2 = parseFloat(match3[2]);
    if (Math.abs(val1) > Math.abs(val2)) {
      return { lat: val2, lng: val1 };
    } else {
      return { lat: val1, lng: val2 };
    }
  }

  // fallback match
  const match1 = html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  if (match1) {
    console.log('Match 1 (fallback) found');
    return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
  }

  return null;
}

async function test() {
  const url = 'https://maps.app.goo.gl/F2TgyEFGJw1hRH716';
  console.log(`Testing URL: ${url}`);
  const resolved = await resolveUrl(url);
  console.log(`Resolved to: ${resolved}`);
  const html = await fetchHtml(resolved);
  // fs.writeFileSync('debug.html', html);
  const coords = extractCoordinates(html);
  console.log('Extracted coords:', coords);
}

test();
