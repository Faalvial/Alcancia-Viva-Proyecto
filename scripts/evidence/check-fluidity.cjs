// Comprobaciones de fluidez: View Transitions entre pestañas, respuesta inmediata (optimista)
// aunque el servidor tarde, listas que aparecen con animación y todo apagado con movimiento
// reducido. Requiere `npx vite preview --port 4173`. Con una carpeta guarda un GIF (ffmpeg).
// Uso: node scripts/evidence/check-fluidity.cjs [carpeta]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { mockBackend } = require('./mock-backend.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const check = async (name, fn) => { await fn(); console.log('✓', name); };

(async () => {
  const browser = await chromium.launch();
  async function open(url = '/', { reducedMotion, preferences = {}, slowRpc = 0, video } = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion, recordVideo: video });
    const page = await context.newPage();
    // Cuenta las View Transitions iniciadas por la app.
    await page.addInitScript(() => {
      window.__vt = 0;
      const original = document.startViewTransition?.bind(document);
      if (original) document.startViewTransition = (cb) => { window.__vt++; return original(cb); };
    });
    await mockBackend(page, { preferences });
    if (slowRpc) await page.route(/\/rest\/v1\/rpc\/(set_goal_archived|update_goal)/, async (route) => { await new Promise((r) => setTimeout(r, slowRpc)); await route.fallback(); });
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#av-main');
    return { page, context };
  }

  await check('cambiar de pestaña usa una View Transition con dirección (adelante/atrás)', async () => {
    const { page, context } = await open();
    await page.locator('.av-nav-item[data-tab="history"]').first().click();
    const direction = await page.evaluate(() => document.documentElement.dataset.vt);
    assert.equal(direction, 'forward');
    await page.locator('.av-nav-item[data-tab="history"][aria-current="page"]').first().waitFor({ state: 'attached' });
    await page.locator('.av-nav-item[data-tab="garden"]').first().click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.vt), 'back');
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.__vt), 2);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.vt), undefined, 'se limpia al terminar');
    await context.close();
  });

  await check('respuesta inmediata: archivar quita la tarjeta antes de que responda el servidor (1,5 s)', async () => {
    const { page, context } = await open('/?tab=metas', { slowRpc: 1500 });
    await page.getByRole('button', { name: 'Opciones de Bicicleta' }).click();
    const started = Date.now();
    await page.getByRole('button', { name: 'Archivar meta' }).click();
    await page.locator('.av-goal-card h2', { hasText: 'Bicicleta' }).waitFor({ state: 'detached', timeout: 1000 });
    assert.ok(Date.now() - started < 1000, `tardó ${Date.now() - started} ms`);
    await page.getByText('«Bicicleta» se archivó').waitFor();
    await context.close();
  });

  await check('las tarjetas y movimientos aparecen con animación (av-rise) y el jardín crece al subir de etapa', async () => {
    const { page, context } = await open('/?tab=movimientos', { preferences: { plantKinds: { g3: 'girasol' } } });
    assert.equal(await page.locator('.av-timeline > li').first().evaluate((el) => getComputedStyle(el).animationName), 'av-rise');
    await page.locator('.av-nav-item[data-tab="garden"]').first().click();
    await page.getByRole('button', { name: /^Viaje a Cusco\./ }).click();
    await page.locator('.ag-contribute').click();
    await page.getByLabel('Monto en soles').fill('90');
    await page.getByRole('button', { name: 'Confirmar y guardar' }).click();
    await page.locator('.ag-pot[data-goal="g3"] .ag-stage-in .ag-svg-sway').first().waitFor({ state: 'attached', timeout: 3000 });
    assert.equal(await page.locator('.ag-pot[data-goal="g3"] .ag-stage-in .ag-svg-sway').first().evaluate((el) => getComputedStyle(el).animationName), 'ag-grow');
    await context.close();
  });

  await check('movimiento reducido (sistema o preferencia): sin View Transitions ni animaciones de lista', async () => {
    for (const options of [{ reducedMotion: 'reduce' }, { preferences: { reducedMotion: true } }]) {
      const { page, context } = await open('/?tab=movimientos', options);
      assert.equal(await page.locator('.av-timeline > li').first().evaluate((el) => getComputedStyle(el).animationName), 'none');
      await page.locator('.av-nav-item[data-tab="goals"]').first().click();
      await page.locator('.av-nav-item[data-tab="goals"][aria-current="page"]').first().waitFor({ state: 'attached' });
      assert.equal(await page.evaluate(() => window.__vt), 0);
      await context.close();
    }
  });

  if (out) {
    // GIF corto: pestañas que se deslizan, la planta que «vuela» a su maceta y archivar con respuesta inmediata.
    const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'av-fluidez-'));
    const { page, context } = await open('/?tab=metas', { video: { dir, size: { width: 1280, height: 860 } } });
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Ver la maceta de Viaje a Cusco' }).click();
    await page.waitForTimeout(900);
    await page.locator('.av-nav-item[data-tab="history"]').first().click();
    await page.waitForTimeout(800);
    await page.locator('.av-nav-item[data-tab="goals"]').first().click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Opciones de Bicicleta' }).click();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Archivar meta' }).click();
    await page.waitForTimeout(1200);
    const video = await page.video().path();
    await context.close();
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vf', 'fps=8,scale=560:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer', path.join(out, 'EV-38-fluidez.gif')]);
      console.log('GIF guardado en', path.join(out, 'EV-38-fluidez.gif'));
    } catch { console.log('(sin ffmpeg: se omite el GIF)'); }
  }
  await browser.close();
})().catch((error) => { console.error('✗', error); process.exit(1); });
