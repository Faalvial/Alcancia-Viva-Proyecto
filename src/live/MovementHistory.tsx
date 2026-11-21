import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { rpc } from './client';
import type { Member, Profile, Snapshot } from './client';
import { localDate, soles } from './domain';
import { filterMovements, groupByDay } from './timeline';
import type { TypeFilter } from './timeline';
import { MOVEMENT_META, MovementTypeIcon } from '../components/MovementTypeIcon';
import { EmptyState } from '../components/EmptyState';
import { canUndoMovement, contributorName, contributionTotals, historyForSpace } from './history';
import type { ContributorDirectory } from './history';
import './history.css';

const filters:{id:TypeFilter;label:string}[]=[{id:'all',label:'Todos'},{id:'expense',label:'Gastos'},{id:'income',label:'Ingresos'},{id:'savings',label:'Ahorros'}];
export function MovementHistory({snapshot,profile,scope,busy,onUndo,onRegister}:{snapshot:Snapshot;profile:Profile;scope:string;busy:boolean;onUndo:(id:string)=>Promise<void>;onRegister?:()=>void}) {
  const [directory,setDirectory]=useState<ContributorDirectory>({});
  const [loading,setLoading]=useState(true),[namesUnavailable,setNamesUnavailable]=useState(false);
  const [typeFilter,setTypeFilter]=useState<TypeFilter>('all'),[query,setQuery]=useState('');
  const movements=historyForSpace(snapshot.movements,profile.id,scope);
  const group=snapshot.groups.find(g=>g.id===scope),overview=scope==='all';
  useEffect(()=>{
    let alive=true;
    const relevant=historyForSpace(snapshot.movements,profile.id,scope);
    const allowedGroups=new Set(snapshot.groups.map(g=>g.id));
    const groupIds=[...new Set(relevant.map(m=>m.group_id).filter((id):id is string=>typeof id==='string'&&allowedGroups.has(id)))];
    setLoading(groupIds.length>0);setNamesUnavailable(false);
    setDirectory(previous=>Object.fromEntries(groupIds.map(id=>[id,previous[id]||{}])));
    Promise.allSettled(groupIds.map(async groupId=>({groupId,people:await rpc<{members:Member[]}>('group_people',{p_group:groupId})}))).then(results=>{
      if(!alive)return;
      const next:ContributorDirectory={};
      for(const result of results)if(result.status==='fulfilled')next[result.value.groupId]=Object.fromEntries((result.value.people.members||[]).map(member=>[member.user_id,member.name]));
      setDirectory(next);setNamesUnavailable(results.some(result=>result.status==='rejected'));setLoading(false);
    });
    return()=>{alive=false;};
  },[snapshot,scope,profile.id]);
  const totals=contributionTotals(movements);
  const visible=filterMovements(movements,typeFilter,query,snapshot.goals);
  const days=groupByDay(visible,localDate());
  const groupName=(id:string)=>snapshot.groups.find(g=>g.id===id)?.name||'Grupo compartido';
  return <section className="av-history" aria-label="Historial de movimientos">
    <h1>{group?'Aportes del grupo':overview?'Movimientos de tus espacios':'Mis movimientos'}</h1>
    <p>{group?'Consulta quién aportó, cuánto y a qué meta.':'Consulta tus registros y los aportes de tus grupos.'} Los movimientos revertidos se conservan en el historial.</p>
    {namesUnavailable&&<p className="av-notice" role="status">No pudimos cargar algunos nombres. Los importes del historial se mantienen visibles; vuelve a abrir Movimientos para reintentar.</p>}
    {(group||overview)&&totals.length>0&&<section className="av-card av-contribution-summary" aria-labelledby="av-contribution-summary-title">
      <h2 id="av-contribution-summary-title">{overview?'Aportes por integrante y grupo':'Aportes por integrante'}</h2><p>Totales vigentes: no incluyen movimientos revertidos.</p>
      <dl>{totals.map(row=><div key={row.key}><dt><strong>{contributorName(row,profile,directory,loading)}</strong>{overview&&<span>{groupName(row.group_id)}</span>}</dt><dd><strong>{soles(row.total)}</strong><span>{row.count} aporte{row.count===1?'':'s'} vigente{row.count===1?'':'s'}</span></dd></div>)}</dl>
    </section>}
    {movements.length>0&&<div className="av-history-tools">
      <div className="av-chips" role="group" aria-label="Filtrar por tipo">{filters.map(f=><button key={f.id} type="button" className={`av-secondary av-chip ${f.id!=='all'?`av-tone-${MOVEMENT_META[f.id].tone}`:''}`} aria-pressed={typeFilter===f.id} onClick={()=>setTypeFilter(f.id)}>{f.id!=='all'&&<MovementTypeIcon type={f.id} size={20} className="av-chip-icon"/>}{f.label}</button>)}</div>
      <label className="av-search"><span>Buscar en movimientos</span><span className="av-search-field"><Search size={20} aria-hidden="true"/><input type="search" autoComplete="off" spellCheck={false} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ej.: almuerzo, laptop, transporte…" maxLength={100}/></span></label>
      <p className="av-history-count" role="status" aria-live="polite">{visible.length===movements.length?`${movements.length} movimiento${movements.length===1?'':'s'}`:`${visible.length} de ${movements.length} movimientos`}</p>
    </div>}
    {days.map(day=><section className="av-day" key={day.day} aria-labelledby={`av-day-${day.day}`}>
      <h2 id={`av-day-${day.day}`} className="av-day-title">{day.label}</h2>
      <ol className="av-timeline">{day.items.map(m=>{const meta=MOVEMENT_META[m.type];const goal=m.goal_id?snapshot.goals.find(g=>g.id===m.goal_id)?.title||'Meta registrada':'';return <li className={`av-card av-movement av-tone-${meta.tone} ${m.reversed_at?'av-movement-reversed':''}`} key={m.id}>
        <MovementTypeIcon type={m.type}/>
        <div className="av-movement-body">
          <h3><span className="av-movement-kind">{meta.name}</span> {m.description||(m.type==='savings'?goal:m.category)}</h3>
          <p className="av-movement-meta">{m.goal_id?`Meta: ${goal}`:`Categoría: ${m.category}`}{overview&&m.group_id?` · Grupo: ${groupName(m.group_id)}`:''}</p>
          {(m.group_id||group)&&<p className="av-movement-author">{m.type==='savings'?'Aportó':'Registrado por'}: <strong>{contributorName(m,profile,directory,loading)}</strong></p>}
          {m.reversed_at&&<p className="av-reversed-badge"><strong>Revertido</strong> · No se suma al total vigente.</p>}
        </div>
        <div className="av-movement-side">
          <strong className="av-movement-amount"><span className="av-sr-only">{meta.name} de </span>{soles(m.amount)}</strong>
          {canUndoMovement(m,profile.id)&&<button className="av-secondary" disabled={busy} onClick={()=>onUndo(m.id)} aria-label={`Deshacer ${meta.name.toLowerCase()} de ${soles(m.amount)}`}>Deshacer</button>}
        </div>
      </li>;})}</ol>
    </section>)}
    {movements.length>0&&!visible.length&&<p className="av-notice">No hay movimientos con ese filtro. Prueba con otra palabra o elige «Todos».</p>}
    {!movements.length&&<EmptyState title="Tu historial empieza aquí" text="Cada gasto, ingreso o ahorro que registres aparecerá en esta línea de tiempo, agrupado por día." action={onRegister?{label:'Registrar movimiento',onClick:onRegister,icon:<Plus size={24} aria-hidden="true"/>}:undefined}/>}
  </section>;
}
