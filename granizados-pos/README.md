# Granizados Oasis POS

Punto de venta y panel de administración para un negocio de granizados. Dos roles:
**vendedor** (vender rápido desde el móvil) y **administrador** (controlar el negocio).

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 + SQLite ·
sesión por PIN con JWT en cookie httpOnly · iconos Phosphor · tipografía Inter.

## Poner a andar el proyecto

```bash
npm install
cp .env.example .env          # y genera un SESSION_SECRET
npx prisma migrate dev        # crea la base de datos
npx prisma db seed            # carga catálogo, recetas e inventario
npm run dev                   # http://localhost:3000
```

Generar el `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Usuarios de desarrollo

Creados por el seed. **Cambiar los PIN antes de usar en producción.**

| Usuario  | PIN  | Rol           |
| -------- | ---- | ------------- |
| `camilo` | 9999 | Administrador |
| `sara`   | 1234 | Vendedor      |
| `juan`   | 1234 | Vendedor      |

## Estructura

```
prisma/            esquema, migraciones y seed
src/app/           rutas: /login, (vendedor) y (admin)
src/components/    shell móvil y primitivos de UI
src/lib/           prisma, sesión, DAL de autorización, formato de moneda
src/server/actions Server Actions (lógica de negocio)
src/proxy.ts       control de acceso por rol (Next 16 reemplaza middleware por proxy)
design_handoff_pos_granizados/  prototipo y tokens de diseño de referencia
```

## Diseño

La UI recrea el prototipo de `design_handoff_pos_granizados/` con el sistema
**Nocturne**: fondo `#161826`, superficie `#232532`, acento `#9184d9` usado como
línea, borde o brillo — nunca como relleno grande. Los tokens viven en
`src/app/globals.css` (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`).
Caso principal: pantalla de 390–430 px.

## Hitos

- **H1** — esquema + auth por PIN + tokens de diseño y layout móvil ✅
- **H2** — flujo del vendedor: venta → carrito → cobro → confirmación
- **H3** — inventario con recetas, descuento automático y alertas
- **H4** — mis ventas, cierre de caja y auditoría
- **H5** — panel admin: dashboard, ventas, productos/precios, inventario
- **H6** — finanzas, gastos, reportes y configuración
