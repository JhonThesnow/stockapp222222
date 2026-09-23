import React from 'react';

const ScannerFAB = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            id="scanner-fab" className="fixed bottom-20 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg z-40 md:hidden"
            aria-label="Escanear código de barras"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5v14"></path>
                <path d="M8 5v14"></path>
                <path d="M12 5v14"></path>
                <path d="M17 5v14"></path>
                <path d="M21 5v14"></path>
            </svg>
        </button>
    );
};

export default ScannerFAB;
