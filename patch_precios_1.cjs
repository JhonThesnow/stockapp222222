const fs = require('fs');
let content = fs.readFileSync('src/pages/PreciosPage.jsx', 'utf8');

// Imports
content = content.replace(
    "import { formatNumber } from '../utils/formatting';",
    "import { formatNumber } from '../utils/formatting';\nimport usePriceSyncStore from '../store/usePriceSyncStore';\nimport PriceSyncSettingsModal from '../components/PriceSyncSettingsModal';\nimport { FiSettings, FiCheckSquare, FiSquare, FiPlay, FiPause, FiXCircle } from 'react-icons/fi';"
);

// State variables
const stateReplace = `    const { products, fetchProducts, updateProduct } = useInventoryStore();
    const { settings, startSync, pauseSync, resumeSync, cancelSync, isSyncing, isPaused, queue, currentIndex } = usePriceSyncStore();
    const [loadingCheck, setLoadingCheck] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'cambios'
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);`;

content = content.replace(
    /const \{ products, fetchProducts, updateProduct \} = useInventoryStore\(\);\n    const \[loadingCheck, setLoadingCheck\] = useState\(\{\}\);\n    const \[searchTerm, setSearchTerm\] = useState\(''\);/,
    stateReplace
);

// Filtering logic
const filterReplace = `    // Filtrar productos que tengan provider_url configurada
    const productsWithProvider = products.filter(p => p.provider_url && p.provider_url.trim() !== '');

    // Check if product has significant change
    const hasSignificantChange = (product) => {
        if (!product.provider_price) return false;
        const diff = product.provider_price - product.purchasePrice;
        if (diff <= 0) return false; // Solo aumentos o podemos considerar bajadas usando Math.abs(diff)

        if (settings.thresholdType === 'percentage') {
            const percentChange = (diff / product.purchasePrice) * 100;
            return percentChange >= settings.thresholdValue;
        } else {
            return diff >= settings.thresholdValue;
        }
    };

    // Filtro adicional por búsqueda local y tab
    const filteredProducts = productsWithProvider.filter(p => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.type && p.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.subtype && p.subtype.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesTab = activeTab === 'todos' || (activeTab === 'cambios' && hasSignificantChange(p));

        return matchesSearch && matchesTab;
    });`;

content = content.replace(
    /\/\/ Filtrar productos que tengan provider_url configurada\n[\s\S]*?(?=    const handleCheckPrice)/,
    filterReplace + "\n\n"
);

// View modifications (header)
const viewReplace = `            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FiRefreshCw className="mr-2" />
                    Sincronización de Precios
                </h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {isSyncing || isPaused ? (
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg border border-blue-200">
                            <span className="text-sm font-medium mr-2">
                                {currentIndex} / {queue.length}
                            </span>
                            {!isPaused ? (
                                <button onClick={pauseSync} className="p-1 hover:bg-blue-100 rounded" title="Pausar"><FiPause /></button>
                            ) : (
                                <button onClick={resumeSync} className="p-1 hover:bg-blue-100 rounded" title="Reanudar"><FiPlay /></button>
                            )}
                            <button onClick={cancelSync} className="p-1 hover:bg-blue-100 rounded" title="Cancelar"><FiXCircle /></button>
                        </div>
                    ) : (
                        <button
                            onClick={() => startSync(filteredProducts.map(p => p.id))}
                            disabled={filteredProducts.length === 0}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
                        >
                            <FiPlay className="mr-2" />
                            Sincronizar {filteredProducts.length} productos
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center justify-center"
                    >
                        <FiSettings className="mr-2" />
                        Ajustes
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
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

                <div className="relative w-full sm:w-64 md:w-96">
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
    /            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">[\s\S]*?<\/div>\n            <\/div>/,
    viewReplace
);

fs.writeFileSync('src/pages/PreciosPage.jsx', content);
