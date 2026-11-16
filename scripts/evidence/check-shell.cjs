// Comprobaciones de interacción de la shell (Fase 1) con backend simulado.
// Requiere `npx vite preview --port 4173` en marcha.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mockBackend } = require('./mock-backend.cjs');
const BASE = process.env.BASE_URL || 'http://localhost:4173';

async function open(browser, width, preferences = {}) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, hasTouch: width < 768 });
  await mockBackend(page, { preferences });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#av-main');
  return page;
}
const check = async (name, fn) => { await fn(); console.log('✓', name); };

(async () => {
  const browser = await chromium.launch();
  let page = await open(browser, 375);
  await check('móvil: tab bar fija de 5 ítems con aria-current y Preferencias en el header', async () => {
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    const visible = await nav.getByRole('button').filter({ visible: true }).count();
    assert.equal(visible, 5);
    const box = await nav.boundingBox();
    assert.equal(Math.round(box.y + box.height), 800);
    assert.equal(Math.round(box.height), 64);
    for (const item of await nav.getByRole('button').filter({ visible: true }).all()) {
      const b = await item.boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= 375, `ítem fuera de pantalla: ${JSON.stringify(b)}`);
      assert.equal(await item.locator('.av-nav-text--short').evaluate(e => e.scrollWidth <= e.clientWidth), true, 'etiqueta truncada');
    }
    await page.getByRole('button', { name: 'Metas', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Metas', exact: true }).getAttribute('aria-current'), 'page');
    await page.getByRole('button', { name: 'Preferencias' }).filter({ visible: true }).click();
    await page.getByRole('heading', { name: 'A tu manera' }).waitFor();
    await page.getByRole('button', { name: 'Cerrar sesión' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Salir' }).isVisible(), false);
  });
  await check('móvil: todos los botones de la tab bar y el FAB miden al menos 44 px', async () => {
    for (const el of await page.locator('.av-nav-item:visible, .av-fab, .av-header-settings').all()) {
      const b = await el.boundingBox(); assert.ok(b.width >= 44 && b.height >= 44, JSON.stringify(b));
    }
    const fab = await page.locator('.av-fab').boundingBox();
    assert.equal(Math.round(fab.width), 56);
    assert.ok(fab.y + fab.height <= 800 - 64, 'el FAB queda sobre la tab bar');
  });
  await check('móvil: el FAB abre el bottom sheet anclado abajo y el arrastre lo cierra devolviendo el foco', async () => {
    await page.locator('.av-fab').click();
    const dialog = page.locator('dialog[open]');
    await dialog.waitFor(); await page.waitForTimeout(350);
    const box = await dialog.boundingBox();
    assert.equal(Math.round(box.y + box.height), 800);
    assert.ok(box.height <= 800 * 0.92 + 1);
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'TEXTAREA');
    const grip = await page.locator('.av-sheet-handle').boundingBox();
    const x = grip.x + grip.width / 2, y = grip.y + 4;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x, y + 60, { steps: 4 }); await page.mouse.up();
    await page.waitForTimeout(300);
    assert.equal(await dialog.count(), 1, 'un arrastre corto no cierra');
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x, y + 260, { steps: 6 }); await page.mouse.up();
    await page.waitForSelector('dialog[open]', { state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'av-fab');
  });
  await check('móvil: el botón Cerrar sigue cerrando el sheet', async () => {
    await page.locator('.av-fab').click();
    await page.getByRole('button', { name: 'Cerrar registro' }).click();
    await page.waitForSelector('dialog[open]', { state: 'detached' });
  });
  await page.close();

  page = await open(browser, 1440);
  await check('escritorio: la tecla n abre el registro y Escape lo cierra; dentro de un campo no', async () => {
    await page.keyboard.press('n');
    await page.locator('dialog[open]').waitFor();
    await page.keyboard.press('Escape');
    await page.waitForSelector('dialog[open]', { state: 'detached' });
    await page.getByRole('combobox', { name: 'Tu espacio' }).focus();
    await page.keyboard.press('n');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.locator('.av-fab').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Registrar movimiento' }).filter({ visible: true }).count(), 1);
  });
  await check('escritorio: diálogo centrado', async () => {
    await page.getByRole('button', { name: 'Registrar movimiento' }).filter({ visible: true }).click();
    const b = await page.locator('dialog[open]').boundingBox();
    assert.ok(Math.abs(b.x + b.width / 2 - 720) < 2 && b.width <= 600);
  });
  await page.close();

  page = await open(browser, 800);
  await check('tablet: rail de 72 px con tooltip y nombre accesible', async () => {
    const nav = await page.locator('.av-nav').boundingBox();
    assert.ok(nav.width <= 72, String(nav.width));
    const item = page.getByRole('button', { name: 'Mis grupos', exact: true });
    await item.hover();
    const tip = await item.evaluate(el => getComputedStyle(el, '::after').content);
    assert.equal(tip, '"Mis grupos"');
  });
  await page.close();

  page = await open(browser, 375, { largeText: true });
  await check('texto 200 %: la navegación deja de ser fija y muestra el texto completo', async () => {
    assert.equal(await page.locator('.av-nav').evaluate(el => getComputedStyle(el).position), 'static');
    await page.getByText('Mis grupos', { exact: true }).waitFor();
  });
  await page.close();
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
