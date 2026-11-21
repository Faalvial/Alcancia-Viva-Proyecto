import { useEffect, useRef } from 'react';

const TYPING=/^(INPUT|TEXTAREA|SELECT)$/;

/**
 * Atajo de una sola tecla (sin modificadores). Se ignora mientras se escribe en un
 * campo, en contenido editable o con un diálogo modal abierto, para no robar texto.
 */
export function useKeyShortcut(key:string,handler:()=>void,enabled=true) {
  const latest=useRef(handler);latest.current=handler;
  useEffect(()=>{
    if(!enabled)return;
    const onKey=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
      if(event.key.toLowerCase()!==key.toLowerCase())return;
      const target=event.target as HTMLElement|null;
      if(target&&(target.isContentEditable||TYPING.test(target.tagName)))return;
      if(document.querySelector('dialog[open]'))return;
      event.preventDefault();latest.current();
    };
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[key,enabled]);
}
