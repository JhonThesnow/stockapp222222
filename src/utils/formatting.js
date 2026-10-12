/**
 * Formatea un número al estilo argentino (ej: 1000 -> "1.000") sin decimales.
 * @param {number} number - El número a formatear.
 * @returns {string} El número formateado como texto.
 */
export const formatNumber = (number) => {
    if (typeof number !== 'number' || isNaN(number)) return '0';
    return new Intl.NumberFormat('es-AR', {
        maximumFractionDigits: 0
    }).format(number);
};

export const formatCurrency = (number) => {
    return `$${formatNumber(number)}`;
};

/**
 * Redondea un monto para pagos en efectivo a la centena más cercana.
 * (ej: 2330 -> 2300, 2350 -> 2400, 2380 -> 2400).
 * @param {number} amount - El monto a redondear.
 * @returns {number} El monto redondeado.
 */
export const roundCash = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 0;
    return Math.round(amount / 100) * 100;
};

/**
 * Formatea una fecha a `dd/MM/yyyy` evitando el desfase UTC en fechas ISO `YYYY-MM-DD`.
 * @param {string | Date} date - La fecha a formatear.
 * @returns {string} La fecha formateada.
 */
export const formatDateOnly = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        const [year, month, day] = date.trim().split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('es-AR');
    }
    return new Date(date).toLocaleDateString('es-AR');
};

/**
 * Construye un ítem de Venta Rápida estandarizado para el carrito y ventas pendientes.
 */
export const createQuickSaleItem = (description, price, quantity = 1) => {
    const cleanName = (description || '').trim() || 'Artículo Vario';
    const finalPrice = parseFloat(price);
    const qty = parseInt(quantity, 10) || 1;
    return {
        id: `qs-${Date.now()}`,
        productId: null,
        name: cleanName,
        fullName: cleanName,
        subtype: '',
        quantity: qty,
        purchasePrice: 0,
        unitPrice: finalPrice,
        salePrices: [{ name: 'Minorista', price: finalPrice }],
    };
};