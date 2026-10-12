# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Cajeros / Vendedores de mostrador:** Registran ventas de forma ágil en PC de escritorio/laptop con lector de código de barras físico o búsqueda rápida por teclado, cobrando con diversos métodos de pago y emitiendo comprobantes o tickets.
- **Operadores de salón / Repositores / Vendedores móviles:** Utilizan teléfonos móviles o tablets para consultar stock, registrar precios, reponer mercadería en góndola o concretar ventas directas en salón usando la cámara como escáner (PWA / barra de navegación móvil).
- **Dueño / Administrador del comercio:** Administra inventario, costos, márgenes, listas de precios, promociones, cierres de caja, encargos a proveedores y reportes de rentabilidad.

## Product Purpose
Proporcionar un sistema integral, veloz y confiable de punto de venta (POS) y control de stock para comercios minoristas y retail (minimarkets, almacenes, bazares, ferreterías, repuestos, etc.). Elimina cuellos de botella en la atención al cliente en caja y brinda control total de stock, costos y márgenes de ganancia tanto en puesto fijo como en movimiento.

## Positioning
Una solución de retail ligera y reactiva con base de datos local SQLite, que combina la velocidad operativa de un POS tradicional de escritorio (atajos de teclado, lector de barras físico, tickets) con la versatilidad de una app móvil para salón/depósito (PWA con escaneo por cámara).

## Operating Context
- **Puesto de caja fija (PC/Laptop):** Espacio de mostrador con periféricos (lector de código de barras USB, impresora térmica) y alta frecuencia de transacciones donde la velocidad de teclado sin uso de mouse es prioritaria.
- **Piso de venta / Depósito (Móvil/Tablet):** Dispositivos móviles en mano para control de góndola, consulta instantánea de precios, conteo de stock y ventas auxiliares.
- **Horarios pico de atención:** Requiere latencia cero, confirmaciones visuales/sonoras claras ante escaneo, y robustez frente a errores accidentales.

## Capabilities and Constraints
- **Módulos clave:** Punto de Venta (Sales), Inventario y catálogo, Caja diaria y arqueos, Gestión de Costos y Precios, Promociones, Encargos y Pedidos, Reportes estadísticos y Panel de Administración con control de roles (`admin`, `caja`, operador).
- **Hardware y periféricos:** Lectores de código de barras (USB y cámara web/móvil), atajos de teclado (`react-hotkeys-hook`), e impresión de tickets.
- **Arquitectura técnica:** Frontend React 19 + Vite + Tailwind CSS v4 + Zustand + Lucide/React Icons. Backend Node.js / Express con base de datos SQLite (`inventory.db`).

## Brand Commitments
- Nombre de la aplicación: **STOCK** (referenciado internamente en el proyecto como `facturacionapp20`).
- Tono utilitario, claro, de alta densidad de información y con foco en legibilidad y respuesta inmediata.

## Evidence on Hand
- Base de datos activa: `inventory.db`.
- Código fuente implementado en `src/` con módulos completos de POS, inventario, reportes y cuentas.
- Componentes de escaneo y navegación adaptativa (`src/hooks/useGlobalScanner.js`, `src/components/ScannerFAB.jsx`, `src/components/BottomNav.jsx`, `src/components/NativeScannerModal.jsx`).

## Product Principles
1. **Velocidad transaccional primero:** En el mostrador cada segundo cuenta. La interacción debe ser inmediata, con flujo guiado por atajos y escáner.
2. **Coherencia escritorio-móvil:** El escritorio optimiza densidad de datos y atajos físicos; el entorno móvil optimiza ergonomía táctil y escaneo ágil con cámara.
3. **Fidelidad y consistencia en números:** Los movimientos de stock, ingresos/egresos de caja y márgenes de ganancia deben ser precisos y auditables en todo momento.
4. **Resistencia a fallos en el punto de venta:** Las transacciones no deben perderse por desconexiones breves o errores fortuitos en la entrada de datos.

## Accessibility & Inclusion
- Alto contraste y tipografía legible a distancia de mostrador.
- Soporte completo de navegación por teclado en flujos críticos de cobro y búsqueda.
