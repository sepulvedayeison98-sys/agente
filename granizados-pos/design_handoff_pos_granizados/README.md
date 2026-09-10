# Handoff: POS Granizados Oasis (móvil)

## Overview
App móvil para un negocio de granizados con dos roles. **Vendedor**: registrar una venta en segundos (promo del día y favoritos de un toque, configurador tamaño → sabor → adiciones, carrito, cobro con cambio, mis ventas, cierre de caja). **Administrador**: dashboard, ventas, productos y precios (crear, editar, mostrar/ocultar), inventario con descuento automático, caja, finanzas y gastos, reportes, configuración y auditoría.

El prompt listo para pegar en Claude Code está en `PROMPT.md`.

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML**: un prototipo que muestra el aspecto y el comportamiento previstos, no código de producción para copiar. La tarea es **recrear estos diseños en el entorno de la aplicación destino** (React/Next, Vue, SwiftUI, nativo…) usando sus patrones y librerías; si todavía no hay entorno, elegir el stack adecuado (recomendado en `PROMPT.md`) e implementarlos allí.

## Fidelity
**Alta fidelidad.** Colores, tipografía, espaciado, radios, sombras y estados son definitivos y salen del sistema de diseño Nocturne (`styles.css`). Recrear la UI fielmente con las librerías del proyecto.

## Screens / Views

Marco de referencia: pantalla de teléfono 402 × 874 px, tema oscuro. Estructura común: encabezado (56 px de alto útil, `padding: 6px 16px 10px`) con nombre del negocio + subtítulo de 11 px y botón de cambio de rol; contenido con scroll y `padding: 0 16px 12px`; botón primario fijo de 54 px; barra de navegación inferior de 4 destinos (iconos 20 px, etiquetas 10 px, `padding-bottom: 34px` por el home indicator).

### 1. Nueva venta (vendedor) — pantalla inicial
- **Propósito**: armar y agregar productos al carrito en el menor número de toques.
- **Promo del día**: tarjeta con fondo `--color-accent-900`, borde interno `--color-accent-700`, radio 8 px, icono `ph-sparkle` 20 px `--color-accent-300`, kicker 10 px mayúscula con `letter-spacing: .1em`, nombre 15 px medium, precio 16 px con el precio anterior tachado 10 px, y botón cuadrado 38 px con borde de acento e icono `ph-plus`.
- **Los más vendidos**: grid de 2 columnas, gap 8 px, tarjetas de mín. 64 px con fondo `--color-surface`, `--shadow-sm`, nombre 14 px medium, subtítulo 10.5 px atenuado y precio 13 px en `--color-accent-300`. Un toque agrega al carrito.
- **Armar granizado**: fila de 4 tamaños (grid `repeat(4,1fr)`, gap 6 px) con nombre 11.5 px y precio 13.5 px; grid de sabores `repeat(3,1fr)` con celdas de 50 px; chips de adiciones (flex wrap, gap 6 px, `padding: 8px 11px`) con nombre 12.5 px y precio 11 px atenuado. Selección = `box-shadow: inset 0 0 0 1px var(--color-accent)` y texto `--color-accent`; sin selección = `inset 0 0 0 1px var(--color-divider)`.
- **Resumen**: tarjeta con descripción 13 px y precio 19 px, más CTA de 50 px `+ AGREGAR AL CARRITO` (borde de acento, fondo `color-mix(in srgb, var(--color-accent) 12%, transparent)`).
- **Barra de carrito** (si hay líneas): franja de acento con icono, número de ítems, total 18 px y flecha; lleva al carrito.
- Solo aparecen tamaños, sabores y adiciones **visibles** según el admin.

### 2. Carrito
Encabezado “Carrito · N ítems”. Cada línea: título 14 px medium (`Granizado grande · Mango`), subtítulo 11 px con adiciones o “Sin adiciones”, subtotal 15 px y precio unitario 10.5 px; fila de controles con botones 34 × 34 px (`−`, cantidad, `+`), `Editar` (devuelve la línea al configurador) y `eliminar` (icono `ph-trash`). Al final tarjeta con Subtotal 13 px y TOTAL 26 px. CTA fijo: `COBRAR $X` + secundario “Seguir vendiendo”.

### 3. Cobro
Total centrado a 38 px con kicker “TOTAL A COBRAR”. Grid 2 × 2 de métodos (46 px, icono 16 px: `ph-money`, `ph-device-mobile`, `ph-credit-card`, `ph-dots-three-circle`). En efectivo: fila de 4 montos rápidos (38 px), tarjeta con “Dinero recibido” 22 px y “Cambio” 22 px en `--color-accent-300` (gris si es negativo) y teclado numérico 3 × 4 (teclas 46 px, `1…9`, `000`, `0`, `⌫`). CTA `CONFIRMAR VENTA`, bloqueado mientras registra (`REGISTRANDO…`) y si el recibido es menor al total. Secundario “Volver al carrito”.

