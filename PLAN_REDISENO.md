# Plan de rediseño — Alcancía Viva (CC451 · PC04)

> Guarda este archivo en la raíz del repo como `PLAN_REDISENO.md`. Claude Code lo usará como fuente de verdad.
> Cada fase es un prompt independiente: pégalo, deja que termine, revisa el resultado, haz commit, pasa a la siguiente.

---

## 0. Preparación (ya hecha)

Este repositorio es una copia de https://github.com/ingac98/Alcancia-Viva.git hecha con el importador de GitHub. El trabajo se hace en **Claude Code en la nube** (claude.ai/code) sobre https://github.com/Faalvial/Alcancia-Viva-Proyecto.git.

Ya están en la raíz: `PLAN_REDISENO.md` (este archivo), `CLAUDE.md` (reglas permanentes) y `.claude/settings.json` (sin atribución a Claude en commits ni PR).

**Primera tarea de la sesión, antes de la FASE 0:**
1. Crea la rama `rediseno-pc04` desde `main`.
2. Instala las skills dentro del proyecto (`.claude/skills/`) y haz commit:
   ```bash
   npx -y skills add anthropics/skills --skill frontend-design --agent claude-code
   npx -y skills add anthropics/skills --skill webapp-testing --agent claude-code
   npx -y skills add vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code
   npx -y skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max --agent claude-code
   ```
   Si alguna no se instala por red, sigue sin ella y dilo; no bloquea el plan.
3. `npm ci`, `npm run build` y las cinco suites de pruebas para tener la línea base.

**Mensaje para iniciar la sesión:**
```
Lee PLAN_REDISENO.md y CLAUDE.md. Haz la "Primera tarea de la sesión" de la sección 0 y luego ejecuta la FASE 0.
Commits y PR sin ninguna atribución a Claude. Push a la rama rediseno-pc04 al terminar.
```
Después: "Ejecuta la FASE 1", "Ejecuta la FASE 2"… hasta la 5.

**Al final:** comprueba que ningún commit tenga atribución. Si alguno la tiene, pide: "Reescribe los mensajes de commit de rediseno-pc04 quitando cualquier línea de atribución y haz push con --force-with-lease".

---

## FASE 0 — Fundaciones (sin cambio visual aún)

```
FASE 0 de PLAN_REDISENO.md. Objetivo: preparar el terreno sin cambiar la apariencia.

1. Des-minifica src/live/live.css, src/live/garden.css y src/live/history.css a CSS legible (un selector por bloque). Mismo resultado visual.
2. Crea src/styles/tokens.css con variables CSS y regístralas también en @theme de Tailwind v4 en src/index.css:
   - Color: fondo, tarjeta, tinta, tinta-suave, línea, acento (verde actual #25583d), y semánticos: --c-gasto (terracota), --c-ingreso (dorado/ámbar), --c-ahorro (verde), más acento por etapa de crecimiento (6 etapas en GROWTH_STAGES).
   - Tipografía: --font-display y --font-body. Self-host dos fuentes con @font-face y font-display:swap en public/fonts/: una serif con carácter para display (Fraunces o Instrument Serif) y Inter para texto. Hoy "Inter" está declarada pero nunca cargada.
   - Espaciado, radios (12/18/22 px ya usados), sombras, duraciones de animación.
   - Modo oscuro: define los mismos tokens bajo [data-theme="dark"] y @media (prefers-color-scheme: dark). Paleta "jardín de noche" (verdes profundos, no gris neutro). El modo alto contraste existente tiene prioridad sobre el oscuro.
3. index.html: viewport con viewport-fit=cover. Usa las clases .safe-top/.safe-bottom (existen en index.css pero nadie las usa) en header y en la futura tab bar.
4. Sustituye min-height:100vh por 100dvh en .av-app.
5. public/manifest.json: elimina "orientation": "portrait".
6. Elimina las dos implementaciones paralelas de reconocimiento de voz: MovementComposer usa SpeechService.startListening y AssistantQuestionForm usa createQuestionDictation. Unifica en un hook src/hooks/useDictation.ts basado en createQuestionDictation (es la más robusta: maneja abort, visibilitychange y mensajes de error). SpeechService conserva solo la síntesis. Las pruebas de tests/question-dictation.test.mjs deben seguir pasando.

Verifica: npm run build, las cinco suites de pruebas, y captura la pantalla de login a 375 y 1440 px para confirmar que no cambió nada. Commit: "Fase 0: tokens, fuentes, viewport y unificación de dictado".
```

