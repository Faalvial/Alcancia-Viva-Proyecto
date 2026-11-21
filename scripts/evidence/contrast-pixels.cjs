// Revisión manual asistida de los contrastes que axe marca como «por revisar» (texto sobre la
// foto del jardín, degradados o capas). Oculta el texto, fotografía el fondo y calcula el
// contraste del color del texto contra el percentil 10 (peor caso) de los píxeles de fondo.
// Requiere pngjs (npm i --no-save pngjs) y `npx vite preview --port 4173`.
// Uso: node scripts/evidence/contrast-pixels.cjs [ruta-a-pngjs]
const { chromium } = require('playwright');
const { mockBackend } = require('./mock-backend.cjs');
const sel = ['.ag-scene-heading > span','.ag-scene-heading > p','.ag-plant-label strong','.ag-plant-label small','.ag-plant-label b','.ag-scene-foot > span','.ag-card-type','.av-goal-ring-label','.av-auth .av-eyebrow','.av-auth h1','.av-welcome > p:not(.av-eyebrow)','.av-gauge-text strong','.av-gauge-text span','.av-week-label'];
const lum = ([r,g,b]) => { const f=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
(async () => {
  const b = await chromium.launch(); const worst = {};
  for (const [mode,prefs] of Object.entries({normal:{},contraste:{highContrast:true},grande:{largeText:true},oscuro:{theme:'dark'}})) for (const w of [375,1440]) for (const signed of [true,false]) {
    const p = await b.newPage({ viewport:{width:w,height:900} }); await mockBackend(p,{preferences:prefs,signedIn:signed});
    if(!signed&&prefs.theme) await p.addInitScript(()=>localStorage.setItem('av-theme','dark'));
    await p.goto('http://localhost:4173',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
    for (const tab of signed?['Mi jardín','Metas']:[null]) {
      if (tab) { await p.getByRole('button',{name:new RegExp('^'+tab)}).filter({visible:true}).first().click(); await p.waitForTimeout(400); }
      for (const s of sel) for (const el of await p.locator(s).all()) {
        if (!(await el.isVisible())) continue;
        // Oculta el texto para fotografiar solo el fondo, luego lo restaura.
        const color = await el.evaluate(e=>{const c=getComputedStyle(e).color.match(/[\d.]+/g).map(Number);e.dataset.prev=e.style.color;e.style.setProperty('color','transparent','important');e.style.setProperty('text-shadow','none','important');e.style.setProperty('fill','transparent','important');return c;});
        await el.scrollIntoViewIfNeeded(); let buf; try { buf = await el.screenshot(); } catch { continue; } finally { await el.evaluate(e=>{e.style.removeProperty('color');e.style.removeProperty('text-shadow');e.style.removeProperty('fill');}); }
        const { PNG } = require(process.argv[2] || 'pngjs'); const img = PNG.sync.read(buf); const rs=[];
        for (let i=0;i<img.data.length;i+=4*7) rs.push(ratio(color.slice(0,3),[img.data[i],img.data[i+1],img.data[i+2]]));
        rs.sort((x,y)=>x-y); const r10 = rs[Math.floor(rs.length*0.1)];
        const key = s; if (!worst[key] || r10 < worst[key].r) worst[key] = { r: Math.round(r10*100)/100, where:`${mode} ${w}` };
      }
    }
    await p.close();
  }
  for (const [k,v] of Object.entries(worst)) console.log(v.r.toFixed(2).padStart(6), v.r>=4.5?'OK ':v.r>=3?'3:1':'BAJO', k, '·', v.where);
  await b.close();
})();
