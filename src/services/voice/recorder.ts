import { getAudioContext } from './audioContext.ts';

/**
 * Voz para navegadores sin un reconocimiento fiable (Firefox no tiene SpeechRecognition;
 * en iPhone el de Safari falla a menudo y Chrome para iOS no lo tiene): se graba con
 * MediaRecorder y el audio se transcribe en la función financial-assistant
 * (action:"transcribe", Whisper de Groq). La grabación termina sola tras una pausa.
 * Se puede desactivar con VITE_VOICE_TRANSCRIBE=0.
 */
export const RECORDING_TYPES=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'];
export const MAX_RECORDING_MS=15000;
export const MAX_AUDIO_BYTES=1_500_000;
/** Silencio que da por terminada la frase y espera máxima si no se oye nada. */
export const SILENCE_MS=1400;
export const NO_SPEECH_MS=7000;

export function transcriptionEnabled(){
  try{return import.meta.env?.VITE_VOICE_TRANSCRIBE!=='0';}catch{return true;}
}

/** iPhone/iPad (incluido iPadOS, que se presenta como Mac con pantalla táctil). */
export function isIOS(userAgent=typeof navigator!=='undefined'?navigator.userAgent:'',platform=typeof navigator!=='undefined'?navigator.platform:'',touchPoints=typeof navigator!=='undefined'?navigator.maxTouchPoints:0){
  return /iPad|iPhone|iPod/.test(userAgent)||(platform==='MacIntel'&&touchPoints>1);
}

/** Primer formato que el navegador puede grabar (webm/opus en Chrome y Firefox, mp4 en Safari). */
export function pickRecordingType(isSupported:(type:string)=>boolean){
  return RECORDING_TYPES.find(type=>{try{return isSupported(type);}catch{return false;}})||null;
}

export function canRecord(){
  return transcriptionEnabled()&&typeof window!=='undefined'&&typeof window.MediaRecorder!=='undefined'&&Boolean(navigator.mediaDevices?.getUserMedia)
    &&pickRecordingType(type=>typeof MediaRecorder.isTypeSupported!=='function'||MediaRecorder.isTypeSupported(type))!==null;
}

/**
 * Decide cuándo termina la frase a partir del volumen: tras oír voz, una pausa de
 * SILENCE_MS; si nunca se oye voz, a los NO_SPEECH_MS. Función pura para poder probarla.
 */
export function createSilenceDetector({threshold=0.035,silenceMs=SILENCE_MS,noSpeechMs=NO_SPEECH_MS}:{threshold?:number;silenceMs?:number;noSpeechMs?:number}={}){
  let start=-1,heard=false,quietSince=-1;
  return {
    /** Devuelve 'speech' | 'end' | 'wait' para un nivel RMS (0–1) en el instante `now` (ms). */
    push(level:number,now:number):'speech'|'end'|'wait'{
      if(start<0)start=now;
      if(level>=threshold){heard=true;quietSince=-1;return 'speech';}
      if(!heard)return now-start>=noSpeechMs?'end':'wait';
      if(quietSince<0)quietSince=now;
      return now-quietSince>=silenceMs?'end':'wait';
    },
    get heard(){return heard;},
  };
}

/** Grabación con parada manual, por pausa al terminar de hablar o a los 15 s. */
export function createRecorder({onAutoStop}:{onAutoStop?:()=>void}={}){
  let recorder:MediaRecorder|null=null,stream:MediaStream|null=null,timer=0,frame=0;
  let source:MediaStreamAudioSourceNode|null=null;
  const chunks:Blob[]=[];
  let resolveStop:((blob:Blob)=>void)|null=null;
  function release(){
    window.clearTimeout(timer);cancelAnimationFrame(frame);
    try{source?.disconnect();}catch{/* ya desconectado */}
    source=null;stream?.getTracks().forEach(track=>track.stop());stream=null;
  }
  function watchSilence(media:MediaStream){
    const context=getAudioContext();
    if(!context)return;
    try{
      source=context.createMediaStreamSource(media);
      const analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);
      const data=new Uint8Array(analyser.fftSize),detector=createSilenceDetector();
      const tick=()=>{
        if(recorder?.state!=='recording')return;
        analyser.getByteTimeDomainData(data);
        let sum=0;for(const value of data){const centered=(value-128)/128;sum+=centered*centered;}
        if(detector.push(Math.sqrt(sum/data.length),performance.now())==='end'){onAutoStop?.();return;}
        frame=requestAnimationFrame(tick);
      };
      frame=requestAnimationFrame(tick);
    }catch{/* sin detección de silencio: queda la parada manual y el tope */}
  }
  return {
    async start(){
      const mimeType=pickRecordingType(type=>typeof MediaRecorder.isTypeSupported!=='function'||MediaRecorder.isTypeSupported(type))||'';
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
      recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
      chunks.length=0;
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onstop=()=>{release();resolveStop?.(new Blob(chunks,{type:recorder?.mimeType||mimeType||'audio/mp4'}));};
      recorder.start(250);
      timer=window.setTimeout(()=>{if(recorder?.state==='recording')onAutoStop?.();},MAX_RECORDING_MS);
      watchSilence(stream);
    },
    stop(){
      return new Promise<Blob>(resolve=>{resolveStop=resolve;if(recorder?.state==='recording')recorder.stop();else{release();resolve(new Blob(chunks));}});
    },
    cancel(){resolveStop=null;if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}release();},
  };
}

export async function blobToBase64(blob:Blob){
  const bytes=new Uint8Array(await blob.arrayBuffer());
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(binary);
}

type Invoke=(name:string,options:{body:Record<string,unknown>})=>Promise<{data:any;error:unknown}>;

/** Envía el audio a la función de Supabase y devuelve el texto reconocido. */
export async function transcribe(blob:Blob,invoke:Invoke){
  if(!blob.size)throw new Error('No se grabó audio.');
  if(blob.size>MAX_AUDIO_BYTES)throw new Error('La grabación es demasiado larga. Intenta con una frase más corta.');
  const {data,error}=await invoke('financial-assistant',{body:{action:'transcribe',audio:await blobToBase64(blob),mimeType:blob.type||'audio/webm',language:'es'}});
  if(error||data?.error||typeof data?.text!=='string')throw new Error('No se pudo transcribir el audio. Puedes escribir tu movimiento.');
  return data.text.trim();
}