---

## FASE 1 — Shell móvil: tab bar, FAB y bottom sheet (responsive)

```
FASE 1 de PLAN_REDISENO.md. Usa el skill frontend-design antes de escribir CSS. Objetivo: que la app se sienta nativa en celular y correcta en tablet.

Breakpoints: móvil < 768, tablet 768–1023, escritorio ≥ 1024.

1. Navegación:
   - Móvil: reemplaza la fila de botones .av-nav por una tab bar fija inferior (position:fixed; bottom:0; padding-bottom: env(safe-area-inset-bottom)) con 5 ítems e icono lucide + etiqueta: Jardín (Sprout), Metas (Target), Grupos (Users), Movimientos (ScrollText), Asistente (MessageCircle). "Preferencias" pasa a un icono (Settings) en el header. Mantén aria-current="page" y aria-label="Navegación principal". Altura 64 px; el main debe tener padding-bottom suficiente.
   - Tablet: sidebar colapsada a 72 px, solo iconos con tooltip y aria-label.
   - Escritorio: sidebar actual de 210 px, pero con icono + texto.
2. Acción principal: en móvil "+ Registrar movimiento" se convierte en un FAB circular de 56 px (icono Plus) anclado sobre la tab bar, lado derecho. En escritorio queda en la toolbar y además responde al atajo de teclado "n" (no dentro de inputs).
3. MovementComposer: en móvil el <dialog> se renderiza como bottom sheet (anclado abajo, border-radius superior 24 px, max-height 92dvh, asa visual arriba, se cierra con arrastre hacia abajo o botón). En escritorio sigue centrado. Conserva showModal(), foco inicial y devolución de foco.
4. Corrige .av-fields (Monto + Fecha) a una columna en < 480 px.
5. El aside del jardín (.ag-detail, 290 px) pasa debajo de la escena cuando el contenedor es < 1024 px (hoy lo hace a 760 vía container query; sube el umbral).
6. Header: en móvil muestra solo logo + avatar con inicial del nombre; "Salir" se mueve a Preferencias.

Verifica con webapp-testing en 320, 375, 768, 1024 y 1440 px, en las seis pestañas, con texto 200 % activado y con alto contraste activado. Sin scroll horizontal en ninguna. Guarda capturas en docs/evidence/pc04/fase1/. Commit: "Fase 1: tab bar, FAB y bottom sheet (NFR-04, NFR-11)".
```

---

## FASE 2 — Identidad visual en todas las pantallas

