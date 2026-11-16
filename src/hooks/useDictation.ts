import { useCallback, useEffect, useRef, useState } from 'react';
import { createQuestionDictation } from '../services/voice/questionDictation';
import type { DictationMessages, QuestionRecognizer } from '../services/voice/questionDictation';

/**
 * Dictado por voz único de la app (asistente y registro de movimientos).
 *
 * Envuelve createQuestionDictation: conserva el texto ante errores, descarta
 * resultados tardíos, aborta al ocultar la pestaña (visibilitychange) y al
 * desmontar, y traduce los errores del navegador a mensajes sin juicio.
 * La voz nunca es la única vía: quien lo use debe ofrecer siempre el campo
 * de texto equivalente.
 */

type RecognitionConstructor = new () => QuestionRecognizer;

export function getRecognitionConstructor():RecognitionConstructor|null {
  if(typeof window==='undefined')return null;
  const scope=window as unknown as {SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
  return scope.SpeechRecognition||scope.webkitSpeechRecognition||null;
}

export function isRecognitionSupported() {
  return getRecognitionConstructor()!==null;
}

export interface UseDictationOptions {
  /** Recibe el texto (base + lo dictado) mientras se escucha, incluidos resultados parciales. */
  onText:(text:string)=>void;
  /** Recibe el texto final cuando la escucha termina con voz detectada. */
  onDone?:(text:string)=>void;
  maxLength?:number;
  messages?:Partial<DictationMessages>;
}

export function useDictation({onText,onDone,maxLength,messages}:UseDictationOptions) {
  const [listening,setListening]=useState(false);
  const [status,setStatus]=useState('');
  const [supported]=useState(isRecognitionSupported);
  const controller=useRef<ReturnType<typeof createQuestionDictation>|null>(null);
  // Las devoluciones de llamada más recientes, sin reiniciar el reconocedor en cada render.
  const handlers=useRef({onText,onDone});handlers.current={onText,onDone};
  const config=useRef({lang:import.meta.env.VITE_SPEECH_LANG||'es-PE',maxLength,messages});

  useEffect(()=>{
    const Recognition=getRecognitionConstructor();
    if(!Recognition)return;
    const dictation=createQuestionDictation(()=>new Recognition(),{
      question:text=>handlers.current.onText(text),
      done:text=>handlers.current.onDone?.(text),
      listening:setListening,
      status:setStatus,
    },config.current);
    controller.current=dictation;
    const hidden=()=>{if(document.hidden)dictation.stop();};
    document.addEventListener('visibilitychange',hidden);
    return()=>{document.removeEventListener('visibilitychange',hidden);dictation.dispose();controller.current=null;};
  },[]);

  const start=useCallback((base='')=>{controller.current?.start(base);},[]);
  const stop=useCallback(()=>{controller.current?.stop();},[]);
  const clearStatus=useCallback(()=>setStatus(''),[]);

  return {supported,listening,status,start,stop,clearStatus};
}
