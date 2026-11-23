import React from 'react';
import ReactDOM from 'react-dom/client';
import { CollaborativeApp } from './live/CollaborativeApp';
import './index.css';
import { initTheme } from './hooks/useTheme';

initTheme();

// Registro de Service Worker para PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registrado exitosamente:', registration.scope);
      })
      .catch((err) => {
        console.log('Fallo en registro de SW:', err);
      });
  });
}

const container=document.getElementById('root') as HTMLElement;
// Con el acceso prerenderizado (scripts/prerender-auth.mjs) se hidrata en lugar de repintar:
// el navegador conserva la imagen y el título ya pintados. Sin él, render normal.
const prerendered=container.dataset.prerendered!==undefined&&container.childElementCount>0;
const app=<React.StrictMode><CollaborativeApp prerendered={prerendered}/></React.StrictMode>;
if(prerendered)ReactDOM.hydrateRoot(container,app);
else ReactDOM.createRoot(container).render(app);