```
FASE 2 de PLAN_REDISENO.md. Usa frontend-design. Objetivo: que la metáfora del jardín viva en toda la app, no solo en "Mi jardín". Respeta los tokens de la Fase 0.

1. Tipografía: aplica --font-display a todos los h1 y a los montos grandes; --font-body al resto. Escala tipográfica fluida con clamp().
2. Color semántico: badges e iconos por tipo de movimiento usando --c-gasto / --c-ingreso / --c-ahorro en el historial, en la revisión del composer (.av-review) y en los mensajes de confirmación. Iconos lucide: ArrowDownCircle (gasto), ArrowUpCircle (ingreso), Droplets (ahorro).
3. Movimientos (MovementHistory): convierte la lista en una línea de tiempo agrupada por día ("Hoy", "Ayer", fecha), con icono de tipo a la izquierda, monto alineado a la derecha con color semántico, y el autor en los grupos. Añade filtros por tipo (chips) y un buscador. Mantén el botón "Deshacer" y el badge de revertido.
4. Metas (GoalCard): la tarjeta ya tiene el sprite; añade el anillo de progreso con el color de la etapa y una línea "Te faltan S/ X" calculada en el cliente.
5. Grupos: tarjeta de grupo con avatares circulares de iniciales de los integrantes (máx. 4 + "+N") y la maceta de la meta más avanzada. Solicitudes pendientes con badge numérico en la tab bar del admin.
6. Estados vacíos: componente src/components/EmptyState.tsx con ilustración SVG propia (una maceta vacía con una semilla; dibújala tú, sin assets externos), título, texto y una sola acción. Úsalo en Metas, Grupos, Movimientos y Asistente.
7. Estados de carga: skeletons con la silueta de la maceta y de las tarjetas (src/components/Skeleton.tsx) en lugar de "Cargando tu perfil…". Respeta movimiento reducido (sin shimmer).
8. Toasts: src/components/Toast.tsx anclado abajo (sobre la tab bar en móvil), con aria-live="polite", icono, botón "Deshacer" cuando aplique y auto-cierre a 6 s (pausa en hover/foco). Reemplaza los <p role="status"> dispersos de mensaje y error de CollaborativeApp. El error sigue siendo role="alert".
9. Presupuesto semanal: sustituye el <progress> por un medidor semicircular (SVG) con el color que cambia suavemente de verde a ámbar al acercarse al límite, y debajo una mini-gráfica de barras de los 7 días (lunes a hoy). Usa el skill dataviz si está disponible; si no, SVG a mano. Nunca rojo "de alarma" ni texto culpabilizador.
10. Pantalla de acceso (Auth): conserva la composición actual; aplica las fuentes nuevas y añade un degradado suave en el fondo de la columna izquierda.
11. Modo oscuro: toggle en Preferencias (Sol/Luna) guardado en preferences.theme ("system" | "light" | "dark"). Extiende el tipo Preferences solo en el cliente (es JSON en Supabase, no requiere migración).

Verifica en los cinco anchos y en los tres modos de accesibilidad. Commit: "Fase 2: identidad visual, historial, vacíos, toasts y modo oscuro (FR-24, NFR-11)".
```

---

## FASE 3 — Voz conversacional

