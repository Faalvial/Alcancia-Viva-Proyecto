import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Mismo valor por defecto que src/live/client.ts.
const DEFAULT_SUPABASE_URL = 'https://haqdsmtildbcubvtitfk.supabase.co';

/** Adelanta la conexión TLS con Supabase (el inicio de sesión la necesita enseguida). */
function preconnectSupabase(url: string): Plugin {
  return {
    name: 'preconnect-supabase',
    transformIndexHtml: () => [{ tag: 'link', attrs: { rel: 'preconnect', href: new URL(url).origin, crossorigin: '' }, injectTo: 'head-prepend' }],
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss(), preconnectSupabase(env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL)],
    server: {
      host: true,
      port: 5173,
    },
    build: {
      rollupOptions: {
        output: {
          // Librerías en archivos propios: cambian poco y el navegador las guarda entre versiones.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@supabase')) return 'supabase';
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
            return undefined;
          },
        },
      },
    },
  };
});
