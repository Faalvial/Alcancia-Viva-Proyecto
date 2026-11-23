// Comprobaciones de la versión humana: modo demo de punta a punta (sin servidor),
// bienvenida guiada con la mascota, saludo del jardín y nombre de la alcancía.
// Requiere `npx vite preview --port 4173`. El modo demo no hace peticiones de red.
// Uso: node scripts/evidence/check-humana.cjs [carpeta-de-capturas]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BASE = process.env.BASE_URL || 'http://localhost:4173';
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const check = async (name, fn) => { await fn(); console.log('✓', name); };

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
  const page = await context.newPage();
  const external = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('data')) external.push(u.hostname); });
  const shot = (name) => shots ? page.screenshot({ path: path.join(shots, name) }) : null;

  await check('«Probar sin cuenta» abre la bienvenida guiada sin servidor', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Probar sin cuenta' }).click();
    await page.getByRole('heading', { name: '¡Hola! Soy tu nueva alcancía' }).waitFor();
    await page.getByText('Paso 1 de 3').waitFor();
    await shot('bienvenida-1.png');
  });

  await check('bienvenida: nombre, bautizo de la alcancía y primera meta', async () => {
    await page.getByLabel('¿Cómo te llamas?').fill('Ana Torres');
    await page.getByLabel('Acepto este uso de mis datos.').check();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('heading', { name: '¿Cómo quieres llamarme?' }).waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'av-onboarding-title', 'el foco va al título del paso');
    await page.getByRole('button', { name: 'Chanchi' }).click();
    await shot('bienvenida-2.png');
    await page.getByRole('button', { name: 'Me llamo Chanchi' }).click();
    await page.getByRole('heading', { name: 'Chanchi quiere plantar tu primera meta' }).waitFor();
    await page.getByLabel('Nombre de la meta').fill('Bicicleta');
    await page.getByLabel('Monto objetivo (S/)').fill('600');
    const next = new Date(Date.now() + 864e5 * 90).toISOString().slice(0, 10);
    await page.getByLabel('Fecha objetivo').fill(next);
    await shot('bienvenida-3.png');
    await page.getByRole('button', { name: 'Plantar y empezar' }).click();
    await page.locator('.av-toast').getByText('¡Listo, Ana! Chanchi ya está contigo.').waitFor();
  });

  await check('el jardín saluda por el nombre, cuenta la semana y firma la mascota', async () => {
    await page.locator('.av-greeting').waitFor();
    assert.match(await page.locator('#av-greeting-title').textContent(), /^(Buenos días|Buenas tardes|Buenas noches), Ana\.$/);
    assert.match(await page.locator('.av-greeting-signature').textContent(), /Chanchi/);
    assert.equal(await page.locator('.av-pet-name').count(), 0, 'ya tiene nombre: no lo vuelve a pedir');
    await page.getByRole('button', { name: /^Bicicleta\./ }).waitFor();
    assert.ok(await page.getByText('modo demo').first().isVisible());
    await shot('jardin-demo.png');
  });

  await check('demo: registrar un aporte actualiza la meta y se puede deshacer', async () => {
    await page.getByRole('button', { name: /^Laptop para la universidad\./ }).click();
    await page.locator('.ag-contribute').click();
    await page.getByLabel('Monto en soles').fill('50');
    await page.getByRole('button', { name: 'Confirmar y guardar' }).click();
    await page.locator('.av-toast').getByText(/S\/\s?50\.00 sumados a Laptop/).waitFor();
    await page.waitForFunction(() => document.querySelector('.ag-money strong')?.textContent?.includes('1,500.00'));
    await page.locator('.av-toast').getByRole('button', { name: /^Deshacer/ }).click();
    await page.waitForFunction(() => document.querySelector('.ag-money strong')?.textContent?.includes('1,450.00'));
  });

  await check('el asistente habla como la mascota y en la demo declara que no usa IA', async () => {
    await page.getByRole('button', { name: /^Asistente/ }).filter({ visible: true }).first().click();
    await page.getByText(/Soy Chanchi, tu alcancía\. Respondo con ayuda de inteligencia artificial/).waitFor();
    await page.getByLabel('¿Qué quieres comprender?').fill('¿Cómo ahorro más?');
    await page.getByRole('button', { name: 'Consultar al asistente' }).click();
    await page.locator('.av-bubble--pet').getByText(/^Chanchi:/).waitFor();
    await page.getByText(/En el modo demo te respondo con un ejemplo, sin IA/).waitFor();
    await shot('asistente-demo.png');
  });

  await check('la demo no hace ninguna petición fuera de este equipo y «Salir» borra los datos', async () => {
    assert.deepEqual([...new Set(external)].filter((h) => !h.endsWith('.invalid')), [], 'sin red externa');
    await page.getByRole('button', { name: 'Salir del modo demo' }).click();
    await page.getByRole('button', { name: 'Probar sin cuenta' }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('av-demo')), null);
  });

  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
