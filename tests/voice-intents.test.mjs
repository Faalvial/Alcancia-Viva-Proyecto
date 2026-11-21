import test from 'node:test';
import assert from 'node:assert/strict';
import { routeIntent, answerQuery, parseSpokenAmount, matchGoal, parseConfirmation, nextSlot, fillSlot, confirmationPrompt, spokenSoles, draftFrom } from '../src/services/voice/intents.ts';

const goals=[
  {id:'g1',title:'Laptop para la universidad',owner_id:'u',group_id:null,target_amount:2500,current_amount:1450,target_date:'2027-03-16'},
  {id:'g2',title:'Fondo de emergencia',owner_id:'u',group_id:null,target_amount:1000,current_amount:180,target_date:'2027-06-04'},
  {id:'g3',title:'Viaje a Cusco',owner_id:'u',group_id:'grp',target_amount:1800,current_amount:1800,target_date:'2027-01-14'},
];
const ctx={goals,profile:null};

test('los comandos de navegación cambian de pestaña con o sin verbo',()=>{
  assert.deepEqual(routeIntent('Ir a metas',ctx),{kind:'navigate',tab:'goals',label:'Metas'});
  assert.equal(routeIntent('muestra mi jardín',ctx).tab,'garden');
  assert.equal(routeIntent('Abre movimientos.',ctx).tab,'history');
  assert.equal(routeIntent('preferencias',ctx).tab,'settings');
  assert.equal(routeIntent('llévame a mis grupos por favor',ctx).tab,'groups');
  assert.equal(routeIntent('abre el asistente',ctx).tab,'assistant');
  assert.equal(routeIntent('gasté 10 soles en metas',ctx).kind,'register');
});

test('las consultas se responden con los datos cargados, sin IA',()=>{
  const goal=routeIntent('¿Cuánto llevo para la laptop?',ctx);
  assert.deepEqual(goal,{kind:'query',query:'goal',goalId:'g1',title:'la laptop'});
  assert.equal(routeIntent('cómo va el viaje a cusco',ctx).goalId,'g3');
  assert.equal(routeIntent('cuánto me falta para el fondo de emergencia',ctx).goalId,'g2');
  const answer=answerQuery(goal,{goals,movements:[],today:'2026-11-16',weeklyBudget:300});
  assert.match(answer,/llevas 1450 soles de 2500 soles, el 58 por ciento\. Te faltan 1050 soles\./);
  assert.match(answerQuery(routeIntent('como va viaje a cusco',ctx),{goals,movements:[],today:'2026-11-16',weeklyBudget:300}),/ya floreció/);
  const unknown=routeIntent('cómo va la moto',ctx);
  assert.equal(unknown.goalId,null);
  assert.match(answerQuery(unknown,{goals,movements:[],today:'2026-11-16',weeklyBudget:300}),/No encontré una meta parecida a «la moto»\. Tus metas son/);
  const week=routeIntent('¿Cuánto gasté esta semana?',ctx);
  assert.deepEqual(week,{kind:'query',query:'week-spending'});
  const movements=[{id:'a',type:'expense',amount:18.5,occurred_on:'2026-11-16',reversed_at:null},{id:'b',type:'expense',amount:99,occurred_on:'2026-11-08',reversed_at:null}];
  assert.equal(answerQuery(week,{goals,movements,today:'2026-11-16',weeklyBudget:300}),'Esta semana llevas 18 soles con 50 céntimos en gastos. Tu presupuesto semanal es de 300 soles.');
});

test('«pregunta:» y «asistente …» van al asistente financiero',()=>{
  assert.deepEqual(routeIntent('Pregunta: ¿cómo puedo ahorrar más?',ctx),{kind:'assistant',question:'¿cómo puedo ahorrar más?'});
  assert.deepEqual(routeIntent('asistente en qué gasto más',ctx),{kind:'assistant',question:'en qué gasto más'});
  assert.equal(routeIntent('asistente',ctx).kind,'navigate');
});

test('todo lo demás se interpreta como registro con interpretLocally',()=>{
  const r=routeIntent('Ahorré 100 soles para mi laptop',ctx);
  assert.equal(r.kind,'register');
  assert.deepEqual({type:r.draft.type,amount:r.draft.amount,goalId:r.draft.goalId},{type:'savings',amount:100,goalId:'g1'});
  assert.equal(routeIntent('gasté veinte con cincuenta en almuerzo',ctx).draft.amount,20.5);
  assert.equal(draftFrom('quiero ahorrar para un viaje',goals,null).planning,true);
});

test('los montos dichos con palabras se convierten a número',()=>{
  assert.equal(parseSpokenAmount('cien'),100);
  assert.equal(parseSpokenAmount('ciento cincuenta soles'),150);
  assert.equal(parseSpokenAmount('doscientos treinta y cinco'),235);
  assert.equal(parseSpokenAmount('dos mil quinientos'),2500);
  assert.equal(parseSpokenAmount('mil'),1000);
  assert.equal(parseSpokenAmount('veintidós con cincuenta'),22.5);
  assert.equal(parseSpokenAmount('S/ 12,50'),12.5);
  assert.equal(parseSpokenAmount('no sé'),null);
  assert.equal(parseSpokenAmount('cero'),null);
});

test('la meta se reconoce de forma difusa y solo si la coincidencia es única',()=>{
  assert.equal(matchGoal('para la laptop',goals)?.id,'g1');
  assert.equal(matchGoal('lap top universidad',goals)?.id,'g1');
  assert.equal(matchGoal('emergencias',goals)?.id,'g2');
  assert.equal(matchGoal('el viaje',goals)?.id,'g3');
  assert.equal(matchGoal('cusko',goals)?.id,'g3');
  assert.equal(matchGoal('bicicleta',goals),null);
  assert.equal(matchGoal('meta',goals),null);
  assert.equal(matchGoal('fondo',[{id:'a',title:'Fondo de viaje'},{id:'b',title:'Fondo de emergencia'}]),null);
});

test('sí, no y cancelar se reconocen con variantes habituales',()=>{
  for(const yes of ['Sí','sí, guárdalo','claro','dale','ok','correcto'])assert.equal(parseConfirmation(yes),'yes',yes);
  for(const no of ['no','No, corrige el monto','cambiar'])assert.equal(parseConfirmation(no),'no',no);
  for(const cancel of ['cancelar','no, cancela','olvídalo'])assert.equal(parseConfirmation(cancel),'cancel',cancel);
  assert.equal(parseConfirmation('quizás mañana'),null);
});

test('slot-filling: pide lo que falta en orden y arma la confirmación',()=>{
  let draft=draftFrom('ahorré para algo',goals,null);
  assert.equal(nextSlot(draft),'amount');
  assert.equal(fillSlot(draft,'amount','no sé',goals),null);
  draft=fillSlot(draft,'amount','cien',goals);
  assert.equal(nextSlot(draft),'goal');
  assert.equal(fillSlot(draft,'goal','la moto',goals),null);
  draft=fillSlot(draft,'goal','la laptop',goals);
  assert.equal(nextSlot(draft),null);
  assert.equal(confirmationPrompt(draft,goals),'¿Guardo un ahorro de 100 soles para Laptop para la universidad?');
  let other=draftFrom('cincuenta soles',goals,null);
  assert.equal(nextSlot(other),'type');
  other=fillSlot(other,'type','un gasto',goals);
  assert.equal(nextSlot(other),null);
  assert.equal(confirmationPrompt(other,goals),'¿Guardo un gasto de 50 soles en Otros?');
  assert.equal(spokenSoles(1),'1 sol');assert.equal(spokenSoles(0.01),'0 soles con 1 céntimo');
});
