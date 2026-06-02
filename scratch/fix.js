const fs = require('fs');
let txt = fs.readFileSync('js/modules/inventory.js', 'utf8');

// Replace return \` with return `
txt = txt.replace(/return \\`/g, 'return `');

// Replace \`; with `;
txt = txt.replace(/\\`;/g, '`;');

fs.writeFileSync('js/modules/inventory.js', txt);
console.log('Fixed regex');
