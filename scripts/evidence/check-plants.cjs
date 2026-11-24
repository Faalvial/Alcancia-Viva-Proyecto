// Comprobaciones del jardín con varias especies (árbol, girasol, cactus, bambú) con backend simulado.
// Requiere `npx vite preview --port 4173` en marcha. Con una carpeta como argumento guarda capturas.
// Uso: node scripts/evidence/check-plants.cjs [carpeta]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mockBackend } = require('./mock-backend.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const check = async (name, fn) => { await fn(); console.log('✓', name); };

(async () => {
  const browser = await chromium.launch();
  async function open({ width = 1280, preferences = {}, reducedMotion } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const saved = [];
    page.on('request', (r) => { if (r.url().includes('/rest/v1/profiles') && r.method() !== 'GET') saved.push(JSON.parse(r.postData() || '{}')); });
    await mockBackend(page, { preferences });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-scene');
    return { page, context, errors, saved };
  }

  await check('sin elección, todas las metas siguen siendo cosmos (compatibilidad)', async () => {
    const { page, context } = await open();
    assert.equal(await page.locator('.ag-pots .ag-svg-plant').count(), 0);
    assert.equal(await page.locator('.ag-pots .ag-foliage').count(), 4);
    await context.close();
  });

  await check('cada meta muestra su especie y la etapa con su nombre propio', async () => {
    const { page, context, errors } = await open({ preferences: { plantKinds: { g1: 'arbol', g2: 'girasol', g3: 'cactus', g4: 'bambu', otra: 'invalida' } } });
    assert.equal(await page.locator('.ag-pots .ag-svg-plant').count(), 4);
    assert.match(await page.locator('.ag-pot[data-goal="g1"]').getAttribute('aria-label'), /Árbol frutal, Árbol joven/);
    assert.match(await page.locator('.ag-pot[data-goal="g3"]').getAttribute('aria-label'), /Cactus, Con botones/);
    await assert.doesNotReject(page.getByText('Más de la mitad: tu árbol da sombra y se sostiene solo.').waitFor());
    if (out) await page.locator('.ag-scene').screenshot({ path: path.join(out, 'EV-30-jardin-especies.png') });
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check('cambiar la planta desde el jardín: radios con teclado, se guarda y el avance se conserva', async () => {
    const { page, context, saved } = await open({ preferences: { plantKinds: { g1: 'arbol' } } });
    const picker = page.getByRole('group', { name: 'Tipo de planta' });
    assert.equal(await picker.getByRole('radio', { name: 'Árbol frutal' }).isChecked(), true);
    await picker.getByRole('radio', { name: 'Árbol frutal' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.getByText('Planta cambiada. Tu avance se conserva.').first().waitFor();
    assert.equal(saved.at(-1).preferences.plantKinds.g1, 'girasol');
    assert.match(await page.locator('.ag-pot[data-goal="g1"]').getAttribute('aria-label'), /Girasol, Botón cerrado/);
    await page.getByText('Crece buscando la luz: cada día un poco más alto.').waitFor();
    const box = await picker.getByRole('radio', { name: 'Cactus' }).locator('..').boundingBox();
    assert.ok(box.height >= 44 && box.width >= 44, `opción de ${box.width}×${box.height}`);
    if (out) await page.locator('#av-garden-detail').screenshot({ path: path.join(out, 'EV-31-elegir-planta.png') });
    await context.close();
  });

  await check('crear una meta permite elegir la planta', async () => {
    const { page, context } = await open();
    await page.goto(`${BASE}/?tab=metas`, { waitUntil: 'networkidle' });
    await page.locator('#av-goal-form summary').click();
    const picker = page.getByRole('group', { name: '¿Cómo quieres que crezca esta meta?' });
    assert.equal(await picker.getByRole('radio', { name: 'Flor cosmos' }).isChecked(), true);
    await picker.getByRole('radio', { name: 'Bambú' }).check();
    assert.equal(await picker.getByRole('radio', { name: 'Bambú' }).isChecked(), true);
    await page.getByText('Sube nudo a nudo: cada aporte es un tramo más.').waitFor();
    await context.close();
  });

  await check('movimiento reducido y pausa detienen el vaivén de las plantas ilustradas', async () => {
    const prefs = { plantKinds: { g1: 'arbol' } };
    let { page, context } = await open({ preferences: prefs, reducedMotion: 'reduce' });
    assert.equal(await page.locator('.ag-pot[data-goal="g1"] .ag-svg-sway').evaluate((el) => getComputedStyle(el).animationName), 'none');
    await context.close();
    ({ page, context } = await open({ preferences: prefs }));
    const sway = page.locator('.ag-pot[data-goal="g1"] .ag-svg-sway');
    assert.equal(await sway.evaluate((el) => getComputedStyle(el).animationName), 'ag-breeze');
    await page.getByRole('button', { name: 'Pausar movimiento' }).click();
    assert.equal(await sway.evaluate((el) => getComputedStyle(el).animationName), 'none');
    await context.close();
  });

  await check('móvil 320 px y texto 200 %: sin desbordes horizontales', async () => {
    for (const [width, preferences] of [[320, {}], [375, { largeText: true }]]) {
      const { page, context } = await open({ width, preferences: { ...preferences, plantKinds: { g1: 'arbol', g2: 'bambu' } } });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `desborde de ${overflow}px en ${width}`);
      if (out && width === 320) await page.locator('.ag-scene').screenshot({ path: path.join(out, 'EV-32-jardin-especies-320.png') });
      await context.close();
    }
  });

  await browser.close();
})().catch((error) => { console.error('✗', error); process.exit(1); });
