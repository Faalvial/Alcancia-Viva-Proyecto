# Evidencia PC04 · Rediseño de Alcancía Viva

Evidencia reproducible del rediseño por fases ([plan](../../../PLAN_REDISENO.md)) y su [trazabilidad](../../trazabilidad-pc04.md). Las pantallas con sesión usan un backend simulado ([`scripts/evidence/mock-backend.cjs`](../../../scripts/evidence/mock-backend.cjs)) y la voz se simula en el navegador ([`voice-fakes.cjs`](../../../scripts/evidence/voice-fakes.cjs)): ninguna prueba crea ni cambia datos en el Supabase compartido.

## Capturas finales (EV-17 a EV-24)

| ID | Captura | Qué muestra |
|---|---|---|
| EV-17 | [Tab bar móvil](EV-17-tab-bar-movil.png) | 375 px: tab bar inferior con hoja en el ítem activo, botón «Hablar» y FAB de registro. |
| EV-18 | [Bottom sheet de registro](EV-18-bottom-sheet-registro.png) | Formulario de registro como bottom sheet, con la revisión coloreada por tipo. |
| EV-19 | [VoiceSheet escuchando](EV-19-voicesheet-escuchando.png) | Panel de voz con el anillo de escucha y la transcripción parcial. |
| EV-20 | [Confirmación por voz](EV-20-confirmacion-por-voz.png) | «¿Guardo un ahorro de 100 soles para Laptop…?» con Sí / No / Cancelar y «Prefiero escribir». |
| EV-21 | [Historial con filtros](EV-21-historial-con-filtros.png) | Línea de tiempo por día con el chip «Gastos» y la búsqueda «almuerzo». |
| EV-22 | [Celebración al 100 %](EV-22-celebracion-100.png) | Planta florecida, pétalos y aviso «¡Viaje a Cusco floreció!» con «Deshacer» de 10 s. |
| EV-23 | [Modo oscuro](EV-23-modo-oscuro.png) | Tema «jardín de noche» a 1440 px. |
| EV-24 | [Tablet 768](EV-24-tablet-768.png) | Rail de 72 px y entrada «Hablar» en el header. |

Se generan con `node scripts/evidence/capture-final.cjs docs/evidence/pc04`.

## Auditoría de accesibilidad (NFR-04, WCAG 2.2 AA)

