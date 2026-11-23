import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDemoState, handleDemo, DEMO_USER_ID, DEMO_URL } from '../src/live/demo.ts';

const call=(state,method,path,body=null,accept='')=>handleDemo(state,method,new URL(path,DEMO_URL),body,accept);

test('la demo empieza sin perfil (bienvenida guiada) y con datos de práctica',()=>{
  const s=initialDemoState();
  assert.equal(call(s,'GET','/rest/v1/profiles?select=*&id=eq.x',null,'application/vnd.pgrst.object+json').body,null);
  assert.equal(s.tables.goal_progress.length,3);
  assert.ok(s.tables.movements.length>=5);
  assert.equal(call(s,'GET','/auth/v1/user').body.id,DEMO_USER_ID);
});

test('guardar el perfil, crear una meta y aportar actualiza el estado como el servidor',()=>{
  const s=initialDemoState();
  call(s,'POST','/rest/v1/profiles',[{id:DEMO_USER_ID,display_name:'Ana',preferences:{petName:'Chanchi'}}]);
  assert.equal(call(s,'GET','/rest/v1/profiles',null,'application/vnd.pgrst.object+json').body.preferences.petName,'Chanchi');
  const id=call(s,'POST','/rest/v1/rpc/create_goal',{p_title:' Bici ',p_amount:600,p_date:'2027-01-01',p_group:null}).body;
  assert.equal(s.tables.goal_progress.find(g=>g.id===id).title,'Bici');
  call(s,'POST','/rest/v1/rpc/record_movement',{p_id:'m-x',p_type:'savings',p_amount:50,p_category:'Ahorro',p_description:'',p_date:'2026-11-23',p_source:'voice',p_goal:id});
  call(s,'POST','/rest/v1/rpc/record_movement',{p_id:'m-x',p_type:'savings',p_amount:50,p_category:'Ahorro',p_description:'',p_date:'2026-11-23',p_source:'voice',p_goal:id});
  assert.equal(s.tables.goal_progress.find(g=>g.id===id).current_amount,50,'un mismo id no se cuenta dos veces');
  call(s,'POST','/rest/v1/rpc/reverse_movement',{p_id:'m-x'});
  assert.equal(s.tables.goal_progress.find(g=>g.id===id).current_amount,0);
  assert.ok(s.tables.movements.find(m=>m.id==='m-x').reversed_at);
});

test('grupos: integrantes, aprobar solicitudes y revocar invitaciones',()=>{
  const s=initialDemoState();
  const people=call(s,'POST','/rest/v1/rpc/group_people',{p_group:'g'}).body;
  assert.equal(people.requests.length,1);assert.equal(people.members.length,3);
  call(s,'POST','/rest/v1/rpc/decide_group_request',{p_request:'demo-r1',p_approve:true});
  assert.equal(call(s,'POST','/rest/v1/rpc/group_people',{}).body.members.length,4);
  call(s,'POST','/rest/v1/rpc/revoke_group_invitation',{p_invitation:'demo-i1'});
  assert.equal(call(s,'GET','/rest/v1/group_invitations').body.length,0);
});

test('el asistente de la demo responde con un ejemplo y declara que no usa IA',()=>{
  const r=call(initialDemoState(),'POST','/functions/v1/financial-assistant',{action:'advice',question:'¿Cómo ahorro?'});
  assert.match(r.body.answer,/^En el modo demo te respondo con un ejemplo, sin IA\./);
  assert.ok(call(initialDemoState(),'POST','/functions/v1/financial-assistant',{action:'interpret'}).body.error);
});
