async function testNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=ec`;
  console.log(`\n=== NOMINATIM QUERY: "${query}" ===`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ChargeWay-Ecuador-EV-Planner-Contact-boris'
      }
    });
    const data = await res.json();
    data.forEach((item, i) => {
      console.log(`  [${i}] ${item.display_name} (${item.lon}, ${item.lat}) - Type: ${item.type}, Class: ${item.class}`);
    });
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await testNominatim('Veintimilla y Juan Leon Mera, Quito');
  await testQueryPhoton('Veintimilla y Juan Leon Mera, Quito');
  await testNominatim('Amazonas y Eloy Alfaro, Quito');
}

async function testQueryPhoton(query) {
  const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&bbox=-81.0,-5.0,-75.2,1.5`;
  console.log(`\n=== PHOTON QUERY: "${query}" ===`);
  try {
    const res = await fetch(urlPhoton);
    const data = await res.json();
    data.features.forEach((f, i) => {
      console.log(`  [${i}] ${f.properties.name || f.properties.city}, ${f.properties.street || ''} (${f.geometry.coordinates})`);
    });
  } catch (err) {
    console.error(err);
  }
}

run();
