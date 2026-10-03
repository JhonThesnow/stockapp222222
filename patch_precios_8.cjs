const fs = require('fs');
let content = fs.readFileSync('src/pages/PreciosPage.jsx', 'utf8');

const massUpdateLogic = `    // Lógica de redondeo
    const roundPrice = (price) => {
        const rounded = Math.round(price);
        const lastTwoDigits = rounded % 100;

        if (lastTwoDigits === 0) return rounded;
        if (lastTwoDigits <= 50) {
            return rounded - lastTwoDigits + 50;
        } else {
            return rounded - lastTwoDigits + 100;
        }
    };

    // Actualización masiva
    const handleMassUpdate = async (type) => {
        const productsToUpdate = selectedIds.size > 0
            ? filteredProducts.filter(p => selectedIds.has(p.id))
            : filteredProducts;

        if (productsToUpdate.length === 0) return;

        // Mostrar un toast para el progreso
        const toastId = toast.loading(\`Actualizando \${productsToUpdate.length} productos...\`);

        let successCount = 0;
        let errorCount = 0;

        for (const product of productsToUpdate) {
            if (!product.provider_price) continue;

            try {
                const updatedProductData = { ...product };

                if (type === 'cost_only') {
                    updatedProductData.purchasePrice = product.provider_price;
                } else if (type === 'cost_and_margin') {
                    const oldCost = product.purchasePrice || 1; // Prevenir división por 0
                    const multiplier = product.provider_price / oldCost;

                    updatedProductData.purchasePrice = product.provider_price;

                    if (product.salePrices) {
                        const parsedPrices = typeof product.salePrices === 'string' ? JSON.parse(product.salePrices) : product.salePrices;
                        updatedProductData.salePrices = JSON.stringify(parsedPrices.map(priceTier => ({
                            ...priceTier,
                            price: roundPrice(priceTier.price * multiplier)
                        })));
                    }
                }

                await fetch(\`\${API_URL}/products/\${product.id}\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedProductData),
                });
                successCount++;
            } catch (error) {
                console.error(error);
                errorCount++;
            }
        }

        fetchProducts({ page: 1, limit: 1000 }); // Refrescar
        setSelectedIds(new Set());
        toast.dismiss(toastId);

        if (errorCount > 0) {
            toast.warning(\`Actualizados: \${successCount}, Errores: \${errorCount}\`);
        } else {
            toast.success(\`\${successCount} productos actualizados correctamente.\`);
        }
    };`;

content = content.replace(
    '    const handleUpdateCost = async (product) => {',
    massUpdateLogic + '\n\n    const handleUpdateCost = async (product) => {'
);

const filterBarReplace = `            <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-start sm:items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('todos')}
                            className={\`px-4 py-2 rounded-md font-medium text-sm transition-colors \${activeTab === 'todos' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}\`}
                        >
                            Todos (\${productsWithProvider.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('cambios')}
                            className={\`px-4 py-2 rounded-md font-medium text-sm transition-colors \${activeTab === 'cambios' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}\`}
                        >
                            Con Cambios (\${productsWithProvider.filter(hasSignificantChange).length})
                        </button>
                    </div>

                    {activeTab === 'cambios' && filteredProducts.length > 0 && (
                        <div className="flex gap-2 items-center bg-green-50 p-2 rounded-md border border-green-200 w-full sm:w-auto">
                            <span className="text-xs font-bold text-green-800 ml-2 hidden lg:inline">Acción Masiva:</span>
                            <button
                                onClick={() => handleMassUpdate('cost_only')}
                                className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-xs font-medium"
                                title="Actualizar solo el precio de compra"
                            >
                                Solo Costo
                            </button>
                            <button
                                onClick={() => handleMassUpdate('cost_and_margin')}
                                className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 text-xs font-medium"
                                title="Actualizar costo y recalcular precios de venta manteniendo margen"
                            >
                                Costo + Ganancia
                            </button>
                        </div>
                    )}
                </div>

                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, código, marca, tipo..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>`;

content = content.replace(
    /<div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">[\s\S]*?<\/div>\n            <\/div>/,
    filterBarReplace
);


fs.writeFileSync('src/pages/PreciosPage.jsx', content);
