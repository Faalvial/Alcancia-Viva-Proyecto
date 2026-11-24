# Voz en Alcancía Viva (PC04 · Fase 3)

Cubre FR-11, FR-14, FR-23, HU-13, HU-14 y NFR-13. Toda función de voz tiene su equivalente por texto y teclado: el botón **«Prefiero escribir»** está siempre visible en el panel de voz y la confirmación tiene botones **Sí, guardar / No, corregir / Cancelar**.

## Cómo funciona

| Pieza | Archivo | Qué hace |
|---|---|---|
| Entrada «Hablar» | `src/live/CollaborativeApp.tsx` | Botón con micrófono en el header (tablet y escritorio) y botón secundario a la izquierda del FAB (móvil). |
| Panel de voz | `src/components/VoiceSheet.tsx` | Bottom sheet en móvil, panel flotante en escritorio. Empieza a escuchar al abrirse. Escape cierra y devuelve el foco. |
| Indicador | `src/components/ListeningIndicator.tsx`, `src/hooks/useMicLevel.ts` | Anillo que late con el volumen real (AudioContext + AnalyserNode). Sin permiso de micrófono: latido fijo. Con movimiento reducido: estático. Estados: Escuchando, Procesando, Listo para revisar, No te escuché. |
| Dictado | `src/hooks/useDictation.ts` | Único dictado de la app: reconocimiento del navegador (Chrome, Edge) con resultados parciales, o grabación con transcripción en el servidor (Firefox, iPhone). |
| Router de intenciones | `src/services/voice/intents.ts` | Función pura: navegación, consultas, asistente y registro. Pruebas en `tests/voice-intents.test.mjs`. |
| Conversación | `src/hooks/useVoiceFlow.ts` | Slot-filling, confirmación sí/no/cancelar, máximo 2 repreguntas por dato y luego abre el formulario precargado (FR-14). |
| Síntesis | `src/services/voice/speechService.ts`, `voices.ts` | Voz es-PE → es-MX → es-ES (espera a `voiceschanged`). Velocidad 0.8–1.3 en Preferencias. Resaltado de la palabra que se lee en las respuestas del asistente (`onboundary`), desactivado con movimiento reducido. |
| Earcons y vibración | `src/services/voice/earcons.ts` | Tres sonidos de menos de 200 ms (inicio, fin y éxito) generados con Web Audio, solo si «Leer confirmaciones en voz alta» está activo. Vibración corta al guardar y al cambiar de etapa de una meta. |
| Grabación (Firefox e iPhone) | `src/services/voice/recorder.ts`, `src/hooks/useDictation.ts` | MediaRecorder (webm/opus o mp4) + `action:"transcribe"` (Whisper de Groq en la función de Supabase). Termina solo tras una pausa de 1,4 s (o a los 15 s). Lo usan el panel «Hablar», «Dictar movimiento» y «Dictar pregunta». |

### Qué se puede decir

| Intención | Ejemplos | Resultado |
|---|---|---|
| Navegación | «Ir a metas», «Muestra mi jardín», «Abre movimientos», «Preferencias» | Cambia de pestaña y lo confirma en voz («Metas»). |
| Consulta | «¿Cuánto llevo para la laptop?», «¿Cómo va el viaje a Cusco?», «¿Cuánto gasté esta semana?» | Responde en voz con los datos ya cargados. No llama a la IA. |
| Asistente | «Pregunta: ¿cómo puedo ahorrar más?», «Asistente, ¿en qué gasto más?» | Envía la pregunta al asistente financiero. |
| Registro | «Gasté 12 soles en almuerzo», «Ahorré cien para mi laptop», «Recibí doscientos de clases» | `interpretLocally` y, si falta algo, pregunta «¿Es un gasto, un ingreso o un ahorro?», «¿Cuánto?» o «¿Para qué meta?» (con coincidencia difusa con los títulos). Luego confirma: «¿Guardo un ahorro de 100 soles para Laptop?». Con «sí» guarda con el mismo `onSave` del formulario; con «no» abre el formulario para corregir; con «cancelar» no guarda nada. |

