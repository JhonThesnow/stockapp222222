const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

// Import PedidosPage
code = code.replace(
    "import PreciosPage from './pages/PreciosPage';",
    "import PreciosPage from './pages/PreciosPage';\nimport PedidosPage from './pages/PedidosPage';"
);

// Import FiTruck
code = code.replace(
    "FiBox, FiBarChart2, FiShoppingCart, FiMenu, FiUser, FiHome, FiClipboard, FiDollarSign, FiStar, FiRefreshCw",
    "FiBox, FiBarChart2, FiShoppingCart, FiMenu, FiUser, FiHome, FiClipboard, FiDollarSign, FiStar, FiRefreshCw, FiTruck"
);

// Add to Desktop Nav
code = code.replace(
    "            <span>Encargos</span>\n          </NavLink>\n        </li>",
    "            <span>Encargos</span>\n          </NavLink>\n        </li>\n        <li>\n          <NavLink to=\"/pedidos\" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className=\"flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors\">\n            <FiTruck />\n            <span>Pedidos</span>\n          </NavLink>\n        </li>"
);

// Add Route
code = code.replace(
    "<Route path=\"/encargos\" element={<EncargosPage />} />",
    "<Route path=\"/encargos\" element={<EncargosPage />} />\n            <Route path=\"/pedidos\" element={<PedidosPage />} />"
);

fs.writeFileSync('src/App.jsx', code);
console.log("App.jsx patched.");
