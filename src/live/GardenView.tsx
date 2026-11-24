import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Goal, Group, Preferences } from './client';
import { soles } from './domain';
import { gardenNumber, goalPercent, growthStage, gardenSummary, goalPace, goalDateLabel } from './garden';
import { SpeechService } from '../services/voice/speechService';
import { goalRemaining } from './timeline';
import { GoalRing } from '../components/GoalRing';
import { usePreviousStage } from '../hooks/usePreviousStage';
import { useCountUp } from '../hooks/useCountUp';
import { SlidersHorizontal } from 'lucide-react';
import { PlantArt } from '../components/PlantArt';
import { PlantPicker } from '../components/PlantPicker';
import { speciesOf } from './plants';
import { vtName } from '../hooks/viewTransition';
import type { PlantKind } from './plants';
import './garden.css';

function StageSprite({stage,index,kind,className=''}:{stage:number;index:number;kind:PlantKind;className?:string}) {
  if(kind!=='cosmos')return <PlantArt kind={kind} stage={stage} className={`ag-stage ${className}`} style={{'--ag-delay':`${index*-.85}s`} as React.CSSProperties}/>;
  const style={'--ag-position':`${[0,50,100][stage%3]}% ${stage<3?0:100}%`,'--ag-delay':`${index*-.85}s`} as React.CSSProperties;
  return <span className={`ag-stage ${stage<3?'ag-top-row':''} ${className}`} style={style}><span className="ag-vessel"/><span className="ag-foliage"/></span>;
}
/** Maceta con el sprite de su etapa; al subir de etapa hace un fundido cruzado con escala (600 ms). */
export function Plant({percent,index=0,kind='cosmos',vt}:{percent:number;index?:number;kind?:PlantKind;vt?:string}) {
  const stage=growthStage(percent);
  const transition=usePreviousStage(stage);
  return <span className={`ag-plant ${transition?'ag-plant-growing':''}`} aria-hidden="true" style={vt?{viewTransitionName:vt} as React.CSSProperties:undefined}>
    {transition&&<StageSprite key={`out-${transition.key}`} stage={transition.from} index={index} kind={kind} className="ag-stage-out"/>}
    <StageSprite key={transition?`in-${transition.key}`:`stage-${kind}`} stage={stage} index={index} kind={kind} className={transition?'ag-stage-in':''}/>
  </span>;
}

const PETAL_COLORS=['var(--c-stage-4)','var(--c-stage-5)','var(--c-ingreso-soft)','var(--c-stage-1)','var(--c-gasto-soft)'];
/**
 * Lluvia de pétalos (16) cuando una meta llega al 100 %. Es una capa fija sobre la
 * pantalla (portal en .av-app) para que se vea aunque el foco haya vuelto al botón de
 * aporte, debajo de la escena en pantallas estrechas. Se omite con movimiento reducido.
 */
