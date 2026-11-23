import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import type React from 'react';
import type { Session } from '@supabase/supabase-js';
import { database, requireDatabase, passwordRecovery } from './client';
import { enterDemo } from './demo';
import { PasswordRecovery, RecoveryEmailForm } from './PasswordRecovery';
import { cleanRecoveryUrl } from './recoveryFlow';
import { SpeechService } from '../services/voice/speechService';
import { Pause, Play } from 'lucide-react';
import { LoadingScreen } from '../components/Skeleton';
import { Mascot } from '../components/Mascot';
import { BrandIcon, errorMessage } from './shared';
import './live.css';
import '../components/components.css';

// El espacio con sesión (jardín, metas, voz, historial…) se descarga aparte: el acceso carga menos.
const loadWorkspace = () => import('./Workspace');
const Workspace = lazy(()=>loadWorkspace().then(m=>({default:m.Workspace})));

export function CollaborativeApp({prerendered=false}:{prerendered?:boolean}) {
  // Tercer argumento: el mismo estado al hidratar el acceso prerenderizado (React lo exige).
  const recovery=useSyncExternalStore(passwordRecovery.subscribe,passwordRecovery.getSnapshot,passwordRecovery.getSnapshot);
  const [session,setSession]=useState<Session|null>(null);
  // Con el acceso prerenderizado no hay sesión guardada: se parte del acceso para hidratarlo tal cual.
  const [ready,setReady]=useState(prerendered);
  useEffect(()=>{const root=document.getElementById('root');root?.removeAttribute('inert');delete root?.dataset.prerendered;},[]);
  useEffect(()=>{if(ready&&recovery==='expired')history.replaceState(history.state,'',cleanRecoveryUrl(location.href));},[ready,recovery]);
  useEffect(()=>{
    if(!database){setReady(true);return;}
    database.auth.getSession().then(({data})=>{setSession(data.session);setReady(true);});
    const {data}=database.auth.onAuthStateChange((_event,s)=>{setSession(s);setReady(true);});
    return()=>{data.subscription.unsubscribe();SpeechService.stopSpeaking();};
  },[]);
  if(!ready)return <LoadingScreen label="Preparando tu espacio…"/>;
  if(!database)return <main className="av-page"><h1>Alcancía Viva</h1><p>Configura la conexión con Supabase para usar las cuentas y los grupos.</p></main>;
  if(recovery!=='none')return <PasswordRecovery userId={session?.user.id||null} valid={recovery==='active'&&Boolean(session)} onFinish={()=>passwordRecovery.finish()}/>;
  return session ? <Suspense fallback={<LoadingScreen label="Despertando a tu alcancía…"/>}><Workspace key={session.user.id} session={session}/></Suspense> : <Auth/>;
}

export function Auth() {
  useEffect(()=>{const idle=(window as unknown as {requestIdleCallback?:(cb:()=>void)=>number}).requestIdleCallback;const start=()=>{void loadWorkspace();};if(idle)idle(start);else window.setTimeout(start,1500);},[]);
  const [recovering,setRecovering]=useState(false);
  const [signup,setSignup]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [name,setName]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState(''),[error,setError]=useState('');
  const [breezePaused,setBreezePaused]=useState(false);
  async function submit(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try {
      const db=requireDatabase();
      if(signup) {
        if(!consent)throw new Error('Acepta el tratamiento de tus datos para crear tu cuenta.');
        const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/`,data:{display_name:name.trim(),consent_at:new Date().toISOString()}}});
        if(error)throw error;
        if(!data.session)setMessage('Revisa tu correo para confirmar la cuenta. Después vuelve aquí e inicia sesión.');
      } else {
        const {error}=await db.auth.signInWithPassword({email,password});
        if(error)throw new Error(error.message==='Invalid login credentials'?'Correo o contraseña incorrectos.':error.message);
      }
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  return <main className="av-auth av-page">
    <div className="av-brand" translate="no"><BrandIcon/> Alcancía Viva</div>
    <section className="av-auth-grid">
      <div className="av-welcome"><p className="av-eyebrow">CADA PEQUEÑO PASO CUENTA</p><h1>Tu ahorro,<br/>un jardín que crece.</h1>
        <p>Comprende tus gastos, cuida tus metas y avanza junto a quienes tú elijas.</p>
        <div className={`av-welcome-art ${breezePaused?'is-paused':''}`}><img src="/garden/floreciente.webp" srcSet="/garden/floreciente-720.webp 720w, /garden/floreciente.webp 1280w" sizes="(max-width: 767px) 92vw, 46vw" alt="Jardín con flores rosadas, margaritas y un sendero de piedra" width={1280} height={720} fetchPriority="high"/>
          {/* Capa del follaje con una brisa muy lenta (se detiene con movimiento reducido o con el botón). */}
          <img className="av-welcome-breeze" src="/garden/floreciente.webp" srcSet="/garden/floreciente-720.webp 720w, /garden/floreciente.webp 1280w" sizes="(max-width: 767px) 92vw, 46vw" alt="" aria-hidden="true" width={1280} height={720}/>
          <button type="button" className="av-secondary av-icon-button av-breeze-toggle" aria-pressed={breezePaused} aria-label={breezePaused?'Reanudar la brisa del jardín':'Pausar la brisa del jardín'} onClick={()=>setBreezePaused(!breezePaused)}>{breezePaused?<Play size={20} aria-hidden="true"/>:<Pause size={20} aria-hidden="true"/>}</button></div>
      </div>
      <section className="av-card" aria-labelledby="auth-title">{recovering?<RecoveryEmailForm initialEmail={email} onBack={()=>setRecovering(false)}/>:<><div className="av-auth-hello"><Mascot mood="happy" growth={2} size={72}/><h2 id="auth-title">{signup?'Crea tu espacio':'Qué bueno verte por el jardín'}</h2></div>
        <p>Organiza tus gastos, alcanza tus metas y haz crecer tu ahorro.</p>
        <form onSubmit={submit}>
          {signup&&<label>Tu nombre<input autoComplete="name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>}
          <label>Correo electrónico<input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Contraseña<input autoComplete={signup?'new-password':'current-password'} type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
          {signup&&<label className="av-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/>
            Acepto guardar en Supabase mi perfil y los datos de práctica que registre. En grupos se comparten mis aportes; mis gastos personales son privados.</label>}
          <button disabled={busy}>{busy?'Un momento…':signup?'Crear cuenta':'Entrar'}</button>
        </form>
        {error&&<p role="alert" className="av-error">{error}</p>}{message&&<p role="status">{message}</p>}
        {!signup&&<button className="av-link" disabled={busy} onClick={()=>{setRecovering(true);setPassword('');setError('');setMessage('');}}>¿Olvidaste tu contraseña?</button>}
        <button className="av-link" disabled={busy} onClick={()=>{setSignup(!signup);setError('');setMessage('');}}>{signup?'Ya tengo cuenta':'Quiero crear una cuenta'}</button>
        <div className="av-demo-entry"><p>¿Solo quieres mirar? Prueba la app con datos de práctica, sin crear cuenta. Nada se guarda fuera de este navegador.</p>
          <button type="button" className="av-secondary" disabled={busy} onClick={()=>{enterDemo();location.reload();}}>Probar sin cuenta</button></div></>}
      </section>
    </section>
  </main>;
}

