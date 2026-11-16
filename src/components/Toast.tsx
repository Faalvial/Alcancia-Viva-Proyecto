import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Info, Undo2, X } from 'lucide-react';
import type { Movement } from '../live/client';
import { MovementTypeIcon } from './MovementTypeIcon';

export interface ToastData {
  id:number; text:string; type?:Movement['type']; tone?:'success'|'info';
  action?:{label:string;onClick:()=>void};
}

/**
 * Aviso flotante anclado abajo (sobre la tab bar en móvil). La región aria-live
 * existe siempre para que los lectores de pantalla anuncien cada mensaje.
 * Se cierra solo a los 6 s y se pausa mientras el puntero o el foco están encima.
 */
export function Toast({toast,onDismiss,duration=6000}:{toast:ToastData|null;onDismiss:()=>void;duration?:number}) {
  const [paused,setPaused]=useState(false);
  const dismiss=useRef(onDismiss);dismiss.current=onDismiss;
  const remaining=useRef(duration),started=useRef(0);
  useEffect(()=>{remaining.current=duration;setPaused(false);},[toast?.id,duration]);
  useEffect(()=>{
    if(!toast||paused)return;
    started.current=Date.now();
    const timer=window.setTimeout(()=>dismiss.current(),Math.max(0,remaining.current));
    return()=>{window.clearTimeout(timer);remaining.current-=Date.now()-started.current;};
  },[toast?.id,paused]);
  const icon=toast?.type?<MovementTypeIcon type={toast.type} size={20}/>:
    <span className={`av-type-icon av-tone-${toast?.tone==='info'?'ingreso':'ahorro'}`} aria-hidden="true">{toast?.tone==='info'?<Info size={20}/>:<CheckCircle2 size={20}/>}</span>;
  return <div className="av-toast-region" role="status" aria-live="polite" aria-atomic="true">
    {toast&&<div className="av-toast" key={toast.id}
      onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}
      onFocus={()=>setPaused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setPaused(false);}}>
      {icon}
      <p>{toast.text}</p>
      {toast.action&&<button type="button" className="av-secondary av-with-icon av-toast-action" onClick={()=>{toast.action?.onClick();dismiss.current();}}><Undo2 size={20} aria-hidden="true"/>{toast.action.label}</button>}
      <button type="button" className="av-secondary av-icon-button av-toast-close" aria-label="Cerrar aviso" onClick={()=>dismiss.current()}><X size={20} aria-hidden="true"/></button>
    </div>}
  </div>;
}
