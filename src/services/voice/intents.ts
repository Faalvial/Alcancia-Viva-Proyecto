import type { Goal, Movement, Profile } from '../../live/client';
import { interpretLocally, normalize } from '../../live/domain.ts';
import { goalRemaining, weekDailyExpenses } from '../../live/timeline.ts';

/**
 * Router de intenciones de voz (FR-11, FR-23, HU-14). Funciones puras: reciben el
 * texto reconocido y los datos ya cargados en el cliente; no llaman a la IA.
 *
 * Orden: asistente («pregunta: …») → consultas («cuánto llevo para…») →
 * navegación («ir a metas») → registro (interpretLocally + slot-filling).
 */

export type VoiceTab='garden'|'goals'|'groups'|'history'|'assistant'|'settings';
export type MovementType=Movement['type'];

export type Intent=
  | {kind:'empty'}
  | {kind:'navigate';tab:VoiceTab;label:string}
  | {kind:'query';query:'week-spending'}
  | {kind:'query';query:'goal';goalId:string|null;title:string}
  | {kind:'assistant';question:string}
  | {kind:'register';draft:VoiceDraft};

export interface VoiceDraft {
  text:string; type:MovementType|''; amount:number|null; category:string; goalId:string; planning:boolean;
}
export type Slot='type'|'amount'|'goal';

const clean=(text:string)=>normalize(text).replace(/[¿?¡!.,;:«»"“”()]/g,' ').replace(/\s+/g,' ').trim();

/* ---------- Navegación ---------- */

const NAV_TARGETS:{tab:VoiceTab;label:string;words:string[]}[]=[
  {tab:'garden',label:'Mi jardín',words:['jardin','inicio','mi jardin']},
  {tab:'goals',label:'Metas',words:['metas','mis metas']},
  {tab:'groups',label:'Mis grupos',words:['grupos','mis grupos']},
  {tab:'history',label:'Movimientos',words:['movimientos','mis movimientos','historial']},
  {tab:'assistant',label:'Asistente',words:['asistente','el asistente']},
  {tab:'settings',label:'Preferencias',words:['preferencias','ajustes','configuracion']},
];
const NAV_VERB=/^(?:por favor )?(?:ir|ve|vamos|anda|abre|abrir|abreme|muestra|muestrame|mostrar|ensename|llevame|lleva|quiero ver|ver|pasa|cambia|regresa|vuelve)(?: a| al| a la| hacia)?\s+/;
const ARTICLES=/^(?:el|la|los|las|a|al|mi|mis)\s+/;

export function navigationIntent(text:string):Intent|null {
  let rest=clean(text).replace(/\s+por favor$/,'');
  rest=rest.replace(NAV_VERB,'');
  while(ARTICLES.test(rest)&&!NAV_TARGETS.some(t=>t.words.includes(rest)))rest=rest.replace(ARTICLES,'');
  const target=NAV_TARGETS.find(t=>t.words.includes(rest));
  return target?{kind:'navigate',tab:target.tab,label:target.label}:null;
}

/* ---------- Montos dichos con palabras ---------- */

const UNITS:Record<string,number>={
  cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,
  once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,
  veinte:20,veintiun:21,veintiuno:21,veintiuna:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,
  veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,
  treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,
  cien:100,ciento:100,doscientos:200,doscientas:200,trescientos:300,trescientas:300,cuatrocientos:400,cuatrocientas:400,
  quinientos:500,quinientas:500,seiscientos:600,seiscientas:600,setecientos:700,setecientas:700,
  ochocientos:800,ochocientas:800,novecientos:900,novecientas:900,
};

function wordsToNumber(words:string[]) {
  let total=0,current=0,seen=false;
  for(const word of words){
    if(word in UNITS){current+=UNITS[word];seen=true;}
    else if(word==='mil'){total+=(current||1)*1000;current=0;seen=true;}
    else if(word==='y'&&seen)continue;
    else if(seen)break;
  }
  return seen?total+current:null;
}

/** «100», «12,50», «S/ 20», «cien», «doscientos cincuenta», «veinte con cincuenta» → número. */
export function parseSpokenAmount(text:string):number|null {
  const digits=text.match(/\d+(?:[.,]\d{1,2})?/);
  if(digits){const value=Number(digits[0].replace(',','.'));return value>0?value:null;}
  const words=clean(text).split(' ');
  const start=words.findIndex(word=>word in UNITS||word==='mil');
  if(start<0)return null;
  const tail=words.slice(start);
  const cut=tail.indexOf('con');
  const whole=wordsToNumber(cut<0?tail:tail.slice(0,cut));
  if(whole===null)return null;
  const cents=cut<0?0:wordsToNumber(tail.slice(cut+1))||0;
  const value=whole+(cents>0&&cents<100?cents/100:0);
  return value>0?Math.round(value*100)/100:null;
}

/* ---------- Coincidencia difusa con metas ---------- */

const FILLER=new Set(['para','la','el','los','las','mi','mis','meta','de','del','al','a','un','una','en','con','que','y']);
const tokens=(text:string)=>clean(text).split(' ').filter(word=>word.length>1&&!FILLER.has(word));

function distance(a:string,b:string) {
  const row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let previous=row[0];row[0]=i;
    for(let j=1;j<=b.length;j++){
      const temp=row[j];
      row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));
      previous=temp;
    }
  }
  return row[b.length];
}
const similar=(a:string,b:string)=>a===b||(a.length>=4&&b.startsWith(a))||(b.length>=4&&a.startsWith(b))||(Math.min(a.length,b.length)>=5&&distance(a,b)<=1);

