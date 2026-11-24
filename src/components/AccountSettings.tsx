import React, { useState } from 'react';
import { KeyRound, LogOut, UserRound } from 'lucide-react';

/** Tu cuenta: nombre visible, contraseña y cierre de sesión. */
export function AccountSettings({ name, email, busy, demo = false, onName, onPassword, onSignOut }: {
  name: string; email?: string; busy: boolean; demo?: boolean;
  onName: (name: string) => Promise<boolean>; onPassword: (password: string) => Promise<boolean>; onSignOut: () => void;
}) {
  const [draft, setDraft] = useState(name);
  const [password, setPassword] = useState(''), [repeat, setRepeat] = useState(''), [problem, setProblem] = useState('');
  async function submitName(event: React.FormEvent) {
    event.preventDefault();
    if (draft.trim() && draft.trim() !== name) await onName(draft.trim());
  }
  async function submitPassword(event: React.FormEvent) {
    event.preventDefault(); setProblem('');
    if (password.length < 8) { setProblem('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== repeat) { setProblem('Las contraseñas no coinciden.'); return; }
    if (await onPassword(password)) { setPassword(''); setRepeat(''); }
  }
  return <section className="av-card av-account" aria-labelledby="av-account-title">
    <h2 id="av-account-title">Tu cuenta</h2>
    {email && <p>Sesión iniciada con <strong translate="no">{email}</strong>.</p>}
    <form className="av-inline-form" onSubmit={submitName}>
      <label>¿Cómo quieres que te llamemos?<input required maxLength={100} autoComplete="name" value={draft} onChange={e => setDraft(e.target.value)} /></label>
      <div className="av-actions av-actions-start"><button type="submit" className="av-with-icon" disabled={busy || !draft.trim() || draft.trim() === name}><UserRound size={24} aria-hidden="true" />Guardar nombre</button></div>
    </form>
    {!demo && <details className="av-password">
      <summary>Cambiar contraseña</summary>
      <form className="av-inline-form" onSubmit={submitPassword}>
        <div className="av-fields">
          <label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label>Repite la contraseña<input type="password" autoComplete="new-password" minLength={8} required value={repeat} onChange={e => setRepeat(e.target.value)} /></label>
        </div>
        {problem && <p role="alert" className="av-error">{problem}</p>}
        <div className="av-actions av-actions-start"><button type="submit" className="av-with-icon" disabled={busy}><KeyRound size={24} aria-hidden="true" />Guardar contraseña</button></div>
      </form>
    </details>}
    <div className="av-actions av-actions-start"><button type="button" className="av-secondary av-with-icon" onClick={onSignOut}><LogOut size={24} aria-hidden="true" />Cerrar sesión</button></div>
  </section>;
}
