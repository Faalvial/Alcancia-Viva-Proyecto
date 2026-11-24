import { vtName } from '../hooks/viewTransition';
import React, { useState } from 'react';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import type { Goal } from '../live/client';
import { localDate, soles } from '../live/domain';
import { amountProblem } from '../live/errors';
import type { PlantKind } from '../live/plants';
import { Modal } from './Modal';
import { PlantPicker } from './PlantPicker';

/**
 * Opciones de una meta: editar nombre, monto objetivo y fecha; cambiar su planta;
 * archivarla (se puede restaurar) o eliminarla si no tiene aportes vigentes.
 */
export function GoalSettings({ goal, kind, busy, onSave, onPlantChange, onArchive, onDelete, onClose }: {
  goal: Goal; kind: PlantKind; busy: boolean;
  onSave: (title: string, amount: number, date: string) => Promise<boolean>;
  onPlantChange: (kind: PlantKind) => void; onArchive: () => void; onDelete: () => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(goal.title), [amount, setAmount] = useState(String(goal.target_amount)), [date, setDate] = useState(goal.target_date);
  const [error, setError] = useState('');
  const hasContributions = goal.current_amount > 0;
  const changed = title.trim() !== goal.title || Number(amount) !== goal.target_amount || date !== goal.target_date;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    const value = Number(amount);
    const problem = !title.trim() ? 'Escribe un nombre para la meta.' : amountProblem(value);
    if (problem) { setError(problem); return; }
    if (await onSave(title.trim(), value, date)) onClose();
  }
  // La fecha puede quedarse como está aunque ya haya pasado; una nueva debe ser futura.
  const minDate = goal.target_date < localDate() ? goal.target_date : localDate();
  return <Modal title="Opciones de la meta" description={`${goal.title} · ${soles(goal.current_amount)} ahorrados`} busy={busy} onClose={onClose} className="av-goal-settings">
    <form onSubmit={submit}>
      <label>Nombre de la meta<input required maxLength={100} autoComplete="off" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <div className="av-fields">
        <label>Monto objetivo (S/)<input type="number" inputMode="decimal" autoComplete="off" min="0.01" max="999999.99" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label>Fecha objetivo<input type="date" required min={minDate} value={date} onChange={e => setDate(e.target.value)} /></label>
      </div>
      {Number(amount) > 0 && Number(amount) < goal.current_amount && <p className="av-note">Ya ahorraste {soles(goal.current_amount)}: con este monto la meta quedará cumplida.</p>}
      {error && <p role="alert" className="av-error">{error}</p>}
      <div className="av-actions"><button type="submit" disabled={busy || !changed}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>
    <PlantPicker legend="Tipo de planta" value={kind} onChange={onPlantChange} disabled={busy} />
    <section className="av-danger-zone" aria-labelledby="av-goal-end">
      <h3 id="av-goal-end">¿Ya no quieres esta meta?</h3>
      <p><strong>Archivar</strong> la quita del jardín y conserva sus aportes; puedes restaurarla cuando quieras desde «Metas archivadas».</p>
      <div className="av-actions av-actions-start">
        <button type="button" className="av-secondary av-with-icon" disabled={busy} onClick={onArchive}><Archive size={24} aria-hidden="true" />Archivar meta</button>
        <button type="button" className="av-secondary av-danger-outline av-with-icon" disabled={busy || hasContributions} aria-describedby="av-goal-delete-help" onClick={onDelete}><Trash2 size={24} aria-hidden="true" />Eliminar meta</button>
      </div>
      <p id="av-goal-delete-help" className="av-note">{hasContributions ? 'Para eliminarla no debe tener aportes vigentes: así tu historial de ahorro no se pierde. Puedes archivarla.' : 'Eliminar la borra para siempre; no tiene aportes vigentes.'}</p>
    </section>
  </Modal>;
}

/** Metas archivadas: fuera del jardín, con sus aportes intactos. */
export function ArchivedGoals({ goals, busy, canManage, onRestore, onDelete }: {
  goals: Goal[]; busy: boolean; canManage: (goal: Goal) => boolean; onRestore: (goal: Goal) => void; onDelete: (goal: Goal) => void;
}) {
  if (!goals.length) return null;
  return <details className="av-card av-archived">
    <summary>Metas archivadas ({goals.length})</summary>
    <p>No aparecen en el jardín ni al registrar ahorros. Sus aportes siguen en tu historial.</p>
    <ul className="av-archived-list">{goals.map(goal => <li key={goal.id} className="av-archived-item" style={{ viewTransitionName: vtName('goal', goal.id) } as React.CSSProperties}>
      <div><strong>{goal.title}</strong><span>{soles(goal.current_amount)} de {soles(goal.target_amount)}</span></div>
      {canManage(goal) && <div className="av-actions av-actions-start">
        <button type="button" className="av-secondary av-with-icon" disabled={busy} onClick={() => onRestore(goal)} aria-label={`Restaurar ${goal.title}`}><ArchiveRestore size={24} aria-hidden="true" />Restaurar</button>
        {goal.current_amount <= 0 && <button type="button" className="av-secondary av-danger-outline av-with-icon" disabled={busy} onClick={() => onDelete(goal)} aria-label={`Eliminar ${goal.title} para siempre`}><Trash2 size={24} aria-hidden="true" />Eliminar</button>}
      </div>}
    </li>)}</ul>
  </details>;
}
