# Evidencia PC04 · Fase 3 (voz conversacional)

FR-11, FR-14, FR-23, HU-13, HU-14 y NFR-13. Detalle técnico y matriz de compatibilidad en [`docs/VOZ.md`](../../../VOZ.md).

En la nube no hay micrófono: el reconocimiento y la síntesis se simulan en Playwright (`scripts/evidence/voice-fakes.cjs`) con un guion de frases, y el backend con `scripts/evidence/mock-backend.cjs`. La prueba con voz real queda para después del despliegue.

## Capturas

| Archivo | Qué muestra |
|---|---|
| `voz-escuchando-1280.png` | Panel flotante en escritorio, escuchando (anillo con volumen del micrófono simulado de Chromium). |
| `voz-confirmacion-1280.png`, `voz-confirmacion-375.png` | Confirmación hablada «¿Guardo…?» con botones Sí / No / Cancelar (bottom sheet en móvil). |
| `voz-consulta-1280.png` | Respuesta a «¿Cuánto llevo para la laptop?» con los datos cargados. |
| `voz-microfono-denegado-1280.png` | Micrófono sin permiso: «No te escuché», motivo y «Prefiero escribir». |
| `voz-sin-soporte-375.png` | Navegador sin SpeechRecognition: «Este navegador no admite voz; escribe tu movimiento». |
| `voz-oscuro-375.png`, `voz-contraste-1280.png`, `voz-texto-200-375.png` | El panel en tema oscuro, alto contraste y texto 200 %. |
| `preferencias-voz-375.png` | Velocidad de la voz (0.8–1.3) y «Probar voz». |

## Resultados

- `npm run test:voice`: 17 pruebas (8 nuevas del router de intenciones: navegación, consultas, asistente, registro, montos con palabras, metas difusas, sí/no/cancelar y slot-filling).
- `npm run test:playback`: 13 pruebas (7 nuevas: voz es-PE → es-MX → es-ES, velocidad, resaltado por palabra, earcons < 200 ms y respaldo de grabación).
- `scripts/evidence/check-voice.cjs`: 13 recorridos de extremo a extremo, entre ellos registro completo por voz con «sí» (`record_movement` con `p_source: "voice"`), repreguntas y formulario precargado, navegación, consultas sin IA, asistente con resaltado, micrófono denegado, navegador sin reconocimiento, teclado (Tab/Enter/Escape con devolución del foco) y movimiento reducido.
- `scripts/evidence/check-voice-recording.cjs`: con `VITE_VOICE_TRANSCRIBE=1`, MediaRecorder graba `audio/webm;codecs=opus`, envía `action:"transcribe"` y el texto devuelto sigue el mismo flujo.
- axe-core (WCAG 2.0/2.1/2.2 A y AA): 0 violaciones en 200 combinaciones (5 modos × 5 anchos × 8 pantallas, incluido el panel de voz).
- Sin scroll horizontal en 175 combinaciones; las comprobaciones de las Fases 1 y 2 siguen pasando (8 + 6).
