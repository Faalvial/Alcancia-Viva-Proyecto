# Evidencia PC04 · Fase 1 (shell móvil: tab bar, FAB y bottom sheet)

Capturas `{modo}-{ancho}-{pantalla}.png`:

- modos: `normal`, `large` (texto 200 %), `contrast` (alto contraste);
- anchos: 320, 375, 768, 1024 y 1440 px;
- pantallas: `jardin`, `metas`, `grupos`, `movimientos`, `asistente`, `preferencias` y `registro` (composer abierto: bottom sheet en móvil, diálogo centrado en tablet/escritorio).

`antes/` guarda el estado previo a la fase (375 y 1440 px).

## Cómo se generan

Las pantallas con sesión usan un backend simulado (`scripts/evidence/mock-backend.cjs`): sesión de práctica en `localStorage` y respuestas REST/RPC interceptadas en Playwright. Ninguna petición llega al Supabase compartido.

```bash
npm run build
npx vite preview --port 4173
node scripts/evidence/capture-shell.cjs docs/evidence/pc04/fase1   # capturas + control de scroll horizontal
node scripts/evidence/check-shell.cjs                              # interacciones
```

(Con el Playwright preinstalado de forma global: `NODE_PATH=$(npm root -g)`.)

## Resultados

- Sin scroll horizontal en ninguna combinación de ancho × pantalla × modo (105 capturas). Se corrigieron tres desbordes que ya existían con texto 200 % a 320/375 px (título de Movimientos, monto del avance conjunto y tarjeta de grupo) y uno nuevo del header a 768 px.
- `check-shell.cjs` verifica:
  - móvil: tab bar fija de 64 px con 5 destinos, `aria-current="page"`, etiquetas sin truncar a 375 px (y 320 px en la comprobación manual), Preferencias en el header y «Cerrar sesión» dentro de Preferencias;
  - objetivos táctiles ≥ 44 px (tab bar, FAB de 56 px, botón de Preferencias) y FAB sobre la tab bar;
  - bottom sheet anclado abajo (≤ 92 dvh), foco inicial en el texto, un arrastre corto no cierra, un arrastre largo cierra y devuelve el foco al FAB, el botón Cerrar sigue funcionando;
  - escritorio: atajo «n» abre el registro (no dentro de campos), Escape lo cierra, diálogo centrado;
  - tablet: rail de 72 px con tooltip y nombre accesible;
  - texto 200 %: la navegación deja de ser fija y muestra el texto completo.
