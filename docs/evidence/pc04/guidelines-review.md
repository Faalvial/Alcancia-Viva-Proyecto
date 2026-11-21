# Revisión con Web Interface Guidelines (skill `web-design-guidelines`)

Revisión de `src/` contra las reglas publicadas en `vercel-labs/web-interface-guidelines` (versión descargada el 21-11-2026). Solo se corrigió accesibilidad y experiencia de uso; la lógica de negocio no cambió.

## Corregido

| Archivo | Hallazgo | Corrección |
|---|---|---|
| `src/live/CollaborativeApp.tsx` | Imagen del acceso sin `width`/`height` (salto de diseño) y de 3 MB en PNG. | `width`/`height`, `fetchPriority="high"` y WebP con `srcset` (83 KB en móvil, 194 KB en escritorio). |
| `src/live/CollaborativeApp.tsx` | Movimiento automático de más de 5 s (brisa del acceso) sin forma de pausarlo (WCAG 2.2.2). | Botón «Pausar la brisa del jardín» con `aria-pressed`; oculto con movimiento reducido, donde la brisa ya no corre. |
| `src/live/CollaborativeApp.tsx` | Acciones destructivas inmediatas: «Revocar código», «Rechazar» solicitud y «Reiniciar categorías aprendidas». | Confirmación previa que explica la consecuencia. |
| `src/live/CollaborativeApp.tsx`, `MovementHistory.tsx` | Campos sin `autocomplete`/`inputmode`/`spellcheck` adecuados. | `autoComplete` («name», «off»), `inputMode="decimal"` en montos y `spellCheck={false}` en códigos y búsqueda. |
| `src/live/CollaborativeApp.tsx`, `MovementHistory.tsx` | Placeholders sin «…». | «Ahorré 100 soles para mi laptop…», «Ej.: almuerzo, laptop, transporte…». |
| `src/live/CollaborativeApp.tsx` | La pestaña activa no se reflejaba en la URL. | `?tab=metas` (y demás) con `history.replaceState`; recargar o compartir conserva la pestaña. |
| `src/live/*.tsx` | Marca sin `translate="no"`. | «Alcancía Viva» y el código de invitación con `translate="no"`. |
| `src/live/PasswordRecovery.tsx` | Icono de marca sin dimensiones ni `aria-hidden`. | Añadidos. |
| `src/components/components.css` | Botones sin estado *hover*. | Cambio de brillo con `@media (hover: hover)`, más contraste que en reposo. |
| `src/components/components.css` | Sin `touch-action: manipulation`; diálogos sin `overscroll-behavior: contain`; el asa del bottom sheet seleccionaba texto al arrastrar. | Añadidos. |
| `src/components/components.css` | En móvil, la tab bar y el FAB fijos podían tapar el elemento con foco al tabular. | `scroll-padding-bottom` del alto de la tab bar + FAB. |
| `src/components/components.css` | Títulos sin `text-wrap: balance`. | Añadido. |
| `index.html` | Fuentes críticas sin precarga; `theme-color` distinto del fondo. | `<link rel="preload" as="font">` para Inter y Fraunces; `theme-color` igual al fondo (claro y oscuro). |
| `public/manifest.json` | Sin icono *maskable* (Lighthouse PWA). | `icon-maskable-192/512.png` con el cerdito dentro de la zona segura. |
| `src/live/GardenView.tsx` | `<aside>` dentro de `<main>` (axe `landmark-complementary-is-top-level`). | `<section aria-labelledby>`. |
| `src/live/garden.css` | Texto blanco sobre la foto del jardín por debajo de 4.5:1 en zonas claras. | Velo superior más denso: peor caso medido 6.89:1. |
| `src/components/components.css` | Scroll horizontal de 3 a 8 px en el acceso entre 320 y 430 px (margen negativo del degradado de la Fase 2). | Margen limitado a `max(-1.5rem, -5vw)`. |

## No aplicado, con motivo

| Regla | Motivo |
|---|---|
| Title Case en títulos y botones | La interfaz está en español: la norma (RAE) es mayúscula inicial solo en la primera palabra. |
| `autoFocus` evitado en móvil | La Fase 1 pide conservar el foco inicial del formulario de registro (accesibilidad con teclado y lector de pantalla). |
| Virtualizar listas de más de 50 elementos | El historial muestra los movimientos del espacio filtrados y agrupados por día; con los volúmenes del curso no hace falta. Se puede revisar si crece. |
| Filtros del historial en la URL | La pestaña sí va en la URL; los filtros son temporales por diseño (se reinician al volver a Movimientos). |
| Vídeo en lugar de GIF animado | El único GIF es evidencia del informe (`fase4/meta-al-100.gif`), no parte de la app. |
| `overscroll-behavior: none` solo con puntero fino | Se conserva el comportamiento existente de `body` en `src/index.css` para no alterar la PWA instalada. |
