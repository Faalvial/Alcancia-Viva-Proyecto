import React, { useState } from 'react';
import { DoorOpen, Pencil, ShieldCheck, ShieldOff, UserMinus, XCircle } from 'lucide-react';
import type { Group, Member } from '../live/client';
import { UserAvatar } from './UserAvatar';

/**
 * Gestión de un grupo. Todos pueden salir; el administrador además renombra, cambia
 * roles, quita integrantes y cierra el grupo. Las reglas finales las valida el servidor
 * (por ejemplo, el grupo siempre conserva un administrador).
 */
export function GroupManager({ group, members, userId, admin, busy, onRename, onRole, onRemove, onLeave, onClose }: {
  group: Group; members: Member[]; userId: string; admin: boolean; busy: boolean;
  onRename: (name: string) => Promise<boolean>; onRole: (member: Member, role: 'admin' | 'member') => void;
  onRemove: (member: Member) => void; onLeave: () => void; onClose: () => void;
}) {
  const [editing, setEditing] = useState(false), [name, setName] = useState(group.name);
  const admins = members.filter(m => m.role === 'admin').length;
  const soleAdmin = admin && admins <= 1 && members.length > 1;
  async function rename(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || name.trim() === group.name) { setEditing(false); return; }
    if (await onRename(name.trim())) setEditing(false);
  }
  return <div className="av-group-manager">
    {admin && (editing
      ? <form className="av-inline-form" onSubmit={rename}>
          <label>Nuevo nombre del grupo<input required maxLength={100} autoComplete="off" value={name} onChange={e => setName(e.target.value)} /></label>
          <div className="av-actions av-actions-start"><button type="submit" disabled={busy}>Guardar nombre</button><button type="button" className="av-secondary" onClick={() => { setName(group.name); setEditing(false); }}>Cancelar</button></div>
        </form>
      : <button type="button" className="av-secondary av-with-icon" disabled={busy} onClick={() => setEditing(true)}><Pencil size={24} aria-hidden="true" />Cambiar nombre</button>)}
    <h3>Integrantes</h3>
    <ul className="av-member-list">{members.map(member => {
      const self = member.user_id === userId;
      return <li key={member.user_id} className="av-member">
        <UserAvatar name={member.name} />
        <span className="av-member-name"><strong>{member.name}{self ? ' (tú)' : ''}</strong><small>{member.role === 'admin' ? 'Administrador' : 'Miembro'}</small></span>
        {admin && !self && <span className="av-member-actions">
          {member.role === 'admin'
            ? <button type="button" className="av-secondary av-with-icon" disabled={busy} onClick={() => onRole(member, 'member')} aria-label={`Quitar la administración a ${member.name}`}><ShieldOff size={20} aria-hidden="true" />Quitar admin.</button>
            : <button type="button" className="av-secondary av-with-icon" disabled={busy} onClick={() => onRole(member, 'admin')} aria-label={`Hacer administrador a ${member.name}`}><ShieldCheck size={20} aria-hidden="true" />Hacer admin.</button>}
          <button type="button" className="av-secondary av-danger-outline av-with-icon" disabled={busy} onClick={() => onRemove(member)} aria-label={`Quitar a ${member.name} del grupo`}><UserMinus size={20} aria-hidden="true" />Quitar</button>
        </span>}
      </li>;
    })}</ul>
    <section className="av-danger-zone" aria-label="Salir o cerrar el grupo">
      <div className="av-actions av-actions-start">
        <button type="button" className="av-secondary av-with-icon" disabled={busy || soleAdmin} aria-describedby={soleAdmin ? 'av-leave-help' : undefined} onClick={onLeave}><DoorOpen size={24} aria-hidden="true" />Salir del grupo</button>
        {admin && <button type="button" className="av-secondary av-danger-outline av-with-icon" disabled={busy} onClick={onClose}><XCircle size={24} aria-hidden="true" />Cerrar grupo</button>}
      </div>
      {soleAdmin && <p id="av-leave-help" className="av-note">Eres el único administrador: antes de salir, nombra a otra persona como administradora.</p>}
      {admin && <p className="av-note">Cerrar el grupo lo retira para todos y archiva sus metas. Los aportes siguen en el historial de cada persona.</p>}
    </section>
  </div>;
}
