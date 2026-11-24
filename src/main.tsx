import React from 'react';
import ReactDOM from 'react-dom/client';
import { CollaborativeApp } from './live/CollaborativeApp';
import { ErrorBoundary } from './components/ErrorBoundary';
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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CollaborativeApp />
    </ErrorBoundary>
  </React.StrictMode>
);
