import { useEffect, useRef, useState } from 'react';

/**
 * Detecta cuándo sube la etapa de crecimiento de una planta (un aporte la hizo
 * crecer) y devuelve la transición en curso durante `duration` ms, para hacer un
 * fundido cruzado entre el sprite anterior y el nuevo (FR-18). Las bajadas (por
 * ejemplo al deshacer un aporte) cambian sin animación.
 */
export function usePreviousStage(stage:number,duration=600) {
  const previous=useRef(stage);
  const [transition,setTransition]=useState<{from:number;to:number;key:number}|null>(null);
  useEffect(()=>{
    const from=previous.current;
    previous.current=stage;
    if(stage<=from){setTransition(null);return;}
    setTransition({from,to:stage,key:Date.now()});
    const timer=window.setTimeout(()=>setTransition(null),duration);
    return()=>window.clearTimeout(timer);
  },[stage,duration]);
  return transition;
}
