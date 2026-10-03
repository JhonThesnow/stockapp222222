const fs = require('fs');
let content = fs.readFileSync('src/pages/PreciosPage.jsx', 'utf8');

const regexToReplace = /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">[\s\S]*?<\/div>\n            <\/div>/;

const viewReplace = `<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
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
                            onClick={() => {
                                const idsToSync = selectedIds.size > 0 ? Array.from(selectedIds) : filteredProducts.map(p => p.id);
                                startSync(idsToSync);
                            }}
                            disabled={filteredProducts.length === 0}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
                        >
                            <FiPlay className="mr-2" />
                            Sincronizar {selectedIds.size > 0 ? \`\${selectedIds.size} seleccionados\` : \`\${filteredProducts.length} productos\`}
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

content = content.replace(regexToReplace, viewReplace);

fs.writeFileSync('src/pages/PreciosPage.jsx', content);
