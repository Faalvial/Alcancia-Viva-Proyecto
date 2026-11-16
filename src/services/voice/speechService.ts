// Servicio de síntesis de voz (Web Speech API). El reconocimiento vive en src/hooks/useDictation.ts.
import { createSpeechPlayback } from './speechPlayback';
import type { PlaybackState } from './speechPlayback';

export class SpeechService {
  private static playback:ReturnType<typeof createSpeechPlayback>|null=null;
  private static getPlayback(){
    if(!this.isSynthesisSupported())return null;
    if(!this.playback)this.playback=createSpeechPlayback(window.speechSynthesis,text=>new SpeechSynthesisUtterance(text));
    return this.playback;
  }
  static getPlaybackState():PlaybackState{return this.getPlayback()?.getState()||{id:null,status:'idle'};}
  static subscribePlayback(listener:(state:PlaybackState)=>void){return this.getPlayback()?.subscribe(listener)||(()=>{});}
  static pauseSpeaking(id:number){this.getPlayback()?.pause(id);}
  static resumeSpeaking(id:number){this.getPlayback()?.resume(id);}
  static isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  static speak(text: string, rate: number = 1.0, onEnd?: () => void) {
    return this.getPlayback()?.speak(text,rate,import.meta.env.VITE_SPEECH_LANG||'es-PE',onEnd)??null;
  }

  static stopSpeaking() {
    this.getPlayback()?.stop();
  }
}
