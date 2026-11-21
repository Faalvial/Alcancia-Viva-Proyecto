# Voz en Alcancía Viva (PC04 · Fase 3)

Cubre FR-11, FR-14, FR-23, HU-13, HU-14 y NFR-13. Toda función de voz tiene su equivalente por texto y teclado: el botón **«Prefiero escribir»** está siempre visible en el panel de voz y la confirmación tiene botones **Sí, guardar / No, corregir / Cancelar**.

## Cómo funciona

| Pieza | Archivo | Qué hace |
|---|---|---|
| Entrada «Hablar» | `src/live/CollaborativeApp.tsx` | Botón con micrófono en el header (tablet y escritorio) y botón secundario a la izquierda del FAB (móvil). |
| Panel de voz | `src/components/VoiceSheet.tsx` | Bottom sheet en móvil, panel flotante en escritorio. Empieza a escuchar al abrirse. Escape cierra y devuelve el foco. |
| Indicador | `src/components/ListeningIndicator.tsx`, `src/hooks/useMicLevel.ts` | Anillo que late con el volumen real (AudioContext + AnalyserNode). Sin permiso de micrófono: latido fijo. Con movimiento reducido: estático. Estados: Escuchando, Procesando, Listo para revisar, No te escuché. |
| Dictado | `src/hooks/useDictation.ts` | Único reconocedor de la app (Fase 0), con resultados parciales palabra a palabra. |
| Router de intenciones | `src/services/voice/intents.ts` | Función pura: navegación, consultas, asistente y registro. Pruebas en `tests/voice-intents.test.mjs`. |
| Conversación | `src/hooks/useVoiceFlow.ts` | Slot-filling, confirmación sí/no/cancelar, máximo 2 repreguntas por dato y luego abre el formulario precargado (FR-14). |
| Síntesis | `src/services/voice/speechService.ts`, `voices.ts` | Voz es-PE → es-MX → es-ES (espera a `voiceschanged`). Velocidad 0.8–1.3 en Preferencias. Resaltado de la palabra que se lee en las respuestas del asistente (`onboundary`), desactivado con movimiento reducido. |
| Earcons y vibración | `src/services/voice/earcons.ts` | Tres sonidos de menos de 200 ms (inicio, fin y éxito) generados con Web Audio, solo si «Leer confirmaciones en voz alta» está activo. Vibración corta al guardar y al cambiar de etapa de una meta. |
| Respaldo con grabación | `src/services/voice/recorder.ts` | MediaRecorder (webm/opus o mp4) + `action:"transcribe"`. Desactivado hasta que el servidor lo implemente (ver abajo). |

### Qué se puede decir

| Intención | Ejemplos | Resultado |
|---|---|---|
| Navegación | «Ir a metas», «Muestra mi jardín», «Abre movimientos», «Preferencias» | Cambia de pestaña y lo confirma en voz («Metas»). |
| Consulta | «¿Cuánto llevo para la laptop?», «¿Cómo va el viaje a Cusco?», «¿Cuánto gasté esta semana?» | Responde en voz con los datos ya cargados. No llama a la IA. |
| Asistente | «Pregunta: ¿cómo puedo ahorrar más?», «Asistente, ¿en qué gasto más?» | Envía la pregunta al asistente financiero. |
| Registro | «Gasté 12 soles en almuerzo», «Ahorré cien para mi laptop», «Recibí doscientos de clases» | `interpretLocally` y, si falta algo, pregunta «¿Es un gasto, un ingreso o un ahorro?», «¿Cuánto?» o «¿Para qué meta?» (con coincidencia difusa con los títulos). Luego confirma: «¿Guardo un ahorro de 100 soles para Laptop?». Con «sí» guarda con el mismo `onSave` del formulario; con «no» abre el formulario para corregir; con «cancelar» no guarda nada. |

Los montos también se entienden con palabras («ciento cincuenta», «veinte con cincuenta», «dos mil quinientos»).

## Matriz de compatibilidad (NFR-13)

Estado esperado según la documentación de cada navegador. En la nube no hay micrófono: el comportamiento de la app se verificó con reconocimiento y síntesis simulados (`scripts/evidence/check-voice.cjs`) y la prueba manual en dispositivos reales queda pendiente para después del despliegue.