```
FASE 3 de PLAN_REDISENO.md. Objetivo: pasar de "dictado en un formulario" a una interfaz de voz dinámica. Cubre FR-11, FR-14, FR-23 y HU-14 del informe. Toda función de voz conserva su equivalente por texto y teclado.

1. Micrófono global: botón "Hablar" (icono Mic) siempre visible —en móvil integrado al FAB como botón secundario a su izquierda; en escritorio en el header—. Un toque abre src/components/VoiceSheet.tsx (bottom sheet en móvil, panel flotante en escritorio) que escucha de inmediato.
2. Feedback mientras escucha, en src/components/ListeningIndicator.tsx:
   - Anillo que pulsa con el volumen real: AudioContext + AnalyserNode sobre getUserMedia (pide el permiso una sola vez; si se niega, muestra el anillo con animación fija). Desactivado con movimiento reducido (queda un indicador estático "Escuchando").
   - Transcripción interina en vivo, palabra a palabra, en texto grande.
   - Estados visuales claros: "Escuchando", "Procesando", "Listo para revisar", "No te escuché".
3. Router de intenciones en src/services/voice/intents.ts (función pura, con pruebas en tests/voice-intents.test.mjs):
   - Navegación: "ir a metas", "muestra mi jardín", "abre movimientos", "preferencias" → cambia de pestaña y confirma en voz "Metas".
   - Consulta: "cuánto llevo para <meta>", "cuánto gasté esta semana", "cómo va <meta>" → responde con TTS usando los datos ya cargados en el snapshot, sin llamar a la IA.
   - Registro: todo lo demás pasa por interpretLocally (ya existe) y abre el composer precargado.
   - Asistente: "pregunta: ..." o "asistente ..." → envía al asistente financiero.
4. Bucle de confirmación con slot-filling (src/hooks/useVoiceFlow.ts):
   - Si falta la meta en un ahorro, el sistema dice "¿Para qué meta?" y vuelve a escuchar; hace match difuso contra los títulos de metas del espacio.
   - Si falta el monto, pregunta "¿Cuánto?".
   - Al completar, lee "¿Guardo un ahorro de 100 soles para Laptop?" y escucha "sí/no/cancelar". Con "sí" guarda vía el mismo onSave del composer; con "no" abre el composer para corregir.
   - Máximo 2 repreguntas por slot; luego abre el formulario (ayuda proactiva, FR-14).
   - Siempre visible un botón "Prefiero escribir".
5. Síntesis de voz: en speechService elige explícitamente una voz es-PE, luego es-MX, luego es-ES de getVoices() (espera a voiceschanged). Velocidad configurable en Preferencias (0.8–1.3). Mientras lee una respuesta del asistente, resalta la palabra actual con el evento onboundary (quítalo con movimiento reducido).
6. Earcons: src/services/voice/earcons.ts genera con Web Audio API (sin archivos) tres sonidos de < 200 ms: inicio de escucha, fin de escucha, éxito. Solo suenan si prefs.audio está activo. Añade navigator.vibrate(…) corto en éxito y al cambiar de etapa (HU-13, FR-18) cuando está disponible.
7. Fallback sin SpeechRecognition (Firefox, algunos iOS): si no existe la API, VoiceSheet graba con MediaRecorder (webm/opus o mp4) y envía el audio a la edge function financial-assistant con action:"transcribe". NO modifiques la función de Supabase: deja el cliente listo y documenta en docs/VOZ.md el bloque que habría que añadir en el servidor (Groq whisper-large-v3) para que lo apliquemos aparte. Mientras tanto el botón muestra "Este navegador no admite voz; escribe tu movimiento".
8. Matriz de compatibilidad (NFR-13): escribe docs/VOZ.md con una tabla Chrome / Edge / Safari iOS / Firefox: reconocimiento, síntesis, interim results, fallback.

Verifica: pruebas nuevas pasan; recorrido completo con teclado (Tab/Enter/Escape) en VoiceSheet; nada de voz rompe con el micrófono denegado. Commit: "Fase 3: voz conversacional, comandos de navegación, earcons y fallback (FR-11, FR-14, FR-23, HU-13, HU-14)".
```

---

## FASE 4 — Delicia: celebración, transiciones y deshacer

```
FASE 4 de PLAN_REDISENO.md. Objetivo: refuerzo emocional (nivel visceral y reflexivo de Norman). Cubre FR-18 y HU-17.

1. Transición de etapa: cuando un aporte hace que growthStage(percent) suba, el sprite hace una transición (escala + fundido cruzado entre el sprite anterior y el nuevo, 600 ms) en lugar de cambiar de golpe. Hook src/hooks/usePreviousStage.ts.
2. Celebración al 100 %: lluvia de pétalos en SVG/CSS (12–20 pétalos, 2 s, colores de la paleta) sobre la escena, toast "¡<Meta> floreció!", earcon de éxito y vibración. Todo se omite con movimiento reducido (queda el toast y el texto).
3. Montos con count-up: el monto grande del aside y el "Avance conjunto" animan de valor anterior a nuevo en 500 ms (sin animación con movimiento reducido). Hook src/hooks/useCountUp.ts.
4. Deshacer con ventana: tras guardar, el toast muestra "Deshacer" durante 10 s con una barra que se vacía (HU-17). Pulsar llama al mismo reverse_movement que ya usa el historial. Pasados los 10 s, la reversión sigue disponible desde Movimientos como hoy.
5. Micro-interacciones: botones con transform:scale(.97) al presionar; macetas con elevación al hover/focus; cambio de pestaña con fundido de 150 ms. Todas con transition en tokens y anuladas por .av-still.
6. Página de acceso: el jardín de la izquierda con una animación muy lenta de "brisa" (reutiliza ag-breeze) sobre una capa, respetando movimiento reducido.

Verifica en los cinco anchos y tres modos; graba un GIF de 10 s de un aporte que lleva una meta al 100 % para la evidencia. Commit: "Fase 4: celebración de hitos, transiciones y deshacer de 10 s (FR-18, HU-17)".
```

