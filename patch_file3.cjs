const fs = require('fs');
let code = fs.readFileSync('src/components/ProductForm.jsx', 'utf8');

// 1. Add useEffect
code = code.replace(
  '    }, [productToEdit, isEditMode]);',
  `    }, [productToEdit, isEditMode]);

    useEffect(() => {
        const fab = document.getElementById('scanner-fab');
        if (fab) fab.style.display = 'none';
        return () => {
            const fab = document.getElementById('scanner-fab');
            if (fab) fab.style.display = 'flex';
        }
    }, []);`
);

// 2. Modify isEditMode block
const oldEditMode = `<div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Editar Producto</h2>
                        <button onClick={onClose}><FiX size={24} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">`;

const newEditMode = `<>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <h2 className="text-2xl font-bold">Editar Producto</h2>
                        <button onClick={onClose}><FiX size={24} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 sm:pr-4 space-y-4">`;

code = code.replace(oldEditMode, newEditMode);

const oldButtons = `<div className="flex justify-end gap-4 mt-6">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded">Cancelar</button>
                            <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        );`;

const newButtons = `<div className="flex justify-end gap-3 mt-8 border-t pt-5 sticky bottom-0 bg-white pb-2">
                            <button type="button" onClick={onClose} className="py-2.5 px-5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm">Cancelar</button>
                            <button type="submit" className="py-2.5 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center gap-2">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
            {activeScannerIndex !== null && (
                <NativeScannerModal
                    onClose={() => setActiveScannerIndex(null)}
                    onScan={(barcode) => {
                        if (activeScannerIndex === 'edit') {
                            setEditData({ ...editData, code: barcode });
                        } else {
                            const newVariations = [...variations];
                            newVariations[activeScannerIndex].code = barcode;
                            setVariations(newVariations);
                        }
                        setActiveScannerIndex(null);
                    }}
                />
            )}
            </>
        );`;

code = code.replace(oldButtons, newButtons);

// 3. Modify normal form z-index (second occurrence of <div className="fixed inset-0... )
// Do a precise replace
code = code.replace(
    `return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">`,
    `return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">`
);


fs.writeFileSync('src/components/ProductForm.jsx', code);