/** Meta cuyo título se parece más a lo dicho; null si no hay una coincidencia clara y única. */
export function matchGoal<T extends Pick<Goal,'id'|'title'>>(text:string,goals:T[]):T|null {
  const spoken=clean(text),said=tokens(text);
  if(!said.length)return null;
  const scored=goals.map(goal=>{
    const title=clean(goal.title);
    if(title&&(spoken.includes(title)||title===said.join(' ')))return {goal,score:2};
    const words=tokens(goal.title);
    const hits=said.filter(word=>words.some(other=>similar(word,other))).length;
    return {goal,score:words.length?hits/Math.min(said.length,words.length):0};
  }).sort((a,b)=>b.score-a.score);
  const [best,second]=scored;
  if(!best||best.score<0.5)return null;
  if(second&&second.score===best.score)return null;
  return best.goal;
}

/* ---------- Respuestas sí / no / cancelar ---------- */

export function parseConfirmation(text:string):'yes'|'no'|'cancel'|null {
  const s=clean(text);
  if(!s)return null;
  if(/\b(cancela|cancelar|cancelalo|olvidalo|dejalo|salir|ninguno|nada)\b/.test(s))return 'cancel';
  if(/^(no|nop|nones|corrige|corregir|cambia|cambiar|editar|edita)\b/.test(s)||/\bno es\b/.test(s))return 'no';
  if(/\b(si|sip|claro|dale|ok|okay|confirmo|confirmar|guarda|guardalo|guardar|correcto|exacto|de acuerdo|perfecto|eso|asi es)\b/.test(s))return 'yes';
  return null;
}

export function parseType(text:string):MovementType|null {
  const s=clean(text);
  if(/ahorr|aport|separ/.test(s))return 'savings';
  if(/ingres|cobr|recib|sueldo|me pagaron/.test(s))return 'income';
  if(/gast|pague|compre|egreso/.test(s))return 'expense';
  return null;
}

/* ---------- Registro con slot-filling ---------- */

export function draftFrom(text:string,goals:Goal[],profile:Profile|null):VoiceDraft {
  const r=interpretLocally(text,goals,profile);
  const amount=r.amount?Number(r.amount):parseSpokenAmount(text);
  const goalId=r.goalId||(r.type==='savings'?matchGoal(text,goals)?.id||'':'');
  return {text,type:r.type,amount:amount&&amount>0?amount:null,category:r.category,goalId,planning:r.planning};
}

export function nextSlot(draft:VoiceDraft):Slot|null {
  if(!draft.type)return 'type';
  if(!draft.amount)return 'amount';
  if(draft.type==='savings'&&!draft.goalId)return 'goal';
  return null;
}

export const SLOT_QUESTIONS:Record<Slot,string>={
  type:'¿Es un gasto, un ingreso o un ahorro?',
  amount:'¿Cuánto?',
  goal:'¿Para qué meta?',
};

