import { flushSync } from 'react-dom';

type Direction = 'forward' | 'back' | 'none';

/**
 * Aplica un cambio de estado dentro de una View Transition (si el navegador la soporta y
 * no hay movimiento reducido): las tarjetas y plantas con `view-transition-name` se
 * desplazan a su nuevo lugar y las vistas se funden/deslizan. Sin soporte, el cambio es
 * inmediato, igual que antes. La dirección se expone en <html data-vt> para el CSS.
 */
export function withTransition(update: () => void, { enabled, direction = 'none' }: { enabled: boolean; direction?: Direction }) {
  const doc = typeof document !== 'undefined' ? document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } } : null;
  if (!enabled || !doc?.startViewTransition || doc.visibilityState === 'hidden') { update(); return; }
  doc.documentElement.dataset.vt = direction;
  try {
    const transition = doc.startViewTransition(() => flushSync(update));
    transition.finished.finally(() => { delete doc.documentElement.dataset.vt; }).catch(() => {});
  } catch {
    delete doc.documentElement.dataset.vt;
    update();
  }
}

/** Nombre válido para view-transition-name a partir de un id (los UUID pueden empezar con un dígito). */
export const vtName = (prefix: string, id: string) => `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
