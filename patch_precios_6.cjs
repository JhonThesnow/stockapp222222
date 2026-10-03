const fs = require('fs');
let content = fs.readFileSync('src/pages/PreciosPage.jsx', 'utf8');

const regex = /<button[\s]*onClick=\{\(\) => startSync\(filteredProducts\.map\(p => p\.id\)\)\}[\s]*disabled=\{filteredProducts\.length === 0\}[\s]*className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"[\s]*>[\s]*<FiPlay className="mr-2" \/>[\s]*Sincronizar \{filteredProducts\.length\} productos[\s]*<\/button>/;

const newBtn = `<button
                            onClick={() => {
                                const idsToSync = selectedIds.size > 0 ? Array.from(selectedIds) : filteredProducts.map(p => p.id);
                                startSync(idsToSync);
                            }}
                            disabled={filteredProducts.length === 0}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
                        >
                            <FiPlay className="mr-2" />
                            Sincronizar {selectedIds.size > 0 ? \`\${selectedIds.size} seleccionados\` : \`\${filteredProducts.length} productos\`}
                        </button>`;

content = content.replace(regex, newBtn);
fs.writeFileSync('src/pages/PreciosPage.jsx', content);
