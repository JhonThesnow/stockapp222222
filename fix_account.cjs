const fs = require('fs');
const content = fs.readFileSync('src/pages/AccountPage.jsx', 'utf8');

const targetStr = `                    <p className="relative z-10 text-3xl font-bold">
                        {accountSummary.historicalBalance >= 0 ? '

            <div>
                {/* Pestañas (Tabs) Estilo Underline */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex gap-6" aria-label="Tabs">`;

const replacement = `                    <p className="relative z-10 text-3xl font-bold">
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
            </div>

            <div>
                {/* Pestañas (Tabs) Estilo Underline */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex gap-6" aria-label="Tabs">`;

if (content.includes(targetStr)) {
    fs.writeFileSync('src/pages/AccountPage.jsx', content.replace(targetStr, replacement));
    console.log('File patched successfully.');
} else {
    console.log('Target string not found.');
}
