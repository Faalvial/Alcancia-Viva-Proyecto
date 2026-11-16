import type { Goal, Movement } from './client';

/** Funciones puras de presentación para el rediseño PC04 (historial, metas, presupuesto). */

export type MovementType = Movement['type'];
export type TypeFilter = MovementType | 'all';

const DAY_MS = 86400000;
const toUtc = (day:string) => Date.parse(`${day}T12:00:00Z`);

export function shiftDay(day:string,offset:number) {
  return new Date(toUtc(day)+offset*DAY_MS).toISOString().slice(0,10);
}

/** «Hoy», «Ayer» o la fecha larga en español («lunes, 10 de noviembre»; con año si no es el actual). */
export function dayLabel(day:string,today:string) {
  if(day===today)return 'Hoy';
  if(day===shiftDay(today,-1))return 'Ayer';
  const options:Intl.DateTimeFormatOptions={weekday:'long',day:'numeric',month:'long',timeZone:'UTC'};
  if(day.slice(0,4)!==today.slice(0,4))options.year='numeric';
  const text=new Intl.DateTimeFormat('es-PE',options).format(new Date(toUtc(day)));
  return text.charAt(0).toLocaleUpperCase('es-PE')+text.slice(1);
}

const plain = (value:string) => value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();

/** Filtra por tipo y por texto (descripción, categoría o título de la meta), sin distinguir tildes. */
export function filterMovements<T extends Pick<Movement,'type'|'description'|'category'|'goal_id'>>(movements:T[],type:TypeFilter,query:string,goals:Pick<Goal,'id'|'title'>[]=[]) {
  const words=plain(query).split(/\s+/).filter(Boolean);
  return movements.filter(m=>{
    if(type!=='all'&&m.type!==type)return false;
    if(!words.length)return true;
    const goal=m.goal_id?goals.find(g=>g.id===m.goal_id)?.title||'':'';
    const haystack=plain(`${m.description} ${m.category} ${goal}`);
    return words.every(word=>haystack.includes(word));
  });
}

/** Agrupa por día (más reciente primero) conservando el orden original dentro de cada día. */
export function groupByDay<T extends Pick<Movement,'occurred_on'>>(movements:T[],today:string) {
  const days=new Map<string,T[]>();
  for(const m of movements){const list=days.get(m.occurred_on);if(list)list.push(m);else days.set(m.occurred_on,[m]);}
  return [...days.entries()].sort(([a],[b])=>b.localeCompare(a)).map(([day,items])=>({day,label:dayLabel(day,today),items}));
}

/** Gastos vigentes de cada día de la semana actual (lunes a domingo). Los días futuros valen null. */
export function weekDailyExpenses(movements:Pick<Movement,'type'|'amount'|'occurred_on'|'reversed_at'>[],today:string) {
  const weekday=(new Date(toUtc(today)).getUTCDay()+6)%7;
  const monday=shiftDay(today,-weekday);
  return ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((name,index)=>{
    const day=shiftDay(monday,index);
    if(day>today)return {day,name,amount:null as number|null,today:false};
    const cents=movements.filter(m=>m.type==='expense'&&!m.reversed_at&&m.occurred_on===day&&Number.isFinite(m.amount))
      .reduce((sum,m)=>sum+Math.round(m.amount*100),0);
    return {day,name,amount:cents/100,today:day===today};
  });
}

/** Lo que falta para la meta, nunca negativo. */
export function goalRemaining(goal:Pick<Goal,'target_amount'|'current_amount'>) {
  const target=Number.isFinite(goal.target_amount)?goal.target_amount:0;
  const current=Number.isFinite(goal.current_amount)?goal.current_amount:0;
  return Math.max(0,Math.round((target-current)*100)/100);
}

/**
 * Tono del medidor de presupuesto: 0 = verde (holgado) → 1 = ámbar (cerca o por encima
 * del límite). Cambia de forma gradual a partir de la mitad. Nunca hay un estado rojo.
 */
export function budgetTone(spent:number,budget:number) {
  if(!(budget>0)||!Number.isFinite(spent))return 0;
  const ratio=spent/budget;
  return Math.min(1,Math.max(0,(ratio-0.5)/0.45));
}

/** Iniciales para avatares de grupo: hasta 4 visibles y el resto como «+N». */
export function avatarStack<T>(members:T[],max=4) {
  return {shown:members.slice(0,max),extra:Math.max(0,members.length-max)};
}
