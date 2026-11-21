import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Flower2, Info, Undo2, X } from 'lucide-react';
import type { Movement } from '../live/client';
import { MovementTypeIcon } from './MovementTypeIcon';

/** Ventana para deshacer un registro desde el aviso (HU-17). */
export const UNDO_WINDOW_MS=10000;

export interface ToastData {
  id:number; text:string; type?:Movement['type']; tone?:'success'|'info'|'celebration';
  action?:{label:string;onClick:()=>void};
  /** Duración propia (por defecto 6 s). */
  duration?:number;
  /** Muestra una barra que se vacía y los segundos que quedan para la acción. */
  countdown?:boolean;
}

/**
 * Aviso flotante anclado abajo (sobre la tab bar en móvil). La región aria-live
 * existe siempre para que los lectores de pantalla anuncien cada mensaje.
 * Se cierra solo a los 6 s y se pausa mientras el puntero o el foco están encima.
 */
export function Toast({toast,onDismiss,duration:defaultDuration=6000}:{toast:ToastData|null;onDismiss:()=>void;duration?:number}) {
  const duration=toast?.duration||defaultDuration;
  const [paused,setPaused]=useState(false);
  const [seconds,setSeconds]=useState(Math.ceil(duration/1000));
  const dismiss=useRef(onDismiss);dismiss.current=onDismiss;
  const remaining=useRef(duration),started=useRef(0);
  useEffect(()=>{remaining.current=duration;setPaused(false);setSeconds(Math.ceil(duration/1000));},[toast?.id,duration]);
  // Segundos restantes (solo visual: no se anuncian cada segundo).
  useEffect(()=>{
    if(!toast?.countdown||paused)return;
    const timer=window.setInterval(()=>setSeconds(Math.max(0,Math.ceil((remaining.current-(Date.now()-started.current))/1000))),250);
    return()=>window.clearInterval(timer);
  },[toast?.id,toast?.countdown,paused]);
  useEffect(()=>{
    if(!toast||paused)return;
    started.current=Date.now();
    const timer=window.setTimeout(()=>dismiss.current(),Math.max(0,remaining.current));
    return()=>{window.clearTimeout(timer);remaining.current-=Date.now()-started.current;};
  },[toast?.id,paused]);
  const icon=toast?.tone==='celebration'?<span className="av-type-icon av-tone-ingreso" aria-hidden="true"><Flower2 size={20}/></span>:
    toast?.type?<MovementTypeIcon type={toast.type} size={20}/>:
    <span className={`av-type-icon av-tone-${toast?.tone==='info'?'ingreso':'ahorro'}`} aria-hidden="true">{toast?.tone==='info'?<Info size={20}/>:<CheckCircle2 size={20}/>}</span>;
  return <div className="av-toast-region" role="status" aria-live="polite" aria-atomic="true">
    {toast&&<div className={`av-toast ${toast.tone==='celebration'?'av-toast--celebration':''} ${toast.countdown?'av-toast--countdown':''} ${paused?'is-paused':''}`} key={toast.id}
      onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}
      onFocus={()=>setPaused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setPaused(false);}}>
      {icon}
      <p>{toast.text}</p>
      {toast.action&&<button type="button" className="av-secondary av-with-icon av-toast-action" onClick={()=>{toast.action?.onClick();dismiss.current();}}><Undo2 size={20} aria-hidden="true"/>{toast.action.label}{toast.countdown&&<span className="av-toast-seconds" aria-hidden="true">{seconds} s</span>}</button>}
      <button type="button" className="av-secondary av-icon-button av-toast-close" aria-label="Cerrar aviso" onClick={()=>dismiss.current()}><X size={20} aria-hidden="true"/></button>
      {toast.countdown&&<span className="av-toast-timer" aria-hidden="true" style={{animationDuration:`${duration}ms`}}/>}
      {toast.countdown&&toast.action&&<span className="av-sr-only">Puedes deshacerlo durante {Math.round(duration/1000)} segundos; después, desde Movimientos.</span>}
    </div>}
  </div>;
}
