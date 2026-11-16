/** Preferencia de voz para la síntesis: es-PE, luego es-MX, luego es-ES y, si no, cualquier español. */
export interface VoiceLike { lang:string; name:string; localService?:boolean; }
export const VOICE_PREFERENCE=['es-pe','es-mx','es-es'];
const langOf=(voice:VoiceLike)=>voice.lang.replace('_','-').toLowerCase();

export function pickSpanishVoice<T extends VoiceLike>(voices:readonly T[]):T|null {
  for(const lang of VOICE_PREFERENCE){
    const matches=voices.filter(voice=>langOf(voice)===lang);
    if(matches.length)return matches.find(voice=>voice.localService)||matches[0];
  }
  return voices.find(voice=>langOf(voice).startsWith('es'))||null;
}

/** Velocidad de lectura permitida en Preferencias. */
export const SPEECH_RATES=[0.8,0.9,1,1.1,1.2,1.3] as const;
export function clampRate(rate:number){return Number.isFinite(rate)?Math.min(1.3,Math.max(0.8,Math.round(rate*10)/10)):1;}

/** Divide un texto en tramos para resaltar la palabra que se está leyendo. */
export function splitAtWord(text:string,start:number,length:number){
  if(start<0||start>=text.length)return null;
  let end=length>0?start+length:start;
  if(length<=0)while(end<text.length&&!/\s/.test(text[end]))end++;
  if(end<=start)return null;
  return {before:text.slice(0,start),word:text.slice(start,end),after:text.slice(end)};
}
