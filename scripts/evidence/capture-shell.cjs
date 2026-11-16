// Capturas de la shell en varios anchos, pestañas y modos de accesibilidad.
//
// Requiere `npm run build` y `npx vite preview --port 4173` en marcha.
// Uso: node scripts/evidence/capture-shell.cjs <carpeta> [anchos] [modos]
//   anchos: lista separada por comas (por defecto 320,375,768,1024,1440)
//   modos:  normal,large,contrast,dark,dark-contrast (por defecto los tres primeros)
// Informa de cualquier scroll horizontal y termina con código 1 si lo hay.

const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { mockBackend } = require('./mock-backend.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const out = process.argv[2] || 'docs/evidence/pc04/tmp';
const widths = (process.argv[3] || '320,375,768,1024,1440').split(',').map(Number);
const modes = (process.argv[4] || 'normal,large,contrast').split(',');
const tabs = [
  ['jardin', 'Mi jardín'], ['metas', 'Metas'], ['grupos', 'Mis grupos'],
  ['movimientos', 'Movimientos'], ['asistente', 'Asistente'], ['preferencias', 'Preferencias'],
];
const modePrefs = { normal: {}, large: { largeText: true }, contrast: { highContrast: true }, dark: { theme: 'dark' }, 'dark-contrast': { theme: 'dark', highContrast: true } };
// El nombre accesible puede llevar un sufijo (p. ej. «Mis grupos, 1 solicitud pendiente»).
const named = (name) => new RegExp(`^${name}`);

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];
  for (const mode of modes) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: width < 768 ? 800 : 900 } });
      await mockBackend(page, { preferences: modePrefs[mode] });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForSelector('#av-main');
      for (const [slug, name] of tabs) {
        await page.getByRole('button', { name: named(name) }).filter({ visible: true }).first().click();
        await page.waitForTimeout(250);
        const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
        if (scroll > width) problems.push(`${mode} ${width}px ${slug}: scrollWidth ${scroll}`);
        await page.screenshot({ path: path.join(out, `${mode}-${width}-${slug}.png`), fullPage: process.env.FULL === '1' });
      }
      await page.getByRole('button', { name: 'Mi jardín', exact: true }).filter({ visible: true }).first().click();
      const register = page.getByRole('button', { name: /Registrar movimiento/ }).filter({ visible: true }).first();
      await register.click();
      await page.waitForSelector('dialog[open]');
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, `${mode}-${width}-registro.png`) });
      await page.close();
    }
  }
  await browser.close();
  if (problems.length) { console.log('Scroll horizontal:\n' + problems.join('\n')); process.exit(1); }
  console.log('Sin scroll horizontal en', widths.join(', '), 'px ·', modes.join(', '));
})();
