/**
 * Modo demo: un Supabase simulado dentro del navegador, para probar la app sin cuenta.
 * Los datos son de práctica, viven en sessionStorage (se borran al cerrar la pestaña o
 * al salir del modo demo) y nunca llegan a ningún servidor.
 *
 * El cliente de Supabase usa `createDemoFetch()` como fetch; las URLs apuntan a un
 * dominio inexistente para que, aunque algo escapara, no salga de este equipo.
 */

export const DEMO_FLAG='av-demo';
export const DEMO_URL='https://demo.alcancia-viva.invalid';
export const DEMO_KEY='sb_publishable_demo';
export const DEMO_USER_ID='00000000-0000-4000-8000-000000000de0';
const STATE_KEY='av-demo-state';
const SESSION_KEY='sb-demo-auth-token';
const GROUP_ID='00000000-0000-4000-8000-0000000000a1';

type Row=Record<string,any>;
export interface DemoState { profile:Row|null; tables:Record<string,Row[]>; requests:Row[]; members:Row[]; }

function storage(kind:'local'|'session'):Storage|null{try{return kind==='local'?window.localStorage:window.sessionStorage;}catch{return null;}}
export function demoActive(){try{return storage('local')?.getItem(DEMO_FLAG)==='1';}catch{return false;}}

const limaDay=(offset=0)=>{
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return new Date(Date.parse(`${today}T12:00:00Z`)+offset*864e5).toISOString().slice(0,10);
};
const uuid=()=>typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`demo-${Math.random().toString(16).slice(2)}`;

/** Datos de práctica: tres metas, un grupo con dos amistades y una semana de movimientos. */
export function initialDemoState():DemoState {
  const goal=(id:string,title:string,target:number,current:number,days:number,group:string|null=null)=>({id,title,owner_id:DEMO_USER_ID,group_id:group,target_amount:target,current_amount:current,target_date:limaDay(days),created_at:new Date(Date.now()-days*1e6).toISOString(),archived:false});
  const move=(type:string,amount:number,category:string,description:string,day:number,goalId:string|null=null,group:string|null=null)=>({id:uuid(),user_id:DEMO_USER_ID,type,amount,category,description,occurred_on:limaDay(day),source:'text',goal_id:goalId,group_id:group,reversed_at:null,created_at:`${limaDay(day)}T1${Math.abs(day)%10}:00:00Z`});
  return {
    profile:null,
    tables:{
      groups:[{id:GROUP_ID,name:'Viaje de promoción',created_by:DEMO_USER_ID,created_at:new Date().toISOString()}],
      goal_progress:[
        goal('demo-g1','Laptop para la universidad',2500,1450,120),
        goal('demo-g2','Fondo para imprevistos',1000,180,200),
        goal('demo-g3','Viaje a Cusco',1800,1710,60,GROUP_ID),
      ],
      movements:[
        move('expense',18.5,'Alimentación','Almuerzo en la universidad',0),
        move('savings',100,'Ahorro','Ahorré 100 soles para mi laptop',0,'demo-g1'),
        move('income',450,'Trabajo','Pago de clases particulares',-1),
        move('expense',3.5,'Transporte','Pasaje',-1),
        move('savings',60,'Ahorro','Aporte al viaje',-3,'demo-g3',GROUP_ID),
        move('expense',42,'Ocio','Cine con amigos',-8),
      ],
      group_members:[{group_id:GROUP_ID,role:'admin',user_id:DEMO_USER_ID}],
      group_invitations:[{id:'demo-i1',group_id:GROUP_ID,code:'JARDIN-2026',expires_at:new Date(Date.now()+864e5*7).toISOString(),revoked_at:null}],
    },
    requests:[{id:'demo-r1',name:'Diego Flores',status:'pending'}],
    members:[{user_id:'demo-u2',name:'Mateo Huamán',role:'member'},{user_id:'demo-u3',name:'Valeria Rojas',role:'member'}],
  };
}