Los montos también se entienden con palabras («ciento cincuenta», «veinte con cincuenta», «dos mil quinientos»).

## Matriz de compatibilidad (NFR-13)

Estado según la documentación de cada navegador. En la nube no hay micrófono: el comportamiento de la app se verificó con reconocimiento y síntesis simulados (`scripts/evidence/check-voice.cjs`) y la prueba manual en dispositivos reales queda pendiente para después del despliegue.

| | Chrome (escritorio y Android) | Edge | Safari iOS | Firefox |
|---|---|---|---|---|
| Reconocimiento usado por la app | `SpeechRecognition` del navegador (servicio en línea) | `SpeechRecognition` del navegador | **Grabación + transcripción en el servidor** (Safari y Chrome para iOS; el reconocimiento de Safari es poco fiable y falla en la app instalada) | **Grabación + transcripción en el servidor** (Firefox no tiene `SpeechRecognition`) |
| Síntesis (`speechSynthesis`) | Sí; voces es-ES/es-US/es-MX según el sistema | Sí; voces neuronales es-MX/es-ES | Sí; voces del sistema (es-MX, es-ES) | Sí; voces del sistema operativo |
| Resaltado por palabra (`onboundary`) | Sí con voces locales; las voces en línea a veces no lo emiten | Sí | Sí | Sí (depende de la voz) |
| Formato de grabación | — | — | `audio/mp4` | `audio/webm;codecs=opus` |
| Resultados parciales mientras hablas | Sí | Sí | No: el texto aparece al terminar («Transcribiendo…») | No: igual que iPhone |

Si el usuario niega el micrófono: el panel muestra «No te escuché» con el motivo, el anillo pasa a latido fijo y «Prefiero escribir» abre el formulario. No se vuelve a pedir permiso en la misma sesión.

## Transcripción en el servidor: acción `transcribe`

Implementada en `supabase/functions/financial-assistant/index.ts` y desplegada. Usa la misma clave `GROQ_API_KEY` que el asistente. El cliente envía:

```json
{ "action": "transcribe", "audio": "<base64>", "mimeType": "audio/mp4", "language": "es" }
```

y recibe `{ "text": "…" }` o `{ "error": "…" }`. La función:

- exige sesión iniciada, como las demás acciones;
- acepta hasta ~1,5 MB de audio (unos 15 s) en webm, mp4/m4a, ogg, mp3 o wav;
- llama a `whisper-large-v3-turbo` de Groq en español, con una pista de vocabulario (soles, gastos, ahorros, metas) para transcribir mejor los montos.

Para desactivar la grabación en el cliente se puede compilar con `VITE_VOICE_TRANSCRIBE=0`; entonces esos navegadores vuelven a mostrar «Este navegador no admite voz; escribe tu movimiento».

En iPhone, el toque en «Hablar» o «Dictar» también desbloquea el audio (iOS bloquea la voz y los sonidos que no nacen de un toque), así que la mascota puede leer en voz alta sus preguntas y confirmaciones.

`scripts/evidence/check-voice-fallback.cjs` comprueba Firefox e iPhone con grabación real (micrófono falso de Chromium) y transcripción simulada.

## Verificación automática

```bash
npm run test:voice      # router de intenciones, montos, metas difusas, sí/no, slot-filling y dictado
npm run test:playback   # selección de voz, velocidad, resaltado, earcons, grabación, detección de iPhone y de silencio
npx vite preview --port 4173 &
node scripts/evidence/check-voice.cjs docs/evidence/pc04/fase3
node scripts/evidence/check-voice-fallback.cjs   # Firefox e iPhone
```

`check-voice.cjs` recorre: registro completo con confirmación hablada, slot-filling con repregunta, formulario tras 2 repreguntas, navegación, consultas sin IA, preguntas al asistente con resaltado, micrófono denegado, navegador sin reconocimiento, bottom sheet en móvil, recorrido con teclado (Tab/Enter/Escape), movimiento reducido y elección de voz y velocidad.
