import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';

// Code Splitting con lazy loading para transiciones de página instantáneas
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const CajaPage = lazy(() => import('./pages/CajaPage'));
const EncargosPage = lazy(() => import('./pages/EncargosPage'));
const CostsPage = lazy(() => import('./pages/CostsPage'));
const PromotionsPage = lazy(() => import('./pages/PromotionsPage'));
const PreciosPage = lazy(() => import('./pages/PreciosPage'));
const PedidosPage = lazy(() => import('./pages/PedidosPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs text-gray-400 font-medium tracking-wide">Cargando...</p>
    </div>
  </div>
);
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/useAuthStore';
import { 
  FiBox, 
  FiBarChart2, 
  FiShoppingCart, 
  FiMenu, 
  FiUser, 
  FiHome, 
  FiClipboard, 
  FiDollarSign, 
  FiStar, 
  FiRefreshCw, 
  FiTruck, 
  FiShield, 
  FiLogOut 
} from 'react-icons/fi';
import { useHotkeys } from 'react-hotkeys-hook';
import { useGlobalScanner, handleGlobalScan } from './hooks/useGlobalScanner';
import { Toaster } from 'sonner';
import BottomNav from './components/BottomNav';
import ScannerFAB from './components/ScannerFAB';
import NativeScannerModal from './components/NativeScannerModal';
import useCostsStore from './store/useCostsStore';
import PriceSyncWidget from './components/PriceSyncWidget';

const Navigation = ({ onLinkClick }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const activeLinkStyle = {
    backgroundColor: '#374151',
    color: 'white'
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 text-white w-64 h-full p-4 flex flex-col justify-between flex-shrink-0">
      <div className="overflow-y-auto">
        <div className="text-2xl font-bold mb-6 text-center tracking-wider text-blue-400">STOCK</div>
        
        {/* User Card */}
        {user && (
          <div className="mb-6 p-3 bg-gray-700/60 rounded-xl border border-gray-600/50 flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs text-gray-400 font-medium">Sesión iniciada</p>
              <p className="text-sm font-bold text-white truncate">{user.name || user.username}</p>
              <span className={`inline-block text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md mt-0.5 ${
                user.role === 'admin' 
                  ? 'bg-purple-900/80 text-purple-200' 
                  : user.role === 'caja'
                    ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700/50'
                    : 'bg-blue-900/80 text-blue-200'
              }`}>
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600/50 rounded-lg transition cursor-pointer"
            >
              <FiLogOut className="text-lg" />
            </button>
          </div>
        )}

        <ul className="space-y-1.5">
          {user?.role === 'admin' && (
            <li>
              <NavLink 
                to="/admin" 
                style={({ isActive }) => isActive ? { backgroundColor: '#4f46e5', color: 'white' } : undefined} 
                onClick={onLinkClick} 
                className="flex items-center gap-3 p-3 rounded-lg bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900/60 transition-colors font-medium border border-indigo-800/40"
              >
                <FiShield className="text-indigo-400" />
                <span>Panel Admin</span>
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiHome />
              <span>Principal</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/sales" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiShoppingCart />
              <span>Ventas</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/caja" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiDollarSign />
              <span>Caja</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/inventario" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiBox />
              <span>Inventario</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/cuenta" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiUser />
              <span>Cuenta</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/precios" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiRefreshCw />
              <span>Sinc. Precios</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/reports" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiBarChart2 />
              <span>Reportes</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/costos" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiDollarSign />
              <span>Costos</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/promociones" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiStar />
              <span>Promociones</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/encargos" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiClipboard />
              <span>Encargos</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/pedidos" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
              <FiTruck />
              <span>Pedidos</span>
            </NavLink>
          </li>
        </ul>
      </div>

      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 w-full rounded-lg text-red-300 hover:bg-red-950/40 hover:text-red-200 transition-colors cursor-pointer"
        >
          <FiLogOut />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </nav>
  );
};

const AppLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNativeScannerOpen, setIsNativeScannerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, checkAuth } = useAuthStore();

  useGlobalScanner();

  useEffect(() => {
    checkAuth();
    // Initial fetch to calculate incidence rate and sync recurring expenses
    useCostsStore.getState().syncRecurring().then(() => {
        useCostsStore.getState().fetchIncidenceRate();
    });
  }, []);

  useHotkeys('f12', (e) => {
    e.preventDefault();
    navigate('/caja');
  }, { enableOnFormTags: true });

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Si no está autenticado y está en cualquier ruta que no sea login, redirige a login
  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/cuenta" element={<AccountPage />} />
              <Route path="/inventario" element={<InventoryPage />} />
              <Route path="/precios" element={<PreciosPage />} />
              <Route path="/caja" element={<CajaPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/encargos" element={<EncargosPage />} />
              <Route path="/pedidos" element={<PedidosPage />} />
              <Route path="/costos" element={<CostsPage />} />
              <Route path="/promociones" element={<PromotionsPage />} />
              {/* Ruta exclusiva de Administrador */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Suspense>
        </main>
      </div>
      {isMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-20 animate-fade-in" onClick={() => setIsMenuOpen(false)}></div>
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
      <PriceSyncWidget />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Suspense>
      <Toaster position="top-center" richColors />
    </Router>
  );
};

export default App;
