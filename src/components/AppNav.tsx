import type { LucideIcon } from 'lucide-react';
import { MessageCircle, ScrollText, Settings, Sprout, Target, Users } from 'lucide-react';

export type TabId = 'garden'|'goals'|'groups'|'history'|'assistant'|'settings';

/** label: nombre accesible completo; short: etiqueta visible en la tab bar móvil (contenida en label). */
export const NAV_ITEMS: {id:TabId;label:string;short:string;Icon:LucideIcon}[] = [
  {id:'garden',label:'Mi jardín',short:'Jardín',Icon:Sprout},
  {id:'goals',label:'Metas',short:'Metas',Icon:Target},
  {id:'groups',label:'Mis grupos',short:'Grupos',Icon:Users},
  {id:'history',label:'Movimientos',short:'Movimientos',Icon:ScrollText},
  {id:'assistant',label:'Asistente',short:'Asistente',Icon:MessageCircle},
  {id:'settings',label:'Preferencias',short:'Preferencias',Icon:Settings},
];

/**
 * Navegación principal adaptable:
 * - móvil (< 768 px): tab bar fija inferior con 5 destinos (Preferencias pasa al header);
 * - tablet (768–1023 px): rail de 72 px con iconos y tooltip;
 * - escritorio (≥ 1024 px): barra lateral de 210 px con icono y texto.
 * Con texto 200 % se convierte en una fila que se ajusta, sin posición fija.
 */
export function AppNav({tab,onChange,badges={}}:{tab:string;onChange:(id:TabId)=>void;badges?:Partial<Record<TabId,{count:number;label:string}>>}) {
  return <nav aria-label="Navegación principal" className="av-nav safe-bottom">
    {NAV_ITEMS.map(({id,label,short,Icon})=>{const badge=badges[id];const count=badge?.count||0;return <button key={id} type="button" className="av-nav-item" data-tab={id} data-label={label}
      aria-label={count?`${label}, ${badge?.label}`:label} aria-current={tab===id?'page':undefined} onClick={()=>onChange(id)}>
      <span className="av-nav-icon" aria-hidden="true"><Icon size={20} strokeWidth={2}/>{count>0&&<span className="av-nav-badge">{count>9?'9+':count}</span>}</span>
      <span className="av-nav-text av-nav-text--long" aria-hidden="true">{label}</span>
      <span className="av-nav-text av-nav-text--short" aria-hidden="true">{short}</span>
    </button>;})}
  </nav>;
}

/** Nombre de cada pestaña en la URL (?tab=metas), en español. */
export const TAB_SLUGS:Record<TabId,string>={garden:'jardin',goals:'metas',groups:'grupos',history:'movimientos',assistant:'asistente',settings:'preferencias'};

export function tabFromUrl(search:string):TabId {
  const slug=new URLSearchParams(search).get('tab');
  return (Object.entries(TAB_SLUGS).find(([,value])=>value===slug)?.[0] as TabId|undefined)||'garden';
}

/** La misma URL con la pestaña actual; «Mi jardín» no añade parámetro. */
export function urlWithTab(href:string,tab:string) {
  const url=new URL(href);
  const slug=TAB_SLUGS[tab as TabId];
  if(!slug||tab==='garden')url.searchParams.delete('tab');else url.searchParams.set('tab',slug);
  return url.toString();
}
