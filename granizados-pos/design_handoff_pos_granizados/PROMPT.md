# PROMPT PARA CLAUDE CODE — POS Granizados Oasis

Pega este prompt completo en Claude Code, dentro de la carpeta del proyecto (vacía o existente), con los archivos de `design_handoff_pos_granizados/` disponibles.

---

## Contexto

Voy a construir **Granizados Oasis POS**: una aplicación web móvil (usable también en tablet y computador) para administrar un negocio de granizados. Tiene dos roles: **VENDEDOR** (vender rápido) y **ADMINISTRADOR** (controlar todo el negocio).

En esta carpeta hay un **prototipo de diseño en HTML** (`Granizados POS.dc.html`) que muestra el look final y el comportamiento esperado de todo el flujo del vendedor y del panel del administrador. **No es código de producción**: es la referencia visual y funcional. Tu trabajo es **recrear ese diseño en una aplicación real**, con la misma jerarquía visual, los mismos tokens de color/tipografía y los mismos flujos.

El prototipo es **alta fidelidad**: respeta colores, tamaños de texto, radios, espaciado y estados tal como están. Los tokens exactos están en `styles.css` (sistema de diseño Nocturne) y documentados en `README.md`.

## Stack objetivo

Si no te indico otra cosa, usa:

- **Next.js (App Router) + TypeScript + React**
- **Tailwind CSS** con los tokens de `styles.css` mapeados a variables CSS (`--color-bg`, `--color-surface`, `--color-accent`, ramps 100–900, `--space-*`, `--radius-*`, `--shadow-*`). No inventes colores nuevos.
- **Prisma + PostgreSQL** (o SQLite en desarrollo)
- **Auth** con usuario/PIN por empleado y sesión con rol
- **Iconos Phosphor** (`@phosphor-icons/react`), tipografía **Inter**
- PWA instalable, funciona en pantalla de 390–430 px de ancho como caso principal
- Vitest/Playwright para pruebas de las reglas de negocio críticas

## Modelo de datos (crear migraciones)

Entidades mínimas, con relaciones y preparadas para crecer (helados, malteadas, combos, domicilios, múltiples sucursales, proveedores, clientes):

- `User` (nombre, usuario, pin_hash, rol, activo)
- `Role` / permisos por rol
- `Branch` (sucursal — una por defecto, pero la relación existe)
- `Product` (tipo: granizado; extensible), `Size` (nombre, precio, activo), `Flavor` (nombre, imagen opcional, activo, insumo relacionado), `Addon` (nombre, precio, costo, activo, insumo relacionado)
- `PriceHistory` (entidad, valor anterior, valor nuevo, usuario, fecha)
- `Sale` (número consecutivo, fecha/hora, user_id, branch_id, método de pago, total, estado: ok | anulada, motivo_anulación, anulada_por)
- `SaleItem` (sale_id, size_id, flavor_id, cantidad, **precio_unitario congelado**, snapshot de nombres)
- `SaleItemAddon` (sale_item_id, addon_id, **precio congelado**)
- `PaymentMethod` (efectivo, transferencia, tarjeta, otro)
- `InventoryItem` (nombre, unidad, existencia, mínimo)
- `InventoryMovement` (item_id, tipo: entrada | salida | ajuste | venta, cantidad, fecha, user_id, motivo, sale_id opcional)
- `Recipe` / `RecipeLine` (consumo de insumos por tamaño, por sabor y por adición)
- `Expense` (concepto, categoría, valor, fecha, método de pago, nota) + `ExpenseCategory`
- `CashClosure` (turno, user_id, apertura, cierre, esperado por método, contado, diferencia) + `CashMovement`
- `AuditLog` (user_id, fecha, acción, entidad, registro_id, valor_anterior, valor_nuevo)

## Reglas de negocio (no negociables)

1. Los precios siempre vienen de la configuración del administrador; el vendedor no puede modificarlos.
2. Una venta confirmada **nunca** se borra físicamente: se anula y queda registrada como `anulada`.
3. Toda venta guarda fecha, hora, vendedor, productos, cantidades, adiciones y método de pago.
4. `SaleItem` guarda el **precio con el que se vendió** (los cambios de precio solo afectan ventas nuevas).
5. Cada venta confirmada descuenta inventario según la receta (vaso por tamaño, hielo por tamaño, pulpa por sabor, insumo por adición) y genera `InventoryMovement` tipo `venta`.
6. Todo movimiento de inventario guarda usuario y motivo.
7. Productos/sabores/adiciones desactivados u ocultos no aparecen para el vendedor.
8. Si un insumo llega al mínimo, mostrar alerta “⚠️ Inventario bajo”.
9. Los reportes se calculan de registros reales, nunca de valores en duro.
10. Confirmar venta es **idempotente**: doble toque no crea dos ventas (deshabilitar botón + clave de idempotencia en el request).
11. Acciones sensibles (anular venta, ajustar inventario, cambiar precio) piden confirmación y escriben en `AuditLog`.
12. El vendedor puede **solicitar** la anulación; solo el administrador la ejecuta.
13. El cierre de caja calcula esperado por método, recibe el efectivo contado y guarda la diferencia.
14. El administrador consulta todo por día, semana, mes y rango personalizado.
15. El vendedor no ve utilidad global, gastos, inventario ni configuración.

