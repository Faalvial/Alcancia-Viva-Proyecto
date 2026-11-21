// Auditoría de accesibilidad NFR-04 (WCAG 2.2 AA) con @axe-core/playwright.
//
// Recorre acceso, jardín, metas, grupos, movimientos, asistente, preferencias, el
// formulario de registro y el panel de voz, a 375 y 1440 px, en modo normal, alto
// contraste, texto 200 % y tema oscuro. Guarda un JSON por combinación y un resumen.
// Requiere `npx vite preview --port 4173`. Backend y voz simulados: no toca Supabase.
// Uso: node scripts/evidence/axe-audit.cjs [carpeta] [anchos]
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');
const { mockBackend } = require('./mock-backend.cjs');
const { installVoiceFakes } = require('./voice-fakes.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const out = process.argv[2] || 'docs/evidence/pc04/axe';
const widths = (process.argv[3] || '375,1440').split(',').map(Number);
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const modes = {
  normal: {},
  'alto-contraste': { highContrast: true },
  'texto-200': { largeText: true },
  oscuro: { theme: 'dark' },
};
const screens = [
  ['acceso', null], ['jardin', 'Mi jardín'], ['metas', 'Metas'], ['grupos', 'Mis grupos'],
  ['movimientos', 'Movimientos'], ['asistente', 'Asistente'], ['preferencias', 'Preferencias'],
  ['registro', 'composer'], ['voz', 'voice'],
];
const slim = (items) => items.map(({ id, impact, tags, help, helpUrl, nodes }) => ({
  id, impact, tags, help, helpUrl,
  nodes: nodes.map(({ target, html, failureSummary, any }) => ({ target, html: html.slice(0, 300), failureSummary, data: any?.[0]?.data })),
}));

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const summary = [];
  for (const [mode, preferences] of Object.entries(modes)) {
    for (const width of widths) {
      for (const [screen, target] of screens) {
        const context = await browser.newContext({ viewport: { width, height: width < 768 ? 800 : 900 } });
        const page = await context.newPage();
        await installVoiceFakes(page);
        await mockBackend(page, { preferences, signedIn: screen !== 'acceso' });
        if (screen === 'acceso' && preferences.theme) await page.addInitScript((theme) => localStorage.setItem('av-theme', theme), preferences.theme);
        await page.goto(BASE, { waitUntil: 'networkidle' });
        if (screen !== 'acceso') await page.waitForSelector('#av-main');
        if (target === 'composer') {
          await page.getByRole('button', { name: /Registrar movimiento/ }).filter({ visible: true }).first().click();
          await page.getByLabel('Tipo de movimiento').selectOption('savings');
          await page.getByLabel('Monto en soles').fill('100');
        } else if (target === 'voice') {
          await page.getByRole('button', { name: 'Hablar' }).filter({ visible: true }).first().click();
          await page.evaluate(() => window.__say('ahorré cien para la laptop'));
          await page.getByRole('group', { name: 'Confirmar el registro' }).waitFor();
        } else if (target) {
          await page.getByRole('button', { name: new RegExp(`^${target}`) }).filter({ visible: true }).first().click();
        }
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        const row = {
          screen, width, mode,
          violations: results.violations.length,
          serious: results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').length,
          incomplete: results.incomplete.length,
          passes: results.passes.length,
        };
        summary.push(row);
        fs.writeFileSync(path.join(out, `${mode}-${width}-${screen}.json`), JSON.stringify({
          ...row, url: results.url, timestamp: results.timestamp, engine: `axe-core ${results.testEngine.version}`, tags: TAGS,
          violations: slim(results.violations), incomplete: slim(results.incomplete),
          passesIds: results.passes.map((p) => p.id),
        }, null, 2));
        await context.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'resumen.json'), JSON.stringify(summary, null, 2));
  const total = summary.reduce((sum, r) => sum + r.violations, 0);
  const serious = summary.reduce((sum, r) => sum + r.serious, 0);
  console.log(`${summary.length} combinaciones · ${total} violaciones (${serious} serias o críticas) · ${summary.reduce((s, r) => s + r.incomplete, 0)} por revisar`);
  for (const r of summary.filter((r) => r.violations)) console.log(' ', r.mode, r.width, r.screen, r.violations);
})().catch((error) => { console.error(error); process.exit(1); });
