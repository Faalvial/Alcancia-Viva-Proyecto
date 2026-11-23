import type React from 'react';

export type MascotMood='happy'|'listening'|'thinking'|'speaking'|'celebrating'|'encouraging'|'sleepy';

/**
 * Mascota de Alcancía Viva: un cerdito-alcancía con un brote en la ranura de la
 * moneda. El brote crece con el avance (`growth`, 0–5, como las etapas del jardín).
 * Decorativa (aria-hidden): lo que dice siempre está también en texto.
 * Sus animaciones son breves (< 5 s) y se anulan con movimiento reducido.
 */
export function Mascot({mood='happy',growth=1,size=96,className=''}:{mood?:MascotMood;growth?:number;size?:number;className?:string}) {
  const stage=Math.max(0,Math.min(5,Math.round(growth)));
  const leaf=6+stage*2.2;
  const stem=10+stage*5;
  const eyesClosed=mood==='happy'||mood==='celebrating';
  return <svg className={`av-mascot av-mascot--${mood} ${className}`} viewBox="0 0 160 150" width={size} height={size*150/160} aria-hidden="true" focusable="false"
    style={{'--sprout':stem} as React.CSSProperties}>
    <ellipse className="av-mascot-shadow" cx="82" cy="140" rx="46" ry="6"/>
    <g className="av-mascot-body">
      {/* Cola en espiral */}
      <path className="av-mascot-line" d="M33 86c-12-3-16 8-9 12 6 3 11-4 5-8" fill="none" strokeWidth="4" strokeLinecap="round"/>
      {/* Patas */}
      <rect className="av-mascot-fill av-mascot-line" x="46" y="108" width="14" height="22" rx="6" strokeWidth="4"/>
      <rect className="av-mascot-fill av-mascot-line" x="98" y="108" width="14" height="22" rx="6" strokeWidth="4"/>
      {/* Oreja trasera */}
      <path className="av-mascot-inner av-mascot-line" d="M92 50 98 32 110 52Z" strokeWidth="4" strokeLinejoin="round"/>
      {/* Cuerpo */}
      <ellipse className="av-mascot-fill av-mascot-line" cx="80" cy="86" rx="50" ry="36" strokeWidth="4"/>
      {/* Oreja delantera */}
      <path className="av-mascot-inner av-mascot-line av-mascot-ear" d="M108 52 118 34 126 58Z" strokeWidth="4" strokeLinejoin="round"/>
      {/* Ranura de la moneda */}
      <rect className="av-mascot-slot" x="58" y="51" width="28" height="6" rx="3"/>
      {/* Hocico */}
      <ellipse className="av-mascot-inner av-mascot-line" cx="130" cy="90" rx="15" ry="13" strokeWidth="4"/>
      <ellipse className="av-mascot-ink" cx="125.5" cy="90" rx="2.4" ry="3.6"/>
      <ellipse className="av-mascot-ink" cx="134.5" cy="90" rx="2.4" ry="3.6"/>
      {/* Mejilla */}
      <ellipse className="av-mascot-blush" cx="108" cy="98" rx="8" ry="5"/>
      {/* Ojos */}
      <g className="av-mascot-eyes">
        {eyesClosed?<>
          <path className="av-mascot-line" d="M96 77q5-6 10 0" fill="none" strokeWidth="3.6" strokeLinecap="round"/>
          <path className="av-mascot-line" d="M112 75q5-6 10 0" fill="none" strokeWidth="3.6" strokeLinecap="round"/>
        </>:mood==='sleepy'?<>
          <path className="av-mascot-line" d="M96 77h10" strokeWidth="3.6" strokeLinecap="round"/>
          <path className="av-mascot-line" d="M112 75h10" strokeWidth="3.6" strokeLinecap="round"/>
        </>:<>
          <ellipse className="av-mascot-ink av-mascot-eye" cx="101" cy={mood==='thinking'?72:75} rx="4.2" ry="5.2"/>
          <ellipse className="av-mascot-ink av-mascot-eye" cx="117" cy={mood==='thinking'?70:73} rx="4.2" ry="5.2"/>
          <circle className="av-mascot-shine" cx={mood==='thinking'?102.5:102.5} cy={mood==='thinking'?70:73} r="1.5"/>
          <circle className="av-mascot-shine" cx="118.5" cy={mood==='thinking'?68:71} r="1.5"/>
        </>}
      </g>
      {/* Boca */}
      {mood==='speaking'||mood==='celebrating'
        ?<ellipse className="av-mascot-mouth" cx="113" cy="108" rx="5" ry={mood==='celebrating'?4.5:3.4}/>
        :mood==='thinking'?<circle className="av-mascot-mouth" cx="114" cy="108" r="2.4"/>
        :mood==='sleepy'?<path className="av-mascot-line" d="M109 108h8" strokeWidth="3" strokeLinecap="round"/>
        :<path className="av-mascot-line" d="M107 105q6 6 12 0" fill="none" strokeWidth="3.4" strokeLinecap="round"/>}
    </g>
    {/* Brote que crece con el avance */}
    <g transform="translate(72 52)"><g className="av-mascot-sprout">
      <path className="av-mascot-stem" d={`M0 0V${-stem}`} strokeWidth="3.4" strokeLinecap="round"/>
      <path className="av-mascot-leaf" d={`M0 ${-stem+2}c-${leaf} -2 -${leaf*1.35} -${leaf} -${leaf*1.2} -${leaf*1.25}c${leaf*0.9} -${leaf*0.2} ${leaf*1.15} ${leaf*0.45} ${leaf*1.2} ${leaf*1.25}Z`}/>
      <path className="av-mascot-leaf av-mascot-leaf--light" d={`M0 ${-stem+1}c${leaf} -2 ${leaf*1.35} -${leaf} ${leaf*1.2} -${leaf*1.25}c-${leaf*0.9} -${leaf*0.2} -${leaf*1.15} ${leaf*0.45} -${leaf*1.2} ${leaf*1.25}Z`}/>
      {stage>=4&&<g className="av-mascot-flower" transform={`translate(0 ${-stem-4})`}>
        {[0,72,144,216,288].map(angle=><ellipse key={angle} rx="3.6" ry="5.6" cy="-5" transform={`rotate(${angle})`}/>)}
        <circle className="av-mascot-flower-core" r="3"/>
      </g>}
    </g></g>
    {mood==='celebrating'&&<g transform="translate(40 26)"><g className="av-mascot-coin">
      <circle r="11"/><rect x="-2" y="-6" width="4" height="12" rx="2"/>
    </g></g>}
  </svg>;
}