export function loadDemoState():DemoState {
  try{const raw=storage('session')?.getItem(STATE_KEY);if(raw)return JSON.parse(raw);}catch{/* estado nuevo */}
  return initialDemoState();
}
function saveDemoState(state:DemoState){try{storage('session')?.setItem(STATE_KEY,JSON.stringify(state));}catch{/* solo en memoria */}}

const b64=(value:unknown)=>btoa(JSON.stringify(value)).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
export function demoSession(displayName=''){
  const exp=Math.floor(Date.now()/1000)+86400*7;
  const user={id:DEMO_USER_ID,aud:'authenticated',role:'authenticated',email:'demo@alcancia-viva.invalid',user_metadata:{display_name:displayName},app_metadata:{},created_at:new Date().toISOString()};
  const token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:DEMO_USER_ID,exp,role:'authenticated',aud:'authenticated'})}.demo`;
  return {access_token:token,refresh_token:'demo-refresh',token_type:'bearer',expires_in:86400*7,expires_at:exp,user};
}

/** Activa el modo demo y deja una sesión simulada lista para el cliente de Supabase. */
export function enterDemo(){
  const local=storage('local');
  local?.setItem(DEMO_FLAG,'1');
  local?.setItem(SESSION_KEY,JSON.stringify(demoSession()));
  storage('session')?.removeItem(STATE_KEY);
}
export function exitDemo(){
  const local=storage('local');
  local?.removeItem(DEMO_FLAG);local?.removeItem(SESSION_KEY);
  storage('session')?.removeItem(STATE_KEY);
}

const reply=(body:unknown,status=200)=>({status,body});

/** Atiende una petición como lo haría Supabase. Función pura sobre el estado (lo muta). */
export function handleDemo(state:DemoState,method:string,url:URL,body:any,accept=''):{status:number;body:unknown} {
  const path=url.pathname;
  if(path.startsWith('/auth/v1/user'))return reply(demoSession(state.profile?.display_name||'').user);
  if(path.startsWith('/auth/v1/logout'))return reply(null,204);
  if(path.startsWith('/auth/v1/'))return reply(demoSession(state.profile?.display_name||''));
  if(path.startsWith('/functions/v1/')){
    if(body?.action==='advice'){
      const expenses=state.tables.movements.filter(m=>m.type==='expense'&&!m.reversed_at);
      const byCategory=new Map<string,number>();for(const m of expenses)byCategory.set(m.category,(byCategory.get(m.category)||0)+m.amount);
      const top=[...byCategory.entries()].sort((a,b)=>b[1]-a[1])[0];
      return reply({answer:`En el modo demo te respondo con un ejemplo, sin IA. ${top?`Tu categoría con más gasto es ${top[0]} (S/ ${top[1].toFixed(2)}). `:''}Una idea sencilla: separa un monto fijo al inicio de la semana para tu meta más cercana y revisa los gastos pequeños, que suelen sumar más de lo que parece.`});
    }
    return reply({error:'En el modo demo la interpretación usa las reglas locales.'});
  }
  if(path.startsWith('/rest/v1/rpc/')){
    const name=path.split('/').pop()||'',p=body||{};
    const goals=state.tables.goal_progress,moves=state.tables.movements;
    switch(name){
      case 'my_requests':return reply([]);
      case 'group_people':return reply({members:[{user_id:DEMO_USER_ID,name:state.profile?.display_name||'Tú',role:'admin'},...state.members],requests:state.requests});
      case 'record_movement':{
        if(moves.some(m=>m.id===p.p_id))return reply(null);
        const goal=goals.find(g=>g.id===p.p_goal);
        if(p.p_type==='savings'&&goal)goal.current_amount=Math.round((goal.current_amount+p.p_amount)*100)/100;
        moves.unshift({id:p.p_id,user_id:DEMO_USER_ID,type:p.p_type,amount:p.p_amount,category:p.p_category,description:p.p_description||'',occurred_on:p.p_date,source:p.p_source,goal_id:p.p_goal||null,group_id:goal?.group_id||null,reversed_at:null,created_at:new Date().toISOString()});
        return reply(null);
      }
      case 'reverse_movement':{
        const m=moves.find(x=>x.id===p.p_id);
        if(m&&!m.reversed_at){m.reversed_at=new Date().toISOString();const goal=goals.find(g=>g.id===m.goal_id);if(m.type==='savings'&&goal)goal.current_amount=Math.round((goal.current_amount-m.amount)*100)/100;}
        return reply(null);
      }
      case 'create_goal':{
        const id=uuid();
        goals.push({id,title:String(p.p_title||'').trim(),owner_id:DEMO_USER_ID,group_id:p.p_group||null,target_amount:Number(p.p_amount),current_amount:0,target_date:p.p_date,created_at:new Date().toISOString(),archived:false});
        return reply(id);
      }
      case 'create_group':{
        const id=uuid();
        state.tables.groups.push({id,name:String(p.p_name||'').trim(),created_by:DEMO_USER_ID,created_at:new Date().toISOString()});
        state.tables.group_members.push({group_id:id,role:'admin',user_id:DEMO_USER_ID});
        return reply({group_id:id});
      }
      case 'request_group_access':return reply({group_name:'Grupo de práctica',status:'pending'});
      case 'create_group_invitation':state.tables.group_invitations.unshift({id:uuid(),group_id:p.p_group,code:`DEMO-${Math.random().toString(36).slice(2,8).toUpperCase()}`,expires_at:new Date(Date.now()+864e5*7).toISOString(),revoked_at:null});return reply(null);
      case 'revoke_group_invitation':{const i=state.tables.group_invitations.find(x=>x.id===p.p_invitation);if(i)i.revoked_at=new Date().toISOString();return reply(null);}
      case 'decide_group_request':{
        const r=state.requests.find(x=>x.id===p.p_request);
        if(r){state.requests=state.requests.filter(x=>x.id!==r.id);if(p.p_approve)state.members.push({user_id:uuid(),name:r.name,role:'member'});}
        return reply(null);
      }
      default:return reply(null);
    }
  }
  if(path.startsWith('/rest/v1/')){
    const table=path.split('/').pop()||'';
    if(table==='profiles'){
      if(method==='GET'){const single=accept.includes('vnd.pgrst.object');return reply(single?state.profile:state.profile?[state.profile]:[]);}
      const row=Array.isArray(body)?body[0]:body;
      if(row)state.profile={...state.profile,...row};
      return reply([],201);
    }
    if(method!=='GET')return reply([],201);
    let rows=[...(state.tables[table]||[])];
    if(table==='group_invitations')rows=rows.filter(r=>!r.revoked_at);
    if(table==='movements')rows.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    return reply(rows);
  }
  return reply({});
}

/** fetch para el cliente de Supabase en modo demo. */
export function createDemoFetch():typeof fetch {
  return async (input,init={})=>{
    const request=input instanceof Request?input:null;
    const url=new URL(request?request.url:String(input));
    const method=(init.method||request?.method||'GET').toUpperCase();
    const headers=new Headers(init.headers||request?.headers);
    let body:any=null;
    const raw=init.body??(request&&method!=='GET'?await request.clone().text():null);
    if(typeof raw==='string'&&raw){try{body=JSON.parse(raw);}catch{body=raw;}}
    const state=loadDemoState();
    const result=handleDemo(state,method,url,body,headers.get('accept')||'');
    saveDemoState(state);
    await new Promise(resolve=>setTimeout(resolve,120));
    if(result.status===204)return new Response(null,{status:204});
    return new Response(JSON.stringify(result.body),{status:result.status,headers:{'Content-Type':'application/json'}});
  };
}
