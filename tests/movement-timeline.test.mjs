import test from 'node:test';
import assert from 'node:assert/strict';
import { dayLabel, filterMovements, groupByDay, weekDailyExpenses, goalRemaining, budgetTone, avatarStack, shiftDay } from '../src/live/timeline.ts';

const m=(id,type,amount,occurred_on,extra={})=>({id,type,amount,occurred_on,description:'',category:'Otros',goal_id:null,reversed_at:null,...extra});

test('las fechas se nombran como Hoy, Ayer o fecha larga en español',()=>{
  assert.equal(dayLabel('2026-11-16','2026-11-16'),'Hoy');
  assert.equal(dayLabel('2026-11-15','2026-11-16'),'Ayer');
  assert.equal(dayLabel('2026-11-10','2026-11-16'),'Martes, 10 de noviembre');
  assert.match(dayLabel('2025-12-31','2026-01-02'),/2025/);
  assert.equal(shiftDay('2026-03-01',-1),'2026-02-28');
});

test('el historial se agrupa por día, del más reciente al más antiguo, sin reordenar dentro del día',()=>{
  const groups=groupByDay([m('a','expense',1,'2026-11-14'),m('b','income',2,'2026-11-16'),m('c','expense',3,'2026-11-14'),m('d','savings',4,'2026-11-15')],'2026-11-16');
  assert.deepEqual(groups.map(g=>g.label),['Hoy','Ayer','Sábado, 14 de noviembre']);
  assert.deepEqual(groups[2].items.map(i=>i.id),['a','c']);
});

test('los filtros combinan tipo y búsqueda sin distinguir tildes ni mayúsculas, incluido el título de la meta',()=>{
  const list=[m('a','expense',10,'2026-11-16',{description:'Almuerzo',category:'Alimentación'}),m('b','savings',100,'2026-11-16',{description:'',category:'Ahorro',goal_id:'g1'}),m('c','income',50,'2026-11-16',{description:'Clases'})];
  const goals=[{id:'g1',title:'Laptop para la universidad'}];
  assert.deepEqual(filterMovements(list,'all','',goals).map(x=>x.id),['a','b','c']);
  assert.deepEqual(filterMovements(list,'expense','',goals).map(x=>x.id),['a']);
  assert.deepEqual(filterMovements(list,'all','alimentacion',goals).map(x=>x.id),['a']);
  assert.deepEqual(filterMovements(list,'all','LAPTOP universidad',goals).map(x=>x.id),['b']);
  assert.deepEqual(filterMovements(list,'income','laptop',goals),[]);
});

test('la mini-gráfica suma gastos vigentes por día de lunes a hoy y deja vacíos los días futuros',()=>{
  const list=[m('a','expense',10.1,'2026-11-16'),m('b','expense',0.2,'2026-11-16'),m('c','expense',5,'2026-11-17'),m('d','income',99,'2026-11-16'),m('e','expense',7,'2026-11-16',{reversed_at:'2026-11-16T10:00:00Z'}),m('f','expense',3,'2026-11-15')];
  const week=weekDailyExpenses(list,'2026-11-18');
  assert.equal(week.length,7);assert.equal(week[0].day,'2026-11-16');assert.equal(week[0].name,'Lunes');
  assert.equal(week[0].amount,10.3);assert.equal(week[1].amount,5);assert.equal(week[2].today,true);
  assert.equal(week[3].amount,null);
  assert.equal(weekDailyExpenses([],'2026-11-22')[6].today,true);
});

test('lo que falta para la meta nunca es negativo',()=>{
  assert.equal(goalRemaining({target_amount:2500,current_amount:1450}),1050);
  assert.equal(goalRemaining({target_amount:100,current_amount:150}),0);
  assert.equal(goalRemaining({target_amount:0.3,current_amount:0.1}),0.2);
});

test('el medidor pasa de verde a ámbar de forma gradual y nunca supera el tope',()=>{
  assert.equal(budgetTone(0,300),0);assert.equal(budgetTone(150,300),0);
  assert.ok(budgetTone(225,300)>0&&budgetTone(225,300)<1);
  assert.equal(budgetTone(400,300),1);assert.equal(budgetTone(10,0),0);
});

test('los avatares muestran hasta cuatro integrantes y el resto como +N',()=>{
  assert.deepEqual(avatarStack([1,2,3]),{shown:[1,2,3],extra:0});
  assert.deepEqual(avatarStack([1,2,3,4,5,6]),{shown:[1,2,3,4],extra:2});
});
