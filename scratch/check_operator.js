const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('scratch/station.html', 'utf8');
const $ = cheerio.load(html);

console.log('Operador:', $('div:contains("Operador")').last().next().text().trim() || $('div:contains("Operator")').last().next().text().trim());
console.log('Provider text:', $('body').text().match(/operador|proveedor|propietario|operator/i) ? 'Exists' : 'Not found');
