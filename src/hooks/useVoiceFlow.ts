import { useCallback, useEffect, useRef, useState } from 'react';
import type { Goal, Movement, Profile } from '../live/client';
import { useDictation } from './useDictation';
import type { DictationMessages } from '../services/voice/questionDictation';
import { SpeechService } from '../services/voice/speechService';
import { playEarcon, vibrate } from '../services/voice/earcons';
import {
  answerQuery, confirmationPrompt, fillSlot, nextSlot, parseConfirmation, routeIntent,
} from '../services/voice/intents';
import type { Slot, VoiceDraft, VoiceTab } from '../services/voice/intents';
import type { VoiceStage } from '../components/ListeningIndicator';
import { phrase } from '../live/companion';

// Frases variadas para que la mascota no repita siempre lo mismo.
const say_=(kind:Parameters<typeof phrase>[0],values:Record<string,string>={})=>phrase(kind,Math.floor(Math.random()*997),values);

/** Repreguntas permitidas por slot (y para la confirmación) antes de abrir el formulario (FR-14). */
export const MAX_REASKS=2;

const VOICE_MESSAGES:Partial<DictationMessages>={
  listening:'Escuchando…',
  interim:'Escuchando…',
  heard:'',
  noSpeech:'No te escuché. Toca «Hablar de nuevo» o elige «Prefiero escribir».',
  stopped:'',
  requesting:'Solicitando acceso al micrófono…',
  startFailed:'No se pudo iniciar el micrófono. Puedes escribir tu movimiento.',
  genericError:'No se pudo completar el reconocimiento. Puedes volver a intentarlo o escribir.',
  errors:{
    'not-allowed':'El micrófono no tiene permiso. Puedes permitirlo en el navegador o escribir tu movimiento.',
    'service-not-allowed':'El navegador no permite el reconocimiento de voz. Puedes escribir tu movimiento.',
    'audio-capture':'No encontramos un micrófono disponible. Puedes escribir tu movimiento.',
    'no-speech':'No te escuché. Toca «Hablar de nuevo» o elige «Prefiero escribir».',
    'network':'No se pudo conectar el reconocimiento de voz. Puedes escribir tu movimiento.',
  },
};

type Awaiting={kind:'command'}|{kind:'slot';slot:Slot;draft:VoiceDraft}|{kind:'confirm';draft:VoiceDraft};

export interface VoiceFlowOptions {
  goals:Goal[]; movements:Movement[]; profile:Profile; today:string; weeklyBudget:number; audio:boolean;
  onNavigate:(tab:VoiceTab)=>void;
  onAsk:(question:string)=>void;
  onSave:(movement:Movement,phrase:string,category:string)=>Promise<void>;
  /** Abre el formulario de registro (precargado si hay borrador) y cierra la voz. */
  onOpenComposer:(draft:VoiceDraft|null)=>void;
  onClose:()=>void;
}

/**
 * Bucle de conversación por voz: escucha → intención → (repreguntas) →
 * confirmación hablada «sí / no / cancelar» → guardado con el mismo onSave del
 * formulario. La alternativa escrita está siempre a un toque (preferWriting).
 */
