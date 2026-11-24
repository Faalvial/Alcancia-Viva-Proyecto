// Comprobaciones del control del usuario (metas, grupos, solicitudes, movimientos y cuenta)
// con backend simulado. Requiere `npx vite preview --port 4173` en marcha.
// Uso: node scripts/evidence/check-control.cjs [carpeta-de-capturas]
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
  async function open(url = '/', { width = 1280 } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [], rpcs = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => { errors.push(`diálogo nativo: ${d.message()}`); d.dismiss(); });
    page.on('request', (r) => { const m = r.url().match(/\/rpc\/(\w+)/); if (m && r.method() === 'POST') rpcs.push({ name: m[1], body: JSON.parse(r.postData() || '{}') }); });
    await mockBackend(page);
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#av-main');
    return { page, context, errors, rpcs };
  }
  const toast = (page, text) => page.locator('.av-toast').filter({ hasText: text }).first().waitFor();

  await check('opciones de una meta: editar nombre, monto y fecha', async () => {
    const { page, context, rpcs, errors } = await open();
    await page.getByRole('button', { name: 'Opciones de Laptop para la universidad' }).click();
    const dialog = page.getByRole('dialog', { name: 'Opciones de la meta' });
    await dialog.waitFor();
    assert.equal(await dialog.getByLabel('Nombre de la meta').evaluate((el) => el === document.activeElement), true, 'el foco va al primer campo');
    await dialog.getByLabel('Nombre de la meta').fill('Laptop nueva');
    await dialog.getByLabel('Monto objetivo (S/)').fill('3000');
    if (out) await dialog.screenshot({ path: path.join(out, 'EV-33-opciones-meta.png') });
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await toast(page, '«Laptop nueva» se actualizó.');
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(rpcs.find((r) => r.name === 'update_goal').body, { p_goal: 'g1', p_title: 'Laptop nueva', p_amount: 3000, p_date: rpcs.find((r) => r.name === 'update_goal').body.p_date });
    assert.match(await page.locator('.ag-pot[data-goal="g1"]').getAttribute('aria-label'), /^Laptop nueva\./);
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check('archivar con «Deshacer», metas archivadas y restaurar', async () => {
    const { page, context } = await open('/?tab=metas');
    await page.getByRole('button', { name: 'Opciones de Fondo de emergencia' }).click();
    await page.getByRole('dialog', { name: 'Opciones de la meta' }).getByRole('button', { name: 'Archivar meta' }).click();
    await toast(page, '«Fondo de emergencia» se archivó');
    assert.equal(await page.locator('.av-goal-card h2', { hasText: 'Fondo de emergencia' }).count(), 0);
    await page.getByText('Metas archivadas (1)').click();
    if (out) await page.locator('.av-archived').screenshot({ path: path.join(out, 'EV-34-metas-archivadas.png') });
    await page.getByRole('button', { name: 'Restaurar Fondo de emergencia' }).click();
    await toast(page, '«Fondo de emergencia» volvió a tu jardín.');
    await page.locator('.av-goal-card h2', { hasText: 'Fondo de emergencia' }).waitFor();
    await context.close();
  });

  await check('eliminar: bloqueado con aportes; sin aportes pide confirmación propia (Escape cancela)', async () => {
    const { page, context, rpcs, errors } = await open('/?tab=metas');
    await page.getByRole('button', { name: 'Opciones de Laptop para la universidad' }).click();
    let dialog = page.getByRole('dialog', { name: 'Opciones de la meta' });
    assert.equal(await dialog.getByRole('button', { name: 'Eliminar meta' }).isDisabled(), true);
    await dialog.getByText('Para eliminarla no debe tener aportes vigentes').waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Opciones de Bicicleta' }).click();
    dialog = page.getByRole('dialog', { name: 'Opciones de la meta' });
    await dialog.getByRole('button', { name: 'Eliminar meta' }).click();
    const confirm = page.getByRole('dialog', { name: '¿Eliminar esta meta?' });
    await confirm.waitFor();
    if (out) await confirm.screenshot({ path: path.join(out, 'EV-35-confirmar-eliminar.png') });
    await page.keyboard.press('Escape');
    await confirm.waitFor({ state: 'detached' });
    assert.equal(rpcs.some((r) => r.name === 'delete_goal'), false, 'Escape no elimina');
    await dialog.getByRole('button', { name: 'Eliminar meta' }).click();
    await confirm.getByRole('button', { name: 'Eliminar meta' }).click();
    await toast(page, 'Meta eliminada.');
    assert.equal(await page.locator('.av-goal-card h2', { hasText: 'Bicicleta' }).count(), 0);
    assert.deepEqual(errors, [], 'sin window.confirm');
    await context.close();
  });

  await check('grupo: renombrar, roles, quitar integrante y salir (único admin no puede)', async () => {
    const { page, context, rpcs } = await open('/?tab=grupos');
    await page.locator('.av-group-card').click();
    await page.getByRole('button', { name: 'Cambiar nombre' }).click();
    await page.getByLabel('Nuevo nombre del grupo').fill('Promo 2026');
    await page.getByRole('button', { name: 'Guardar nombre' }).click();
    await toast(page, 'Nombre del grupo actualizado.');
    assert.equal(await page.getByRole('button', { name: 'Salir del grupo' }).isDisabled(), true, 'único admin');
    await page.getByRole('button', { name: 'Hacer administrador a Mateo Huamán' }).click();
    await toast(page, 'Mateo Huamán ahora también administra el grupo.');
    assert.equal(await page.getByRole('button', { name: 'Salir del grupo' }).isDisabled(), false);
    await page.getByRole('button', { name: 'Quitar a Valeria Rojas del grupo' }).click();
    await page.getByRole('dialog', { name: '¿Quitar a Valeria Rojas?' }).getByRole('button', { name: 'Quitar del grupo' }).click();
    await toast(page, 'Valeria Rojas ya no está en el grupo.');
    if (out) await page.locator('.av-group-manager').screenshot({ path: path.join(out, 'EV-36-gestion-grupo.png') });
    await page.getByRole('button', { name: 'Salir del grupo' }).click();
    await page.getByRole('dialog', { name: /¿Salir de/ }).getByRole('button', { name: 'Salir del grupo' }).click();
    await toast(page, 'Saliste de');
    assert.deepEqual(rpcs.filter((r) => ['rename_group', 'set_member_role', 'remove_member', 'leave_group'].includes(r.name)).map((r) => r.name), ['rename_group', 'set_member_role', 'remove_member', 'leave_group']);
    await context.close();
  });

  await check('cancelar una solicitud de ingreso pendiente', async () => {
    const { page, context } = await open('/?tab=grupos');
    await page.getByRole('button', { name: 'Cancelar la solicitud a Club de lectura' }).click();
    await toast(page, 'Solicitud cancelada.');
    await page.getByText('No tienes solicitudes.').waitFor();
    await context.close();
  });

  await check('corregir un movimiento: registra el nuevo y revierte el anterior', async () => {
    const { page, context, rpcs } = await open('/?tab=movimientos');
    await page.getByRole('button', { name: 'Corregir gasto de S/ 18.50' }).click();
    const dialog = page.getByRole('dialog', { name: 'Corregir movimiento' });
    await dialog.waitFor();
    assert.equal(await dialog.getByLabel('Monto en soles').inputValue(), '18.5');
    await dialog.getByLabel('Monto en soles').fill('21');
    await dialog.getByRole('button', { name: 'Guardar corrección' }).click();
    await toast(page, 'Movimiento corregido.');
    const names = rpcs.map((r) => r.name).filter((n) => n === 'record_movement' || n === 'reverse_movement');
    assert.deepEqual(names, ['record_movement', 'reverse_movement']);
    assert.equal(rpcs.find((r) => r.name === 'record_movement').body.p_amount, 21);
    assert.equal(rpcs.find((r) => r.name === 'reverse_movement').body.p_id, 'm1');
    await context.close();
  });

  await check('cuenta: cambiar nombre visible y validar la contraseña nueva', async () => {
    const { page, context } = await open('/?tab=preferencias');
    await page.getByLabel('¿Cómo quieres que te llamemos?').fill('Lu');
    await page.getByRole('button', { name: 'Guardar nombre' }).click();
    await toast(page, 'Nombre actualizado.');
    await page.locator('.av-user-name', { hasText: 'Lu' }).waitFor();
    await page.locator('.av-password summary').click();
    await page.getByLabel('Nueva contraseña').fill('12345678');
    await page.getByLabel('Repite la contraseña').fill('87654321');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await page.getByText('Las contraseñas no coinciden.').waitFor();
    if (out) await page.locator('.av-account').screenshot({ path: path.join(out, 'EV-37-cuenta.png') });
    await context.close();
  });

  await check('móvil 320 px: diálogo de opciones sin desborde y botones de 44 px', async () => {
    const { page, context } = await open('/?tab=metas', { width: 320 });
    await page.getByRole('button', { name: 'Opciones de Bicicleta' }).click();
    const dialog = page.getByRole('dialog', { name: 'Opciones de la meta' });
    await dialog.waitFor();
    const sizes = await dialog.locator('button').evaluateAll((list) => list.filter((b) => b.offsetParent).map((b) => [b.textContent.trim(), Math.round(b.getBoundingClientRect().height)]));
    for (const [label, height] of sizes) assert.ok(height >= 44, `${label}: ${height}px`);
    const overflow = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth);
    assert.ok(overflow <= 0, `desborde ${overflow}px`);
    await context.close();
  });

  await browser.close();
})().catch((error) => { console.error('✗', error); process.exit(1); });
