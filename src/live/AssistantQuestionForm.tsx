import React, { useEffect, useRef } from 'react';
import { useDictation } from '../hooks/useDictation';
import { SpeechService } from '../services/voice/speechService';

export function AssistantQuestionForm({question,onQuestion,busy,onSubmit}:{question:string;onQuestion:(text:string)=>void;busy:boolean;onSubmit:(event:React.FormEvent)=>void}) {
  const input=useRef<HTMLTextAreaElement>(null);
  const {supported,listening,status,start,stop}=useDictation({onText:onQuestion,maxLength:1500});
  useEffect(()=>{if(busy&&listening)stop();},[busy,listening,stop]);
  function dictate(){
    if(listening){stop();input.current?.focus();return;}
    SpeechService.stopSpeaking();start(question);
  }
  return <form onSubmit={event=>{if(listening||busy){event.preventDefault();return;}onSubmit(event);}} className="av-card">
    <label>¿Qué quieres comprender?<textarea ref={input} value={question} onChange={event=>onQuestion(event.target.value)} required maxLength={1500} readOnly={listening||busy} aria-describedby="av-assistant-voice-help"/></label>
    <div className="av-actions"><button type="button" className="av-secondary" onClick={dictate} aria-pressed={listening} disabled={busy||!supported} aria-describedby="av-assistant-voice-help">{listening?'Detener dictado':'Dictar pregunta'}</button>
      <button type="submit" disabled={busy||listening||!question.trim()}>{busy?'Consultando…':'Consultar al asistente'}</button></div>
    <p id="av-assistant-voice-help">{supported?'Dicta tu pregunta, revisa el texto y luego envíalo. Puedes continuar escribiendo al terminar.':'Este navegador no admite dictado de voz. Puedes escribir tu pregunta.'}</p>
    {status&&<p role="status" aria-live="polite" aria-atomic="true">{status}</p>}
  </form>;
}
