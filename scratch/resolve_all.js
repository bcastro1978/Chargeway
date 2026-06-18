const fs = require('fs');
const path = require('path');

const url = 'https://nmddylhyfgeplnxdauia.supabase.co/rest/v1/charging_points?select=*';
const anonKey = 'sb_publishable_hzbCvSpczgaz6U-bx6PSNA_kqmlprsM';

function parseCoords(urlStr) {
  if (!urlStr) return null;
  // 1. Check for the actual place/marker coordinates: !3d(lat)!4d(lng)
  const placeMatch = urlStr.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (placeMatch) {
    return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]), source: 'place_pin' };
  }
  // 2. Check for query parameter: query=lat,lng
  const queryMatch = urlStr.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (queryMatch) {
    return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]), source: 'query' };
  }
  // 3. Check for dir destination: /maps/dir/.../lat,lng
  const dirMatch = urlStr.match(/\/maps\/dir\/[^/]+\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (dirMatch) {
    return { lat: parseFloat(dirMatch[1]), lng: parseFloat(dirMatch[2]), source: 'dir_dest' };
  }
  // 4. Fallback: viewport center: /@lat,lng
  const viewportMatch = urlStr.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (viewportMatch) {
    return { lat: parseFloat(viewportMatch[1]), lng: parseFloat(viewportMatch[2]), source: 'viewport' };
  }
  return null;
}

async function resolveUrl(shortUrl) {
  if (!shortUrl || !shortUrl.startsWith('http')) return null;
  try {
    const res = await fetch(shortUrl, { method: 'HEAD', redirect: 'manual' });
    const location = res.headers.get('location');
    if (location && location !== shortUrl) {
      // recursively resolve if needed
      if (location.includes('maps.app.goo.gl') || location.includes('goo.gl')) {
        return await resolveUrl(location);
      }
      return location;
    }
    return shortUrl;
  } catch (err) {
    // try GET request if HEAD is not allowed
    try {
      const res = await fetch(shortUrl, { redirect: 'manual' });
      const location = res.headers.get('location');
      return location || shortUrl;
    } catch {
      return null;
    }
  }
}

async function run() {
  try {
    console.log('Fetching all chargers from Supabase...');
    const res = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    const data = await res.json();
    console.log(`Loaded ${data.length} chargers. Resolving links...`);

    const corrections = {};

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item.gps_link) continue;
      
      console.log(`[${i+1}/${data.length}] Resolving link for: ${item.name || item.id}...`);
      const resolved = await resolveUrl(item.gps_link);
      if (resolved) {
        const parsed = parseCoords(resolved);
        if (parsed) {
          const originalLat = parseFloat(item.lat);
          const originalLng = parseFloat(item.lng);
          
          // If the parsed coordinate is different from original or if original is null
          const isDifferent = isNaN(originalLat) || isNaN(originalLng) ||
            Math.abs(parsed.lat - originalLat) > 0.005 ||
            Math.abs(parsed.lng - originalLng) > 0.005;

          if (isDifferent) {
            console.log(`  -> CORRECTION FOUND for ${item.name}:`);
            console.log(`     DB:   lat=${item.lat}, lng=${item.lng}`);
            console.log(`     Real: lat=${parsed.lat}, lng=${parsed.lng} (source: ${parsed.source})`);
            
            corrections[item.id] = {
              lat: parsed.lat,
              lng: parsed.lng,
              name: item.name
            };
          }
        }
      }
      // Wait 100ms between requests to prevent rate-limiting
      await new Promise(r => setTimeout(r, 100));
    }

    const outputPath = path.join(__dirname, '../src/lib/data/chargers-corrections.json');
    fs.writeFileSync(outputPath, JSON.stringify(corrections, null, 2));
    console.log(`\nSuccessfully wrote ${Object.keys(corrections).length} corrections to ${outputPath}`);
  } catch (err) {
    console.error('Error in script:', err);
  }
}

run();
