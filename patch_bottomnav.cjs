const fs = require('fs');

let code = fs.readFileSync('src/components/BottomNav.jsx', 'utf8');

// Add FiTruck
code = code.replace(
    "import { FiHome, FiBox, FiShoppingCart, FiMenu, FiX, FiClipboard } from 'react-icons/fi';",
    "import { FiHome, FiBox, FiShoppingCart, FiMenu, FiX, FiClipboard, FiTruck } from 'react-icons/fi';"
);
if (!code.includes("FiTruck")) {
    // maybe different imports
    code = code.replace(
        "import { NavLink, Link, useLocation } from 'react-router-dom';",
        "import { NavLink, Link, useLocation } from 'react-router-dom';\nimport { FiTruck } from 'react-icons/fi';"
    );
}


// Add to mobile modal menu
code = code.replace(
    "                            <span className=\"font-medium\">Encargos</span>\n                        </Link>",
    "                            <span className=\"font-medium\">Encargos</span>\n                        </Link>\n                        <Link\n                            to=\"/pedidos\"\n                            onClick={() => setIsMenuOpen(false)}\n                            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${location.pathname === '/pedidos' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}\n                        >\n                            <FiTruck className=\"text-xl\" />\n                            <span className=\"font-medium\">Pedidos (Compras)</span>\n                        </Link>"
);

fs.writeFileSync('src/components/BottomNav.jsx', code);
console.log("BottomNav.jsx patched.");
