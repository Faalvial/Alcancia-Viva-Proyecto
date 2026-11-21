# Evidencia PC04 · Fase 2 (identidad visual, historial, vacíos, toasts y modo oscuro)

## Capturas

- `{modo}-{ancho}-{pantalla}.png`
  - `normal` y `dark` (tema oscuro «jardín de noche»): 320, 375, 768, 1024 y 1440 px;
  - `large` (texto 200 %), `contrast` (alto contraste) y `dark-contrast` (alto contraste con tema oscuro: gana el alto contraste): 375 y 1440 px;
  - pantallas: `jardin` (medidor semicircular y semana día a día), `metas` (anillo de etapa y «Te faltan»), `grupos` (avatares, maceta de la meta más avanzada y badge de solicitudes), `movimientos` (línea de tiempo por día, chips y buscador), `asistente`, `preferencias` (selector de tema) y `registro` (revisión con color e icono del tipo).
- `escenarios/`
  - `carga-*`: silueta de carga con macetas (sin brillo con movimiento reducido);
  - `vacio-{metas,grupos,movimientos,asistente}-{light,dark}-*`: estados vacíos con la ilustración de la maceta y la semilla;
  - `registro-revision-*` y `toast-*`: confirmación con icono semántico y botón «Deshacer»;
  - `tema-oscuro-*`: selector de tema en Preferencias;
  - `acceso-sistema-{light,dark}-*`: pantalla de acceso con Fraunces, degradado suave y tema del sistema.

## Cómo se generan y verifican

Backend simulado (`scripts/evidence/mock-backend.cjs`): ninguna petición llega al Supabase compartido.

```bash
npm run build
npx vite preview --port 4173
node scripts/evidence/capture-shell.cjs docs/evidence/pc04/fase2 320,375,768,1024,1440 normal,dark
node scripts/evidence/capture-shell.cjs docs/evidence/pc04/fase2 375,1440 large,contrast,dark-contrast
node scripts/evidence/capture-phase2.cjs docs/evidence/pc04/fase2/escenarios 375,1440
node scripts/evidence/check-shell.cjs     # shell de la Fase 1 (8 comprobaciones)
node scripts/evidence/check-phase2.cjs    # comportamiento de la Fase 2 (6 comprobaciones)
AXE_PATH=… node scripts/evidence/axe-check.cjs 320,375,768,1024,1440
```

## Resultados

- **Sin scroll horizontal** en 5 anchos × 7 pantallas × 5 modos (175 combinaciones).
- **axe-core 4.10 (WCAG 2.0/2.1/2.2 A y AA): 0 violaciones** en las mismas 175 combinaciones. Durante la fase detectó y se corrigió: contraste de chips y tarjetas de grupo en alto contraste, y dos textos verdes fijos del jardín en tema oscuro.
- `check-phase2.cjs`: medidor con `role="meter"` y `aria-valuetext`; historial agrupado por día con filtros y buscador; toast que se cierra a los 6 s y se pausa con el puntero; tema que se aplica al instante y se recuerda en el acceso; alto contraste por encima del tema oscuro; toast sin animación con movimiento reducido.
- Pruebas unitarias nuevas en `tests/movement-timeline.test.mjs` (dentro de `npm run test:history`): agrupación por día, filtros sin tildes, gastos por día de la semana, «Te faltan», tono del medidor y avatares.
- Paleta semántica (validador del skill dataviz): gasto, ingreso y ahorro superan 3:1 sobre la tarjeta en ambos temas, pero gasto/ingreso no se separan lo suficiente para daltonismo deuteránope; por eso **nunca se usan solos**: siempre van con icono distinto (flecha abajo, flecha arriba, gotas) y etiqueta de texto.