| | Chrome (escritorio y Android) | Edge | Safari iOS | Firefox |
|---|---|---|---|---|
| Reconocimiento (`SpeechRecognition`) | Sí (`webkitSpeechRecognition`, servicio en línea) | Sí (`webkitSpeechRecognition`) | Parcial: desde iOS 14.5, requiere Siri/Dictado activado; inestable en modo app instalada (PWA) | No |
| Resultados parciales (`interimResults`) | Sí | Sí | Parcial (a veces solo el resultado final) | — |
| Síntesis (`speechSynthesis`) | Sí; voces es-ES/es-US/es-MX según el sistema | Sí; voces neuronales es-MX/es-ES | Sí; voces del sistema (es-MX, es-ES) | Sí; voces del sistema operativo |
| Resaltado por palabra (`onboundary`) | Sí con voces locales; las voces en línea a veces no lo emiten | Sí | Sí | Sí (depende de la voz) |
| Respaldo sin reconocimiento | No hace falta | No hace falta | Si no hay reconocimiento: MediaRecorder `audio/mp4` + `transcribe` | MediaRecorder `audio/webm;codecs=opus` + `transcribe` |
| Mientras `transcribe` no exista en el servidor | — | — | «Este navegador no admite voz; escribe tu movimiento» y formulario escrito | Igual |

Si el usuario niega el micrófono: el panel muestra «No te escuché» con el motivo, el anillo pasa a latido fijo y «Prefiero escribir» abre el formulario. No se vuelve a pedir permiso en la misma sesión.

## Pendiente en el servidor: acción `transcribe`

La función `supabase/functions/financial-assistant` **no se ha modificado** (regla del proyecto). El cliente ya envía:

```json
{ "action": "transcribe", "audio": "<base64>", "mimeType": "audio/webm;codecs=opus", "language": "es" }
```

y espera `{ "text": "…" }` (o `{ "error": "…" }`). Bloque propuesto para `index.ts`, justo después de comprobar `GROQ_API_KEY` y antes de validar `question`:

```ts
if(body.action==='transcribe'){
  const audio=typeof body.audio==='string'?body.audio:'';
  const mimeType=typeof body.mimeType==='string'?body.mimeType:'audio/webm';
  // ~1,5 MB de audio (unos 15 s de opus) como máximo.
  if(!audio||audio.length>2_100_000||!/^audio\/(webm|mp4|ogg|mpeg|wav)/.test(mimeType))return reply({error:'Revisa la grabación.'},400);
  try{
    const bytes=Uint8Array.from(atob(audio),c=>c.charCodeAt(0));
    const extension=mimeType.includes('mp4')?'m4a':mimeType.includes('ogg')?'ogg':'webm';
    const form=new FormData();
    form.append('file',new Blob([bytes],{type:mimeType}),`voz.${extension}`);
    form.append('model','whisper-large-v3');
    form.append('language','es');
    form.append('response_format','json');
    const response=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form});
    if(!response.ok)throw new Error('transcribe');
    const result=await response.json();
    return reply({text:typeof result.text==='string'?result.text.trim().slice(0,500):''});
  }catch{return reply({error:'No se pudo transcribir el audio. Puedes escribir tu movimiento.'},502);}
}
```

Después de desplegarlo:

1. Activa el respaldo en el cliente con `VITE_VOICE_TRANSCRIBE=1` (Netlify → variables de entorno) y vuelve a desplegar.
2. Prueba en Firefox: «Hablar» graba, «Detener» envía y el texto sigue el mismo flujo de intenciones.

`scripts/evidence/check-voice-recording.cjs` comprueba este camino con una build que tiene el respaldo activado y un servidor simulado.

## Verificación automática

```bash
npm run test:voice      # router de intenciones, montos, metas difusas, sí/no, slot-filling y dictado
npm run test:playback   # selección de voz, velocidad, resaltado, earcons y respaldo de grabación
npx vite preview --port 4173 &
node scripts/evidence/check-voice.cjs docs/evidence/pc04/fase3
```

`check-voice.cjs` recorre: registro completo con confirmación hablada, slot-filling con repregunta, formulario tras 2 repreguntas, navegación, consultas sin IA, preguntas al asistente con resaltado, micrófono denegado, navegador sin reconocimiento, bottom sheet en móvil, recorrido con teclado (Tab/Enter/Escape), movimiento reducido y elección de voz y velocidad.
