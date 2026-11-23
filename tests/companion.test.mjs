import test from 'node:test';
import assert from 'node:assert/strict';
import { weekStory, weekMessage, greetingFor, limaHour, firstName, petNameOf, phrase, pick, assistantIntro, DEFAULT_PET_NAME, PHRASES } from '../src/live/companion.ts';

const m=(type,amount,occurred_on,extra={})=>({type,amount,occurred_on,reversed_at:null,goal_id:null,...extra});
const goals=[{id:'g1',title:'Laptop'},{id:'g2',title:'Viaje'}];

test('saluda según la hora de Lima',()=>{
  assert.equal(greetingFor(8),'Buenos días');assert.equal(greetingFor(15),'Buenas tardes');assert.equal(greetingFor(21),'Buenas noches');assert.equal(greetingFor(2),'Buenas noches');
  assert.equal(limaHour(new Date('2026-11-23T15:30:00Z')),10);
});

test('usa el primer nombre y un nombre de mascota por defecto',()=>{
  assert.equal(firstName('  Lucía Quispe '),'Lucía');assert.equal(firstName(''),'');
  assert.equal(petNameOf(''),DEFAULT_PET_NAME);assert.equal(petNameOf(' Chanchi '),'Chanchi');assert.equal(petNameOf('x'.repeat(40)).length,24);
});

test('el relato de la semana suma solo movimientos vigentes y compara con el mismo tramo de la semana anterior',()=>{
  // Hoy: miércoles 25-11-2026. Semana: 23 al 25; comparable anterior: 16 al 18; últimos 7 días: 19 al 25.
  const list=[m('savings',100,'2026-11-23',{goal_id:'g1'}),m('savings',30,'2026-11-24',{goal_id:'g2'}),m('expense',20,'2026-11-24'),m('expense',99,'2026-11-24',{reversed_at:'x'}),
    m('expense',50,'2026-11-17'),m('expense',70,'2026-11-20'),m('income',200,'2026-11-25'),m('savings',5,'2026-11-19',{goal_id:'g2'})];
  const s=weekStory(list,goals,'2026-11-25');
  assert.deepEqual(s,{saved:130,expenses:20,income:200,previousExpenses:50,movements:4,activeDays:5,topGoal:'Laptop'});
});

test('el mensaje celebra lo ahorrado, compara sin juzgar y anima si no hay registros',()=>{
  const happy=weekMessage({saved:130,expenses:20,previousExpenses:50,income:0,movements:3,activeDays:3,topGoal:'Laptop'},'s');
  assert.equal(happy.mood,'happy');assert.equal(happy.lines.length,2);
  assert.match(happy.lines[0],/S\/\s?130\.00/);assert.match(happy.lines[0],/Laptop/);
  assert.match(happy.lines[1],/S\/\s?30\.00 menos en gastos/);
  const more=weekMessage({saved:0,expenses:80,previousExpenses:50,income:0,movements:2,activeDays:1,topGoal:null},'s');
  assert.equal(more.mood,'encouraging');assert.match(more.lines[0],/Si quieres, los miramos juntos/);
  const empty=weekMessage({saved:0,expenses:0,previousExpenses:0,income:0,movements:0,activeDays:0,topGoal:null},'s');
  assert.equal(empty.mood,'encouraging');assert.equal(empty.lines.length,1);
  for(const text of [...happy.lines,...more.lines,...empty.lines])assert.doesNotMatch(text,/demasiado|mal|error tuyo|culpa/i);
});

test('las frases varían según la semilla pero son estables para la misma semilla',()=>{
  assert.equal(pick(['a','b','c'],4),'b');
  assert.equal(phrase('saved','2026-11-23'),phrase('saved','2026-11-23'));
  const variants=new Set(Array.from({length:12},(_,i)=>phrase('saved',i)));
  assert.equal(variants.size,PHRASES.saved.length);
  assert.equal(phrase('navigate',0,{label:'Metas'}),'Vamos a Metas.');
});

test('la mascota se presenta como apoyada en IA y sin mover dinero',()=>{
  const intro=assistantIntro('Chanchi','Lucía');
  assert.match(intro,/^Hola, Lucía\. Soy Chanchi, tu alcancía\./);assert.match(intro,/inteligencia artificial/);assert.match(intro,/no muevo dinero/);
  assert.match(assistantIntro('','') ,/^Soy tu alcancía\./);
});
