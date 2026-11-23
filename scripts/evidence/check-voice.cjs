// Comprobaciones de la Fase 3 (voz conversacional) con reconocimiento y síntesis simulados.
// Requiere `npx vite preview --port 4173` en marcha.
// Uso: node scripts/evidence/check-voice.cjs [carpeta-de-capturas]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { mockBackend } = require('./mock-backend.cjs');
const { installVoiceFakes } = require('./voice-fakes.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const check = async (name, fn) => { await fn(); console.log('✓', name); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  async function open({ width = 1280, voice = {}, backend = {}, reducedMotion } = {}) {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 800 : 900 }, hasTouch: width < 768, reducedMotion });
    const saved = [];
    page.on('request', (request) => { if (request.url().includes('/rpc/record_movement')) saved.push(JSON.parse(request.postData() || '{}')); });
    await installVoiceFakes(page, voice);
    await mockBackend(page, backend);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#av-main');
    return { page, saved };
  }
  const sheet = (page) => page.locator('dialog.av-voice-sheet');
  const say = (page, text) => page.evaluate((t) => window.__say(t), text);
  const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name) }); };

  await check('registro completo por voz: interpreta, confirma en voz y guarda con «sí»', async () => {
    const { page, saved } = await open();
    await page.getByRole('button', { name: 'Hablar' }).click();
    await sheet(page).waitFor();
    await page.getByRole('status').filter({ hasText: 'Escuchando' }).waitFor();
    await shot(page, 'voz-escuchando-1280.png');
    await say(page, 'ahorré cien para la laptop');
    await page.getByText('¿Guardo un ahorro de 100 soles para Laptop para la universidad?').first().waitFor();
    await page.getByRole('status').filter({ hasText: 'Listo para revisar' }).waitFor();
    await shot(page, 'voz-confirmacion-1280.png');
    assert.ok((await page.evaluate(() => window.__spoken)).includes('¿Guardo un ahorro de 100 soles para Laptop para la universidad?'));
    await say(page, 'sí');
    await sheet(page).waitFor({ state: 'detached' });
    await page.locator('.av-toast').getByText(/S\/\s?100\.00 sumados a Laptop/).waitFor();
    assert.equal(saved.length, 1);
    assert.deepEqual({ type: saved[0].p_type, amount: saved[0].p_amount, goal: saved[0].p_goal, source: saved[0].p_source }, { type: 'savings', amount: 100, goal: 'g1', source: 'voice' });
    assert.ok((await page.evaluate(() => window.__spoken)).some((t) => ['Listo, ya lo anoté.', '¡Hecho! Ya está en tu jardín.', 'Anotado. Gracias por contármelo.'].includes(t)));
    await page.close();
  });

  await check('slot-filling: pregunta «¿Cuánto?» y «¿Para qué meta?», repregunta y «no» abre el formulario precargado', async () => {
    const { page, saved } = await open();
    await page.getByRole('button', { name: 'Hablar' }).click();
    await say(page, 'ahorré para algo');
    await page.getByText(/^(¿Cuánto fue\?|¿De cuánto fue\?)$/).first().waitFor();
    await say(page, 'cincuenta');
    await page.getByText(/^(¿Para qué meta es\?|¿A qué meta lo sumo\?)$/).first().waitFor();
    await say(page, 'la moto');
    await page.getByText(/^(Perdona, no te entendí\.|Uy, no lo capté bien\.) (¿Para qué meta es\?|¿A qué meta lo sumo\?)$/).first().waitFor();
    await say(page, 'fondo de emergencia');
    await page.getByText('¿Guardo un ahorro de 50 soles para Fondo de emergencia?').first().waitFor();
    await say(page, 'no, corrige');
    await page.locator('dialog.av-dialog:not(.av-voice-sheet)[open]').waitFor();
    assert.equal(await page.getByLabel('Monto en soles').inputValue(), '50');
    assert.equal(await page.getByLabel('Tipo de movimiento').inputValue(), 'savings');
    assert.equal(await page.getByLabel('Meta de destino').inputValue(), 'g2');
    assert.equal(saved.length, 0);
    await page.close();
  });

  await check('tras 2 repreguntas sin entender, abre el formulario (ayuda proactiva)', async () => {
    const { page } = await open();
    await page.getByRole('button', { name: 'Hablar' }).click();
    await say(page, 'gasté en algo');
    await page.getByText(/^(¿Cuánto fue\?|¿De cuánto fue\?)$/).first().waitFor();
    for (const answer of ['no sé', 'mmm', 'ni idea']) await say(page, answer);
    await page.locator('dialog.av-dialog:not(.av-voice-sheet)[open]').waitFor();
    assert.equal(await sheet(page).count(), 0);
    assert.equal(await page.getByLabel('Tipo de movimiento').inputValue(), 'expense');
    await page.close();
  });

  await check('navegación por voz: «ir a metas» cambia de pestaña y lo confirma en voz', async () => {
    const { page } = await open();
    await page.getByRole('button', { name: 'Hablar' }).click();
    await say(page, 'ir a metas');
    await sheet(page).waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('button', { name: 'Metas', exact: true }).getAttribute('aria-current'), 'page');
    assert.ok((await page.evaluate(() => window.__spoken)).some((t) => /^(Vamos a|Te llevo a) Metas\.$/.test(t)));
    await page.close();
  });

  await check('consultas: responde en voz con los datos cargados y sin llamar a la IA', async () => {
    const { page } = await open();
    let assistantCalls = 0;
    page.on('request', (r) => { if (r.url().includes('/functions/v1/')) assistantCalls++; });
    await page.getByRole('button', { name: 'Hablar' }).click();
    await say(page, '¿cuánto llevo para la laptop?');
    await page.getByText(/llevas 1450 soles de 2500 soles, el 58 por ciento/).waitFor();
    await shot(page, 'voz-consulta-1280.png');
    assert.equal(assistantCalls, 0);
    await page.close();
  });

  await check('«pregunta: …» envía la pregunta al asistente y muestra la respuesta con resaltado', async () => {
    const { page } = await open({ backend: { assistantAnswer: 'Separa una parte fija cada semana y revisa tus gastos pequeños.' } });
    await page.getByRole('button', { name: 'Hablar' }).click();
    await say(page, 'pregunta: cómo puedo ahorrar más');
    await sheet(page).waitFor({ state: 'detached' });
    await page.getByText('Separa una parte fija cada semana').waitFor();
    assert.equal(await page.getByRole('button', { name: /^Asistente/ }).filter({ visible: true }).first().getAttribute('aria-current'), 'page');
    await page.evaluate(() => { window.__speechMs = 3000; });
    await page.getByRole('button', { name: 'Escuchar respuesta' }).click();
    await page.locator('.av-spoken-word').waitFor();
    await page.close();
  });

  await check('micrófono denegado: «No te escuché» con el motivo, y la vía escrita sigue disponible', async () => {
    const { page } = await open({ voice: { micDenied: true } });
    await page.getByRole('button', { name: 'Hablar' }).click();
    await say(page, '__denied');
    await page.getByRole('status').filter({ hasText: 'No te escuché' }).waitFor();
    await page.getByText(/El micrófono no tiene permiso/).waitFor();
    await shot(page, 'voz-microfono-denegado-1280.png');
    await page.getByRole('button', { name: 'Prefiero escribir' }).click();
    await page.locator('dialog.av-dialog:not(.av-voice-sheet)[open]').waitFor();
    await page.getByLabel('Describe tu movimiento').fill('Gasté 5 soles en pasaje');
    await page.close();
  });

  await check('sin SpeechRecognition (Firefox, algunos iOS): el panel lo explica y ofrece escribir', async () => {
    const { page } = await open({ width: 375, voice: { noRecognition: true } });
    await page.getByRole('button', { name: 'Hablar' }).filter({ visible: true }).click();
    await page.getByText('Este navegador no admite voz; escribe tu movimiento.').waitFor();
    await shot(page, 'voz-sin-soporte-375.png');
    await page.getByRole('button', { name: 'Escribir mi movimiento' }).click();
    await page.locator('dialog.av-dialog:not(.av-voice-sheet)[open]').waitFor();
    await page.close();
  });

  await check('móvil: botón «Hablar» a la izquierda del FAB, ≥ 44 px, y panel como bottom sheet', async () => {
    const { page } = await open({ width: 375 });
    const mic = await page.locator('.av-fab-voice').boundingBox(), fab = await page.locator('.av-fab').boundingBox();
    assert.ok(mic.width >= 44 && mic.height >= 44);
    assert.ok(mic.x + mic.width <= fab.x, 'a la izquierda del FAB');
    await page.locator('.av-fab-voice').click();
    await page.getByRole('status').filter({ hasText: 'Escuchando' }).waitFor();
    await page.waitForTimeout(350);
    const box = await sheet(page).boundingBox();
    assert.equal(Math.round(box.y + box.height), 800);
    await say(page, 'gasté veinte con cincuenta en almuerzo');
    await page.getByText('¿Guardo un gasto de 20 soles con 50 céntimos en Alimentación?').first().waitFor();
    await shot(page, 'voz-confirmacion-375.png');
    await page.close();
  });

  await check('teclado: Tab/Enter abre, los botones confirman, Escape cierra y devuelve el foco', async () => {
    const { page, saved } = await open();
    const entry = page.getByRole('button', { name: 'Hablar' });
    await entry.focus();
    await page.keyboard.press('Enter');
    await sheet(page).waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Detener');
    await say(page, 'gasté 8 soles en pasaje');
    await page.getByRole('group', { name: 'Confirmar el registro' }).waitFor();
    // Recorre los controles con Tab hasta «Sí, guardar» y confirma con Enter.
    for (let i = 0; i < 8; i++) {
      if ((await page.evaluate(() => document.activeElement?.textContent)) === 'Sí, guardar') break;
      await page.keyboard.press('Tab');
    }
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Sí, guardar');
    await page.keyboard.press('Enter');
    await sheet(page).waitFor({ state: 'detached' });
    assert.equal(saved.length, 1);
    await entry.focus();
    await page.keyboard.press('Enter');
    await sheet(page).waitFor();
    await page.keyboard.press('Escape');
    await sheet(page).waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Hablar');
    await page.close();
  });

  await check('movimiento reducido: indicador estático y sin resaltado de palabras', async () => {
    const { page } = await open({ reducedMotion: 'reduce', backend: { preferences: { reducedMotion: true }, assistantAnswer: 'Respuesta breve de prueba.' } });
    await page.getByRole('button', { name: 'Hablar' }).click();
    await page.getByRole('status').filter({ hasText: 'Escuchando' }).waitFor();
    assert.match(await page.locator('.av-listening').getAttribute('class'), /is-still/);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Asistente/ }).filter({ visible: true }).first().click();
    await page.getByLabel('¿Qué quieres comprender?').fill('¿Cómo ahorro?');
    await page.getByRole('button', { name: 'Consultar al asistente' }).click();
    await page.getByText('Respuesta breve de prueba.').waitFor();
    await page.evaluate(() => { window.__speechMs = 2000; });
    await page.getByRole('button', { name: 'Escuchar respuesta' }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.av-spoken-word').count(), 0);
    await page.close();
  });

  await check('la voz elegida es es-PE aunque haya otras en español, y respeta la velocidad elegida', async () => {
    const { page } = await open({ backend: { preferences: { speechRate: 1.2 } } });
    await page.getByRole('button', { name: /^Preferencias/ }).filter({ visible: true }).first().click();
    assert.equal(await page.getByLabel('Velocidad de la voz').inputValue(), '1.2');
    await page.evaluate(() => {
      const original = window.speechSynthesis.speak;
      window.speechSynthesis.speak = (u) => { window.__last = { lang: u.lang, rate: u.rate, voice: u.voice?.name }; original(u); };
    });
    await page.getByRole('button', { name: 'Probar voz' }).click();
    assert.deepEqual(await page.evaluate(() => window.__last), { lang: 'es-PE', rate: 1.2, voice: 'Camila' });
    await page.close();
  });

  if (shots) await check('capturas en tema oscuro, alto contraste y Preferencias de voz', async () => {
    for (const [name, width, preferences] of [['voz-oscuro-375.png', 375, { theme: 'dark' }], ['voz-contraste-1280.png', 1280, { highContrast: true }], ['voz-texto-200-375.png', 375, { largeText: true }]]) {
      const { page } = await open({ width, backend: { preferences } });
      await page.getByRole('button', { name: 'Hablar' }).filter({ visible: true }).first().click();
      await say(page, 'ahorré cien para la laptop');
      await page.getByRole('group', { name: 'Confirmar el registro' }).waitFor();
      await page.waitForTimeout(350);
      await shot(page, name);
      await page.close();
    }
    const { page } = await open({ width: 375 });
    await page.getByRole('button', { name: 'Preferencias' }).filter({ visible: true }).first().click();
    await page.getByLabel('Velocidad de la voz').scrollIntoViewIfNeeded();
    await shot(page, 'preferencias-voz-375.png');
    await page.close();
  });

  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
