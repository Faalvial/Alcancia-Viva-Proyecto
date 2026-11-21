// Comprobaciones de comportamiento de la Fase 2 con backend simulado.
// Requiere `npx vite preview --port 4173` en marcha.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mockBackend } = require('./mock-backend.cjs');
const BASE = process.env.BASE_URL || 'http://localhost:4173';
const check = async (name, fn) => { await fn(); console.log('✓', name); };
const tab = (page, name) => page.getByRole('button', { name: new RegExp(`^${name}`) }).filter({ visible: true }).first().click();

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mockBackend(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });

  await check('medidor de presupuesto con role="meter" y valores accesibles', async () => {
    const meter = page.getByRole('meter', { name: 'Gasto respecto al presupuesto semanal' });
    assert.equal(await meter.getAttribute('aria-valuemax'), '300');
    assert.match(await meter.getAttribute("aria-valuetext"), /^S\/\s?\d+\.\d{2} de S\/\s?300\.00, \d+ % del presupuesto$/);
    assert.equal(await page.locator('.av-week table tbody tr').count() >= 1, true);
  });

  await check('historial: agrupado por día, filtros por tipo y buscador', async () => {
    await tab(page, 'Movimientos');
    assert.deepEqual(await page.locator('.av-day-title').allTextContents(), ['Hoy', 'Ayer', await page.locator('.av-day-title').nth(2).textContent()]);
    await page.getByRole('button', { name: 'Gastos' }).click();
    assert.equal(await page.getByRole('button', { name: 'Gastos' }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.av-timeline > li').count(), 2);
    await page.getByRole('button', { name: 'Todos' }).click();
    await page.getByRole('searchbox', { name: 'Buscar en movimientos' }).fill('laptop');
    assert.equal(await page.locator('.av-timeline > li').count(), 1);
    assert.match(await page.locator('.av-history-count').textContent(), /1 de 5/);
    await page.getByRole('searchbox', { name: 'Buscar en movimientos' }).fill('');
    assert.ok(await page.getByRole('button', { name: /^Deshacer/ }).count() >= 1);
  });

  await check('toast tras guardar: se cierra solo (ventana de 10 s desde la Fase 4) y se pausa con el puntero encima', async () => {
    await page.getByRole('button', { name: /Registrar movimiento/ }).filter({ visible: true }).first().click();
    await page.getByLabel('Tipo de movimiento').selectOption('income');
    await page.getByLabel('Monto en soles').fill('20');
    await page.getByLabel('Categoría').fill('Trabajo');
    await page.getByRole('button', { name: 'Confirmar y guardar' }).click();
    const toast = page.locator('.av-toast');
    await toast.waitFor();
    await toast.hover();
    await page.waitForTimeout(7000);
    assert.equal(await toast.count(), 1, 'sigue visible mientras el puntero está encima');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(10500);
    assert.equal(await toast.count(), 0, 'se cierra al reanudar');
  });

  await check('tema oscuro: se aplica al instante, se recuerda en el dispositivo y se usa en la pantalla de acceso', async () => {
    await tab(page, 'Preferencias');
    await page.getByRole('radio', { name: 'Oscuro' }).check();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    assert.equal(await page.evaluate(() => localStorage.getItem('av-theme')), 'dark');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(bg, 'rgb(13, 26, 19)');
    await page.getByRole('radio', { name: 'Según el sistema' }).check();
    await page.waitForFunction(() => document.documentElement.dataset.themePreference === 'system');
    const login = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await login.addInitScript(() => localStorage.setItem('av-theme', 'dark'));
    await mockBackend(login, { signedIn: false });
    await login.goto(BASE, { waitUntil: 'networkidle' });
    assert.equal(await login.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await login.close();
  });

  await check('alto contraste tiene prioridad sobre el tema oscuro', async () => {
    const contrast = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await mockBackend(contrast, { preferences: { theme: 'dark', highContrast: true } });
    await contrast.goto(BASE, { waitUntil: 'networkidle' });
    assert.equal(await contrast.evaluate(() => getComputedStyle(document.querySelector('.av-app')).backgroundColor), 'rgb(0, 0, 0)');
    await contrast.close();
  });

  await check('movimiento reducido: el toast aparece sin animación', async () => {
    const still = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await mockBackend(still, { preferences: { reducedMotion: true } });
    await still.goto(BASE, { waitUntil: 'networkidle' });
    await still.keyboard.press('n');
    await still.getByLabel('Tipo de movimiento').selectOption('expense');
    await still.getByLabel('Monto en soles').fill('5');
    await still.getByLabel('Categoría').fill('Otros');
    await still.getByRole('button', { name: 'Confirmar y guardar' }).click();
    await still.locator('.av-toast').waitFor();
    assert.match(await still.locator('.av-toast').evaluate(el => getComputedStyle(el).animationName + '|' + getComputedStyle(el).animationDuration), /^none\||\|0\.001s$|\|1e-03s$/);
    await still.close();
  });

  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
