const https = require('https');

function resolveUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(url);
    
    const follow = (currentUrl) => {
      https.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`Redirecting to: ${res.headers.location}`);
          follow(res.headers.location);
        } else {
          resolve(currentUrl);
        }
      }).on('error', () => resolve(currentUrl));
    };
    
    follow(url);
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

function extractCoordinates(html, finalUrl) {
  // 1. Try to get from URL first (@lat,lng)
  const urlMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlMatch) {
    console.log('Found in URL');
    return { lat: parseFloat(urlMatch[1]), lng: parseFloat(urlMatch[2]) };
  }

  // 2. Try the init state match (more reliable than staticmap)
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

  // 3. Fallback match
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
  console.log(`Final Resolved URL: ${resolved}`);
  const html = await fetchHtml(resolved);
  const coords = extractCoordinates(html, resolved);
  console.log('Extracted coords:', coords);
}

test();
