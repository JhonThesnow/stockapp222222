const fs = require('fs');
let content = fs.readFileSync('src/pages/PreciosPage.jsx', 'utf8');

// Ensure Settings Modal is rendered at the end of the return statement
content = content.replace(
    '        </div>\n    );\n};\n\nexport default PreciosPage;',
    '            <PriceSyncSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />\n        </div>\n    );\n};\n\nexport default PreciosPage;'
);

fs.writeFileSync('src/pages/PreciosPage.jsx', content);
