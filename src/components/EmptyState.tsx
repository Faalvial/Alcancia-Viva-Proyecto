import type { ReactNode } from 'react';
import { Mascot } from './Mascot';

/** Ilustración propia: una maceta vacía y una semilla a punto de caer en la tierra. */
export function SeedPot({className=''}:{className?:string}) {
  return <svg className={`av-seed-pot ${className}`} viewBox="0 0 160 150" aria-hidden="true" focusable="false">
    <ellipse className="av-seed-pot-shadow" cx="80" cy="138" rx="46" ry="6"/>
    <path className="av-seed-pot-trail" d="M104 20 C 112 34, 100 44, 86 50" fill="none" strokeDasharray="2 6" strokeLinecap="round"/>
    <g className="av-seed-pot-seed" transform="rotate(-28 82 56)">
      <ellipse cx="82" cy="56" rx="6.5" ry="10"/>
      <path className="av-seed-pot-seed-line" d="M82 48 Q 79 56 82 64" fill="none"/>
    </g>
    <path className="av-seed-pot-body" d="M44 86 H116 L106 132 Q105 136 101 136 H59 Q55 136 54 132 Z"/>
    <path className="av-seed-pot-band" d="M46 95 H114 L113 100 H47 Z"/>
    <rect className="av-seed-pot-rim" x="36" y="72" width="88" height="16" rx="5"/>
    <ellipse className="av-seed-pot-soil" cx="80" cy="73" rx="38" ry="5.5"/>
  </svg>;
}

/** Estado vacío: la mascota anima (o la maceta con semilla), título, texto y una sola acción. */
export function EmptyState({title,text,action,headingLevel=2,mascot=true}:{title:string;text:string;action?:{label:string;onClick:()=>void;icon?:ReactNode};headingLevel?:2|3;mascot?:boolean}) {
  const Heading=headingLevel===2?'h2':'h3';
  return <section className="av-empty-state">
    {mascot?<Mascot mood="encouraging" growth={0} size={120}/>:<SeedPot/>}
    <Heading>{title}</Heading>
    <p>{text}</p>
    {action&&<button type="button" className="av-with-icon" onClick={action.onClick}>{action.icon}{action.label}</button>}
  </section>;
}
