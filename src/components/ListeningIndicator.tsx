import { Mic, MicOff } from 'lucide-react';
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
export function ListeningIndicator({stage,reduced}:{stage:VoiceStage;reduced:boolean}) {
  const listening=stage==='listening';
  const {ref,mode}=useMicLevel<HTMLSpanElement>(listening,!reduced);
  const quiet=stage==='notHeard'||stage==='unsupported';
  return <div className={`av-listening av-listening--${stage} ${listening?`is-${reduced?'still':mode==='live'?'live':'fixed'}`:''}`}>
    <span ref={ref} className="av-listening-ring" aria-hidden="true">
      <span className="av-listening-core">{quiet?<MicOff size={28}/>:<Mic size={28}/>}</span>
    </span>
    <p className="av-listening-label" role="status" aria-live="polite">{LABELS[stage]}</p>
  </div>;
}
