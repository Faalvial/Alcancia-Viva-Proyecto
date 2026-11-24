import React from 'react';

const RELOAD_FLAG = 'av-chunk-reload';
const isChunkError = (error: unknown) => /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch dynamically/i.test(String((error as Error)?.message || error));

/**
 * Red de seguridad: si algo falla al dibujar la pantalla, se muestra un aviso amable con
 * salida (recargar o volver al inicio) en vez de una página en blanco. Los registros
 * pendientes siguen guardados en este dispositivo.
 * Si falló la descarga de una parte de la app (p. ej. tras publicar una versión nueva),
 * recarga una sola vez de forma automática.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.error('Alcancía Viva se recuperó de un error de pantalla:', error);
    if (isChunkError(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) { sessionStorage.setItem(RELOAD_FLAG, '1'); location.reload(); }
      } catch { /* sin almacenamiento: se queda el aviso con el botón */ }
    }
  }
  componentDidMount() { window.setTimeout(() => { try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* nada */ } }, 10000); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="av-page av-crash" id="main">
      <div className="av-card" role="alert">
        <h1>Algo no salió como esperábamos</h1>
        <p>Tus datos están a salvo: lo que registraste se guardó o quedó pendiente en este dispositivo. Recarga la página para seguir.</p>
        <div className="av-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" onClick={() => location.reload()}>Recargar la página</button>
          <button type="button" className="av-secondary" onClick={() => location.assign('/')}>Volver al inicio</button>
        </div>
      </div>
    </main>;
  }
}
