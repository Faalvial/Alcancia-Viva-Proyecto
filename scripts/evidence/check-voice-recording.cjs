// Respaldo de voz con MediaRecorder (navegadores sin SpeechRecognition).
// Requiere una build con la transcripción activada, servida en el puerto 4174:
//   VITE_VOICE_TRANSCRIBE=1 npx vite build --outDir /tmp/dist-transcribe
//   npx vite preview --outDir /tmp/dist-transcribe --port 4174
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mockBackend } = require('./mock-backend.cjs');
const { installVoiceFakes } = require('./voice-fakes.cjs');
(async () => {
  const b = await chromium.launch({ args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  let body=null; p.on('request', r=>{ if(r.url().includes('/functions/v1/')) { const j=JSON.parse(r.postData()||'{}'); if(j.action==='transcribe') body=j; } });
  await installVoiceFakes(p,{noRecognition:true}); await mockBackend(p,{transcribeText:'ir a movimientos'});
  await p.goto(process.env.BASE_URL || 'http://localhost:4174',{waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Hablar'}).click();
  await p.getByText('Grabando. Pulsa «Detener» cuando termines.').waitFor();
  await p.waitForTimeout(1200);
  await p.getByRole('button',{name:'Detener'}).click();
  await p.locator('dialog.av-voice-sheet').waitFor({state:'detached'});
  assert.equal(await p.getByRole('button',{name:'Movimientos',exact:true}).getAttribute('aria-current'),'page');
  assert.ok(body && body.audio.length>100, 'audio enviado'); console.log('✓ respaldo con MediaRecorder:', body.mimeType, body.audio.length, 'caracteres base64 → navegó a Movimientos');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
