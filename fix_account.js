const fs = require('fs');
let data = fs.readFileSync('src/pages/AccountPage.jsx', 'utf8');

// The issue is the replaceBlock string literal being parsed by JS template literal, turning \${ into ${
// I need to make sure the replacement has proper escaping.

const targetBlock = `<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Ingresos</p>
                        <div className="p-2 bg-green-50 rounded-full text-green-600">
                            <FiTrendingUp size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">\\$\\{formatNumber(accountSummary.totalIncome)\\}</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Egresos</p>
                        <div className="p-2 bg-red-50 rounded-full text-red-600">
                            <FiTrendingDown size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">-\\$\\{formatNumber(accountSummary.totalOutcome)\\}</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Resultado del Período</p>
                        <div className={\`p-2 rounded-full \\\${accountSummary.periodResult >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}\`}>
                            <FiDollarSign size={18} />
                        </div>
                    </div>
                    <p className={\`text-2xl font-bold \\\${accountSummary.periodResult >= 0 ? 'text-blue-600' : 'text-red-600'}\`}>
                        \\{accountSummary.periodResult >= 0 ? '$' : '-$'\\}\\{formatNumber(Math.abs(accountSummary.periodResult))\\}
                    </p>
                </div>
            </div>`;

// Using replace_with_git_merge_diff to be safe
