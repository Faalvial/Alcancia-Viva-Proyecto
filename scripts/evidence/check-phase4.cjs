// Comprobaciones de la Fase 4 (celebración, transiciones y deshacer de 10 s) con backend simulado.
// Requiere `npx vite preview --port 4173` en marcha. Con una carpeta como argumento
// guarda capturas y un GIF de 10 s de un aporte que lleva una meta al 100 % (necesita ffmpeg).
// Uso: node scripts/evidence/check-phase4.cjs [carpeta]
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
  async function open({ width = 1280, preferences = {}, reducedMotion, video } = {}) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 800 : 900 }, reducedMotion, recordVideo: video });
    const page = await context.newPage();
    const calls = [];
    page.on('request', (r) => { const m = r.url().match(/\/rpc\/(record_movement|reverse_movement)/); if (m) calls.push({ name: m[1], body: JSON.parse(r.postData() || '{}') }); });
    await mockBackend(page, { preferences });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#av-main');
    return { page, context, calls };
  }
  // Aporte de 90 soles a «Viaje a Cusco» (1710 de 1800 → 100 %) desde el aside del jardín.
  async function bloom(page, { pause = 0 } = {}) {
    await page.getByRole('button', { name: /^Viaje a Cusco\./ }).click();
    if (pause) await page.waitForTimeout(pause);
    await page.locator('.ag-contribute').click();
    await page.getByLabel('Monto en soles').fill('90');
    if (pause) await page.waitForTimeout(pause);
    await page.getByRole('button', { name: 'Confirmar y guardar' }).click();
  }

  await check('al llegar al 100 %: transición de etapa, pétalos, aviso «floreció» y count-up del monto', async () => {
    const { page, context } = await open();
    await bloom(page);
    await page.locator('.ag-stage-out').first().waitFor({ state: 'attached', timeout: 3000 });
    assert.equal(await page.locator('.ag-petals i').count(), 16);
    const toast = page.locator('.av-toast');
    await toast.getByText(/^¡Viaje a Cusco floreció! S\/\s?90\.00 sumados a Viaje a Cusco\.$/).waitFor();
    // El monto grande del aside anima de 1710 a 1800 (valor intermedio durante la animación).
    const money = page.locator('.ag-money strong');
    const samples = [];
    for (let i = 0; i < 10; i++) { samples.push(await money.textContent()); await page.waitForTimeout(60); }
    assert.ok(samples.some((t) => !/1,800\.00|1,710\.00/.test(t)) || samples.at(-1).includes('1,800.00'), samples.join(' | '));
    await page.waitForFunction(() => document.querySelector('.ag-money strong')?.textContent?.includes('1,800.00'));
    await page.waitForTimeout(2700);
    assert.equal(await page.locator('.ag-petals').count(), 0, 'los pétalos se retiran tras la celebración');
    assert.equal(await page.locator('.ag-stage-out').count(), 0);
    await context.close();
  });

  await check('deshacer desde el aviso dentro de los 10 s llama a reverse_movement y restaura el avance', async () => {
    const { page, context, calls } = await open();
    await bloom(page);
    const toast = page.locator('.av-toast');
    await toast.locator('.av-toast-timer').waitFor();
    assert.match(await toast.locator('.av-toast-seconds').textContent(), /^(10|9) s$/);
    const saved = calls.find((c) => c.name === 'record_movement');
    await toast.getByRole('button', { name: /^Deshacer/ }).click();
    await page.getByText('Movimiento revertido; actualizamos el avance.').waitFor();
    assert.equal(calls.find((c) => c.name === 'reverse_movement')?.body.p_id, saved.body.p_id);
    await page.waitForFunction(() => document.querySelector('.ag-money strong')?.textContent?.includes('1,710.00'));
    await context.close();
  });

  await check('pasados 10 s el aviso se cierra y la reversión sigue disponible en Movimientos', async () => {
    const { page, context } = await open();
    await page.getByRole('button', { name: /Registrar movimiento/ }).filter({ visible: true }).first().click();
    await page.getByLabel('Tipo de movimiento').selectOption('expense');
    await page.getByLabel('Monto en soles').fill('7');
    await page.getByLabel('Categoría').fill('Transporte');
    await page.getByRole('button', { name: 'Confirmar y guardar' }).click();
    const toast = page.locator('.av-toast');
    await toast.waitFor();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(6800);
    assert.equal(await toast.count(), 1, 'a los 6,8 s sigue visible (ventana de 10 s)');
    await page.waitForTimeout(3700);
    assert.equal(await toast.count(), 0);
    await page.getByRole('button', { name: /^Movimientos/ }).filter({ visible: true }).first().click();
    await page.getByRole('button', { name: /^Deshacer gasto de S\/\s?7\.00$/ }).waitFor();
    await context.close();
  });

  await check('micro-interacciones: botón presionado al 97 %, maceta elevada al pasar el puntero y fundido al cambiar de pestaña', async () => {
    const { page, context } = await open();
    const button = page.getByRole('button', { name: 'Escuchar jardín' });
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(150);
    assert.match(await button.evaluate((el) => getComputedStyle(el).transform), /^matrix\(0\.97, 0, 0, 0\.97/);
    await page.mouse.up();
    const pot = page.getByRole('button', { name: /^Fondo de emergencia\./ });
    await pot.hover();
    await page.waitForTimeout(350);
    assert.match(await pot.evaluate((el) => getComputedStyle(el).transform), /^matrix\(1, 0, 0, 1, 0, -5\)$/);
    await page.getByRole('button', { name: /^Metas/ }).filter({ visible: true }).first().click();
    await page.locator('.av-nav-item[data-tab="goals"][aria-current="page"]').first().waitFor({ state: 'attached' });
    assert.equal(await page.locator('.av-tab-panel').evaluate((el) => getComputedStyle(el).animationName), 'av-tab-fade');
    await context.close();
  });

  await check('movimiento reducido: sin pétalos ni fundido de etapa, monto sin animar; el aviso y el texto se mantienen', async () => {
    const { page, context } = await open({ reducedMotion: 'reduce', preferences: { reducedMotion: true } });
    await bloom(page);
    await page.locator('.av-toast').getByText(/^¡Viaje a Cusco floreció!/).waitFor();
    assert.equal(await page.locator('.ag-petals').count(), 0);
    assert.equal(await page.locator('.ag-stage-out:visible').count(), 0);
    await page.waitForFunction(() => document.querySelector('.ag-money strong')?.textContent?.includes('1,800.00'), null, { timeout: 2000 });
    assert.equal(await page.locator('.av-tab-panel').evaluate((el) => getComputedStyle(el).animationName), 'none');
    const button = page.getByRole('button', { name: 'Escuchar jardín' });
    const box = await button.boundingBox();
    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.down();
    assert.equal(await button.evaluate((el) => getComputedStyle(el).transform), 'none');
    await page.mouse.up();
    await context.close();
  });

  await check('acceso: capa de brisa muy lenta sobre el jardín, que desaparece con movimiento reducido', async () => {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion });
      const page = await context.newPage();
      await mockBackend(page, { signedIn: false });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      const layer = page.locator('.av-welcome-breeze');
      const style = await layer.evaluate((el) => ({ name: getComputedStyle(el).animationName, duration: getComputedStyle(el).animationDuration, display: getComputedStyle(el).display }));
      if (reducedMotion === 'reduce') assert.equal(style.display, 'none');
      else assert.deepEqual(style, { name: 'ag-breeze', duration: '14s', display: 'block' });
      assert.equal(await page.getByRole('img', { name: /Jardín con flores rosadas/ }).count(), 1, 'la capa decorativa no duplica el texto alternativo');
      await context.close();
    }
  });

  if (out) await check('evidencia: capturas y GIF de 10 s del aporte que lleva una meta al 100 %', async () => {
    const videoDir = path.join(out, '.video');
    const { page, context } = await open({ width: 1024, video: { dir: videoDir, size: { width: 1024, height: 900 } } });
    const start = Date.now();
    await page.waitForTimeout(600);
    await bloom(page, { pause: 700 });
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(out, 'celebracion-1024.png') });
    await page.waitForTimeout(Math.max(0, 10000 - (Date.now() - start)));
    await page.locator('.av-toast').screenshot({ path: path.join(out, 'deshacer-10s.png') }).catch(() => {});
    const video = await page.video().path();
    await context.close();
    const gif = path.join(out, 'meta-al-100.gif');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-t', '10', '-i', video, '-vf', 'fps=12,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', gif]);
    fs.rmSync(videoDir, { recursive: true, force: true });
    for (const [name, width, preferences] of [['celebracion-375.png', 375, {}], ['celebracion-oscuro-1440.png', 1440, { theme: 'dark' }], ['celebracion-contraste-1440.png', 1440, { highContrast: true }], ['celebracion-texto-200-375.png', 375, { largeText: true }]]) {
      const { page: p, context: c } = await open({ width, preferences });
      await bloom(p);
      await p.locator('.av-toast').waitFor();
      await p.waitForTimeout(450);
      await p.screenshot({ path: path.join(out, name) });
      await c.close();
    }
  });

  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
