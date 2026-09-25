const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

if (!content.includes('useCostsStore')) {
    content = content.replace(
        "import useSalesStore from './store/useSalesStore';",
        "import useSalesStore from './store/useSalesStore';\nimport useCostsStore from './store/useCostsStore';"
    );

    const initLogic = `
  useEffect(() => {
    // Initial fetch to calculate incidence rate and sync recurring expenses
    useCostsStore.getState().syncRecurring().then(() => {
        useCostsStore.getState().fetchIncidenceRate();
    });
  }, []);
`;

    content = content.replace(
        "useGlobalScanner();",
        `useGlobalScanner();\n${initLogic}`
    );

    fs.writeFileSync('src/App.jsx', content, 'utf8');
    console.log("App.jsx updated with sync recurring logic.");
} else {
    console.log("App.jsx already has sync recurring logic.");
}
