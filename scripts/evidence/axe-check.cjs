// Auditoría axe-core (WCAG 2.0/2.1/2.2 A y AA) en todas las pestañas y el composer,
// en los modos normal, oscuro, alto contraste (claro y oscuro) y texto 200 %.
// Requiere `npx vite preview --port 4173` y axe-core (npm i axe-core, o AXE_PATH=ruta/axe.min.js).
// Uso: node scripts/evidence/axe-check.cjs [anchos]
const { chromium } = require('playwright');
const fs = require('fs');
const { mockBackend } = require('./mock-backend.cjs');
const AXE = fs.readFileSync(process.env.AXE_PATH || require.resolve('axe-core/axe.min.js'),'utf8');
const modes = { normal:{}, dark:{theme:'dark'}, contrast:{highContrast:true}, 'dark-contrast':{theme:'dark',highContrast:true}, large:{largeText:true} };
const tabs = ['Mi jardín','Metas','Mis grupos','Movimientos','Asistente','Preferencias'];
(async () => {
  const b = await chromium.launch(); const summary = {};
  for (const [mode, prefs] of Object.entries(modes)) for (const w of (process.argv[2]||'375,1440').split(',').map(Number)) {
    const p = await b.newPage({ viewport:{width:w,height:900} });
    await mockBackend(p,{preferences:prefs}); await p.goto('http://localhost:4173',{waitUntil:'networkidle'});
    for (const tab of [...tabs,'registro']) {
      if (tab==='registro') { await p.getByRole('button',{name:/^Mi jardín/}).filter({visible:true}).first().click(); await p.getByRole('button',{name:/Registrar movimiento/}).filter({visible:true}).first().click(); await p.waitForTimeout(400); }
      else { await p.getByRole('button',{name:new RegExp('^'+tab)}).filter({visible:true}).first().click(); await p.waitForTimeout(300); }
      await p.addScriptTag({content:AXE});
      const r = await p.evaluate(async () => (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,3).map(n=>n.target.join(' ')+' :: '+(n.any[0]?.message||n.failureSummary||'').slice(0,110))})));
      for (const v of r) { const k=`${v.id}|${v.impact}`; (summary[k] ||= []).push(`${mode} ${w} ${tab} (${v.n}): ${v.t.join(' || ')}`); }
    }
    await p.close();
  }
  await b.close();
  for (const [k,list] of Object.entries(summary)) { console.log('\n##', k, list.length); list.slice(0,12).forEach(l=>console.log('  ',l)); }
  if (!Object.keys(summary).length) console.log('Sin violaciones');
})();
