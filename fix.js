const fs = require('fs');
let c = fs.readFileSync('src/components/Dashboard/ConsentModal.tsx', 'utf8');
c = Buffer.from(c, 'latin1').toString('utf8');
c = c.replace(/\uFFFD/g, 'Í'); // Replace missing replacement characters with Í, assuming POLÍTICA, ESTADÍSTICAS etc.
fs.writeFileSync('src/components/Dashboard/ConsentModal.tsx', c, 'utf8');
