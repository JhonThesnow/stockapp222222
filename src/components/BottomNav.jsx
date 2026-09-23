import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav = () => {
    const activeStyle = {
        color: '#2563eb', // text-blue-600
    };

    const inactiveStyle = {
        color: '#6b7280', // text-gray-500
    };

    return (
        <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around p-3 z-50 md:hidden">
            <NavLink
                to="/caja"
                className="flex flex-col items-center gap-1"
                style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
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
                to="/reports"
                className="flex flex-col items-center gap-1"
                style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span className="text-xs">Reportes</span>
            </NavLink>
        </nav>
    );
};

export default BottomNav;
