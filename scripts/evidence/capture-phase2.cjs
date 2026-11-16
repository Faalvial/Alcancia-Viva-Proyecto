// Escenarios de la Fase 2: estados vacíos, carga, toast con Deshacer, tema y acceso.
// Requiere `npx vite preview --port 4173` en marcha.
// Uso: node scripts/evidence/capture-phase2.cjs <carpeta> [anchos]
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { mockBackend } = require('./mock-backend.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const out = process.argv[2] || 'docs/evidence/pc04/tmp';
const widths = (process.argv[3] || '375,1440').split(',').map(Number);
const tab = (page, name) => page.getByRole('button', { name: new RegExp(`^${name}`) }).filter({ visible: true }).first().click();

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const width of widths) {
    const viewport = { width, height: width < 768 ? 800 : 900 };
    const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}-${width}.png`) });

    // Carga: silueta con la maceta mientras llega el perfil.
    let page = await browser.newPage({ viewport });
    await mockBackend(page, { profileDelay: 4000 });
    await page.goto(BASE);
    await page.waitForSelector('.av-skeleton');
    assert.equal(await page.getByRole('status').filter({ hasText: 'Cargando tu perfil…' }).count(), 1);
    await shot(page, 'carga');
    await page.close();

    // Estados vacíos en Metas, Grupos, Movimientos y Asistente.
    for (const theme of ['light', 'dark']) {
      page = await browser.newPage({ viewport });
      await mockBackend(page, { empty: true, preferences: { theme } });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      for (const [slug, name] of [['metas', 'Metas'], ['grupos', 'Mis grupos'], ['movimientos', 'Movimientos'], ['asistente', 'Asistente']]) {
        await tab(page, name);
        await page.locator('.av-empty-state').first().waitFor();
        if (slug === 'grupos') await page.locator('.av-empty-state').scrollIntoViewIfNeeded();
        await shot(page, `vacio-${slug}-${theme}`);
      }
      await page.close();
    }

    // Toast tras guardar un gasto, con Deshacer, y revisión con color semántico.
    page = await browser.newPage({ viewport });
    await mockBackend(page);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Registrar movimiento/ }).filter({ visible: true }).first().click();
    await page.getByLabel('Tipo de movimiento').selectOption('expense');
    await page.getByLabel('Monto en soles').fill('12.5');
    await page.getByLabel('Categoría').fill('Transporte');
    await page.locator('.av-review').scrollIntoViewIfNeeded();
    await shot(page, 'registro-revision');
    await page.getByRole('button', { name: 'Confirmar y guardar' }).click();
    const toast = page.locator('.av-toast');
    await toast.waitFor();
    assert.match(await page.locator('.av-toast-region').getAttribute('aria-live'), /polite/);
    await toast.getByRole('button', { name: 'Deshacer' }).waitFor();
    await page.waitForTimeout(400);
    await shot(page, 'toast');
    await page.close();

    // Preferencias con el selector de tema, en oscuro.
    page = await browser.newPage({ viewport });
    await mockBackend(page, { preferences: { theme: 'dark' } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await tab(page, 'Preferencias');
    await page.getByRole('group', { name: 'Tema de color' }).scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.getByRole('radio', { name: 'Claro' }).check();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await page.getByRole('radio', { name: 'Oscuro' }).check();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await shot(page, 'tema-oscuro');
    await page.close();

    // Acceso, claro y oscuro (el tema recordado se aplica antes de iniciar sesión).
    for (const scheme of ['light', 'dark']) {
      page = await browser.newPage({ viewport, colorScheme: scheme });
      await mockBackend(page, { signedIn: false });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await shot(page, `acceso-sistema-${scheme}`);
      await page.close();
    }
  }
  await browser.close();
  console.log('Escenarios de la Fase 2 capturados en', out);
})().catch((error) => { console.error(error); process.exit(1); });
