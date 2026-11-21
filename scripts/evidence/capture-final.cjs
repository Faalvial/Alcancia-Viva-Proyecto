// Capturas finales EV-17 a EV-24 para el informe de la PC04 (densidad 2×).
// Requiere `npx vite preview --port 4173`. Backend y voz simulados: no toca Supabase.
// Uso: node scripts/evidence/capture-final.cjs [carpeta]
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { mockBackend } = require('./mock-backend.cjs');
const { installVoiceFakes } = require('./voice-fakes.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const out = process.argv[2] || 'docs/evidence/pc04';
const tab = (page, name) => page.getByRole('button', { name: new RegExp(`^${name}`) }).filter({ visible: true }).first().click();

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  async function open(width, { preferences = {}, height } = {}) {
    const context = await browser.newContext({ viewport: { width, height: height || (width < 768 ? 812 : 900) }, deviceScaleFactor: 2, hasTouch: width < 768 });
    const page = await context.newPage();
    await installVoiceFakes(page);
    await mockBackend(page, { preferences });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#av-main');
    return { page, context };
  }
  const save = (page, name) => page.screenshot({ path: path.join(out, name) });

  let { page, context } = await open(375);
  await save(page, 'EV-17-tab-bar-movil.png');
  await page.locator('.av-fab').click();
  await page.getByLabel('Describe tu movimiento').fill('Gasté 12 soles en almuerzo');
  await page.getByRole('button', { name: 'Interpretar texto' }).click();
  await page.getByLabel('Monto en soles').waitFor();
  await page.waitForTimeout(500);
  await save(page, 'EV-18-bottom-sheet-registro.png');
  await context.close();

  ({ page, context } = await open(375));
  await page.locator('.av-fab-voice').click();
  await page.evaluate(() => { window.__queue = []; });
  await page.getByRole('status').filter({ hasText: 'Escuchando' }).waitFor();
  // Muestra una transcripción parcial «en vivo» mientras sigue escuchando.
  await page.evaluate(() => { const el = document.querySelector('.av-voice-transcript'); if (el) { el.textContent = 'ahorré cien para…'; el.classList.remove('is-empty'); } });
  await page.waitForTimeout(300);
  await save(page, 'EV-19-voicesheet-escuchando.png');
  await context.close();

  ({ page, context } = await open(375));
  await page.locator('.av-fab-voice').click();
  await page.evaluate(() => window.__say('ahorré cien para la laptop'));
  await page.getByRole('group', { name: 'Confirmar el registro' }).waitFor();
  await page.waitForTimeout(350);
  await save(page, 'EV-20-confirmacion-por-voz.png');
  await context.close();

  ({ page, context } = await open(1440));
  await tab(page, 'Movimientos');
  await page.getByRole('button', { name: 'Gastos' }).click();
  await page.getByRole('searchbox', { name: 'Buscar en movimientos' }).fill('almuerzo');
  await page.waitForTimeout(250);
  await save(page, 'EV-21-historial-con-filtros.png');
  await context.close();

  ({ page, context } = await open(1440));
  await page.getByRole('button', { name: /^Viaje a Cusco\./ }).click();
  await page.locator('.ag-contribute').click();
  await page.getByLabel('Monto en soles').fill('90');
  await page.getByRole('button', { name: 'Confirmar y guardar' }).click();
  await page.locator('.av-toast').waitFor();
  await page.evaluate(() => document.querySelector('.ag-scene')?.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -120));
  await page.waitForTimeout(650);
  await save(page, 'EV-22-celebracion-100.png');
  await context.close();

  ({ page, context } = await open(1440, { preferences: { theme: 'dark' } }));
  await save(page, 'EV-23-modo-oscuro.png');
  await context.close();

  ({ page, context } = await open(768, { height: 1024 }));
  await save(page, 'EV-24-tablet-768.png');
  await context.close();

  await browser.close();
  console.log('Capturas EV-17 a EV-24 guardadas en', out);
})().catch((error) => { console.error(error); process.exit(1); });