## Alcance a construir

**Vendedor (móvil, botones grandes, mínimo de pasos):**
1. Login con PIN.
2. **Nueva venta**: promo del día, “los más vendidos” (un toque agrega al carrito), configurador (tamaño con precio → sabor → adiciones múltiples con precio), resumen con precio en vivo y botón `+ AGREGAR AL CARRITO`, barra flotante de carrito.
3. **Carrito**: líneas con producto, tamaño, sabor, adiciones, cantidad, precio unitario y subtotal; `+`, `−`, editar (devuelve la línea al configurador), eliminar; subtotal y TOTAL; `COBRAR`.
4. **Cobro**: métodos (efectivo, transferencia, tarjeta, otro); en efectivo montos rápidos (exacto, 10.000, 20.000, 50.000) y teclado numérico; cálculo de cambio; `CONFIRMAR VENTA` (bloqueado si el recibido es menor al total).
5. **Confirmación**: “Venta registrada correctamente”, número, hora, total, cambio y aviso de inventario descontado.
6. **Mis ventas del turno**: totales del turno, lista con número, hora, productos, total y método; detalle expandible con “Solicitar anulación”.
7. **Cierre de caja**: resumen por método, esperado en efectivo, teclado para el contado, diferencia con signo, `CONFIRMAR CIERRE` y estado de caja cerrada.

**Administrador:**
1. **Dashboard** con selector de período (Hoy | Ayer | Esta semana | Este mes | Personalizado): ventas, ticket promedio, productos vendidos, adiciones, gastos, utilidad estimada; gráfico de ventas por hora; alerta de inventario bajo. Densidad compacta (2 columnas) y amplia (1 columna).
2. **Ventas**: tabla con venta, vendedor, hora, método, total; anular con motivo.
3. **Productos y precios**: tres grupos (Tamaños, Sabores, Adiciones), cada uno con botón `+ Nuevo` y formulario (nombre, precio, costo en adiciones), edición por fila de nombre y precio, y **botón de ojo para mostrar u ocultar** al vendedor (lo oculto desaparece de inmediato del POS).
4. **Inventario**: tabla insumo / existencia / mínimo con marca de bajo; agregar, retirar, ajustar, ver movimientos; configuración del consumo por producto (recetas).
5. **Caja**: histórico de cierres con esperado, contado, diferencia y vendedor.
6. **Finanzas**: ingresos por método, costo de productos, gastos con concepto/categoría/valor/fecha/método/nota, resultado y utilidad estimada.
7. **Reportes**: sabores, tamaños y adiciones más vendidos, métodos de pago, ventas por empleado y horarios de mayor venta (barras).
8. **Configuración**: descuento automático de inventario, alertas de mínimo, propina sugerida, recibo digital, anulación solo por administrador.
9. **Auditoría** consultable con usuario, fecha, acción, valor anterior y nuevo.

## Cómo quiero que trabajes

1. Lee `README.md` y abre `Granizados POS.dc.html` en el navegador para ver el diseño y los flujos antes de escribir código.
2. Propón la estructura de carpetas y el esquema Prisma, y espera mi visto bueno.
3. Implementa por hitos, con la app corriendo al final de cada uno:
   - **H1** — Esquema + auth por PIN + tokens de diseño y layout móvil.
   - **H2** — Flujo completo del vendedor (venta → carrito → cobro → confirmación) con precios congelados e idempotencia.
   - **H3** — Inventario con recetas y descuento automático + alertas.
   - **H4** — Mis ventas, cierre de caja y auditoría.
   - **H5** — Panel admin: dashboard, ventas, productos/precios (crear, editar, mostrar/ocultar), inventario.
   - **H6** — Finanzas, gastos, reportes, configuración.
4. Pruebas obligatorias: precio congelado en ventas históricas, doble confirmación no duplica venta, descuento correcto de inventario, cálculo de diferencia en cierre, permisos por rol.
5. Español para toda la interfaz. Moneda en pesos colombianos con separador de miles (`$8.000`), sin decimales.
6. No agregues funciones que no pedí (domicilios, facturación, fidelización): deja el modelo listo para ellas, nada más.
