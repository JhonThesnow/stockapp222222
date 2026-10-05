const fs = require('fs');

let code = fs.readFileSync('server/server.js', 'utf8');

// The easiest way to finalize safely without restructuring the nested callbacks is to finalize right before the transaction commits or rolls back
code = code.replace(
    "const finalizeTransaction = () => {",
    "const finalizeTransaction = () => {\\n            insertProductStmt.finalize();\\n            stockUpdateStmt.finalize();"
);

fs.writeFileSync('server/server.js', code);
console.log("server.js finalized statements.");
