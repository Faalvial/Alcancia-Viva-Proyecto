/**
 * Un único AudioContext para earcons, nivel del micrófono y detección de silencio.
 * iOS (y otros navegadores) lo crean «suspendido» si no nace de un toque: primeAudio()
 * se llama en el mismo toque de «Hablar» / «Dictar» para desbloquearlo, y también
 * desbloquea la síntesis de voz con una frase vacía.
 */
let shared:AudioContext|null=null;
let synthUnlocked=false;

export function getAudioContext():AudioContext|null {
  if(typeof window==='undefined')return null;
  try{
    const Context=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!Context)return null;
    if(!shared||shared.state==='closed')shared=new Context();
    return shared;
  }catch{return null;}
}

/** Llamar dentro de un gesto del usuario (click/tap). */
export function primeAudio() {
  const context=getAudioContext();
  if(context&&context.state==='suspended')void context.resume().catch(()=>{});
  try{
    if(!synthUnlocked&&'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined'){
      const silent=new SpeechSynthesisUtterance(' ');silent.volume=0;
      window.speechSynthesis.speak(silent);synthUnlocked=true;
    }
  }catch{/* sin síntesis */}
}
