import { useEffect, useRef, useState } from 'react';

const easeOut=(t:number)=>1-Math.pow(1-t,3);

/**
 * Anima un monto desde su valor anterior hasta el nuevo en `duration` ms.
 * Sin animación cuando `enabled` es falso (movimiento reducido) o cuando cambia
 * `resetKey` (por ejemplo, al elegir otra meta: el monto salta directo).
 */
export function useCountUp(value:number,{duration=500,enabled=true,resetKey=''}:{duration?:number;enabled?:boolean;resetKey?:string}={}) {
  const [shown,setShown]=useState(value);
  const from=useRef(value),key=useRef(resetKey),current=useRef(value);
  useEffect(()=>{
    if(!enabled||key.current!==resetKey||!Number.isFinite(value)||current.current===value){
      key.current=resetKey;current.current=value;from.current=value;setShown(value);return;
    }
    from.current=current.current;
    const start=performance.now();
    let frame=0;
    const tick=(now:number)=>{
      const t=Math.min(1,(now-start)/duration);
      const next=from.current+(value-from.current)*easeOut(t);
      current.current=t>=1?value:next;
      setShown(current.current);
      if(t<1)frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[value,enabled,resetKey,duration]);
  return Math.round(shown*100)/100;
}
