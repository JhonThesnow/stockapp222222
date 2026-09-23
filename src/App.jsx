import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import AccountPage from './pages/AccountPage';
import CajaPage from './pages/CajaPage';
import EncargosPage from './pages/EncargosPage';
import { FiBox, FiBarChart2, FiShoppingCart, FiMenu, FiUser, FiHome, FiClipboard, FiDollarSign } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useGlobalScanner, handleGlobalScan } from './hooks/useGlobalScanner';
import { Toaster } from 'sonner';
import BottomNav from './components/BottomNav';
import ScannerFAB from './components/ScannerFAB';
import NativeScannerModal from './components/NativeScannerModal';
import useSalesStore from './store/useSalesStore';

const Navigation = ({ onLinkClick }) => {
  const activeLinkStyle = {
    backgroundColor: '#374151',
    color: 'white'
  };
  return (
    <nav className="bg-gray-800 text-white w-64 h-full p-4 flex flex-col flex-shrink-0">
      <div className="text-2xl font-bold mb-10 text-center">STOCK</div>
      <ul className="space-y-2">
        <li>
          <NavLink to="/" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiHome />
            <span>Principal</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/cuenta" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiUser />
            <span>Cuenta</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/inventario" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiBox />
            <span>Inventario</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/caja" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiDollarSign />
            <span>Caja</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/sales" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiShoppingCart />
            <span>Ventas</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/reports" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiBarChart2 />
            <span>Reportes</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/encargos" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiClipboard />
            <span>Encargos</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

const AppLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNativeScannerOpen, setIsNativeScannerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useGlobalScanner();

  useHotkeys('f12', (e) => {
    e.preventDefault();
    navigate('/caja');
  }, { enableOnFormTags: true });

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <div className="h-screen flex bg-gray-100">
      <div className="hidden md:flex">
        <Navigation />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
        <header className="hidden bg-white shadow-md p-4 flex justify-between items-center z-10">
          <h1 className="text-xl font-bold">Hindumar STOCK</h1>
          <button onClick={() => setIsMenuOpen(true)}>
            <FiMenu size={24} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/cuenta" element={<AccountPage />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/caja" element={<CajaPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/encargos" element={<EncargosPage />} />
          </Routes>
        </main>
      </div>
      {isMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black z-20 animate-fade-in" onClick={() => setIsMenuOpen(false)}></div>
          <div className="md:hidden fixed top-0 left-0 h-full z-30 animate-slide-in-left">
            <Navigation onLinkClick={() => setIsMenuOpen(false)} />
          </div>
        </>
      )}
      {isNativeScannerOpen && (
        <NativeScannerModal
          onClose={() => setIsNativeScannerOpen(false)}
          onScan={(barcode) => {
            handleGlobalScan(barcode, location.pathname);
            setIsNativeScannerOpen(false);
          }}
        />
      )}
      <ScannerFAB onClick={() => setIsNativeScannerOpen(true)} />
      <BottomNav />
    </div>
  );
};

const App = () => (
  <Router>
    <AppLayout />
    <Toaster position="top-right" richColors />
  </Router>
);

export default App;
