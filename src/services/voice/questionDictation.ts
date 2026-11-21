export interface QuestionRecognizer {
  lang:string; continuous:boolean; interimResults:boolean;
  onstart:(()=>void)|null;
  onresult:((event:any)=>void)|null; onerror:((event:any)=>void)|null; onend:(()=>void)|null;
  start:()=>void; abort:()=>void;
}
interface Callbacks {
  question:(text:string)=>void; listening:(value:boolean)=>void; status:(text:string)=>void;
  /** Se llama al terminar la escucha con voz detectada, con el texto final combinado. */
  done?:(text:string)=>void;
}
/** Textos de estado del dictado. Cada uso (pregunta, movimiento…) puede ajustar los suyos. */
export interface DictationMessages {
  listening:string; interim:string; limit:string; heard:string; noSpeech:string; stopped:string;
  requesting:string; startFailed:string; genericError:string; errors:Record<string,string>;
}
export interface DictationOptions { lang?:string; maxLength?:number; messages?:Partial<DictationMessages>; }
export const QUESTION_MESSAGES:DictationMessages = {
  listening:'Micrófono activo. Escuchando tu pregunta…',
  interim:'Escuchando… La pregunta aparecerá aquí; no se envía automáticamente.',
  limit:'Llegaste al límite de 1500 caracteres. Detén el dictado para revisar.',
  heard:'Revisa o edita tu pregunta y pulsa «Consultar al asistente».',
  noSpeech:'No se detectó voz. Puedes volver a dictar o escribir.',
  stopped:'Dictado detenido. Revisa tu pregunta antes de enviarla.',
  requesting:'Solicitando acceso al micrófono…',
  startFailed:'No se pudo iniciar el micrófono. Tu texto se conserva; puedes escribir o reintentar.',
  genericError:'No se pudo completar el dictado. Tu texto se conserva; puedes escribir o reintentar.',
  errors:{
    'not-allowed':'Permite el micrófono en tu navegador o escribe tu pregunta.',
    'service-not-allowed':'El navegador no permite el dictado. Puedes escribir tu pregunta.',
    'audio-capture':'No encontramos un micrófono disponible. Puedes escribir tu pregunta.',
    'no-speech':'No se detectó voz. Puedes volver a dictar o escribir.',
    'network':'No se pudo conectar el reconocimiento de voz. Puedes escribir tu pregunta.',
  },
};
export function createQuestionDictation(factory:()=>QuestionRecognizer,callbacks:Callbacks,options:DictationOptions={}) {
  const lang=options.lang||'es-PE',maxLength=options.maxLength??1500;
  const messages:DictationMessages={...QUESTION_MESSAGES,...options.messages,errors:{...QUESTION_MESSAGES.errors,...options.messages?.errors}};
  let active:QuestionRecognizer|null=null,disposed=false;
  function release(){
    const previous=active;active=null;
    if(previous){previous.onresult=null;previous.onerror=null;previous.onend=null;try{previous.abort();}catch{}}
  }
  return {
    start(base:string){
      if(disposed)return;
      release();
      try {
        const recognition=factory();active=recognition;
        recognition.lang=lang;recognition.continuous=false;recognition.interimResults=true;
        recognition.onstart=()=>{
          if(active!==recognition||disposed){try{recognition.abort();}catch{}return;}
          callbacks.status(messages.listening);
        };
        let heard=false,latest='';
        recognition.onresult=event=>{
          if(active!==recognition||disposed)return;
          let text='';for(let i=0;i<event.results.length;i++)text+=event.results[i][0].transcript+' ';
          text=text.trim();if(!text)return;heard=true;
          const combined=[base.trim(),text].filter(Boolean).join(' ');
          latest=combined.slice(0,maxLength);
          callbacks.question(latest);
          callbacks.status(combined.length>maxLength?messages.limit:messages.interim);
        };
        recognition.onerror=event=>{
          if(active!==recognition||disposed)return;
          release();callbacks.listening(false);callbacks.status(messages.errors[event.error]||messages.genericError);
        };
        recognition.onend=()=>{
          if(active!==recognition||disposed)return;
          release();callbacks.listening(false);callbacks.status(heard?messages.heard:messages.noSpeech);
          if(heard)callbacks.done?.(latest);
        };
        callbacks.listening(true);callbacks.status(messages.requesting);recognition.start();
      } catch {release();callbacks.listening(false);callbacks.status(messages.startFailed);}
    },
    stop(){if(!active)return;release();if(!disposed){callbacks.listening(false);callbacks.status(messages.stopped);}},
    dispose(){disposed=true;release();},
  };
}
