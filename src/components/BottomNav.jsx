import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsMenuOpen(false);
    }, [location]);

    const activeStyle = {
        color: '#2563eb', // text-blue-600
    };

    const inactiveStyle = {
        color: '#6b7280', // text-gray-500
    };

    return (
        <>
            {isMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-30"
                        onClick={() => setIsMenuOpen(false)}
                    ></div>
                    <div className="fixed bottom-[60px] left-0 w-full bg-white border-t rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 p-4 pb-6 flex flex-col gap-2">
                        <Link
                            to="/"
                            className="h-12 flex items-center gap-3 text-gray-700 hover:text-blue-600 px-2 rounded-lg hover:bg-gray-50"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                            <span className="font-medium">Dashboard</span>
                        </Link>

                        <Link
                            to="/encargos"
                            className="h-12 flex items-center gap-3 text-gray-700 hover:text-blue-600 px-2 rounded-lg hover:bg-gray-50"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                            <span className="font-medium">Encargos</span>
                        </Link>

                        <Link
                            to="/reports"
                            className="h-12 flex items-center gap-3 text-gray-700 hover:text-blue-600 px-2 rounded-lg hover:bg-gray-50"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                            <span className="font-medium">Reportes</span>
                        </Link>

                        <Link
                            to="/cuenta"
                            className="h-12 flex items-center gap-3 text-gray-700 hover:text-blue-600 px-2 rounded-lg hover:bg-gray-50"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span className="font-medium">Mi Cuenta</span>
                        </Link>
                    </div>
                </>
            )}

            <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around p-3 z-50 md:hidden">
                <NavLink
                    to="/caja"
                    className="flex flex-col items-center gap-1"
                    style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <span className="text-xs">Caja</span>
                </NavLink>

                <NavLink
                    to="/inventario"
                    className="flex flex-col items-center gap-1"
                    style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <span className="text-xs">Stock</span>
                </NavLink>

                <NavLink
                    to="/sales"
                    className="flex flex-col items-center gap-1"
                    style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span className="text-xs">Ventas</span>
                </NavLink>

                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex flex-col items-center gap-1"
                    style={isMenuOpen ? activeStyle : inactiveStyle}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                    <span className="text-xs">Menú</span>
                </button>
            </nav>
        </>
    );
};

export default BottomNav;