### 4. Venta registrada
Círculo de 76 px con borde de acento y `ph-check` 34 px (animación `popIn` 280 ms), título 20 px “Venta registrada correctamente”, línea de meta 12 px (venta, hora, método), tarjeta con Total, Cambio entregado y nota de inventario descontado con icono `ph-package`. CTA `NUEVA VENTA` + “Ver mis ventas”. Animación de entrada `riseIn` 300 ms.

### 5. Mis ventas del turno
Tres KPI en grid de 3 (Vendido, Ventas, Efectivo; etiqueta 10 px mayúscula, valor 16 px). Lista de ventas: número 13.5 px, hora 11 px, tag de método (`.tag .tag-neutral`), total 15 px alineado a la derecha, detalle 11.5 px (`2× Granizado mediano · Fresa`). Al tocar se expande con la nota “Cerrada · requiere autorización del administrador” y botón “Solicitar anulación” (muestra toast). Las anuladas se ven a 50 % de opacidad con el texto “· ANULADA”.

### 6. Cierre de caja
Resumen del turno (6 filas de 13 px: total de ventas, cantidad, efectivo, transferencias, tarjetas, otros). Tarjeta de conteo: esperado 19 px, contado 19 px, diferencia 22 px con signo (`+$2.000`, `-$3.000`; verde-acento si es 0). Teclado 3 × 4 (44 px). CTA `CONFIRMAR CIERRE`. Tras confirmar: estado “Caja cerrada” con icono `ph-lock-simple` y `ABRIR NUEVO TURNO`.

### 7. Administrador
Tabs horizontales con scroll (`padding: 7px 11px`, 12.5 px; seleccionado con borde interno de acento): Dashboard, Ventas, Productos y precios, Inventario, Caja, Finanzas, Reportes, Configuración.
- **Dashboard**: chips de período (Hoy | Ayer | Esta semana | Este mes | Personalizado); KPIs en 2 columnas (valor 19 px) o 1 columna (24 px) según densidad; barras de ventas por hora (alto 96 px, barras `--color-accent`, vacías `--color-neutral-800`, etiquetas 9 px); alerta de inventario bajo con `ph-warning` sobre `--color-accent-900`.
- **Ventas**: `.table` con Venta (+ vendedor 10.5 px), Hora, Pago y Total alineado a la derecha.
- **Productos y precios**: tres secciones; cada encabezado `h6` con botón `+ Nuevo …` (borde de acento, 11.5 px); formulario en tarjeta con `.field`/`.input` (Nombre; Precio; Costo en adiciones) y botones Guardar / Cancelar; filas con nombre 13 px, meta 11 px (precio, o “precio · costo”), tag `Visible`/`Oculto`, botón ojo 32 px (`ph-eye` / `ph-eye-slash`) y botón editar 32 px (`ph-pencil-simple`). En edición: inputs de nombre y precio, `Guardar cambios` y la nota “Los cambios de precio aplican solo a ventas nuevas”. Lo oculto sale del POS al instante y la fila baja a 55 % de opacidad.
- **Inventario**: `.table` insumo / existencia / mínimo, con marca `⚠ bajo` en `--color-accent-300` y nota del descuento automático.
- **Caja**: tarjetas de cierre con turno, fecha, diferencia (14 px) y línea “Esperado … · contado … · vendedor”.
- **Finanzas**: tarjeta con ventas totales, efectivo, transferencias, costo de productos, gastos y Utilidad estimada 22 px en `--color-accent-300`; tabla de gastos (concepto, categoría, valor).
- **Reportes**: cuatro rankings (sabores, tamaños, adiciones, métodos de pago) con etiqueta 12.5 px, valor atenuado y barra de 5 px (`--color-accent` sobre `--color-neutral-900`) proporcional al máximo.
- **Configuración**: cinco filas con switch (pista 42 × 24 px, radio 12 px, perilla 20 px; encendido: fondo `color-mix(in srgb, var(--color-accent) 26%, transparent)`, borde y perilla `--color-accent`) y nota de auditoría.

