import React, { useEffect, useRef, useState } from 'react';
import { SpeechService } from '../services/voice/speechService';
import { splitAtWord } from '../services/voice/voices';

type Word={start:number;length:number}|null;

function useAnswerPlayback(answer:string,trackWords:boolean) {
  const [playback,setPlayback]=useState(()=>SpeechService.getPlaybackState());
  const [ownId,setOwnId]=useState<number|null>(null);
  const [word,setWord]=useState<Word>(null);
  const own=useRef<number|null>(null);
  useEffect(()=>{
    const unsubscribe=SpeechService.subscribePlayback(setPlayback);
    return()=>{unsubscribe();if(own.current!==null&&SpeechService.getPlaybackState().id===own.current)SpeechService.stopSpeaking();};
  },[]);
  const active=ownId!==null&&playback.id===ownId&&playback.status!=='idle';
  useEffect(()=>{if(!active)setWord(null);},[active]);
  function play(){
    setWord(null);
    const id=SpeechService.speak(answer,undefined,undefined,trackWords?{onBoundary:(start,length)=>setWord({start,length})}:{});
    own.current=id;setOwnId(id);
  }
  return {active,paused:active&&playback.status==='paused',ownId,word:active?word:null,play};
}

function Controls({active,paused,ownId,play}:{active:boolean;paused:boolean;ownId:number|null;play:()=>void}) {
  return <div className="av-actions" style={{justifyContent:'flex-start'}}>
    <button type="button" className="av-secondary" disabled={!SpeechService.isSynthesisSupported()} onClick={play}>Escuchar respuesta</button>
    {active&&<button type="button" className="av-secondary" aria-pressed={paused} aria-label={paused?'Reanudar respuesta':'Pausar respuesta'} onClick={()=>{if(ownId!==null){if(paused)SpeechService.resumeSpeaking(ownId);else SpeechService.pauseSpeaking(ownId);}}}>{paused?'Reanudar':'Pausar'}</button>}
  </div>;
}

export function AnswerAudio({answer}:{answer:string}) {
  const playback=useAnswerPlayback(answer,false);
  return <Controls {...playback}/>;
}

/**
 * Respuesta del asistente con lectura en voz alta. Mientras se lee, resalta la
 * palabra actual (evento onboundary); sin resaltado con movimiento reducido.
 */
export function AssistantAnswer({answer,highlight}:{answer:string;highlight:boolean}) {
  const playback=useAnswerPlayback(answer,highlight);
  const parts=highlight&&playback.word?splitAtWord(answer,playback.word.start,playback.word.length):null;
  return <>
    <p><strong>Asistente:</strong> {parts?<>{parts.before}<span className="av-spoken-word">{parts.word}</span>{parts.after}</>:answer}</p>
    <Controls {...playback}/>
  </>;
}
