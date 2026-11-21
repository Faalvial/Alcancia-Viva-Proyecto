import type React from 'react';
import { useRef } from 'react';

/**
 * Cierre por arrastre hacia abajo de un bottom sheet (solo en móvil).
 * Se engancha a la zona del asa con los manejadores devueltos; los botones y
 * campos dentro de esa zona siguen funcionando. Siempre debe existir además un
 * botón visible de cierre (el arrastre no es la única vía).
 */
export function useSheetDrag<T extends HTMLElement>(sheet:React.RefObject<T|null>,{onClose,disabled=false,query='(max-width: 767px)'}:{onClose:()=>void;disabled?:boolean;query?:string}) {
  const drag=useRef<{id:number;start:number;dy:number}|null>(null);
  function reset(){
    const el=sheet.current;if(!el)return;
    el.classList.remove('is-dragging');el.style.transform='';
  }
  return {
    onPointerDown(event:React.PointerEvent<HTMLElement>){
      if(disabled||!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0))return;
      if(!window.matchMedia(query).matches)return;
      if((event.target as HTMLElement).closest('button,a,input,select,textarea'))return;
      drag.current={id:event.pointerId,start:event.clientY,dy:0};
      try{event.currentTarget.setPointerCapture(event.pointerId);}catch{/* sin captura sigue funcionando */}
      sheet.current?.classList.add('is-dragging');
    },
    onPointerMove(event:React.PointerEvent<HTMLElement>){
      const current=drag.current;if(!current||current.id!==event.pointerId)return;
      current.dy=Math.max(0,event.clientY-current.start);
      if(sheet.current)sheet.current.style.transform=`translateY(${current.dy}px)`;
    },
    onPointerUp(event:React.PointerEvent<HTMLElement>){
      const current=drag.current;if(!current||current.id!==event.pointerId)return;
      drag.current=null;
      const height=sheet.current?.offsetHeight||0;
      const limit=Math.max(80,Math.min(160,height*0.25));
      if(current.dy>limit&&!disabled){onClose();return;}
      reset();
    },
    onPointerCancel(){drag.current=null;reset();},
  };
}
