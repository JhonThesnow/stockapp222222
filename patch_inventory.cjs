const fs = require('fs');

let content = fs.readFileSync('src/pages/InventoryPage.jsx', 'utf8');

if (!content.includes('useCostsStore')) {
    content = content.replace(
        "import useInventoryStore from '../store/useInventoryStore';",
        "import useInventoryStore from '../store/useInventoryStore';\nimport useCostsStore from '../store/useCostsStore';"
    );

    content = content.replace(
        "const { products, activeTab, setActiveTab",
        "const { incidenceRate } = useCostsStore();\n    const { products, activeTab, setActiveTab"
    );

    const updatedSalePricesMap = `
                    {product.salePrices.map((salePrice, index) => {
                        const currentSalePrice = salePrice.price ?? 0;
                        const operatingCost = currentSalePrice * incidenceRate;
                        const realProfit = currentSalePrice - product.purchasePrice - operatingCost;
                        const profitMargin = product.purchasePrice > 0 ? (realProfit / product.purchasePrice) * 100 : Infinity;

                        return (
                            <div key={index} className="bg-white p-3 rounded-md shadow-sm border border-gray-100 flex flex-col gap-2">
                                <p className="font-semibold text-gray-700">{salePrice.name}: <span className="font-bold text-blue-600">\${formatNumber(currentSalePrice)}</span></p>
                                <div className="text-sm bg-gray-50 p-2 rounded border">
                                    <div className="flex justify-between text-gray-600 mb-1">
                                        <span>Precio Compra:</span>
                                        <span className="font-medium">\${formatNumber(product.purchasePrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 mb-1">
                                        <span>Costo Op. ({(incidenceRate * 100).toFixed(1)}%):</span>
                                        <span className="font-medium text-orange-600">-\${formatNumber(operatingCost)}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 mt-1">
                                        <span className="font-bold text-gray-700">Rentabilidad Real:</span>
                                        <span className={\`font-bold \${realProfit >= 0 ? 'text-green-600' : 'text-red-600'}\`}>
                                            \${formatNumber(realProfit)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
`;

    content = content.replace(
        /\{product\.salePrices\.map\(\(salePrice, index\) => \{[\s\S]*?return \([\s\S]*?\}\)\}/,
        updatedSalePricesMap.trim()
    );

    fs.writeFileSync('src/pages/InventoryPage.jsx', content, 'utf8');
    console.log("InventoryPage.jsx updated with Real Profit calculations.");
} else {
    console.log("InventoryPage.jsx already updated.");
}