/** Aplica la respuesta a la pregunta del slot; null si no se entendió. */
export function fillSlot(draft:VoiceDraft,slot:Slot,answer:string,goals:Goal[]):VoiceDraft|null {
  if(slot==='type'){
    const type=parseType(answer);if(!type)return null;
    const next={...draft,type,category:type==='savings'?'Ahorro':draft.category==='Ahorro'?'':draft.category};
    if(!next.amount)next.amount=parseSpokenAmount(answer);
    return next;
  }
  if(slot==='amount'){const amount=parseSpokenAmount(answer);return amount?{...draft,amount}:null;}
  const goal=matchGoal(answer,goals);
  return goal?{...draft,goalId:goal.id}:null;
}

/** «100 soles», «18 soles con 50 céntimos», «1 sol»: legible en pantalla y natural en voz. */
export function spokenSoles(value:number) {
  const cents=Math.round(value*100),whole=Math.floor(cents/100),rest=cents%100;
  const main=`${whole} ${whole===1?'sol':'soles'}`;
  return rest?`${main} con ${rest} céntimo${rest===1?'':'s'}`:main;
}

const ARTICLE:Record<MovementType,string>={expense:'un gasto',income:'un ingreso',savings:'un ahorro'};

export function confirmationPrompt(draft:VoiceDraft,goals:Pick<Goal,'id'|'title'>[]) {
  if(!draft.type||!draft.amount)return '';
  const destination=draft.type==='savings'?`para ${goals.find(g=>g.id===draft.goalId)?.title||'tu meta'}`:`en ${draft.category||'Otros'}`;
  return `¿Guardo ${ARTICLE[draft.type]} de ${spokenSoles(draft.amount)} ${destination}?`;
}

/* ---------- Consultas y router ---------- */

const ASSISTANT=/^\s*(?:preg[uú]ntale al asistente|pregunta al asistente|preg[uú]ntale|pregunta|oye asistente|asistente)\s*[:,]?\s+(.{2,})$/i;
const GOAL_QUERY=/^(?:cuanto (?:llevo ahorrado|llevo|tengo ahorrado|tengo|he ahorrado|ahorre|me falta|falta|va)|como (?:va|vamos con|voy con|va mi meta|esta)) (?:para |en |con |de )?(?:la meta |mi meta )?(.+)$/;

export function routeIntent(text:string,context:{goals:Goal[];profile:Profile|null}):Intent {
  const s=clean(text);
  if(!s)return {kind:'empty'};
  const assistant=text.match(ASSISTANT);
  if(assistant)return {kind:'assistant',question:assistant[1].trim()};
  if(/\bcuanto\b/.test(s)&&/gast/.test(s)&&/semana/.test(s))return {kind:'query',query:'week-spending'};
  const goalQuery=s.match(GOAL_QUERY);
  if(goalQuery&&!/\d/.test(s)){
    const title=goalQuery[1].trim();
    return {kind:'query',query:'goal',goalId:matchGoal(title,context.goals)?.id||null,title};
  }
  const navigation=navigationIntent(text);
  if(navigation)return navigation;
  return {kind:'register',draft:draftFrom(text,context.goals,context.profile)};
}

/** Respuesta hablada a una consulta, con los datos del snapshot (sin IA). */
export function answerQuery(intent:Extract<Intent,{kind:'query'}>,context:{goals:Goal[];movements:Movement[];today:string;weeklyBudget:number}) {
  if(intent.query==='week-spending'){
    const spent=weekDailyExpenses(context.movements,context.today).reduce((sum,day)=>sum+(day.amount||0),0);
    return `Esta semana llevas ${spokenSoles(spent)} en gastos. Tu presupuesto semanal es de ${spokenSoles(context.weeklyBudget)}.`;
  }
  const goal=context.goals.find(g=>g.id===intent.goalId);
  if(!goal){
    const names=context.goals.map(g=>g.title);
    return `No encontré una meta parecida a «${intent.title}». ${names.length?`Tus metas son: ${names.join(', ')}.`:'Aún no tienes metas.'}`;
  }
  const percent=goal.target_amount>0?Math.min(100,Math.round(goal.current_amount/goal.target_amount*100)):0;
  const remaining=goalRemaining(goal);
  return `${goal.title}: llevas ${spokenSoles(goal.current_amount)} de ${spokenSoles(goal.target_amount)}, el ${percent} por ciento. ${remaining>0?`Te faltan ${spokenSoles(remaining)}.`:'¡Esta meta ya floreció!'}`;
}
