const effectiveProximity = [-78.5249, -0.1807];

async function test() {
  const queries = [
    "Amazonas & Patria",
    "Amazonas & Eloy Alfaro",
    "Gaspar de Villarroel & Jorge Drom"
  ];

  const ECUADOR_BBOX = '-81.0,-5.0,-75.2,1.5';
  for (const q of queries) {
    console.log(`\n--- Photon Query: "${q}" ---`);
    const proxPhoton = `&lat=${effectiveProximity[1]}&lon=${effectiveProximity[0]}`;
    const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&bbox=${ECUADOR_BBOX}${proxPhoton}`;

    try {
      const r = await fetch(urlPhoton).then(r => r.json());
      r.features?.forEach(f => {
        console.log(`- Name: "${f.properties.name}" | Street: "${f.properties.street}" | City: "${f.properties.city}" @ ${f.geometry.coordinates}`);
      });
    } catch (e) {
      console.error(e);
    }
  }
}

test();
