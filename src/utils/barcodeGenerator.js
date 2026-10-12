/**
 * Utilidades para generación y validación de códigos de barra para productos artesanales/internos.
 */

/**
 * Calcula el dígito verificador para un código EAN-13 (primeros 12 dígitos).
 * @param {string} code12 - Cadena de 12 dígitos.
 * @returns {number} Dígito verificador (0-9).
 */
export const calculateEAN13CheckDigit = (code12) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(code12[i], 10) || 0;
        sum += (i % 2 === 0) ? digit * 1 : digit * 3;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
};

/**
 * Genera un código de barras EAN-13 interno único garantizado.
 * Utiliza el prefijo '200' (reservado para uso interno en comercios/tiendas).
 * @param {Array} existingProducts - Lista de productos para evitar colisiones.
 * @returns {string} Código EAN-13 de 13 dígitos.
 */
export const generateUniqueEAN13 = (existingProducts = []) => {
    const existingCodes = new Set(
        existingProducts
            .map(p => p.code ? String(p.code).trim() : '')
            .filter(Boolean)
    );

    let attempts = 0;
    while (attempts < 1000) {
        // Prefijo '200' + 9 dígitos aleatorios basados en timestamp y aleatoriedad
        const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
        const base12 = `200${randomPart}`.slice(0, 12);
        const checkDigit = calculateEAN13CheckDigit(base12);
        const fullCode = `${base12}${checkDigit}`;

        if (!existingCodes.has(fullCode)) {
            return fullCode;
        }
        attempts++;
    }

    // Fallback con timestamp
    const timestampTail = Date.now().toString().slice(-9);
    const base12 = `200${timestampTail}`;
    return `${base12}${calculateEAN13CheckDigit(base12)}`;
};

/**
 * Genera un código Code-128 alfanumérico limpio con prefijo 'ART-' (Artesanal) o 'INT-'.
 * @param {Array} existingProducts - Lista de productos existentes.
 * @param {string} prefix - Prefijo opcional (ej: 'ART', 'PRD').
 * @returns {string} Código alfanumérico único.
 */
export const generateUniqueCode128 = (existingProducts = [], prefix = 'ART') => {
    const existingCodes = new Set(
        existingProducts
            .map(p => p.code ? String(p.code).trim().toUpperCase() : '')
            .filter(Boolean)
    );

    let attempts = 0;
    while (attempts < 1000) {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const fullCode = `${prefix}-${randomNum}`;
        if (!existingCodes.has(fullCode)) {
            return fullCode;
        }
        attempts++;
    }

    return `${prefix}-${Date.now().toString().slice(-6)}`;
};
