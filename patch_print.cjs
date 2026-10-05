const fs = require('fs');
let code = fs.readFileSync('src/pages/PedidosPage.jsx', 'utf8');

// The newer versions of react-to-print often export `useReactToPrint` or need a different import. Let's check package json.
// Or we can just use `useReactToPrint`. Let's use `useReactToPrint` because `ReactToPrint` component might be deprecated or default export is gone.
code = code.replace(
    "import ReactToPrint from 'react-to-print';",
    "import { useReactToPrint } from 'react-to-print';"
);

// We need to change the component usage
const oldPrintButton = `<ReactToPrint
                                trigger={() => (
                                    <button className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
                                        <FiPrinter /> <span className="hidden sm:inline">Imprimir</span>
                                    </button>
                                )}
                                content={() => componentRef.current}
                            />`;

const newPrintButton = `<button onClick={handlePrint} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
                                        <FiPrinter /> <span className="hidden sm:inline">Imprimir</span>
                                    </button>`;

code = code.replace(oldPrintButton, newPrintButton);

// Add handlePrint function
const handlePrintFunc = `
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: 'Pedido_Mercaderia',
    });
`;

code = code.replace(
    "const componentRef = useRef(); // For printing",
    "const componentRef = useRef(); // For printing" + handlePrintFunc
);

fs.writeFileSync('src/pages/PedidosPage.jsx', code);
