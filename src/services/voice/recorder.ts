/**
 * Respaldo para navegadores sin SpeechRecognition (Firefox, algunos iOS): graba con
 * MediaRecorder y envía el audio a la función financial-assistant con
 * action:"transcribe". El servidor aún no implementa esa acción (ver docs/VOZ.md),
 * así que el respaldo solo se activa con VITE_VOICE_TRANSCRIBE=1. Mientras tanto
 * la interfaz muestra «Este navegador no admite voz; escribe tu movimiento».
 */
export const RECORDING_TYPES=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'];
export const MAX_RECORDING_MS=15000;
export const MAX_AUDIO_BYTES=1_500_000;

export function transcriptionEnabled(){
  try{return import.meta.env?.VITE_VOICE_TRANSCRIBE==='1';}catch{return false;}
}

/** Primer formato que el navegador puede grabar (webm/opus en Chrome y Firefox, mp4 en Safari). */
export function pickRecordingType(isSupported:(type:string)=>boolean){
  return RECORDING_TYPES.find(type=>{try{return isSupported(type);}catch{return false;}})||null;
}

export function canRecord(){
  return transcriptionEnabled()&&typeof window!=='undefined'&&typeof window.MediaRecorder!=='undefined'&&Boolean(navigator.mediaDevices?.getUserMedia)
    &&pickRecordingType(type=>MediaRecorder.isTypeSupported(type))!==null;
}

/** Grabación con parada manual o a los 15 s. */
export function createRecorder(){
  let recorder:MediaRecorder|null=null,stream:MediaStream|null=null,timer=0;
  const chunks:Blob[]=[];
  let resolveStop:((blob:Blob)=>void)|null=null;
  function release(){window.clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());stream=null;}
  return {
    async start(){
      const mimeType=pickRecordingType(type=>MediaRecorder.isTypeSupported(type))||'';
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
      chunks.length=0;
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onstop=()=>{release();resolveStop?.(new Blob(chunks,{type:recorder?.mimeType||mimeType}));};
      recorder.start();
      timer=window.setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},MAX_RECORDING_MS);
    },
    stop(){
      return new Promise<Blob>(resolve=>{resolveStop=resolve;if(recorder?.state==='recording')recorder.stop();else resolve(new Blob(chunks));});
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
