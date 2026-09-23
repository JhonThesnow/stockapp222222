import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import useInventoryStore from '../store/useInventoryStore';
import useSalesStore from '../store/useSalesStore';
import { toast } from 'sonner';

export const useGlobalScanner = () => {
    const location = useLocation();
    const barcodeBuffer = useRef('');
    const timer = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Rule 1: Check if the focus is on an input or textarea
            const activeTag = document.activeElement.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable) {
                return;
            }

            // Ignore meta keys, control keys etc
            if (e.key.length > 1 && e.key !== 'Enter') {
                return;
            }

            if (e.key === 'Enter') {
                if (barcodeBuffer.current.length > 0) {
                    e.preventDefault();
                    const scannedCode = barcodeBuffer.current;
                    barcodeBuffer.current = '';
                    handleGlobalScan(scannedCode, location.pathname);
                }
            } else {
                barcodeBuffer.current += e.key;
            }

            // Reset the buffer after a short delay (typists type slower than scanners)
            if (timer.current) {
                clearTimeout(timer.current);
            }
            timer.current = setTimeout(() => {
                barcodeBuffer.current = '';
            }, 100);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timer.current) {
                clearTimeout(timer.current);
            }
        };
    }, [location.pathname]);
};

export const handleGlobalScan = async (scannedCode, pathname) => {
    // Rule 1: If in Inventory mode, set the global search term
    if (pathname === '/inventario') {
        useInventoryStore.getState().setGlobalSearchTerm(scannedCode);
    } else {
        // Rule 2: Global Sales Mode
        try {
            const response = await fetch(`/api/products?searchTerm=${encodeURIComponent(scannedCode)}&limit=1`);
            if (!response.ok) throw new Error('Falló al buscar producto');
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                const product = data.data[0];
                // Double check exact match if possible, since searchTerm might be partial
                // We will add the first match
                useSalesStore.getState().addItemToCart({ ...product, quantity: 1 });
                toast.success(`${product.name} agregado al carrito`);
            } else {
                toast.error(`Producto no encontrado: ${scannedCode}`);
            }
        } catch (error) {
            console.error('Error scanning product:', error);
            toast.error('Error al buscar el producto');
        }
    }
};
