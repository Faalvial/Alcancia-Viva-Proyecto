// Capturas de la versión humana con backend simulado (densidad 2×).
// Requiere `npx vite preview --port 4173`. Uso: node scripts/evidence/capture-humana.cjs [carpeta]
const { chromium } = require('playwright');
const path = require('node:path');
const { mockBackend } = require('./mock-backend.cjs');
const { installVoiceFakes } = require('./voice-fakes.cjs');
const BASE = process.env.BASE_URL || 'http://localhost:4173';
const out = process.argv[2] || 'docs/evidence/humana';
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const open = async (width, options = {}) => {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : 900 }, deviceScaleFactor: 2, colorScheme: options.scheme });
    const page = await context.newPage();
    await installVoiceFakes(page);
    await mockBackend(page, options);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    return { page, context };
  };
  let { page, context } = await open(1440, { preferences: { petName: 'Chanchi' } });
  await page.waitForSelector('.av-greeting'); await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, 'saludo-jardin-1440.png') }); await context.close();
  ({ page, context } = await open(375, { preferences: { petName: 'Chanchi', theme: 'dark' } }));
  await page.waitForSelector('.av-greeting'); await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, 'saludo-oscuro-375.png') }); await context.close();
  ({ page, context } = await open(375, {}));
  await page.waitForSelector('.av-pet-name'); await page.locator('.av-pet-name').scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, 'bautizo-en-el-saludo-375.png') }); await context.close();
  ({ page, context } = await open(375, { preferences: { petName: 'Chanchi' } }));
  await page.locator('.av-fab-voice').click();
  await page.locator('dialog.av-voice-sheet').waitFor();
  await page.evaluate(() => window.__say('ahorré cien para la laptop'));
  await page.getByRole('group', { name: 'Confirmar el registro' }).waitFor(); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'voz-con-mascota-375.png') }); await context.close();
  ({ page, context } = await open(1440, { preferences: { petName: 'Chanchi' } }));
  await page.getByRole('button', { name: /^Viaje a Cusco\./ }).click();
  await page.locator('.ag-contribute').click();
  await page.getByLabel('Monto en soles').fill('90');
  await page.getByRole('button', { name: 'Confirmar y guardar' }).click();
  await page.locator('.av-toast').waitFor(); await page.waitForTimeout(700);
  await page.locator('.av-toast').screenshot({ path: path.join(out, 'celebracion-con-mascota.png') }); await context.close();
  ({ page, context } = await open(375, { signedIn: false }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, 'acceso-375.png'), fullPage: true }); await context.close();
  await browser.close();
  console.log('Capturas de la versión humana en', out);
})().catch((error) => { console.error(error); process.exit(1); });
