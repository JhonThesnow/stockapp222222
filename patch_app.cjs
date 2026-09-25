const fs = require('fs');
let appContent = fs.readFileSync('src/App.jsx', 'utf8');

if (!appContent.includes("CostsPage")) {
    appContent = appContent.replace(
        "import EncargosPage from './pages/EncargosPage';",
        "import EncargosPage from './pages/EncargosPage';\nimport CostsPage from './pages/CostsPage';"
    );

    appContent = appContent.replace(
        "<Route path=\"/encargos\" element={<EncargosPage />} />",
        "<Route path=\"/encargos\" element={<EncargosPage />} />\n            <Route path=\"/costos\" element={<CostsPage />} />"
    );

    appContent = appContent.replace(
        "<li>\n          <NavLink to=\"/encargos\"",
        "<li>\n          <NavLink to=\"/costos\" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className=\"flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors\">\n            <FiDollarSign />\n            <span>Costos</span>\n          </NavLink>\n        </li>\n        <li>\n          <NavLink to=\"/encargos\""
    );

    fs.writeFileSync('src/App.jsx', appContent, 'utf8');
    console.log("App.jsx updated with CostsPage.");
} else {
    console.log("App.jsx already has CostsPage.");
}

let bottomNavContent = fs.readFileSync('src/components/BottomNav.jsx', 'utf8');

if (!bottomNavContent.includes("to=\"/costos\"")) {
    const bottomNavEntry = `
                <NavLink
                    to="/costos"
                    className="flex flex-col items-center gap-1"
                    style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <span className="text-xs">Costos</span>
                </NavLink>`;

    bottomNavContent = bottomNavContent.replace(
        /<NavLink\s+to="\/sales"/,
        `${bottomNavEntry}\n\n                <NavLink\n                    to="/sales"`
    );

    fs.writeFileSync('src/components/BottomNav.jsx', bottomNavContent, 'utf8');
    console.log("BottomNav.jsx updated with Costos link.");
} else {
    console.log("BottomNav.jsx already has Costos link.");
}
