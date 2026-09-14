from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # Using mobile dimensions to check for layout issues
    context = browser.new_context(
        ignore_https_errors=True,
        viewport={'width': 375, 'height': 667}
    )
    page = context.new_page()
    page.goto('https://localhost:5173/inventario')
    # wait for the UI to load
    page.wait_for_selector('text=Agrupar vista por:')
    page.screenshot(path='screenshot.png')
    browser.close()
