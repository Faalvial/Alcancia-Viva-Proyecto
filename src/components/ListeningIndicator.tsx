import { Mascot } from './Mascot';
import type { MascotMood } from './Mascot';
import { useMicLevel } from '../hooks/useMicLevel';

export type VoiceStage='idle'|'listening'|'speaking'|'processing'|'review'|'answer'|'saving'|'notHeard'|'unsupported';

const LABELS:Record<VoiceStage,string>={
  idle:'Toca «Hablar de nuevo» cuando quieras',
  listening:'Escuchando',
  speaking:'Te estoy hablando',
  processing:'Procesando',
  review:'Listo para revisar',
  answer:'Listo',
  saving:'Guardando',
  notHeard:'No te escuché',
  unsupported:'Voz no disponible',
};

/**
 * Indicador de escucha: anillo que late con el volumen real del micrófono
 * (o con una animación fija si no hay permiso) y el estado en texto.
 * Con movimiento reducido queda un indicador estático.
 */
const MOODS:Record<VoiceStage,MascotMood>={
  idle:'happy',listening:'listening',speaking:'speaking',processing:'thinking',review:'encouraging',
  answer:'happy',saving:'thinking',notHeard:'sleepy',unsupported:'sleepy',
};

export function ListeningIndicator({stage,reduced,petName='',growth=2}:{stage:VoiceStage;reduced:boolean;petName?:string;growth?:number}) {
  const listening=stage==='listening';
  const {ref,mode}=useMicLevel<HTMLSpanElement>(listening,!reduced);
  return <div className={`av-listening av-listening--${stage} ${listening?`is-${reduced?'still':mode==='live'?'live':'fixed'}`:''}`}>
    <span ref={ref} className="av-listening-ring" aria-hidden="true">
      <span className="av-listening-core"><Mascot mood={MOODS[stage]} growth={growth} size={84}/></span>
    </span>
    <p className="av-listening-label" role="status" aria-live="polite">{stage==='listening'&&petName?`${petName} te escucha`:LABELS[stage]}</p>
  </div>;
}
