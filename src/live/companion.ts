import type { Goal, Movement } from './client';
import { shiftDay, weekDailyExpenses } from './timeline.ts';

/**
 * La voz de la mascota (cerdito-alcancía): saludos, relato de la semana y frases
 * variadas. Funciones puras; el «azar» es determinista (semilla) para que una misma
 * pantalla no cambie de frase en cada render y para poder probarlo.
 * Tono: cálido y alentador, sin juicios (nunca «gastaste demasiado»).
 */

export type CompanionMood='happy'|'encouraging'|'celebrating'|'thinking'|'sleepy';
export const DEFAULT_PET_NAME='tu alcancía';
export const PET_NAME_SUGGESTIONS=['Chanchi','Brotito','Monedita','Pancho'];

export function hashSeed(text:string){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function pick<T>(options:readonly T[],seed:number|string){const n=typeof seed==='number'?seed:hashSeed(seed);return options[n%options.length];}

export function firstName(displayName:string){return displayName.trim().split(/\s+/)[0]||'';}
export function petNameOf(name:string|undefined|null){const clean=(name||'').trim().slice(0,24);return clean||DEFAULT_PET_NAME;}
/** «Chanchi» o «Tu alcancía» al comienzo de una frase. */
export const capitalized=(text:string)=>text.charAt(0).toLocaleUpperCase('es-PE')+text.slice(1);

/** Hora local de Lima (0–23). */
export function limaHour(date=new Date()){
  return Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',hour:'numeric',hourCycle:'h23'}).format(date));
}
export function greetingFor(hour:number){return hour<5?'Buenas noches':hour<12?'Buenos días':hour<19?'Buenas tardes':'Buenas noches';}

const soles=(value:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(value);
const cents=(value:number)=>Math.round(value*100);

export interface WeekStory {
  saved:number; expenses:number; previousExpenses:number; income:number;
  movements:number; activeDays:number; topGoal:string|null;
}

/** Resumen de la semana actual (lunes a hoy) y de la anterior, solo con movimientos vigentes. */
export function weekStory(movements:Pick<Movement,'type'|'amount'|'occurred_on'|'reversed_at'|'goal_id'>[],goals:Pick<Goal,'id'|'title'>[],today:string):WeekStory {
  const week=weekDailyExpenses(movements,today);
  const monday=week[0].day;
  const valid=movements.filter(m=>!m.reversed_at&&Number.isFinite(m.amount));
  const thisWeek=valid.filter(m=>m.occurred_on>=monday&&m.occurred_on<=today);
  const lastMonday=shiftDay(monday,-7),lastSameDay=shiftDay(today,-7);
  const sum=(list:typeof valid,type:Movement['type'])=>list.filter(m=>m.type===type).reduce((total,m)=>total+cents(m.amount),0)/100;
  const previous=valid.filter(m=>m.occurred_on>=lastMonday&&m.occurred_on<=lastSameDay);
  const byGoal=new Map<string,number>();
  for(const m of thisWeek)if(m.type==='savings'&&m.goal_id)byGoal.set(m.goal_id,(byGoal.get(m.goal_id)||0)+cents(m.amount));
  const top=[...byGoal.entries()].sort((a,b)=>b[1]-a[1])[0];
  const last7=new Set(valid.filter(m=>m.occurred_on>shiftDay(today,-7)&&m.occurred_on<=today).map(m=>m.occurred_on));
  return {
    saved:sum(thisWeek,'savings'),expenses:sum(thisWeek,'expense'),income:sum(thisWeek,'income'),
    previousExpenses:sum(previous,'expense'),movements:thisWeek.length,activeDays:last7.size,
    topGoal:top?goals.find(g=>g.id===top[0])?.title||null:null,
  };
}

/** Lo que la mascota te cuenta en el saludo del jardín: estado de ánimo y dos frases como máximo. */
export function weekMessage(story:WeekStory,seed:string):{mood:CompanionMood;lines:string[]} {
  if(!story.movements){
    return {mood:'encouraging',lines:[pick([
      'Esta semana aún no anotamos nada. Cuando quieras, cuéntame tu primer movimiento y lo registramos juntos.',
      'Todavía no hay movimientos esta semana. Un pequeño registro hoy ya ayuda a tu jardín.',
      'Semana nueva, jardín tranquilo. Cuando registres algo, aquí te cuento cómo vamos.',
    ],seed)]};
  }
  const lines:string[]=[];
  if(story.saved>0)lines.push(story.topGoal
    ?pick([`Esta semana sumaste ${soles(story.saved)} a tus metas; «${story.topGoal}» es la que más creció.`,`Le diste ${soles(story.saved)} a tus metas esta semana. «${story.topGoal}» lo nota.`],seed)
    :`Esta semana sumaste ${soles(story.saved)} a tus metas.`);
  if(story.previousExpenses>0&&story.expenses<story.previousExpenses)
    lines.push(`Llevas ${soles(story.previousExpenses-story.expenses)} menos en gastos que a estas alturas de la semana pasada.`);
  else if(story.previousExpenses>0&&story.expenses>story.previousExpenses)
    lines.push('Esta semana hubo algo más de gastos que la anterior. Si quieres, los miramos juntos en Movimientos.');
  if(lines.length<2&&story.activeDays>=3)lines.push(`Me cuidaste ${story.activeDays} de los últimos 7 días. ¡Se siente!`);
  if(!lines.length)lines.push(pick(['Ya tienes movimientos esta semana. Cada registro me ayuda a entender tu ritmo.','Vas anotando tu semana; así es más fácil ver hacia dónde va tu dinero.'],seed));
  return {mood:story.saved>0?'happy':'encouraging',lines:lines.slice(0,2)};
}

/* ---------- Frases habladas variadas ---------- */

export const PHRASES={
  saved:['Listo, ya lo anoté.','¡Hecho! Ya está en tu jardín.','Anotado. Gracias por contármelo.'],
  cancelled:['Está bien, no guardé nada.','Sin problema, lo dejamos así.'],
  notUnderstood:['Perdona, no te entendí.','Uy, no lo capté bien.'],
  amount:['¿Cuánto fue?','¿De cuánto fue?'],
  goal:['¿Para qué meta es?','¿A qué meta lo sumo?'],
  type:['¿Fue un gasto, un ingreso o un ahorro?'],
  navigate:['Vamos a {label}.','Te llevo a {label}.'],
  ask:['Le pregunto a la IA y te cuento.','Déjame pensarlo con la IA.'],
  welcome:['¿Qué quieres contarme?','Te escucho. ¿Qué registramos?','Cuéntame, ¿qué pasó con tu dinero hoy?'],
} as const;

export function phrase(kind:keyof typeof PHRASES,seed:number|string,values:Record<string,string>={}){
  return pick(PHRASES[kind],seed).replace(/\{(\w+)\}/g,(_,key)=>values[key]??'');
}

/** Presentación honesta de la mascota en el asistente. */
export function assistantIntro(petName:string,name:string){
  const pet=petNameOf(petName);
  const who=pet===DEFAULT_PET_NAME?'Soy tu alcancía':`Soy ${pet}, tu alcancía`;
  return `${name?`Hola, ${name}. `:''}${who}. Respondo con ayuda de inteligencia artificial para que entiendas tus registros; no muevo dinero ni creo aportes por mi cuenta.`;
}
