// Backend simulado para capturas y pruebas visuales con Playwright.
//
// Inyecta una sesión ficticia en localStorage e intercepta todas las llamadas
// al proyecto Supabase (REST, RPC, funciones y tiempo real) con datos de
// práctica. Ninguna petición llega al Supabase compartido, así que no crea ni
// modifica datos de nadie.
//
// Uso: const { mockBackend } = require('./mock-backend.cjs');
//      await mockBackend(page, { preferences: { largeText: true } });

const SUPABASE = 'https://ahnfwlmymthfgxpyoasz.supabase.co';
const STORAGE_KEY = 'sb-ahnfwlmymthfgxpyoasz-auth-token';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const GROUP_ID = '00000000-0000-4000-8000-0000000000a1';

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function fakeSession() {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
  const user = {
    id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'practica@example.com',
    user_metadata: { display_name: 'Lucía Quispe' }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z',
  };
  const access = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER_ID, exp, role: 'authenticated', aud: 'authenticated' })}.firma`;
  return { access_token: access, refresh_token: 'refresh-practica', token_type: 'bearer', expires_in: 86400, expires_at: exp, user };
}

function isoDay(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sampleData(preferences) {
  const profile = {
    id: USER_ID, display_name: 'Lucía Quispe', consent_at: '2026-01-01T00:00:00Z', learned_categories: {},
    preferences: { weeklyBudget: 300, highContrast: false, largeText: false, reducedMotion: false, simple: false, audio: false, ...preferences },
  };
  const goals = [
    { id: 'g1', title: 'Laptop para la universidad', owner_id: USER_ID, group_id: null, target_amount: 2500, current_amount: 1450, target_date: isoDay(120), created_at: '2026-02-01T00:00:00Z' },
    { id: 'g2', title: 'Fondo de emergencia', owner_id: USER_ID, group_id: null, target_amount: 1000, current_amount: 180, target_date: isoDay(200), created_at: '2026-03-01T00:00:00Z' },
    { id: 'g3', title: 'Viaje a Cusco', owner_id: USER_ID, group_id: GROUP_ID, target_amount: 1800, current_amount: 1710, target_date: isoDay(60), created_at: '2026-03-10T00:00:00Z' },
    { id: 'g4', title: 'Bicicleta', owner_id: USER_ID, group_id: null, target_amount: 600, current_amount: 0, target_date: isoDay(90), created_at: '2026-04-01T00:00:00Z' },
  ];
  const movement = (id, type, amount, category, description, day, goal = null, group = null) => ({
    id, user_id: USER_ID, type, amount, category, description, occurred_on: isoDay(day), source: 'text', goal_id: goal, group_id: group, reversed_at: null, created_at: `${isoDay(day)}T12:00:00Z`,
  });
  const movements = [
    movement('m1', 'expense', 18.5, 'Alimentación', 'Almuerzo en la universidad', 0),
    movement('m2', 'savings', 100, 'Ahorro', 'Ahorré 100 soles para mi laptop', 0, 'g1'),
    movement('m3', 'income', 450, 'Trabajo', 'Pago de clases particulares', -1),
    movement('m4', 'expense', 3.5, 'Transporte', 'Pasaje', -1),
    movement('m5', 'savings', 60, 'Ahorro', 'Aporte al viaje', -3, 'g3', GROUP_ID),
  ];
  return {
    profile,
    tables: {
      groups: [{ id: GROUP_ID, name: 'Viaje de promoción', created_at: '2026-03-01T00:00:00Z' }],
      goal_progress: goals,
      movements,
      group_members: [{ group_id: GROUP_ID, role: 'admin' }],
      group_invitations: [{ id: 'i1', group_id: GROUP_ID, code: 'JARDIN-2026', expires_at: new Date(Date.now() + 864e5 * 7).toISOString(), revoked_at: null }],
    },
    rpc: {
      my_requests: [],
      group_people: {
        members: [
          { user_id: USER_ID, name: 'Lucía Quispe', role: 'admin' },
          { user_id: 'u2', name: 'Mateo Huamán', role: 'member' },
          { user_id: 'u3', name: 'Valeria Rojas', role: 'member' },
        ],
        requests: [{ id: 'r1', name: 'Diego Flores', status: 'pending' }],
      },
    },
  };
}

async function mockBackend(page, { preferences = {}, signedIn = true } = {}) {
  const data = sampleData(preferences);
  const session = fakeSession();
  if (signedIn) {
    await page.addInitScript(([key, value]) => { try { localStorage.setItem(key, value); } catch {} }, [STORAGE_KEY, JSON.stringify(session)]);
  }
  if (page.routeWebSocket) await page.routeWebSocket(/supabase\.co/, (ws) => { /* sin tiempo real en pruebas */ ws.close(); });
  await page.route(`${SUPABASE}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const path = url.pathname;
    if (path.startsWith('/auth/v1/user')) return json(session.user);
    if (path.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204 });
    if (path.startsWith('/auth/v1/')) return json(session);
    if (path.startsWith('/functions/v1/')) return json({ error: 'Asistente simulado sin conexión.' });
    if (path.startsWith('/rest/v1/rpc/')) {
      const name = path.split('/').pop();
      return json(name in data.rpc ? data.rpc[name] : null);
    }
    if (path.startsWith('/rest/v1/')) {
      const table = path.split('/').pop();
      if (request.method() !== 'GET') return json([], 201);
      if (table === 'profiles') {
        const accept = request.headers()['accept'] || '';
        return json(accept.includes('vnd.pgrst.object') ? data.profile : [data.profile]);
      }
      return json(data.tables[table] || []);
    }
    return json({});
  });
  return data;
}

module.exports = { mockBackend, USER_ID };
