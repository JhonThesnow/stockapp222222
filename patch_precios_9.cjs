const fs = require('fs');
let content = fs.readFileSync('src/pages/PreciosPage.jsx', 'utf8');

content = content.replace(
    "Todos (${productsWithProvider.length})",
    "Todos ({productsWithProvider.length})"
).replace(
    "Con Cambios (${productsWithProvider.filter(hasSignificantChange).length})",
    "Con Cambios ({productsWithProvider.filter(hasSignificantChange).length})"
);

fs.writeFileSync('src/pages/PreciosPage.jsx', content);
