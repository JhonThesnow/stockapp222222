const fs = require('fs');

let fileStr = fs.readFileSync('src/pages/AccountPage.jsx', 'utf8');

const t = `            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Ingresos</p>
                        <div className="p-2 bg-green-50 rounded-full text-green-600">
                            <FiTrendingUp size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">\${formatNumber(accountSummary.totalIncome)}</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Egresos</p>
                        <div className="p-2 bg-red-50 rounded-full text-red-600">
                            <FiTrendingDown size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">-\${formatNumber(accountSummary.totalOutcome)}</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Resultado del Período</p>
                        <div className={\`p-2 rounded-full \${accountSummary.periodResult >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}\`}>
                            <FiDollarSign size={18} />
                        </div>
                    </div>
                    <p className={\`text-2xl font-bold \${accountSummary.periodResult >= 0 ? 'text-blue-600' : 'text-red-600'}\`}>
                        {accountSummary.periodResult >= 0 ? '$' : '-$'}{formatNumber(Math.abs(accountSummary.periodResult))}
                    </p>
                </div>
            </div>`;

const r = `            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 rounded-lg shadow-md flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <FiDollarSign size={64} />
                    </div>
                    <div className="relative z-10 flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-blue-100 uppercase tracking-wider">Saldo Total Acumulado</p>
                    </div>
                    <p className="relative z-10 text-3xl font-bold">
                        {accountSummary.historicalBalance >= 0 ? '$' : '-$'}{formatNumber(Math.abs(accountSummary.historicalBalance || 0))}
                    </p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ingresos (Período)</p>
                        <div className="p-2 bg-green-50 rounded-full text-green-600">
                            <FiTrendingUp size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">\${formatNumber(accountSummary.totalIncome)}</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Egresos (Período)</p>
                        <div className="p-2 bg-red-50 rounded-full text-red-600">
                            <FiTrendingDown size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">-\${formatNumber(accountSummary.totalOutcome)}</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Resultado (Período)</p>
                        <div className={\`p-2 rounded-full \${accountSummary.periodResult >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}\`}>
                            <FiDollarSign size={18} />
                        </div>
                    </div>
                    <p className={\`text-2xl font-bold \${accountSummary.periodResult >= 0 ? 'text-blue-600' : 'text-red-600'}\`}>
                        {accountSummary.periodResult >= 0 ? '$' : '-$'}{formatNumber(Math.abs(accountSummary.periodResult))}
                    </p>
                </div>
            </div>`;

// Safe replace logic that avoids template literal variables being expanded by bash
fileStr = fileStr.split(t).join(r);
fs.writeFileSync('src/pages/AccountPage.jsx', fileStr);
