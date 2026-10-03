const fs = require('fs');
let content = fs.readFileSync('src/pages/PreciosPage.jsx', 'utf8');

const selectAllLogic = `    const handleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };`;

content = content.replace(
    '    const handleCheckPrice = async (product) => {',
    selectAllLogic + '\n\n    const handleCheckPrice = async (product) => {'
);

const theadReplace = `                        <thead className="bg-gray-50 hidden md:table-header-group">
                            <tr className="md:table-row block">
                                <th className="px-6 py-3 text-left w-12">
                                    <button onClick={handleSelectAll} className="text-gray-500 hover:text-gray-700">
                                        {filteredProducts.length > 0 && selectedIds.size === filteredProducts.length ? (
                                            <FiCheckSquare size={20} />
                                        ) : (
                                            <FiSquare size={20} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>`;

content = content.replace(
    /<thead className="bg-gray-50 hidden md:table-header-group">[\s\S]*?<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto<\/th>/,
    theadReplace
);

const tbodyRowReplace = `                                        <tr key={product.id} className={\`hover:bg-gray-50 block md:table-row border-b border-gray-200 md:border-b-0 pb-4 md:pb-0 \${selectedIds.has(product.id) ? 'bg-indigo-50/50' : ''}\`}>
                                            <td className="px-4 py-2 md:px-6 md:py-4 block md:table-cell w-full md:w-12">
                                                <div className="flex justify-between md:justify-center items-center">
                                                    <span className="text-xs font-bold text-gray-500 uppercase md:hidden">Seleccionar:</span>
                                                    <button onClick={() => toggleSelection(product.id)} className="text-gray-500 hover:text-indigo-600">
                                                        {selectedIds.has(product.id) ? <FiCheckSquare size={20} className="text-indigo-600" /> : <FiSquare size={20} />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 md:px-6 md:py-4 block md:table-cell">`;

content = content.replace(
    /                                        <tr key=\{product\.id\} className="hover:bg-gray-50 block md:table-row border-b border-gray-200 md:border-b-0 pb-4 md:pb-0">\n                                            <td className="px-4 py-2 md:px-6 md:py-4 block md:table-cell">/,
    tbodyRowReplace
);

// Empty state colspan fix
content = content.replace(
    /<td colSpan="5" className="px-6 py-12 text-center text-gray-500 block md:table-cell w-full">/,
    '<td colSpan="6" className="px-6 py-12 text-center text-gray-500 block md:table-cell w-full">'
);

fs.writeFileSync('src/pages/PreciosPage.jsx', content);
