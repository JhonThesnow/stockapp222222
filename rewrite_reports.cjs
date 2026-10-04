const fs = require('fs');

const file = 'src/pages/ReportsPage.jsx';
let data = fs.readFileSync(file, 'utf8');

// 1. imports
data = data.replace(
  `import { FiTrendingUp, FiDollarSign, FiAward, FiCalendar, FiFileText, FiFilter, FiX } from 'react-icons/fi';`,
  `import { FiTrendingUp, FiDollarSign, FiAward, FiCalendar, FiFileText, FiFilter, FiX, FiClock } from 'react-icons/fi';`
);

// 2. states
data = data.replace(
  `    const [currentPage, setCurrentPage] = useState(1);`,
  `    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState('statistics');
    const [historyPage, setHistoryPage] = useState(1);`
);

// 3. title and tabs
data = data.replace(
  `            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Reportes y Estadísticas</h1>

            </div>

            {/* Selector de Periodo Rápido y Filtros */}
            <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm w-fit">`,
  `            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Reportes y Estadísticas</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('statistics')}
                    className={\`py-2 px-4 font-semibold text-sm md:text-base border-b-2 transition-colors \${activeTab === 'statistics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
                >
                    Estadísticas
                </button>
                <button
                    onClick={() => { setActiveTab('salesHistory'); setHistoryPage(1); }}
                    className={\`py-2 px-4 font-semibold text-sm md:text-base border-b-2 transition-colors \${activeTab === 'salesHistory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
                >
                    Historial de Ventas
                </button>
            </div>

            {/* Selector de Periodo Rápido y Filtros */}
            <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm w-fit">`
);

// 4. Wrap top KPIs
data = data.replace(
  `            {/* KPIs Principales */}
            {activeReport && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">`,
  `            {activeTab === 'statistics' && (
                <>
                {/* KPIs Principales */}
                {activeReport && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">`
);

data = data.replace(
  `                    <StatCard title="Ticket Promedio" value={\`\$\${formatNumber(activeReport.summary.totalSales > 0 ? activeReport.summary.totalRevenue / activeReport.summary.totalSales : 0)}\`} icon={<FiAward />} color="bg-purple-100 text-purple-600" />
                </div>
            )}

            {/* Panel de Filtros (Drawer Lateral) */}`,
  `                    <StatCard title="Ticket Promedio" value={\`\$\${formatNumber(activeReport.summary.totalSales > 0 ? activeReport.summary.totalRevenue / activeReport.summary.totalSales : 0)}\`} icon={<FiAward />} color="bg-purple-100 text-purple-600" />
                </div>
            )}
            </>
            )}

            {/* Panel de Filtros (Drawer Lateral) */}`
);

// 5. Wrap Charts
data = data.replace(
  `            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Gráfico de Ventas */}`,
  `            {activeTab === 'statistics' && (
                <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Gráfico de Ventas */}`
);

// 6. Close Charts and Add History
data = data.replace(
  `                    )}
                </div>
            </div>
        </div>
    );
};`,
  `                    )}
                </div>
            </div>
            </>
            )}

            {/* Panel de Historial de Ventas */}
            {activeTab === 'salesHistory' && (
                <div className="bg-white p-4 md:p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FiClock className="text-blue-500" /> Detalle de Ventas
                    </h2>
                    {(!activeReport || !activeReport.salesDetails || activeReport.salesDetails.length === 0) ? (
                        <p className="text-center text-gray-500 py-12">No se encontraron ventas para este período y filtros.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 uppercase">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold">Fecha y Hora</th>
                                        <th className="py-3 px-4 font-semibold">Monto Total</th>
                                        <th className="py-3 px-4 font-semibold">Método de Pago</th>
                                        <th className="py-3 px-4 font-semibold">Items</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeReport.salesDetails.slice((historyPage - 1) * 20, historyPage * 20).map((sale) => (
                                        <tr key={sale.id} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {format(new Date(sale.date), "dd/MM/yyyy HH:mm")}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-gray-800">
                                                $\\{formatNumber(sale.finalAmount)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                                                    {sale.paymentMethod || 'Otros'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                <ul className="list-disc list-inside">
                                                    {sale.items && sale.items.map((item, idx) => (
                                                        <li key={idx} className="truncate max-w-[200px] md:max-w-xs" title={\`\${item.quantity}x \${item.fullName}\`}>
                                                            <span className="font-medium text-gray-800">{\`\${item.quantity}x\`}</span> {\`\${item.fullName}\`}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* Paginación de Historial */}
                            {Math.ceil(activeReport.salesDetails.length / 20) > 1 && (
                                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                                    <button
                                        onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                                        disabled={historyPage === 1}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-sm text-gray-500">
                                        Página {historyPage} de {Math.ceil(activeReport.salesDetails.length / 20)}
                                    </span>
                                    <button
                                        onClick={() => setHistoryPage(prev => Math.min(prev + 1, Math.ceil(activeReport.salesDetails.length / 20)))}
                                        disabled={historyPage === Math.ceil(activeReport.salesDetails.length / 20)}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};`
);

// 7. remove the fallback 'No hay datos' that blocks rendering the page
data = data.replace(
  `if (!activeReport && !loading) return <div className="p-6 text-center">No hay datos para mostrar.</div>`,
  `// if (!activeReport && !loading) return <div className="p-6 text-center">No hay datos para mostrar.</div>`
);


fs.writeFileSync(file, data);
console.log("ReportsPage patched successfully");
