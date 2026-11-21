import { useEffect, useRef } from 'react';
import { Check, Keyboard, Mic, Pencil, Square, X } from 'lucide-react';
import { ListeningIndicator } from './ListeningIndicator';
import { useVoiceFlow } from '../hooks/useVoiceFlow';
import type { VoiceFlowOptions } from '../hooks/useVoiceFlow';
import { useSheetDrag } from '../hooks/useSheetDrag';

/**
 * Conversación por voz (FR-11, FR-14, FR-23, HU-14): bottom sheet en móvil y panel
 * flotante en escritorio. Escucha nada más abrirse. Todo se puede hacer también
 * con teclado (botones Sí / No / Cancelar) o por escrito («Prefiero escribir»).
 */
export function VoiceSheet({reduced,...options}:VoiceFlowOptions&{reduced:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null),primary=useRef<HTMLButtonElement>(null);
  const previousFocus=useRef(document.activeElement as HTMLElement|null);
  const flow=useVoiceFlow(options);
  const drag=useSheetDrag(dialog,{onClose:flow.close});
  useEffect(()=>{
    dialog.current?.showModal();primary.current?.focus();
    flow.start();
    return()=>{const target=previousFocus.current;if(target?.isConnected)target.focus();};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const listening=flow.stage==='listening'||(flow.stage==='review'&&flow.listening);
  const confirming=flow.stage==='review';
  return <dialog ref={dialog} className="av-dialog av-voice-sheet" aria-labelledby="voice-title" aria-describedby="voice-help"
    onCancel={event=>{event.preventDefault();flow.close();}}>
    <div className="av-sheet-grip" {...drag}><span className="av-sheet-handle" aria-hidden="true"/>
      <div className="av-dialog-title"><h2 id="voice-title">Hablar</h2>
        <button type="button" className="av-secondary av-icon-button" onClick={flow.close} aria-label="Cerrar conversación por voz"><X size={24} aria-hidden="true"/></button></div></div>
    {flow.stage==='unsupported'?<>
      <p className="av-voice-prompt" role="status">Este navegador no admite voz; escribe tu movimiento.</p>
      <div className="av-actions"><button ref={primary} type="button" className="av-with-icon" onClick={flow.preferWriting}><Keyboard size={24} aria-hidden="true"/>Escribir mi movimiento</button></div>
    </>:<>
      <ListeningIndicator stage={flow.stage} reduced={reduced}/>
      <p className={`av-voice-transcript ${flow.transcript?'':'is-empty'}`}>{flow.transcript||(listening?'Te escucho…':'')}</p>
      {flow.recording&&<p className="av-voice-prompt" aria-live="polite">Grabando. Pulsa «Detener» cuando termines.</p>}
      {flow.prompt&&<p className="av-voice-prompt" aria-live="polite">{flow.prompt}</p>}
      {confirming&&<div className="av-actions av-voice-confirm" role="group" aria-label="Confirmar el registro">
        <button type="button" className="av-with-icon" onClick={()=>flow.confirm('yes')}><Check size={24} aria-hidden="true"/>Sí, guardar</button>
        <button type="button" className="av-secondary av-with-icon" onClick={()=>flow.confirm('no')}><Pencil size={24} aria-hidden="true"/>No, corregir</button>
        <button type="button" className="av-secondary" onClick={()=>flow.confirm('cancel')}>Cancelar</button>
      </div>}
      <div className="av-actions av-voice-actions">
        <button ref={primary} type="button" className={`av-with-icon ${confirming?'av-secondary':''}`} aria-pressed={listening}
          disabled={flow.stage==='saving'} onClick={listening&&!confirming?flow.stop:flow.start}>
          {listening&&!confirming?<><Square size={20} aria-hidden="true"/>Detener</>:<><Mic size={24} aria-hidden="true"/>{confirming?'Empezar de nuevo':'Hablar de nuevo'}</>}
        </button>
        <button type="button" className="av-secondary av-with-icon" onClick={flow.preferWriting}><Keyboard size={24} aria-hidden="true"/>Prefiero escribir</button>
      </div>
    </>}
    <details className="av-voice-help" id="voice-help"><summary>Qué puedo decir</summary>
      <ul>
        <li>«Gasté 12 soles en almuerzo» o «Ahorré cien para mi laptop»</li>
        <li>«¿Cuánto llevo para el viaje?» o «¿Cuánto gasté esta semana?»</li>
        <li>«Ir a metas», «Muestra mi jardín», «Preferencias»</li>
        <li>«Pregunta: ¿cómo puedo ahorrar más?»</li>
      </ul>
      <p>Antes de guardar te leo lo que entendí y puedes decir «sí», «no» o «cancelar».</p>
    </details>
  </dialog>;
}
