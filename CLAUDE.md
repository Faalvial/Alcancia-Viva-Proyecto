# Alcancía Viva — reglas para Claude Code

Proyecto del curso CC451 (IHC, UNI). PWA de educación financiera: React 19 + TypeScript + Vite + Tailwind v4 + Supabase. Idioma de la interfaz y de los commits: español.

## Repositorios
- `origin` = https://github.com/Faalvial/Alcancia-Viva-Proyecto.git → aquí van TODOS los push.
- Repositorio original: https://github.com/ingac98/Alcancia-Viva.git → solo referencia. Nunca push ni PR hacia él.
- Trabajo en la rama `rediseno-pc04`; push a origin al cerrar cada fase.
- Se trabaja en Claude Code en la nube (claude.ai/code). No hay micrófono: la voz se verifica con pruebas automáticas y se prueba manualmente después del despliegue.
- La copia sigue usando el MISMO proyecto Supabase compartido (URL y clave publicable por defecto en el código). No aplicar migraciones ni cambiar datos de prueba de otros.

## Reglas inviolables
- Commits y PRs SIN atribución a Claude: nunca añadir líneas `Co-Authored-By: Claude…`, `Claude-Session:` ni "🤖 Generated with Claude Code". El autor de los commits es el usuario configurado en git; no cambiar `git config user.name/user.email`. Antes de cada push, revisar con `git log --format=%B origin/main..HEAD | grep -iE "claude|anthropic"` y, si aparece alguna línea de atribución, reescribir esos mensajes antes de subir.
- NO tocar `supabase/`, `src/live/client.ts`, `src/live/domain.ts`, `src/live/garden.ts` ni ningún RPC. El backend está validado y desplegado.
- NO romper las pruebas: `npm run test:recovery && npm run test:playback && npm run test:voice && npm run test:history && npm run test:garden` deben pasar después de cada fase. `npm run build` debe compilar sin errores de TypeScript.
- NO eliminar ningún atributo ARIA, `role`, `aria-live`, skip-link, ni bajar ningún target táctil de 44 px. La accesibilidad actual es un requisito del curso (NFR-04, WCAG 2.2 AA).
- Conservar las tres preferencias: alto contraste (`.av-contrast`), texto 200 % (`.av-large`) y movimiento reducido (`.av-still` + `prefers-reduced-motion`). Toda animación nueva debe desactivarse con ellas.
- Conservar la alternativa escrita de cada función de voz. La voz nunca es la única vía.
- Conservar el microcopy en tono sin juicios (NFR-10). Nunca escribir "gastaste demasiado", "mal", "error tuyo".
- Moneda siempre PEN con el helper `soles()`.
- Mantener los IDs de trazabilidad del informe (HU-xx, FR-xx, NFR-xx) en los mensajes de commit cuando una fase los cubra.

## Convenciones
- Tokens de diseño en `src/styles/tokens.css` (variables CSS) y en `@theme` de Tailwind. Nada de colores hexadecimales sueltos en componentes.
- Iconos: `lucide-react` (ya instalado). Tamaño 20 px en nav, 24 px en acciones.
- Componentes nuevos en `src/components/`. Hooks en `src/hooks/`.
- Después de cada fase: `npm run build`, pruebas, y verificación visual en 320, 375, 768, 1024 y 1440 px con el skill `webapp-testing` (o Playwright). Adjuntar capturas en `docs/evidence/pc04/`.
- Commits pequeños y en español, un commit por fase como mínimo.

## Plan
El plan completo por fases está en `PLAN_REDISENO.md`. Ejecuta solo la fase que se pida en cada mensaje.
