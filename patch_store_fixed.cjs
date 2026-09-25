const fs = require('fs');

let content = fs.readFileSync('src/store/useCostsStore.js', 'utf8');

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('src/store/useCostsStore.js', content, 'utf8');
