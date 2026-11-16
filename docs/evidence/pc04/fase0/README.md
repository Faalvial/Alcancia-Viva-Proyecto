# Evidencia PC04 · Fase 0 (fundaciones, sin cambio visual)

- `antes-login-375.png`, `antes-login-1440.png`: pantalla de acceso antes de la fase.
- `login-{320,375,768,1024,1440}.png`: la misma pantalla después de la fase. Sin scroll horizontal en ningún ancho.

Comprobaciones automáticas (Playwright, `vite preview`):

- Antes/después a 375 y 1440 px: mismas dimensiones; solo cambia el suavizado del texto porque ahora Inter se sirve desde `public/fonts/` en lugar de depender de una copia local.
- `document.fonts.check()` confirma que cargan Inter y Fraunces (HTTP 200 desde `/fonts/`).
- Con el sistema en modo oscuro la pantalla no cambia (los tokens oscuros solo se activan con `data-theme`, que la Fase 2 conectará a Preferencias). Con `data-theme="dark"` el fondo pasa a `#0d1a13`.
- El CSS compilado de `live.css`, `garden.css` e `history.css` es equivalente antes y después de des-minificarlos (solo difieren espacios dentro de `calc()` y variables).
