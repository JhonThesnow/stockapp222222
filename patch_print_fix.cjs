const fs = require('fs');
let code = fs.readFileSync('src/pages/PedidosPage.jsx', 'utf8');

// Also update it to work with react-to-print v3
code = code.replace(
    "contentRef: componentRef,",
    "content: () => componentRef.current,"
);

fs.writeFileSync('src/pages/PedidosPage.jsx', code);