[`scripts/evidence/axe-audit.cjs`](../../../scripts/evidence/axe-audit.cjs) con **@axe-core/playwright 4.10** (axe-core 4.10.3), etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` y `best-practice`.

- **Pantallas:** acceso, jardín, metas, grupos, movimientos, asistente, preferencias, formulario de registro y panel de voz.
- **Anchos:** 375 y 1440 px. **Modos:** normal, alto contraste, texto 200 % y tema oscuro.
- **Resultado: 72 combinaciones, 0 violaciones** (ni serias, ni críticas, ni menores). Un JSON por combinación en [`axe/`](axe/) y el resumen en [`axe/resumen.json`](axe/resumen.json).
- Corregido durante la auditoría: el detalle de la meta era un `<aside>` dentro de `<main>` (regla de buenas prácticas); pasó a `<section aria-labelledby>`.
- **44 avisos «por revisar»** (axe no puede calcular el contraste: texto sobre la foto del jardín, degradados, textos de una letra del gráfico semanal o capas abiertas encima). Se revisaron midiendo píxeles con [`contrast-pixels.cjs`](../../../scripts/evidence/contrast-pixels.cjs): se oculta el texto, se fotografía el fondo y se calcula el contraste contra el percentil 10 (peor caso) de sus píxeles, en los cuatro modos y dos anchos. Resultado en [`axe/contraste-pixeles.txt`](axe/contraste-pixeles.txt): **todos ≥ 4.5:1** (mínimo 4.88:1). El texto blanco sobre la foto estaba en 4.15:1 y se corrigió con un velo superior más denso (ahora 6.89:1).

Además, a lo largo de las fases se pasó axe-core sobre las 6 pestañas, el registro y el panel de voz en 5 anchos (320–1440) × 5 modos (incluido alto contraste con tema oscuro): 0 violaciones ([`axe-check.cjs`](../../../scripts/evidence/axe-check.cjs)).

## Lighthouse móvil

[`lighthouse/lighthouse-movil.report.html`](lighthouse/lighthouse-movil.report.html) (y `.json`): Lighthouse 11.7.1, la última versión con categoría PWA, perfil móvil (Moto G Power, 4G lento simulado) sobre `npm run preview` en la pantalla de acceso. Lighthouse no puede iniciar sesión, por eso mide el acceso.

| Categoría | Puntuación |
|---|---|
| Performance | **91** (FCP 1.8 s, LCP 3.4 s, TBT 0 ms, CLS 0) |
| Accessibility | **100** |
| Best Practices | **100** |
| PWA | **100** |

Antes de los ajustes de esta fase: Performance 74 (LCP 17.9 s por una imagen PNG de 3 MB) y PWA 75 (sin icono *maskable* y con 3 px de scroll horizontal a 412 px). Pendiente conocido: el paquete JavaScript (~600 KB, sobre todo el cliente de Supabase) aparece como «JavaScript sin usar»; `vite preview` no comprime y en Netlify el peso transferido es menor.

## Revisión con Web Interface Guidelines

[`guidelines-review.md`](guidelines-review.md): hallazgos corregidos (dimensiones e imagen WebP, pausa de la brisa, confirmación de acciones destructivas, autocompletar e `inputmode`, pestaña en la URL, *hover*, `touch-action`, foco nunca tapado por la tab bar, precarga de fuentes, icono *maskable*, contraste sobre la foto) y reglas no aplicadas con su motivo.

## Comprobaciones automáticas

```bash
npm run build
npm run test:recovery && npm run test:playback && npm run test:voice && npm run test:history && npm run test:garden
npx vite preview --port 4173
node scripts/evidence/check-shell.cjs        # Fase 1 · 8 comprobaciones
node scripts/evidence/check-phase2.cjs       # Fase 2 · 6
node scripts/evidence/check-voice.cjs        # Fase 3 · 12 (13 con carpeta de capturas)
node scripts/evidence/check-phase4.cjs       # Fase 4 · 6 (7 con carpeta: capturas y GIF)
node scripts/evidence/check-phase5.cjs       # Fase 5 · 4
node scripts/evidence/capture-shell.cjs <carpeta> 320,375,768,1024,1440 normal,large,contrast,dark   # scroll horizontal
node scripts/evidence/axe-audit.cjs docs/evidence/pc04/axe
```

(Con el Playwright instalado de forma global: `NODE_PATH=$(npm root -g)`.)

Estado al cerrar la PC04: build sin errores; 70 pruebas unitarias en verde (recovery 11, playback 13, voice 17, history 13, garden 16); 36 comprobaciones de interacción en verde; sin scroll horizontal en 5 anchos × 7 pantallas × 4 modos ni en la pantalla de acceso (320–767 px).

## Evidencia por fase

| Fase | Carpeta | Contenido |
|---|---|---|
| 0 | [`fase0/`](fase0/) | Acceso antes y después: tokens, fuentes y viewport sin cambio visual. |
| 1 | [`fase1/`](fase1/) | Shell móvil: 105 capturas (5 anchos × 7 pantallas × 3 modos). |
| 2 | [`fase2/`](fase2/) | Identidad visual, historial, vacíos, avisos y modo oscuro. |
| 3 | [`fase3/`](fase3/) | Voz conversacional y [docs/VOZ.md](../../VOZ.md). |
| 4 | [`fase4/`](fase4/) | Celebración, transiciones, deshacer de 10 s y [GIF de 10 s](fase4/meta-al-100.gif). |
| 5 | esta carpeta | Auditoría axe, Lighthouse, guías y capturas EV-17 a EV-24. |

## Jardín con especies, control del usuario y fluidez

| ID | Archivo | Qué muestra | Comprobación |
|---|---|---|---|
| EV-30 | `EV-30-jardin-especies.png` | Árbol, girasol, cactus y bambú en el jardín | `scripts/evidence/check-plants.cjs` |
| EV-31 | `EV-31-elegir-planta.png` | Selector «Tipo de planta» en la maceta seleccionada | `check-plants.cjs` |
| EV-32 | `EV-32-jardin-especies-320.png` | Jardín con especies a 320 px | `check-plants.cjs` |
| EV-33 | `EV-33-opciones-meta.png` | Opciones de la meta: editar, planta, archivar y eliminar | `check-control.cjs` |
| EV-34 | `EV-34-metas-archivadas.png` | Metas archivadas con «Restaurar» | `check-control.cjs` |
| EV-35 | `EV-35-confirmar-eliminar.png` | Confirmación propia y accesible (sin `window.confirm`) | `check-control.cjs` |
| EV-36 | `EV-36-gestion-grupo.png` | Gestión del grupo: roles, quitar, salir y cerrar | `check-control.cjs` |
| EV-37 | `EV-37-cuenta.png` | Tu cuenta: nombre visible y contraseña | `check-control.cjs` |
| EV-38 | `EV-38-fluidez.gif` | Transiciones entre vistas y respuesta inmediata al archivar | `check-fluidity.cjs` |
