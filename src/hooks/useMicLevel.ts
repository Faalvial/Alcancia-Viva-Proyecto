import { useEffect, useRef, useState } from 'react';

// Si el usuario niega el micrófono no se vuelve a pedir en esta sesión: el anillo
// pasa a una animación fija.
let denied=false;

/**
 * Nivel de volumen real del micrófono (AudioContext + AnalyserNode) escrito en la
 * variable CSS --av-level del elemento devuelto, sin re-renderizar en cada cuadro.
 * mode: «live» con volumen real, «fixed» sin permiso o sin API, «off» inactivo.
 */
export function useMicLevel<T extends HTMLElement>(active:boolean,enabled:boolean) {
  const ref=useRef<T|null>(null);
  const [mode,setMode]=useState<'live'|'fixed'|'off'>('off');
  useEffect(()=>{
    if(!active||!enabled){setMode('off');return;}
    const Context=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(denied||!navigator.mediaDevices?.getUserMedia||!Context){setMode('fixed');return;}
    let cancelled=false,frame=0,stream:MediaStream|null=null,context:AudioContext|null=null;
    navigator.mediaDevices.getUserMedia({audio:true}).then(media=>{
      if(cancelled){media.getTracks().forEach(track=>track.stop());return;}
      stream=media;context=new Context();
      const analyser=context.createAnalyser();analyser.fftSize=512;
      context.createMediaStreamSource(media).connect(analyser);
      const data=new Uint8Array(analyser.fftSize);
      let level=0;
      setMode('live');
      const tick=()=>{
        analyser.getByteTimeDomainData(data);
        let sum=0;for(const value of data){const centered=(value-128)/128;sum+=centered*centered;}
        const rms=Math.min(1,Math.sqrt(sum/data.length)*4);
        level=level*0.7+rms*0.3;
        ref.current?.style.setProperty('--av-level',level.toFixed(3));
        frame=requestAnimationFrame(tick);
      };
      tick();
    }).catch(()=>{denied=true;if(!cancelled)setMode('fixed');});
    return()=>{
      cancelled=true;cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track=>track.stop());
      void context?.close().catch(()=>{});
      ref.current?.style.removeProperty('--av-level');
    };
  },[active,enabled]);
  return {ref,mode};
}
