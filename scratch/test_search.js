const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYmNhc3Ryb2EiLCJhIjoiY21vZHB1MmhzMDB0NDJyb3dkcDUyeXNjdCJ9.MsARmscCb4Owxi9w1_MJrA';
const QUITO_CENTER = [-78.5249, -0.1807];

async function testQuery(query) {
  const baseParams = `access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&limit=5`;
  const urlMapbox = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${baseParams}&country=ec&proximity=${QUITO_CENTER[0]},${QUITO_CENTER[1]}`;
  const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&bbox=-81.0,-5.0,-75.2,1.5&lat=${QUITO_CENTER[1]}&lon=${QUITO_CENTER[0]}`;

  console.log(`\n=== QUERY: "${query}" ===`);
  try {
    const resM = await fetch(urlMapbox).then(r => r.json());
    console.log('Mapbox features:');
    if (resM.features) {
      resM.features.forEach((f, i) => {
        console.log(`  [${i}] ${f.place_name} (Type: ${f.geometry.type}, Center: ${f.center})`);
      });
    } else {
      console.log('  No features');
    }

    const resP = await fetch(urlPhoton).then(r => r.json());
    console.log('Photon features:');
    if (resP.features) {
      resP.features.forEach((f, i) => {
        const p = f.properties;
        console.log(`  [${i}] ${p.name || p.city || p.state}, ${p.street || ''}, ${p.city || ''} (${f.geometry.coordinates})`);
      });
    } else {
      console.log('  No features');
    }
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await testQuery('Amazonas, Eloy Alfaro, Quito');
  await testQuery('Tamayo, Veintimilla, Quito');
  await testQuery('Veintimilla y Tamayo, Quito');
  await testQuery('Isabel La Catolica y Veintimilla, Quito');
  await testQuery('Veintimilla y Juan Leon Mera, Quito');
}

run();
