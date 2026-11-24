// Voz en Firefox e iPhone: grabación con MediaRecorder (dispositivo de audio falso de
// Chromium) y transcripción en el servidor (respuesta simulada de la acción «transcribe»).
// Requiere `npx vite preview --port 4173`.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mockBackend } = require('./mock-backend.cjs');
const { installVoiceFakes } = require('./voice-fakes.cjs');
const BASE = process.env.BASE_URL || 'http://localhost:4173';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const check = async (name, fn) => { await fn(); console.log('✓', name); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  async function open({ width = 1280, userAgent, voice = {}, transcribeText = '' } = {}) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : 900 }, userAgent, hasTouch: width < 768 });
    const page = await context.newPage();
    const sent = [];
    page.on('request', (r) => { if (r.url().includes('/functions/v1/')) { const b = JSON.parse(r.postData() || '{}'); if (b.action === 'transcribe') sent.push(b); } });
    await installVoiceFakes(page, voice);
    await mockBackend(page, { transcribeText });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#av-main');
    return { page, context, sent };
  }
  const sheet = (page) => page.locator('dialog.av-voice-sheet');

  await check('Firefox (sin SpeechRecognition): «Hablar» graba, transcribe en el servidor y sigue el flujo', async () => {
    const { page, context, sent } = await open({ voice: { noRecognition: true }, transcribeText: 'gasté veinte con cincuenta en almuerzo' });
    await page.getByRole('button', { name: 'Hablar' }).click();
    await sheet(page).waitFor();
    await page.getByText(/Cuando hagas una pausa lo envío/).waitFor();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Detener' }).click();
    await page.getByRole('group', { name: 'Confirmar el registro' }).waitFor({ timeout: 15000 });
    await page.getByText('¿Guardo un gasto de 20 soles con 50 céntimos en Alimentación?').first().waitFor();
    assert.equal(sent.length, 1);
    assert.match(sent[0].mimeType, /^audio\/(webm|mp4|ogg)/);
    assert.ok(sent[0].audio.length > 100, 'envía audio real');
    await context.close();
  });

  await check('la grabación se detiene sola tras una pausa (sin pulsar «Detener»)', async () => {
    const { page, context, sent } = await open({ voice: { noRecognition: true }, transcribeText: 'ir a metas' });
    await page.getByRole('button', { name: 'Hablar' }).click();
    await sheet(page).waitFor({ state: 'detached', timeout: 20000 });
    assert.equal(sent.length, 1);
    assert.equal(await page.getByRole('button', { name: 'Metas', exact: true }).getAttribute('aria-current'), 'page');
    await context.close();
  });

  await check('iPhone: usa grabación aunque Safari exponga reconocimiento, y transcribe', async () => {
    const { page, context, sent } = await open({ width: 390, userAgent: IPHONE, transcribeText: '¿cuánto llevo para la laptop?' });
    await page.locator('.av-fab-voice').click();
    await sheet(page).waitFor();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Detener' }).click();
    await page.getByText(/llevas 1450 soles de 2500 soles/).first().waitFor({ timeout: 15000 });
    assert.equal(sent.length, 1);
    assert.equal(await page.evaluate(() => window.__listening), 0, 'no usa el reconocimiento de Safari');
    await context.close();
  });

  await check('Firefox: «Dictar pregunta» y «Dictar movimiento» también graban y transcriben', async () => {
    const { page, context, sent } = await open({ voice: { noRecognition: true }, transcribeText: 'cómo ahorro más' });
    await page.getByRole('button', { name: /^Asistente/ }).filter({ visible: true }).first().click();
    const dictate = page.getByRole('button', { name: 'Dictar pregunta' });
    assert.equal(await dictate.isEnabled(), true);
    await dictate.click();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Detener dictado' }).click();
    await page.waitForFunction(() => document.querySelector('#av-assistant-question')?.value === 'cómo ahorro más', null, { timeout: 15000 });
    await page.getByRole('button', { name: /Registrar movimiento/ }).filter({ visible: true }).first().click();
    await page.getByRole('button', { name: 'Dictar movimiento' }).click();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Detener micrófono' }).click();
    await page.waitForFunction(() => document.querySelector('dialog[open] textarea')?.value === 'cómo ahorro más', null, { timeout: 15000 });
    assert.equal(sent.length, 2);
    await context.close();
  });

  await check('si la transcripción falla, la mascota lo dice y la vía escrita sigue disponible', async () => {
    const { page, context } = await open({ voice: { noRecognition: true } });
    await page.getByRole('button', { name: 'Hablar' }).click();
    await sheet(page).waitFor();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Detener' }).click();
    await page.getByText('No se pudo transcribir el audio. Puedes escribir tu movimiento.').first().waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Prefiero escribir' }).click();
    await page.locator('dialog.av-dialog:not(.av-voice-sheet)[open]').waitFor();
    await context.close();
  });

  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
