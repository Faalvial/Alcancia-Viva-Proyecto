import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * Diálogo modal nativo (<dialog> con showModal): atrapa el foco, Escape lo cierra y al
 * cerrarse devuelve el foco al elemento que lo abrió. Usa las mismas reglas visuales que
 * el registro de movimientos (.av-dialog: hoja inferior en móvil, centrado en escritorio).
 */
export function Modal({ title, description, onClose, busy = false, children, className = '' }: {
  title: string; description?: string; onClose: () => void; busy?: boolean; children: React.ReactNode; className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId(), descId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    if (node && !node.open) {
      try { node.showModal(); } catch { node.setAttribute('open', ''); }
      // Foco en el primer campo; si no hay, en el título (lectores de pantalla lo anuncian).
      const field = node.querySelector<HTMLElement>('input:not([type="hidden"]),select,textarea');
      (field || node.querySelector<HTMLElement>('h2'))?.focus();
    }
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className={`av-dialog av-modal ${className}`} aria-labelledby={titleId} aria-describedby={description ? descId : undefined}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="av-dialog-title"><h2 id={titleId} tabIndex={-1}>{title}</h2>
      <button type="button" className="av-secondary" onClick={onClose} disabled={busy} aria-label={`Cerrar: ${title}`}>Cerrar</button></div>
    {description && <p id={descId}>{description}</p>}
    {children}
  </dialog>;
}

export interface ConfirmOptions { title: string; text: string; confirm: string; cancel?: string; danger?: boolean; }

/**
 * Confirmación accesible con promesa, en lugar de window.confirm:
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (await confirm({...})) …
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => setRequest({ ...options, resolve })), []);
  const answer = (ok: boolean) => { request?.resolve(ok); setRequest(null); };
  const element = request && <Modal title={request.title} onClose={() => answer(false)} className="av-confirm">
    <p>{request.text}</p>
    <div className="av-actions">
      <button type="button" className="av-secondary" onClick={() => answer(false)}>{request.cancel || 'Cancelar'}</button>
      <button type="button" className={request.danger ? 'av-danger' : ''} onClick={() => answer(true)}>{request.confirm}</button>
    </div>
  </Modal>;
  return [confirm, element];
}
