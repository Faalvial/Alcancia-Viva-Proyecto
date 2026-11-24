// Comprobaciones de los ajustes de la Fase 5 (Web Interface Guidelines) con backend simulado.
// Requiere `npx vite preview --port 4173` en marcha.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mockBackend } = require('./mock-backend.cjs');
const BASE = process.env.BASE_URL || 'http://localhost:4173';
const check = async (name, fn) => { await fn(); console.log('✓', name); };

(async () => {
  const browser = await chromium.launch();
  const open = async (options = {}, width = 1280) => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const rpcs = [];
    page.on('request', (r) => { const m = r.url().match(/\/rpc\/([a-z_]+)/); if (m) rpcs.push(m[1]); });
    await mockBackend(page, options);
    return { page, rpcs };
  };

  await check('la pestaña activa queda en la URL (?tab=metas) y sobrevive a la recarga', async () => {
    const { page } = await open();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Metas', exact: true }).click();
    await page.waitForURL(/\?tab=metas$/); // con View Transitions el cambio llega en el siguiente cuadro
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getByRole('button', { name: 'Metas', exact: true }).getAttribute('aria-current'), 'page');
    await page.getByRole('button', { name: 'Mi jardín', exact: true }).click();
    await page.waitForURL((url) => url.search === '');
    await page.close();
  });

  await check('revocar un código y rechazar una solicitud piden confirmación; cancelar no ejecuta nada', async () => {
    const { page, rpcs } = await open();
    await page.goto(`${BASE}/?tab=grupos`, { waitUntil: 'networkidle' });
    await page.locator('.av-group-card').click();
    // Diálogo de confirmación propio (antes window.confirm): Cancelar no ejecuta nada.
    await page.getByRole('button', { name: 'Revocar código' }).click();
    await page.getByRole('dialog', { name: '¿Revocar este código?' }).getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('button', { name: 'Rechazar' }).click();
    const reject = page.getByRole('dialog', { name: '¿Rechazar la solicitud de Diego Flores?' });
    await reject.waitFor();
    await page.keyboard.press('Escape');
    await reject.waitFor({ state: 'detached' });
    assert.ok(!rpcs.includes('revoke_group_invitation') && !rpcs.includes('decide_group_request'));
    await page.getByRole('button', { name: 'Revocar código' }).click();
    await page.getByRole('dialog', { name: '¿Revocar este código?' }).getByRole('button', { name: 'Revocar código' }).click();
    await page.waitForTimeout(300);
    assert.ok(rpcs.includes('revoke_group_invitation'));
    await page.close();
  });

  await check('acceso: la brisa del jardín se puede pausar y reanudar (WCAG 2.2.2)', async () => {
    const { page } = await open({ signedIn: false });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const toggle = page.getByRole('button', { name: 'Pausar la brisa del jardín' });
    await toggle.click();
    assert.equal(await page.locator('.av-welcome-breeze').evaluate((el) => getComputedStyle(el).animationPlayState), 'paused');
    await page.getByRole('button', { name: 'Reanudar la brisa del jardín' }).click();
    assert.equal(await page.locator('.av-welcome-breeze').evaluate((el) => getComputedStyle(el).animationPlayState), 'running');
    await page.close();
  });

  await check('montos con teclado decimal y búsqueda sin autocompletar ni corrector', async () => {
    const { page } = await open({}, 375);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('.av-fab').click();
    assert.equal(await page.getByLabel('Monto en soles').getAttribute('inputmode'), 'decimal');
    await page.getByRole('button', { name: 'Cerrar registro' }).click();
    await page.getByRole('button', { name: /^Movimientos/ }).filter({ visible: true }).first().click();
    const search = page.getByRole('searchbox', { name: 'Buscar en movimientos' });
    assert.deepEqual([await search.getAttribute('autocomplete'), await search.getAttribute('spellcheck')], ['off', 'false']);
    await page.close();
  });

  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