function PetalRain() {
  const host=document.querySelector('.av-app')||document.body;
  return createPortal(<span className="ag-petals" aria-hidden="true">{Array.from({length:16},(_,i)=>{
    const style={'--x':`${(i*37+11)%96}%`,'--delay':`${(i%6)*0.11}s`,'--drift':`${(i%2?1:-1)*(12+(i*7)%28)}px`,'--spin':`${(i%3-1)*220+180}deg`,'--petal':PETAL_COLORS[i%PETAL_COLORS.length],'--size':`${12+(i*5)%9}px`} as React.CSSProperties;
    return <i key={i} style={style}/>;
  })}</span>,host);
}
const groupLabel=(goal:Goal,groups:Group[])=>goal.group_id?`Grupo · ${groups.find(group=>group.id===goal.group_id)?.name||'Compartido'}`:'Personal';
interface GardenProps {
  goals:Goal[]; groups:Group[]; selectedId:string; today:string; prefs:Preferences;
  onSelect:(id:string)=>void; onContribute:(goal:Goal)=>void; onCreate:()=>void;
  watering:{goalId:string;nonce:number}|null;
  celebration?:{goalId:string;nonce:number}|null;
  plantKinds?:Record<string,PlantKind>;
  onPlantChange?:(goalId:string,kind:PlantKind)=>void;
  /** Abre las opciones de la meta (solo si el usuario puede gestionarla). */
  onOptions?:(goal:Goal)=>void;
  canManage?:(goal:Goal)=>boolean;
}
export function Garden({goals,groups,selectedId,today,prefs,onSelect,onContribute,onCreate,watering,celebration=null,plantKinds={},onPlantChange,onOptions,canManage}:GardenProps) {
  const [paused,setPaused]=useState(false),[systemReduced,setSystemReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setSystemReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  const selected=goals.find(goal=>goal.id===selectedId)||goals[0];
  const summary=gardenSummary(goals),value=selected?goalPercent(selected):0;
  const kindOf=(goal:Goal|undefined)=>(goal&&plantKinds[goal.id])||'cosmos';
  const species=speciesOf(kindOf(selected)),stageIndex=growthStage(value);
  const stage={name:species.stages[stageIndex],message:species.messages[stageIndex]},rhythm=selected?goalPace(selected,today):null;
  const page=Math.max(0,Math.floor(goals.findIndex(goal=>goal.id===selected?.id)/8));
  const visible=goals.slice(page*8,page*8+8);
  const reduced=prefs.reducedMotion||systemReduced,stopped=paused||reduced;
  const savedShown=useCountUp(selected?.current_amount||0,{enabled:!reduced,resetKey:selected?.id||''});
  function speakGarden(){
    const text=`${summary.label}. ${summary.count} metas con un avance promedio de ${gardenNumber(summary.percent)} por ciento. ${selected?`${selected.title}: ${soles(selected.current_amount)} de ${soles(selected.target_amount)}. ${stage.name}. ${rhythm?.label}. ${rhythm?.message}`:'Crea tu primera meta para plantar una nueva maceta.'}`;
    SpeechService.speak(text);
  }
  return <section className={`av-garden-live ${stopped?'ag-paused':''}`} aria-label="Jardín de tus metas">
    <div className="ag-intro"><div><p className="ag-eyebrow">UN ESPACIO PARA VERTE CRECER</p><h1>Cada meta, una nueva raíz.</h1><p>Elige una maceta y descubre la historia de su crecimiento.</p></div><div className="ag-controls">
      <button className="av-secondary" onClick={()=>setPaused(!paused)} aria-pressed={stopped} disabled={reduced}>{reduced?'Movimiento reducido':paused?'Reanudar movimiento':'Pausar movimiento'}</button>
      <button className="av-secondary" onClick={speakGarden} disabled={!SpeechService.isSynthesisSupported()}>Escuchar jardín</button>
    </div></div>
    <div className="ag-layout"><div className="ag-garden-column">
      <div className="ag-scene" style={{'--ag-saturation':.85+summary.percent*.003} as React.CSSProperties}>
        {celebration&&!reduced&&<PetalRain key={celebration.nonce}/>}
        <div className="ag-scene-heading"><span>EL JARDÍN DE TUS METAS</span><p>{summary.label}</p></div>
        <div className="ag-pots" role="group" aria-label="Macetas de tus metas">
          {visible.map((goal,index)=>{const amount=goalPercent(goal),kind=speciesOf(kindOf(goal)),phase={name:kind.stages[growthStage(amount)]};return <button type="button" className="ag-pot" key={goal.id} data-goal={goal.id} aria-pressed={goal.id===selected?.id} aria-controls="av-garden-detail" aria-label={`${goal.title}. ${groupLabel(goal,groups)}. ${gardenNumber(amount)} por ciento. ${kind.name}, ${phase.name}. Ver estado.`} onClick={()=>onSelect(goal.id)}>
            <Plant percent={amount} index={index} kind={kind.id} vt={vtName('plant',goal.id)}/><span className="ag-plant-label"><strong>{goal.title}</strong><small>{groupLabel(goal,groups)}</small><b>{gardenNumber(amount)} %</b></span>
            {watering?.goalId===goal.id&&!stopped&&<span key={watering.nonce} className="ag-watering" aria-hidden="true">{[0,1,2,3,4,5].map(i=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</span>}
          </button>;})}
          {!goals.length&&<div className="ag-empty"><p>Aquí crecerá tu próxima meta.</p><button onClick={onCreate}>Plantar mi primera meta</button></div>}
        </div>
        <div className="ag-scene-foot"><span>Cada maceta representa una meta</span><span>{goals.length>8?`${page*8+1}–${Math.min((page+1)*8,goals.length)} de ${goals.length}`:`${goals.length} maceta${goals.length===1?'':'s'}`}</span></div>
      </div>
      {goals.length>8&&<div className="ag-pages"><button className="av-secondary" disabled={page===0} onClick={()=>onSelect(goals[(page-1)*8].id)}>Anteriores</button><span>Página {page+1} de {Math.ceil(goals.length/8)}</span><button className="av-secondary" disabled={(page+1)*8>=goals.length} onClick={()=>onSelect(goals[(page+1)*8].id)}>Siguientes</button></div>}
      <div className="ag-summary"><div className="ag-average" style={{'--ag-average':`${summary.percent}%`} as React.CSSProperties}><strong>{gardenNumber(summary.percent)} %</strong></div><div><h2>Tu jardín, en conjunto</h2><p>Promedio de {summary.count} meta{summary.count===1?'':'s'} de este espacio. Cada una tiene el mismo peso.</p></div><span className="ag-achievement">{summary.completed} meta{summary.completed===1?'':'s'} florecida{summary.completed===1?'':'s'}</span></div>
      <div className="ag-add"><button className="av-secondary" onClick={onCreate}>＋ Crear una meta</button></div>
    </div>
    {selected&&rhythm&&<section id="av-garden-detail" className="ag-detail" style={{viewTransitionName:'garden-detail'} as React.CSSProperties} aria-labelledby="av-garden-goal-title">
      <div className="ag-detail-top"><span className="ag-eyebrow">TU MACETA SELECCIONADA</span><span className="ag-type">{groupLabel(selected,groups)}</span>{onOptions&&(!canManage||canManage(selected))&&<button type="button" className="av-secondary av-with-icon ag-options" onClick={()=>onOptions(selected)} aria-label={`Opciones de ${selected.title}`}><SlidersHorizontal size={20} aria-hidden="true"/>Opciones</button>}</div>
      <h2 id="av-garden-goal-title">{selected.title}</h2><p className="ag-stage-name">{stage.name}</p>
      <div className="ag-money"><strong>{soles(savedShown)}</strong><span>de {soles(selected.target_amount)}</span></div>
      <div className="ag-progress-title"><span>Tu avance</span><strong>{gardenNumber(value)} %</strong></div><progress max={100} value={value} aria-label={`Avance de ${selected.title}`}/>
      <p className="ag-growth-copy">{prefs.simple?`${gardenNumber(value)} % de tu meta. Cada aporte cuenta.`:stage.message}</p>
      <div className={`ag-pace ${rhythm.kind==='review'?'ag-review':''}`}><span className="ag-pace-icon" aria-hidden="true">{rhythm.kind==='complete'?'✓':rhythm.kind==='review'?'↻':'↗'}</span><div><strong>{rhythm.label}</strong><p>{prefs.simple?(rhythm.kind==='review'?'Puedes ajustar el plan. Tu ahorro se conserva.':rhythm.kind==='complete'?'¡Meta conseguida!': 'Cada aporte cuenta.'):rhythm.message}</p></div></div>
      <dl className="ag-deadline"><div><dt>Fecha objetivo</dt><dd>{goalDateLabel(selected.target_date)}</dd></div><div><dt>Tiempo transcurrido</dt><dd>{rhythm.expected===null?'Sin referencia de plazo':`${gardenNumber(rhythm.expected)} % del plazo`}</dd></div></dl>
      <button className="ag-contribute" onClick={()=>onContribute(selected)}>Registrar un aporte <span aria-hidden="true">↗</span></button>
      <p className="ag-confirm-help">El aporte irá a <strong>{selected.title}</strong>. Revisarás el monto antes de guardarlo.</p>
      {onPlantChange&&<PlantPicker key={selected.id} legend="Tipo de planta" value={kindOf(selected)} onChange={kind=>onPlantChange(selected.id,kind)}/>}
    </section>}
    </div>
    <p className="ag-sr-only" role="status" aria-live="polite">{selected?`Maceta seleccionada: ${selected.title}. ${gardenNumber(value)} por ciento. ${stage.name}. ${rhythm?.label}.`:'Aún no hay metas en este espacio.'}</p>
  </section>;
}

export function GoalCard({goal,groups,today,onView,onContribute,kind='cosmos',onOptions}:{goal:Goal;groups:Group[];today:string;onView:()=>void;onContribute:()=>void;kind?:PlantKind;onOptions?:()=>void}) {
  const value=goalPercent(goal),stageIndex=growthStage(value),phase={name:speciesOf(kind).stages[stageIndex]},remaining=goalRemaining(goal);
  return <article className={`av-goal-card av-stage-${stageIndex}`} style={{viewTransitionName:vtName('goal',goal.id)} as React.CSSProperties}><div className="ag-card-art"><Plant percent={value} kind={kind} vt={vtName('plant',goal.id)}/><span className="ag-card-type">{groupLabel(goal,groups)}</span><GoalRing percent={value} stage={stageIndex} label={`${gardenNumber(value)} %`}/></div><div className="ag-card-body"><h2>{goal.title}</h2><p>{soles(goal.current_amount)} de {soles(goal.target_amount)}</p><p className="av-goal-remaining">{remaining>0?`Te faltan ${soles(remaining)}`:`Meta completa: ${speciesOf(kind).stages[5].toLocaleLowerCase('es-PE')}.`}</p><div className="ag-progress-title"><span>{phase.name}</span><strong>{gardenNumber(value)} %</strong></div><progress max={100} value={value} aria-label={`Avance de ${goal.title}`}/><p>{goalPace(goal,today).label}</p><p>Fecha objetivo: {goalDateLabel(goal.target_date)}</p><div className="ag-card-actions"><button className="av-secondary" aria-label={`Ver la maceta de ${goal.title}`} onClick={onView}>Ver mi maceta</button><button aria-label={`Registrar un aporte para ${goal.title}`} onClick={onContribute}>Registrar un aporte</button>{onOptions&&<button className="av-secondary av-with-icon" aria-label={`Opciones de ${goal.title}`} onClick={onOptions}><SlidersHorizontal size={24} aria-hidden="true"/>Opciones</button>}</div></div></article>;
}
