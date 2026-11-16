// Servicio de síntesis de voz (Web Speech API). El reconocimiento vive en src/hooks/useDictation.ts.
import { createSpeechPlayback } from './speechPlayback';
import type { PlaybackState, SpeakExtras } from './speechPlayback';
import { clampRate, pickSpanishVoice } from './voices';

export class SpeechService {
  private static playback:ReturnType<typeof createSpeechPlayback>|null=null;
  private static voices:SpeechSynthesisVoice[]=[];
  private static rate=1;
  /** Carga las voces y las actualiza cuando el navegador dispara voiceschanged (Chrome las carga tarde). */
  static init(){
    if(!this.isSynthesisSupported()||this.voices.length)return;
    const synth=window.speechSynthesis;
    const update=()=>{try{this.voices=synth.getVoices();}catch{this.voices=[];}};
    update();
    synth.addEventListener?.('voiceschanged',update);
  }
  /** Voz elegida: es-PE, luego es-MX, luego es-ES (null si el navegador no ofrece ninguna en español). */
  static getVoice(){this.init();return pickSpanishVoice(this.voices);}
  static setRate(rate:number){this.rate=clampRate(rate);}
  static getRate(){return this.rate;}
  private static getPlayback(){
    if(!this.isSynthesisSupported())return null;
    if(!this.playback)this.playback=createSpeechPlayback(window.speechSynthesis,text=>{
      const utterance=new SpeechSynthesisUtterance(text);
      const voice=this.getVoice();if(voice)utterance.voice=voice;
      return utterance;
    });
    return this.playback;
  }
  static getPlaybackState():PlaybackState{return this.getPlayback()?.getState()||{id:null,status:'idle'};}
  static subscribePlayback(listener:(state:PlaybackState)=>void){return this.getPlayback()?.subscribe(listener)||(()=>{});}
  static pauseSpeaking(id:number){this.getPlayback()?.pause(id);}
  static resumeSpeaking(id:number){this.getPlayback()?.resume(id);}
  static isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  static speak(text: string, rate: number = this.rate, onEnd?: () => void, extras: SpeakExtras = {}) {
    const lang=this.getVoice()?.lang||import.meta.env.VITE_SPEECH_LANG||'es-PE';
    return this.getPlayback()?.speak(text,rate,lang,onEnd,extras)??null;
  }

  static stopSpeaking() {
    this.getPlayback()?.stop();
  }
}