---

## FASE 5 — Auditoría y evidencia para el informe

```
FASE 5 de PLAN_REDISENO.md. Objetivo: cerrar con evidencia reproducible para la PC04.

1. Ejecuta el skill web-design-guidelines sobre src/ y corrige todo lo que reporte como accesibilidad o UX (no cambies lógica de negocio).
2. Auditoría axe (NFR-04): con webapp-testing / Playwright + @axe-core/playwright, recorre login, jardín, metas, grupos, movimientos, asistente, preferencias y el composer, en 375 y 1440 px, en modo normal, alto contraste y texto 200 %. Guarda el reporte JSON en docs/evidence/pc04/axe/ y resume en docs/evidence/pc04/README.md. Corrige las violaciones serias y críticas.
3. Lighthouse móvil (Performance, Accessibility, Best Practices, PWA) sobre npm run preview; guarda el HTML del reporte.
4. Capturas finales EV-17 a EV-24 en docs/evidence/pc04/: tab bar móvil, bottom sheet de registro, VoiceSheet escuchando, confirmación por voz, historial con filtros, celebración al 100 %, modo oscuro, tablet 768.
5. Actualiza README.md: sección "Novedades PC04" con la lista de cambios enlazada a HU/FR/NFR, y docs/VOZ.md enlazado.
6. Actualiza la matriz de trazabilidad: crea docs/trazabilidad-pc04.md con las filas FR-11, FR-14, FR-18, FR-23, FR-24, HU-13, HU-14, HU-17, NFR-04, NFR-11, NFR-13 y su nuevo estado y evidencia.

7. En README.md cambia los enlaces "Repositorio del equipo" a https://github.com/Faalvial/Alcancia-Viva-Proyecto y añade una línea "Basado en https://github.com/ingac98/Alcancia-Viva". Mantén la licencia MIT y los créditos del equipo.

Commit: "Fase 5: auditoría axe, Lighthouse, evidencia y trazabilidad PC04". Push a origin y abre con `gh pr create --repo Faalvial/Alcancia-Viva-Proyecto --base main --head rediseno-pc04` un PR con el resumen por fase, sin línea "Generated with Claude Code". Nunca contra ingac98/Alcancia-Viva.
```

---

## Prompts de respaldo (si algo se desvía)

- **Se rompió una prueba:** `Las pruebas fallan. No cambies los tests: lee el error, identifica qué contrato rompiste y corrige el código manteniendo la regla de CLAUDE.md.`
- **El diseño se ve genérico:** `Esto se ve como plantilla. Usa el skill frontend-design: elige una dirección concreta (editorial-botánica: serif con carácter, mucho aire, verdes profundos y terracota), aplícala y muéstrame capturas antes/después.`
- **Scroll horizontal en móvil:** `Hay scroll horizontal a 320 px en <pestaña>. Encuentra el elemento con overflow (usa outline:1px solid red en * temporalmente o getBoundingClientRect) y corrígelo con min-width:0 / overflow-wrap:anywhere, no con overflow:hidden en el body.`
- **La voz no responde en el navegador de prueba:** `Documenta el navegador y versión, confirma si existe window.SpeechRecognition, y asegúrate de que el fallback de texto aparece. No bloquees la fase por esto.`

## Orden y tiempos estimados (un día)

| Fase | Tiempo | Entrega |
|---|---|---|
| 0 | 45 min | Tokens, fuentes, dictado unificado |
| 1 | 1.5 h | Tab bar, FAB, bottom sheet |
| 2 | 2.5 h | Identidad visual completa, historial, toasts, oscuro |
| 3 | 2.5 h | Voz conversacional |
| 4 | 1 h | Celebración, transiciones, deshacer |
| 5 | 1 h | Auditoría y evidencia |
