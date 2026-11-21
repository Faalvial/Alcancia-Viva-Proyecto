import type { Goal, Group, Member } from '../live/client';
import { gardenNumber, goalPercent } from '../live/garden';
import { Plant } from '../live/GardenView';
import { avatarStack } from '../live/timeline';
import { SeedPot } from './EmptyState';
import { initialOf } from './UserAvatar';

/** Tarjeta de grupo: maceta de la meta más avanzada, rol y avatares de iniciales (máx. 4 + «+N»). */
export function GroupCard({group,role,members,goals,selected,onSelect}:{group:Group;role:string;members:Member[];goals:Goal[];selected:boolean;onSelect:()=>void}) {
  const best=[...goals].sort((a,b)=>goalPercent(b)-goalPercent(a))[0];
  const {shown,extra}=avatarStack(members);
  return <button type="button" className="av-secondary av-group-card" aria-pressed={selected} onClick={onSelect}>
    <span className="av-group-art" aria-hidden="true">{best?<Plant percent={goalPercent(best)}/>:<SeedPot/>}</span>
    <span className="av-group-info">
      <strong className="av-group-name">{group.name}</strong>
      <span className="av-group-role">{role==='admin'?'Administrador':'Miembro'}</span>
      <span className="av-group-goal">{best?`${best.title}: ${gardenNumber(goalPercent(best))} %`:'Aún sin metas compartidas'}</span>
      {members.length>0&&<span className="av-avatars" aria-hidden="true">{shown.map(member=><span className="av-avatar av-avatar-sm" key={member.user_id}>{initialOf(member.name)}</span>)}{extra>0&&<span className="av-avatar av-avatar-sm av-avatar-more">+{extra}</span>}</span>}
      {members.length>0&&<span className="av-sr-only">{members.length} integrante{members.length===1?'':'s'}: {members.map(member=>member.name).join(', ')}.</span>}
    </span>
  </button>;
}
