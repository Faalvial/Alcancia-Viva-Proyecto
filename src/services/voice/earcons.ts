import { getAudioContext } from './audioContext.ts';
/**
 * Earcons generados con Web Audio API (sin archivos): inicio de escucha, fin de
 * escucha y éxito, cada uno de menos de 200 ms. Solo suenan si el usuario activó
 * «Leer confirmaciones en voz alta» (prefs.audio). La vibración acompaña el éxito
 * y el cambio de etapa de una meta cuando el dispositivo la admite (HU-13, FR-18).
 */
export type EarconName='start'|'end'|'success';
interface Tone { from:number; to?:number; at:number; duration:number; }

export const EARCONS:Record<EarconName,Tone[]>={
  start:[{from:660,to:880,at:0,duration:0.12}],
  end:[{from:880,to:520,at:0,duration:0.12}],
  success:[{from:523.25,at:0,duration:0.08},{from:783.99,at:0.08,duration:0.1}],
};

export function earconLength(name:EarconName){
  return Math.max(...EARCONS[name].map(tone=>tone.at+tone.duration));
}

export function playEarcon(name:EarconName,enabled:boolean){
  if(!enabled||typeof window==='undefined')return false;
  try{
    const context=getAudioContext();
    if(!context)return false;
    if(context.state==='suspended')void context.resume();
    const now=context.currentTime+0.01;
    for(const tone of EARCONS[name]){
      const oscillator=context.createOscillator(),gain=context.createGain();
      const start=now+tone.at,end=start+tone.duration;
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(tone.from,start);
      if(tone.to)oscillator.frequency.exponentialRampToValueAtTime(tone.to,end);
      gain.gain.setValueAtTime(0.0001,start);
      gain.gain.exponentialRampToValueAtTime(0.12,start+0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001,end);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);oscillator.stop(end+0.02);
    }
    return true;
  }catch{return false;}
}

export const VIBRATION={success:[30],stage:[20,60,40]} as const;

export function vibrate(kind:keyof typeof VIBRATION){
  try{return typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'?navigator.vibrate([...VIBRATION[kind]]):false;}catch{return false;}
}
