import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Sprout } from 'lucide-react';
import { Mascot } from './Mascot';
import type { MascotMood } from './Mascot';
import { PET_NAME_SUGGESTIONS, capitalized, firstName, petNameOf } from '../live/companion';
import { localDate } from '../live/domain';

export interface OnboardingResult {
  name:string; petName:string; goal:{title:string;amount:number;date:string}|null;
}

/**
 * Bienvenida guiada (3 pasos): tu nombre y consentimiento, el nombre de tu alcancía
 * y, si quieres, tu primera meta. El foco va al título de cada paso.
 */
export function Onboarding({initialName,busy,error,onFinish,onSignOut}:{
  initialName:string;busy:boolean;error:string;onFinish:(result:OnboardingResult)=>Promise<void>;onSignOut:()=>void;
}) {
  const [step,setStep]=useState(0);
  const [name,setName]=useState(initialName),[consent,setConsent]=useState(false);
  const [petName,setPetName]=useState('');
  const [title,setTitle]=useState(''),[amount,setAmount]=useState(''),[date,setDate]=useState('');
  const heading=useRef<HTMLHeadingElement>(null);
  const first=useRef(true);
  useEffect(()=>{if(first.current){first.current=false;return;}heading.current?.focus();},[step]);
  const pet=capitalized(petNameOf(petName));
  const moods:MascotMood[]=['happy','encouraging','thinking'];
  const titles=['¡Hola! Soy tu nueva alcancía',`¿Cómo quieres llamarme?`,`${pet} quiere plantar tu primera meta`];
  const goalReady=title.trim()&&Number(amount)>0&&date;
  async function finish(withGoal:boolean){
    await onFinish({name:name.trim(),petName:petName.trim(),goal:withGoal&&goalReady?{title:title.trim(),amount:Number(amount),date}:null});
  }
  return <main className="av-page av-onboarding">
    <section className="av-card av-onboarding-card" aria-labelledby="av-onboarding-title">
      <div className="av-onboarding-head">
        <Mascot key={step} mood={moods[step]} growth={step+1} size={128}/>
        <div>
          <p className="av-onboarding-step">Paso {step+1} de 3</p>
          <div className="av-onboarding-dots" aria-hidden="true">{[0,1,2].map(i=><span key={i} className={i<=step?'is-done':''}/>)}</div>
          <h1 id="av-onboarding-title" ref={heading} tabIndex={-1}>{titles[step]}</h1>
        </div>
      </div>

      {step===0&&<form onSubmit={event=>{event.preventDefault();if(name.trim()&&consent)setStep(1);}}>
        <p>Vamos a cuidar tu dinero como si fuera un jardín: cada aporte hace crecer una planta. Yo te acompaño, celebro contigo y nunca te juzgo.</p>
        <label>¿Cómo te llamas?<input required maxLength={100} autoComplete="name" value={name} onChange={event=>setName(event.target.value)}/></label>
        <p>Usa datos de práctica. Guardaremos tu perfil, preferencias y movimientos en Supabase. Solo los aportes de un grupo son visibles para sus miembros.</p>
        <label className="av-check"><input required type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>Acepto este uso de mis datos.</label>
        <div className="av-actions"><span/><button type="submit" className="av-with-icon" disabled={busy}>Siguiente<ArrowRight size={20} aria-hidden="true"/></button></div>
      </form>}

      {step===1&&<form onSubmit={event=>{event.preventDefault();setStep(2);}}>
        <p>{firstName(name)?`Un gusto, ${firstName(name)}. `:''}Ponme el nombre que quieras: así sabrás que soy yo quien te habla en el jardín, en el asistente y cuando uses la voz. Puedes cambiarlo después en Preferencias.</p>
        <label>Nombre de tu alcancía<input value={petName} maxLength={24} autoComplete="off" spellCheck={false} placeholder="Por ejemplo, Chanchi…" onChange={event=>setPetName(event.target.value)}/></label>
        <div className="av-chips" role="group" aria-label="Sugerencias de nombre">
          {PET_NAME_SUGGESTIONS.map(suggestion=><button type="button" key={suggestion} className="av-secondary av-chip" aria-pressed={petName===suggestion} onClick={()=>setPetName(suggestion)}>{suggestion}</button>)}
        </div>
        <div className="av-actions">
          <button type="button" className="av-secondary av-with-icon" onClick={()=>setStep(0)}><ArrowLeft size={20} aria-hidden="true"/>Atrás</button>
          <button type="submit" className="av-with-icon">{petName.trim()?`Me llamo ${capitalized(petName.trim())}`:'Decidir después'}<ArrowRight size={20} aria-hidden="true"/></button>
        </div>
      </form>}

      {step===2&&<form onSubmit={event=>{event.preventDefault();void finish(true);}}>
        <p>¿Para qué quieres ahorrar? Una laptop, un viaje, un fondo para imprevistos… Dime cuánto y para cuándo, y plantaré su maceta. Si prefieres, lo hacemos luego.</p>
        <label>Nombre de la meta<input value={title} maxLength={100} autoComplete="off" placeholder="Por ejemplo, Laptop para la universidad…" onChange={event=>setTitle(event.target.value)}/></label>
        <div className="av-fields">
          <label>Monto objetivo (S/)<input type="number" inputMode="decimal" autoComplete="off" min="0.01" step="0.01" value={amount} onChange={event=>setAmount(event.target.value)}/></label>
          <label>Fecha objetivo<input type="date" min={localDate()} value={date} onChange={event=>setDate(event.target.value)}/></label>
        </div>
        <div className="av-actions">
          <button type="button" className="av-secondary av-with-icon" onClick={()=>setStep(1)}><ArrowLeft size={20} aria-hidden="true"/>Atrás</button>
          <span className="av-onboarding-final">
            <button type="button" className="av-link" disabled={busy} onClick={()=>void finish(false)}>Saltar por ahora</button>
            <button type="submit" className="av-with-icon" disabled={busy||!goalReady}><Sprout size={20} aria-hidden="true"/>{busy?'Plantando…':'Plantar y empezar'}</button>
          </span>
        </div>
      </form>}

      {error&&<p role="alert" className="av-error">{error}</p>}
      <button className="av-link" onClick={onSignOut}>Cerrar sesión</button>
    </section>
  </main>;
}
