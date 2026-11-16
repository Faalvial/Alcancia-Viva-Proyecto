/** Silueta de carga (maceta y tarjetas). Sin brillo animado con movimiento reducido. */
export function Skeleton() {
  return <div className="av-skeleton" aria-hidden="true">
    <div className="av-skel-header"><span className="av-skel-block av-skel-logo"/><span className="av-skel-block av-skel-line" style={{width:'9rem'}}/><span className="av-skel-block av-skel-avatar"/></div>
    <div className="av-skel-body">
      <span className="av-skel-block av-skel-line" style={{width:'40%',height:'2.2rem'}}/>
      <span className="av-skel-block av-skel-line" style={{width:'65%'}}/>
      <div className="av-skel-scene">
        {[0,1,2].map(i=><svg key={i} className="av-skel-pot" viewBox="0 0 80 80"><path className="av-skel-shape" d="M38 6 C 30 16, 28 26, 39 34 C 50 26, 48 16, 38 6 Z"/><rect className="av-skel-shape" x="16" y="34" width="48" height="9" rx="3"/><path className="av-skel-shape" d="M20 45 H60 L55 72 Q54 75 51 75 H29 Q26 75 25 72 Z"/></svg>)}
      </div>
      <div className="av-skel-cards"><span className="av-skel-block av-skel-card"/><span className="av-skel-block av-skel-card"/></div>
    </div>
  </div>;
}

/** Pantalla de carga accesible: anuncia el estado y muestra la silueta. */
export function LoadingScreen({label}:{label:string}) {
  return <main className="av-page av-loading" aria-busy="true">
    <p role="status" className="av-sr-only">{label}</p>
    <Skeleton/>
  </main>;
}
