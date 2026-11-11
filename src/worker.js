import {qrSvg} from './qr.js';

const KEYS = ['property_name','welcome','wifi_name','wifi_password','checkin','checkout','rules','appliances','parking','local_tips','emergency','contact','additional'];
const LIMITS = { property_name:80, wifi_name:100, wifi_password:150, welcome:1500, checkin:800, checkout:800, rules:2000, appliances:2000, parking:1000, local_tips:2000, emergency:1000, contact:1000, additional:2000 };
const DEFAULTS = Object.fromEntries(KEYS.map(k=>[k,'']));
const SECTIONS = [
  ['welcome','Welcome','sparkles'],['wifi','Wi-Fi','wifi'],['stay','Check-in & check-out','clock'],
  ['rules','House rules','shield'],['appliances','How things work','plug'],['parking','Parking & transport','car'],
  ['local_tips','Local favourites','map'],['emergency','Emergencies','heart'],['contact','Contact your host','phone'],['additional','Good to know','info']
];
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
function section(id,title,body,icon){return `<section class="guest-section" id="${id}"><div class="section-icon" aria-hidden="true">${icon}</div><div><h2>${title}</h2>${body}</div></section>`;}
function guestPage(id,model){
  const title=esc(model.property_name),s=[];
  if(model.wifi_name||model.wifi_password){s.push(section('wifi','Wi-Fi',`<div class="wifi-data"><div><small>Network</small><strong>${esc(model.wifi_name||'—')}</strong></div>${model.wifi_password?`<div><small>Password</small><div class="password-wrap"><input id="wifi-password" aria-label="Wi-Fi password" value="${esc(model.wifi_password)}" readonly><button type="button" class="copy-btn" data-copy="wifi-password">Copy</button></div></div>`:''}</div>`,'⌁'));}
  if(model.welcome)s.push(section('welcome','Welcome',`<p>${paragraph(model.welcome)}</p>`,'✳'));
  if(model.checkin||model.checkout)s.push(section('arrival','Arrival & departure',`<div class="hours-grid">${model.checkin?`<div><small>Check-in</small><p>${paragraph(model.checkin)}</p></div>`:''}${model.checkout?`<div><small>Check-out</small><p>${paragraph(model.checkout)}</p></div>`:''}</div>`,'◷'));
  for(const [key,label,icon] of [['rules','House rules','⌂'],['appliances','How things work','⚙'],['parking','Parking & transport','↗'],['local_tips','Local favourites','♡'],['emergency','Emergency information','✚'],['contact','Contact your host','✉'],['additional','Good to know','◎']]){
    if(model[key])s.push(section(key,label,`<p>${paragraph(model[key])}</p>`,icon));
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f6f8f6"><title>${title} · StayGuide</title><link rel="stylesheet" href="/styles.css"></head><body class="guest-body"><main class="guest-shell"><header class="guest-head"><span class="eyebrow">YOUR STAY, MADE SIMPLE</span><h1>${title}</h1><p>Everything you need for a comfortable stay, all in one place.</p></header>${s.length?`<nav class="quick-nav" aria-label="Guide sections">${s.map((part,i)=>{const match=part.match(/id="([^"]+)"/);const h=part.match(/<h2>(.*?)<\/h2>/);return `<a href="#${match[1]}">${h[1]}</a>`;}).join('')}</nav><div class="guest-content">${s.join('')}</div>`:'<p class="empty-guide">Your host is preparing this guide.</p>'}<footer class="guest-foot">Enjoy your stay</footer></main><script src="/guest.js" defer></script></body></html>`;
}
function qrCard(id,model){const name=esc(model.property_name);return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>QR card · ${name}</title><link rel="stylesheet" href="/styles.css"></head><body class="print-body"><main class="print-card"><span class="eyebrow">WELCOME TO</span><h1>${name}</h1><p>Everything for your stay in one place.</p><img src="/g/${id}/qr.svg" width="220" height="220" alt="QR code for your guest guide"><p class="scan-text">Scan for Wi-Fi, house information & local tips</p></main><p class="print-help">Print using your browser · Save as PDF or print on paper</p></body></html>`;}
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
      if(m[2]==='card')return html(qrCard(m[1],model));
      return html(guestPage(m[1],model));
    }
    if(method==='GET'&&env.ASSETS)return env.ASSETS.fetch(request);
    return new Response('Not found',{status:404});
  }catch(err){console.error('StayGuide error',err);return error('Unexpected server error',500);}
}
export default {fetch:handleRequest};