## Interactions & Behavior
- Navegación por tabs inferiores; el rol se alterna con el botón del encabezado (en producción depende del login).
- Toques: `transform: scale(.985)` en `:active`, transiciones de 120 ms en `background`/`box-shadow`.
- Animaciones: `riseIn` (opacidad + 8 px, 200–300 ms ease) para toasts, formularios y confirmación; `popIn` (280 ms) para el check.
- Agregar al carrito: si la combinación (tamaño + sabor + adiciones) ya existe, incrementa cantidad en lugar de duplicar línea; muestra toast 2,2 s.
- Confirmar venta: bloquea el botón (`busy`), registra tras ~260 ms, descuenta inventario, limpia el carrito y navega a confirmación. Doble toque no debe duplicar.
- Cobro en efectivo: si el recibido es menor al total, no permite confirmar y avisa por toast; el cambio nunca se muestra negativo.
- Cierre: exige efectivo contado; guarda el cierre en el histórico del admin.
- Editar línea del carrito: la elimina y precarga tamaño, sabor y adiciones en el configurador.
- Responsive: el diseño está pensado para 390–430 px de ancho; en tablet/desktop se mantiene una columna centrada con el mismo ritmo vertical.

## State Management
`role`, `screen`, `tab`, `period`; borrador de venta (`size`, `flavor`, `addons`); `cart` (líneas con id, tamaño, sabor, adiciones, cantidad, precio unitario congelado); `method`, `received`, `busy`, `lastSale`; `sales` (con `estado: ok | anulada`); `inv` (existencias) y su descuento por receta; `expenses`, `closures`, `counted`, `closed`; catálogos editables `sizes`, `flavors`, `addons_cfg` con bandera `on` (visible/oculto); `prodAdd`, `prodEdit`, `form` para crear/editar; `cfg` (5 ajustes); `toast`, `openSale`.

Recetas usadas en el prototipo: vaso por tamaño (1 unidad); hielo 0,25 / 0,35 / 0,5 / 0,9 kg (pequeño → familiar); pulpa del sabor 0,06 / 0,09 / 0,12 / 0,2 kg; adiciones: gomitas 0,03 kg, fruta 0,05 kg, leche condensada 0,08 lata, crema 0,04 kg, salsa 0,02 l.

Precios del prototipo: Pequeño $4.000, Mediano $6.000, Grande $8.000, Familiar $12.000. Adiciones: Gomitas $1.000 (costo $350), Fruta $1.500 ($600), Leche condensada $1.500 ($500), Crema $1.000 ($300), Salsa $800 ($250). Sabores: Fresa, Mango, Maracuyá, Mora, Piña, Limón.

## Design Tokens (Nocturne — `styles.css`)
- Fondo `--color-bg` #161826 · superficie `--color-surface` #232532 · texto `--color-text` #e9e9ed · divisor `color-mix(in srgb,#e9e9ed 16%, transparent)`
- Acento `--color-accent` #9184d9; ramp 100–900: #f5f4ff, #e7e5fe, #d2cefd, #b5abfc, #968ae0, #796cbf, #5d5294, #423a6a, #2b2741
- Neutros 100–900: #f3f5fe, #e4e7f5, #cfd3e5, #b2b6ca, #9397ab, #75798c, #595d6c, #3f424d, #292b31
- Tipografía Inter (`--font-heading` / `--font-body`), peso de títulos 500, cuerpo 15 px / 1.55; escala usada: 38, 26, 22, 19, 17, 15, 14, 13, 12, 11, 10 px
- Espaciado `--space-1..8`: 2.8, 5.6, 8.4, 11.2, 16.8, 22.4 px · radios `--radius-sm/md/lg`: 4 / 8 / 14 px
- Sombras: `--shadow-sm` `0 0 0 1px #3f424d`, `--shadow-md`, `--shadow-lg`
- Reglas de uso: el acento va como línea, borde o brillo — nunca como relleno grande; botones primarios son contorno de acento sobre transparente con tinte 12 %; foco visible `2px solid var(--color-accent)`.

## Assets
Sin imágenes propias. Iconos **Phosphor** (`ph-*`, regular y fill) por CDN — en producción usar el paquete de Phosphor del proyecto. Tipografía Inter desde Google Fonts. El marco de teléfono del prototipo (`ios-frame.jsx`) es solo andamiaje de presentación: no se implementa.

## Files
- `PROMPT.md` — prompt completo para Claude Code.
- `Granizados POS.dc.html` — prototipo de referencia (abrir en navegador; requiere `support.js`, `ios-frame.jsx` y `styles.css`).
- `support.js`, `ios-frame.jsx` — runtime y marco de presentación del prototipo.
- `styles.css` — tokens y clases del sistema de diseño Nocturne.
- `nocturne-readme.md` — guía del sistema de diseño.
