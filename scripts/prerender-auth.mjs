// Prerenderiza la pantalla de acceso dentro de dist/index.html (se ejecuta tras `vite build`).
//
// Así la imagen y el título del acceso se pintan sin esperar al JavaScript (mejor LCP en
// móviles). El marcado prerenderizado va `inert` (no se puede usar hasta que React toma el
// control) y React lo hidrata (reutiliza el mismo HTML), así que no hay saltos ni repintado.
// Si hay sesión o se viene de un enlace de recuperación, un script lo borra antes de pintar.
import { build } from 'esbuild';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'node_modules', '.prerender', 'auth.mjs');

// Entorno mínimo de navegador para los módulos que lo leen al importarse.
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } }; };
globalThis.window = globalThis;
globalThis.location = new URL('https://alcancia-viva.invalid/');
globalThis.localStorage = memory();
globalThis.sessionStorage = memory();

await build({
  stdin: {
    contents: "import { renderToString } from 'react-dom/server'; import { createElement } from 'react'; import { Auth } from './src/live/CollaborativeApp.tsx'; export const html = renderToString(createElement(Auth));",
    resolveDir: root, loader: 'tsx', sourcefile: 'prerender-entry.tsx',
  },
  bundle: true, platform: 'node', format: 'esm', outfile: out, jsx: 'automatic', logLevel: 'error',
  loader: { '.css': 'empty' },
  define: { 'import.meta.env.VITE_SUPABASE_URL': 'undefined', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': 'undefined', 'import.meta.env.VITE_SUPABASE_ANON_KEY': 'undefined', 'import.meta.env.VITE_SPEECH_LANG': 'undefined', 'import.meta.env.VITE_VOICE_TRANSCRIBE': 'undefined', 'import.meta.env.PROD': 'true' },
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
});
const { html } = await import(pathToFileURL(out).href);
await rm(path.dirname(out), { recursive: true, force: true });

const file = path.join(root, 'dist', 'index.html');
let page = await readFile(file, 'utf8');
if (!page.includes('<div id="root"></div>')) throw new Error('No se encontró <div id="root"></div> en dist/index.html');
const clearIfNeeded = "<script>try{var r=document.getElementById('root'),h=location.hash+location.search;if(Object.keys(localStorage).some(function(k){return /^sb-.*-auth-token$/.test(k)})||/type=recovery|access_token|code=|error_description/.test(h))r.innerHTML='';}catch(e){}</script>";
// React 19 antepone pistas de precarga (<link>) que ya están en <head>: se quitan para que el
// contenido coincida exactamente con lo que hidrata src/main.tsx.
const markup = html.replace(/^(<link [^>]*\/>)+/, '');
const clear = clearIfNeeded.replace("r.innerHTML='';", "{r.innerHTML='';r.removeAttribute('data-prerendered');}");
page = page.replace('<div id="root"></div>', `<div id="root" inert data-prerendered>${markup}</div>${clear}`);
await writeFile(file, page);
console.log(`Acceso prerenderizado en dist/index.html (${Math.round(html.length / 1024)} KB de HTML).`);
