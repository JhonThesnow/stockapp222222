import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Genera y descarga un archivo PDF de alta resolución con las etiquetas en formato A4.
 * @param {HTMLElement} containerElement - El contenedor DOM con las hojas o etiquetas.
 * @param {string} filename - Nombre del archivo a descargar.
 * @param {string} layout - 'a4' | 'roll'
 */
export const exportLabelsToPDF = async (containerElement, filename = 'etiquetas_a4.pdf', layout = 'a4') => {
    if (!containerElement) {
        throw new Error('No se encontró el elemento para exportar a PDF.');
    }

    // Si es modo rollo continuo (40x60mm)
    if (layout === 'roll') {
        const items = containerElement.querySelectorAll('.barcode-roll-item');
        if (!items || items.length === 0) {
            throw new Error('No hay etiquetas para exportar.');
        }

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [40, 60],
        });

        for (let i = 0; i < items.length; i++) {
            if (i > 0) pdf.addPage([40, 60], 'portrait');
            const canvas = await html2canvas(items[i], {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 40, 60);
        }

        pdf.save(filename);
        return;
    }

    // Modo Hoja A4 estándar (210mm x 297mm)
    // Buscamos si hay páginas A4 separadas (.a4-page-sheet) o el grid completo
    const pageSheets = containerElement.querySelectorAll('.a4-page-sheet');

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    if (pageSheets && pageSheets.length > 0) {
        for (let i = 0; i < pageSheets.length; i++) {
            if (i > 0) pdf.addPage('a4', 'portrait');
            const canvas = await html2canvas(pageSheets[i], {
                scale: 3, // 300+ DPI para máxima nitidez del código de barras
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        }
    } else {
        // Fallback: renderizar el container directamente
        const canvas = await html2canvas(containerElement, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = 210;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(297, pdfHeight));
    }

    pdf.save(filename);
};