export function useVoiceFlow(options:VoiceFlowOptions) {
  const latest=useRef(options);latest.current=options;
  const [stage,setStage]=useState<VoiceStage>('idle');
  const [transcript,setTranscript]=useState('');
  const [prompt,setPrompt]=useState('');
  const stageRef=useRef<VoiceStage>('idle');
  const awaiting=useRef<Awaiting>({kind:'command'});
  const asks=useRef<Record<string,number>>({});
  const gotResult=useRef(false);
  const turn=useRef(0);
  const transcriptRef=useRef('');
  const draftRef=useRef<VoiceDraft|null>(null);
  // Respaldo con grabación (solo si SpeechRecognition no existe y la transcripción está activada).

  const go=useCallback((next:VoiceStage)=>{stageRef.current=next;setStage(next);},[]);
  const dictation=useDictation({
    onText:text=>{transcriptRef.current=text;setTranscript(text);},
    onDone:text=>{gotResult.current=true;handle(text);},
    maxLength:500,
    messages:VOICE_MESSAGES,
  });

  // Grabación (Firefox, iPhone): mientras el servidor transcribe, la mascota «piensa».
  useEffect(()=>{
    if(dictation.transcribing&&stageRef.current==='listening')go('processing');
  },[dictation.transcribing,go]);

  // Fin de la escucha sin resultado: «No te escuché» con el motivo (silencio, permiso…).
  const wasActive=useRef(false);
  useEffect(()=>{
    const active=dictation.listening||dictation.transcribing;
    if(wasActive.current&&!active&&!gotResult.current){
      if(stageRef.current==='listening'||stageRef.current==='processing'){go('notHeard');setPrompt(dictation.status||VOICE_MESSAGES.noSpeech!);}
      // En la confirmación los botones siguen visibles: basta con avisar.
      else if(stageRef.current==='review')setPrompt('No te escuché. Di «sí», «no» o «cancelar», o usa los botones.');
    }
    wasActive.current=active;
  },[dictation.listening,dictation.transcribing,dictation.status,go]);

  function listen(){
    gotResult.current=false;transcriptRef.current='';setTranscript('');
    playEarcon('start',latest.current.audio);
    go('listening');
    dictation.start('');
  }

  /** Dice el texto y, al terminar, vuelve a escuchar (o ejecuta then). */
  function say(text:string,then:()=>void=listen){
    const id=++turn.current;
    let done=false;
    const next=()=>{if(done||turn.current!==id)return;done=true;then();};
    setPrompt(text);go('speaking');
    if(!SpeechService.isSynthesisSupported()){next();return;}
    const spoken=SpeechService.speak(text,undefined,next,{onError:next});
    if(spoken===null){next();return;}
    // Respaldo por si el navegador nunca dispara onend.
    window.setTimeout(next,Math.min(12000,1500+text.length*90));
  }

  function openForm(draft:VoiceDraft|null,reason=''){
    if(reason)setPrompt(reason);
    stopAll();
    latest.current.onOpenComposer(draft);
  }

  function askSlot(draft:VoiceDraft,slot:Slot,retry:boolean){
    const count=asks.current[slot]||0;
    if(count>MAX_REASKS){openForm(draft);return;}
    asks.current[slot]=count+1;
    awaiting.current={kind:'slot',slot,draft};
    draftRef.current=draft;
    say(`${retry?`${say_('notUnderstood')} `:''}${say_(slot)}`);
  }

  function advance(draft:VoiceDraft){
    draftRef.current=draft;
    const slot=nextSlot(draft);
    if(slot==='goal'&&!latest.current.goals.length){openForm(draft);return;}
    if(slot){askSlot(draft,slot,false);return;}
    awaiting.current={kind:'confirm',draft};
    asks.current.confirm=(asks.current.confirm||0)+1;
    const question=confirmationPrompt(draft,latest.current.goals);
    say(question,()=>{go('review');setPrompt(question);gotResult.current=false;playEarcon('start',latest.current.audio);transcriptRef.current='';setTranscript('');dictation.start('');stageRef.current='review';});
    // Se mantiene «Listo para revisar» mientras escucha la respuesta.
  }

  async function save(draft:VoiceDraft){
    const {goals,profile,today,onSave,onClose,audio}=latest.current;
    const goal=goals.find(g=>g.id===draft.goalId);
    if(!draft.type||!draft.amount||(draft.type==='savings'&&!goal)){openForm(draft);return;}
    const category=draft.type==='savings'?'Ahorro':(draft.category||'Otros');
    const movement:Movement={
      id:crypto.randomUUID(),user_id:profile.id,type:draft.type,amount:draft.amount,category,description:draft.text,
      occurred_on:today,source:'voice',goal_id:draft.type==='savings'?goal!.id:null,
      group_id:draft.type==='savings'?goal!.group_id||null:null,reversed_at:null,
    };
    go('saving');setPrompt('Guardando…');
    try{
      await onSave(movement,draft.text,category);
      playEarcon('success',audio);vibrate('success');
      stopAll();onClose();
      SpeechService.speak(say_('saved'));
    }catch{
      go('notHeard');setPrompt('No pudimos guardar el movimiento. Tus datos se conservan: elige «Prefiero escribir» para revisarlos.');
    }
  }

  function confirm(choice:'yes'|'no'|'cancel'){
    const state=awaiting.current;
    if(state.kind!=='confirm')return;
    gotResult.current=true;dictation.cancel();SpeechService.stopSpeaking();
    if(choice==='yes'){void save(state.draft);return;}
    if(choice==='no'){openForm(state.draft);return;}
    stopAll();latest.current.onClose();SpeechService.speak(say_('cancelled'));
  }

  function handle(text:string){
    playEarcon('end',latest.current.audio);
    const state=awaiting.current;
    go('processing');
    const {goals,profile,movements,today,weeklyBudget}=latest.current;
    if(state.kind==='confirm'){
      const choice=parseConfirmation(text);
      if(choice){confirm(choice);return;}
      if((asks.current.confirm||0)>MAX_REASKS){openForm(state.draft);return;}
      asks.current.confirm=(asks.current.confirm||0)+1;
      const question=confirmationPrompt(state.draft,goals);
      say(`${say_('notUnderstood')} ${question} Di sí, no o cancelar.`,()=>{go('review');setPrompt(question);gotResult.current=false;transcriptRef.current='';setTranscript('');dictation.start('');stageRef.current='review';});
      return;
    }
    if(state.kind==='slot'){
      const next=fillSlot(state.draft,state.slot,text,goals);
      if(!next){askSlot(state.draft,state.slot,true);return;}
      advance({...next,text:`${state.draft.text} ${text}`.trim()});
      return;
    }
    const intent=routeIntent(text,{goals,profile});
    if(intent.kind==='empty'){go('notHeard');setPrompt(VOICE_MESSAGES.noSpeech!);return;}
    if(intent.kind==='navigate'){
      stopAll();latest.current.onNavigate(intent.tab);latest.current.onClose();SpeechService.speak(say_('navigate',{label:intent.label}));return;
    }
    if(intent.kind==='query'){
      const answer=answerQuery(intent,{goals,movements,today,weeklyBudget});
      say(answer,()=>{go('answer');});
      return;
    }
    if(intent.kind==='assistant'){
      stopAll();latest.current.onAsk(intent.question);latest.current.onClose();SpeechService.speak(say_('ask'));return;
    }
    draftRef.current=intent.draft;
    if(intent.draft.planning){openForm(intent.draft);return;}
    advance(intent.draft);
  }

  function stopAll(){
    turn.current++;gotResult.current=true;
    dictation.cancel();
  }

  /** Empieza una conversación nueva. */
  function start(){
    if(!dictation.supported){go('unsupported');setPrompt('Este navegador no admite voz; escribe tu movimiento.');return;}
    SpeechService.stopSpeaking();
    awaiting.current={kind:'command'};asks.current={};draftRef.current=null;setPrompt(say_('welcome'));
    listen();
  }

  /** «Detener»: procesa lo dicho hasta ahora, si hay algo. */
  function stop(){
    // Grabación: «Detener» envía lo grabado a transcribir.
    if(dictation.mode==='record'&&dictation.listening){dictation.stop();return;}
    const heard=transcriptRef.current.trim();
    gotResult.current=true;dictation.stop();
    if(heard)handle(heard);else{go('idle');setPrompt('');}
  }

  function preferWriting(){
    const draft=draftRef.current||(transcriptRef.current.trim()?{text:transcriptRef.current.trim(),type:'' as const,amount:null,category:'',goalId:'',planning:false}:null);
    SpeechService.stopSpeaking();openForm(draft);
  }

  function close(){stopAll();SpeechService.stopSpeaking();latest.current.onClose();}

  return {
    stage,transcript,prompt,supported:dictation.supported,listening:dictation.listening,recording:dictation.mode==='record'&&dictation.listening,transcribing:dictation.transcribing,
    awaitingConfirmation:awaiting.current.kind==='confirm'&&(stage==='review'),
    start,stop,confirm,preferWriting,close,
  };
}
