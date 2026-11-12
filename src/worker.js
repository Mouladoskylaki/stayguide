import {qrSvg} from './qr.js';
import {previewWarning} from '../public/qr-tools.js';

const KEYS = ['property_name','welcome','wifi_name','wifi_password','checkin','checkout','rules','appliances','parking','local_tips','emergency','contact','additional'];
const LIMITS = { property_name:80, wifi_name:100, wifi_password:150, welcome:1500, checkin:800, checkout:800, rules:2000, appliances:2000, parking:1000, local_tips:2000, emergency:1000, contact:1000, additional:2000 };
const DEFAULTS = Object.fromEntries(KEYS.map(k=>[k,'']));
const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraph = v=>esc(v).replace(/\r?\n/g,'<br>');
const random = count=>{let b=new Uint8Array(count);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');};
async function hash(value){const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(a)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function html(source,status=200){return new Response(source,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer'}});}
function error(msg,status){return json({error:msg},status);}
function validatePatch(base,patch){
  if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('Invalid guide data');
  for(const [k,v] of Object.entries(patch)){
    if(!KEYS.includes(k)||typeof v!=='string')throw new Error('Invalid field: '+k);
    if(v.length>LIMITS[k])throw new Error('Too long: '+k);
  }
  const result={...base,...patch};
  if(!result.property_name.trim())throw new Error('Property name is required');
  return result;
}
async function lookup(db,id){return db.prepare('SELECT id, edit_token_hash, content_json, created_at, updated_at FROM guides WHERE id = ?1').bind(id).first();}
function parseRow(row){return JSON.parse(row.content_json);}
function authorized(request,row){return request.headers.get('Authorization')?.startsWith('Bearer ');}
async function checkOwner(request,row){const h=request.headers.get('Authorization')||'';return h.startsWith('Bearer ')&& (await hash(h.slice(7)))===row.edit_token_hash;}
// Guest presentation only: all links and content are rendered before JavaScript runs.
const GUEST_ICONS = {
  welcome:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  wifi:'<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".8"/>',
  arrival:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h3"/>',
  rules:'<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  appliances:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16"/><circle cx="12" cy="14" r="4"/>',
  parking:'<path d="m5 8 2-4h10l2 4m-16 5 2-5h14l2 5v6H3Z"/><path d="M3 13h18M6 19v2m12-2v2"/>',
  local_tips:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  emergency:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
  contact:'<path d="M7 3H4a1 1 0 0 0-1 1c0 9 8 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a15 15 0 0 1-7-7l2-2Z"/>',
  additional:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>'
};
const guestIcon=id=>`<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">${GUEST_ICONS[id]}</svg>`;
const hasText=value=>typeof value==='string'&&value.trim().length>0;
function guestPage(id,model){
  const title=esc(model.property_name),sections=[];
  const add=(id,title,body)=>sections.push({id,title,body});
  if(hasText(model.wifi_name)||hasText(model.wifi_password)){
    add('wifi','Wi-Fi',`<dl class="wifi-data">
      ${hasText(model.wifi_name)?`<div><dt>Network</dt><dd>${esc(model.wifi_name)}</dd></div>`:''}
      ${hasText(model.wifi_password)?`<div><dt>Password</dt><dd><code id="wifi-password" tabindex="0">${esc(model.wifi_password)}</code></dd></div>`:''}
    </dl>${hasText(model.wifi_password)?`<div class="wifi-copy"><button type="button" class="copy-btn" data-copy="wifi-password" aria-describedby="wifi-copy-status" hidden>Copy password</button><p id="wifi-copy-status" class="copy-status" role="status" aria-live="polite"></p></div>`:''}`);
  }
  if(hasText(model.checkin)||hasText(model.checkout)){
    add('arrival','Check-in & check-out',`<div class="hours-grid">
      ${hasText(model.checkin)?`<div><h3>Check-in</h3><p>${paragraph(model.checkin)}</p></div>`:''}
      ${hasText(model.checkout)?`<div><h3>Check-out</h3><p>${paragraph(model.checkout)}</p></div>`:''}
    </div>`);
  }
  if(hasText(model.welcome))add('welcome','Welcome',`<p>${paragraph(model.welcome)}</p>`);
  for(const [key,label] of [['rules','House rules'],['appliances','How things work'],['parking','Parking & transport'],['local_tips','Local favourites'],['emergency','Emergency information'],['contact','Contact your host'],['additional','Good to know']]){
    if(hasText(model[key]))add(key,label,`<p>${paragraph(model[key])}</p>`);
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f8f7f4"><title>${title} · StayGuide</title><link rel="stylesheet" href="/guest.css"></head>
<body class="guest-body"><main class="guest-shell" id="guide-top">
  <header class="guest-head"><span class="guest-eyebrow">A LITTLE GUIDE TO YOUR STAY</span><h1>${title}</h1><p>Settle in. Make yourself at home.</p></header>
  ${sections.length?`<div class="guest-layout">
    <nav class="quick-nav" aria-labelledby="guide-nav-title"><h2 id="guide-nav-title">Your stay, at a glance</h2><div class="guest-tiles">
      ${sections.map(({id,title})=>`<a class="guest-tile${id==='wifi'?' guest-tile-wifi':''}" href="#${id}">${guestIcon(id)}<span>${title}</span></a>`).join('')}
    </div></nav>
    <div class="guest-content">${sections.map(({id,title,body})=>`<section class="guest-section" id="${id}" aria-labelledby="${id}-title" tabindex="-1"><header class="guest-section-head"><span class="section-icon">${guestIcon(id)}</span><h2 id="${id}-title">${title}</h2></header>${body}<a class="back-to-guide" href="#guide-top">Back to sections <span aria-hidden="true">↑</span></a></section>`).join('')}</div>
  </div>`:`<section class="empty-guide" aria-labelledby="empty-guide-title"><span class="section-icon">${guestIcon('welcome')}</span><h2 id="empty-guide-title">A warm welcome awaits.</h2><p>Your host is preparing this guide. Check back for the details of your stay.</p></section>`}
  <footer class="guest-foot">Enjoy your stay.</footer>
</main><script src="/guest.js" defer></script></body></html>`;
}
function qrCard(id,model,target){
  const name=esc(model.property_name),warning=previewWarning(target);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Welcome card · ${name}</title><link rel="stylesheet" href="/print.css"></head><body class="print-body">
  <header class="print-toolbar"><button type="button" id="print-welcome" hidden>Print / Save as PDF</button><p>Print using your browser · Save as PDF or print on paper</p><p>Single welcome card · A5 portrait · keep browser headers and footers off.</p><noscript>Use your browser’s Print command to print this card.</noscript></header>
  ${warning?`<aside class="print-notice" role="note">${esc(warning)}</aside>`:''}
  <main class="print-card${model.property_name.length>45||target.length>90?' print-card-long':''}"><p class="welcome-title">Welcome.</p><span class="card-eyebrow">MAKE YOURSELF AT HOME AT</span><h1>${name}</h1><p class="card-intro">A little guide to a lovely stay.</p><img src="/g/${id}/qr.svg" width="288" height="288" alt="QR code for your guest guide"><p class="scan-title">Scan. Settle in. Enjoy.</p><p class="card-description">Your host’s guide to a comfortable stay, right on your phone.</p><span class="card-url">${esc(target)}</span><footer class="card-brand">StayGuide<span aria-hidden="true">.</span></footer></main><script src="/print.js" defer></script></body></html>`;
}
export async function handleRequest(request,env){
  const url=new URL(request.url),path=url.pathname,method=request.method;
  try{
    if(path==='/api/guides'&&method==='POST'){
      const payload=await request.json().catch(()=>null);let model;
      try{model=validatePatch(DEFAULTS,payload);}catch(e){return error(e.message,400);}
      const id=random(8),token=random(32),time=new Date().toISOString();
      await env.DB.prepare('INSERT INTO guides (id, edit_token_hash, content_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(id,await hash(token),JSON.stringify(model),time,time).run();
      return json({id,token,guide_url:`/g/${id}`,qr_url:`/g/${id}/qr.svg`},201);
    }
    let m=path.match(/^\/api\/guides\/([a-f0-9]{16})$/);
    if(m&&(method==='GET'||method==='PATCH')){
      const row=await lookup(env.DB,m[1]);if(!row)return error('Not found',404);
      if(!(await checkOwner(request,row)))return error('Not authorized',401);
      if(method==='GET')return json({id:row.id,guide:parseRow(row),updated_at:row.updated_at});
      const patch=await request.json().catch(()=>null);let model;
      try{model=validatePatch(parseRow(row),patch);}catch(e){return error(e.message,400);}
      const now=new Date().toISOString();await env.DB.prepare('UPDATE guides SET content_json = ?1, updated_at = ?2 WHERE id = ?3').bind(JSON.stringify(model),now,row.id).run();
      return json({id:row.id,guide:model,updated_at:now});
    }
    m=path.match(/^\/g\/([a-f0-9]{16})(?:\/(qr\.svg|card))?$/);
    if(m&&method==='GET'){
      const row=await lookup(env.DB,m[1]);if(!row)return html('<h1>Guide not found</h1>',404);
      const model=parseRow(row),target=new URL(`/g/${m[1]}`,url.origin).href;
      if(m[2]==='qr.svg')return new Response(qrSvg(target),{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
      if(m[2]==='card')return html(qrCard(m[1],model,target));
      return html(guestPage(m[1],model));
    }
    if(method==='GET'&&env.ASSETS)return env.ASSETS.fetch(request);
    return new Response('Not found',{status:404});
  }catch(err){console.error('StayGuide error',err);return error('Unexpected server error',500);}
}
export default {fetch:handleRequest};
