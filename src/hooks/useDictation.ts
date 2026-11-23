import { useCallback, useEffect, useRef, useState } from 'react';
import { QUESTION_MESSAGES, createQuestionDictation } from '../services/voice/questionDictation';
import type { DictationMessages, QuestionRecognizer } from '../services/voice/questionDictation';
import { canRecord, createRecorder, isIOS, transcribe } from '../services/voice/recorder';
import { isDemo, requireDatabase } from '../live/client';

/**
 * Dictado por voz único de la app (panel «Hablar», registro de movimientos y asistente).
 *
 * Dos motores con la misma interfaz:
 * - «recognize»: SpeechRecognition del navegador (Chrome, Edge), con resultados parciales.
 * - «record»: graba con MediaRecorder y transcribe en el servidor (Whisper). Se usa en
 *   Firefox (no tiene SpeechRecognition) y siempre en iPhone/iPad, donde el reconocimiento
 *   de Safari es poco fiable y Chrome para iOS no lo tiene. Termina solo tras una pausa.
 *
 * Conserva el texto ante errores, descarta resultados tardíos, se detiene al ocultar la
 * pestaña y traduce los errores a mensajes sin juicio. La voz nunca es la única vía.
 */

type RecognitionConstructor = new () => QuestionRecognizer;
export type DictationMode='recognize'|'record'|'none';

export function getRecognitionConstructor():RecognitionConstructor|null {
  if(typeof window==='undefined')return null;
  const scope=window as unknown as {SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
  return scope.SpeechRecognition||scope.webkitSpeechRecognition||null;
}

export function dictationMode():DictationMode {
  // En el modo demo no hay servidor que transcriba: solo el reconocimiento del navegador.
  const recordable=canRecord()&&!isDemo;
  if(isIOS()&&recordable)return 'record';
  if(getRecognitionConstructor())return 'recognize';
  return recordable?'record':'none';
}

export function isRecognitionSupported() {
  return dictationMode()!=='none';
}

const RECORDING={
  listening:'Te escucho… Cuando hagas una pausa, lo envío. También puedes pulsar «Detener».',
  transcribing:'Transcribiendo lo que dijiste…',
};

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
  const [transcribing,setTranscribing]=useState(false);
  const [status,setStatus]=useState('');
  const [mode]=useState(dictationMode);
  const controller=useRef<ReturnType<typeof createQuestionDictation>|null>(null);
  const recorder=useRef<ReturnType<typeof createRecorder>|null>(null);
  const session=useRef(0);
  const baseText=useRef('');
  // Las devoluciones de llamada más recientes, sin reiniciar el reconocedor en cada render.
  const handlers=useRef({onText,onDone});handlers.current={onText,onDone};
  const config=useRef({lang:import.meta.env.VITE_SPEECH_LANG||'es-PE',maxLength,messages});
  const text=useRef({...QUESTION_MESSAGES,...messages,errors:{...QUESTION_MESSAGES.errors,...messages?.errors}});

  useEffect(()=>{
    if(mode!=='recognize')return;
    const Recognition=getRecognitionConstructor();
    if(!Recognition)return;
    const dictation=createQuestionDictation(()=>new Recognition(),{
      question:value=>handlers.current.onText(value),
      done:value=>handlers.current.onDone?.(value),
      listening:setListening,
      status:setStatus,
    },config.current);
    controller.current=dictation;
    const hidden=()=>{if(document.hidden)dictation.stop();};
    document.addEventListener('visibilitychange',hidden);
    return()=>{document.removeEventListener('visibilitychange',hidden);dictation.dispose();controller.current=null;};
  },[mode]);

  /* ---------- Modo grabación ---------- */

  const finish=useCallback(async(id:number,base:string)=>{
    const media=recorder.current;
    if(!media||session.current!==id)return;
    recorder.current=null;
    setListening(false);setTranscribing(true);setStatus(RECORDING.transcribing);
    try{
      const heard=await transcribe(await media.stop(),(name,options)=>requireDatabase().functions.invoke(name,options));
      if(session.current!==id)return;
      if(!heard){setStatus(text.current.noSpeech);return;}
      const combined=[base.trim(),heard].filter(Boolean).join(' ').slice(0,config.current.maxLength??1500);
      handlers.current.onText(combined);
      setStatus(text.current.heard);
      handlers.current.onDone?.(combined);
    }catch(error){
      if(session.current===id)setStatus(error instanceof Error&&error.message?error.message:text.current.genericError);
    }finally{
      if(session.current===id)setTranscribing(false);
    }
  },[]);

  const cancelRecording=useCallback((message='')=>{
    session.current++;
    recorder.current?.cancel();recorder.current=null;
    setListening(false);setTranscribing(false);
    if(message)setStatus(message);
  },[]);

  useEffect(()=>{
    if(mode!=='record')return;
    const hidden=()=>{if(document.hidden&&recorder.current)cancelRecording(text.current.stopped);};
    document.addEventListener('visibilitychange',hidden);
    return()=>{document.removeEventListener('visibilitychange',hidden);session.current++;recorder.current?.cancel();recorder.current=null;};
  },[mode,cancelRecording]);

  const startRecording=useCallback((base:string)=>{
    cancelRecording();
    const id=session.current;baseText.current=base;
    const media=createRecorder({onAutoStop:()=>{void finish(id,base);}});
    recorder.current=media;
    setListening(true);setStatus(text.current.requesting);
    media.start().then(()=>{
      if(session.current!==id){media.cancel();return;}
      setStatus(RECORDING.listening);
    }).catch(()=>{
      if(session.current!==id)return;
      recorder.current=null;setListening(false);setStatus(text.current.errors['not-allowed']);
    });
  },[cancelRecording,finish]);

  /* ---------- Interfaz común ---------- */

  const start=useCallback((base='')=>{
    if(mode==='record')startRecording(base);
    else controller.current?.start(base);
  },[mode,startRecording]);

  /** Reconocimiento: detiene y conserva lo dicho. Grabación: termina y transcribe. */
  const stop=useCallback(()=>{
    if(mode==='record'){if(recorder.current)void finish(session.current,baseText.current);return;}
    controller.current?.stop();
  },[mode,finish]);

  /** Abandona la escucha sin usar lo dicho (cerrar el panel, navegar…). */
  const cancel=useCallback(()=>{
    if(mode==='record')cancelRecording();
    else controller.current?.stop();
  },[mode,cancelRecording]);

  const clearStatus=useCallback(()=>setStatus(''),[]);

  return {supported:mode!=='none',mode,listening,transcribing,status,start,stop,cancel,clearStatus};
}
