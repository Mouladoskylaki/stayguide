import {readSavedGuide} from './saved-guide.js';
import {GUEST_CATALOGS,GUEST_LANGUAGES,guestSelection} from './guest-i18n.js';
import {createTranslationStore} from './translation-store.js';
import {createTranslationService,TRANSLATABLE_SECTIONS,TRANSLATION_CONFIG,isGenerationLocale} from './translation-service.js';
import {createOpenAITranslationProvider} from './openai-translation-provider.js';
import {qrSvg} from './qr.js';
import {previewWarning} from '../public/qr-tools.js';
import {UPDATE_GUIDE_SQL,guideContent,guideRevision,versionGuide} from './guide-store.js';
import {directWriteSucceeded} from './db-write.js';

const KEYS = ['property_name','welcome','wifi_name','wifi_password','checkin','checkout','rules','appliances','parking','local_tips','emergency','contact','additional'];
const LIMITS = { property_name:80, wifi_name:100, wifi_password:150, welcome:1500, checkin:800, checkout:800, rules:2000, appliances:2000, parking:1000, local_tips:2000, emergency:1000, contact:1000, additional:2000 };
const DEFAULTS = Object.fromEntries(KEYS.map(k=>[k,'']));
const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraph = (v,language)=>{const text=esc(v).replace(/\r?\n/g,'<br>');return language!==undefined?`<span lang="${esc(language)}">${text}</span>`:text;};
const random = count=>{let b=new Uint8Array(count);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');};
async function hash(value){const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(a)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});}
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
const parseRow=guideContent;
const guideConflict=()=>json({error:'This guide was updated elsewhere. Your changes have not been saved.',code:'guide_conflict'},409);
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
function guestPage(id,model,{locale='en-GB',target=null,languages={},fallback=[]}={}){
  const c=GUEST_CATALOGS[locale],label=k=>esc(c[k]),content=(value,key)=>paragraph(value,languages[key]||'');
  const title=esc(model.property_name),sections=[];
  const add=(id,title,body)=>sections.push({id,title:c[id]||title,body});
  if(hasText(model.wifi_name)||hasText(model.wifi_password)){
    add('wifi','Wi-Fi',`<dl class="wifi-data">
      ${hasText(model.wifi_name)?`<div><dt>${label('network')}</dt><dd lang="">${esc(model.wifi_name)}</dd></div>`:''}
      ${hasText(model.wifi_password)?`<div><dt>${label('password')}</dt><dd lang=""><code id="wifi-password" tabindex="0">${esc(model.wifi_password)}</code></dd></div>`:''}
    </dl>${hasText(model.wifi_password)?`<div class="wifi-copy"><button type="button" class="copy-btn" data-copy="wifi-password" data-copying="${label('copying')}" data-copy-label="${label('copy')}" data-copied-button="${label('copiedButton')}" data-copied-status="${label('copiedStatus')}" data-copy-error="${label('copyError')}" aria-describedby="wifi-copy-status" hidden>${label('copy')}</button><p id="wifi-copy-status" class="copy-status" role="status" aria-live="polite"></p></div>`:''}`);
  }
  if(hasText(model.checkin)||hasText(model.checkout)){
    add('arrival','Check-in & check-out',`<div class="hours-grid">
      ${hasText(model.checkin)?`<div><h3>${label('checkin')}</h3><p>${content(model.checkin,'checkin')}</p></div>`:''}
      ${hasText(model.checkout)?`<div><h3>${label('checkout')}</h3><p>${content(model.checkout,'checkout')}</p></div>`:''}
    </div>`);
  }
  if(hasText(model.welcome))add('welcome','Welcome',`<p>${content(model.welcome,'welcome')}</p>`);
  for(const [key,label] of [['rules','House rules'],['appliances','How things work'],['parking','Parking & transport'],['local_tips','Local favourites'],['emergency','Emergency information'],['contact','Contact your host'],['additional','Good to know']]){
    if(hasText(model[key]))add(key,label,`<p>${content(model[key],key)}</p>`);
  }
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f8f7f4"><title>${title} · StayGuide</title><link rel="stylesheet" href="/guest.css"></head>
<body class="guest-body"><main class="guest-shell" id="guide-top">
  <header class="guest-head"><span class="guest-eyebrow">${label('eyebrow')}</span><h1 lang="">${title}</h1><p>${label('intro')}</p>
  <form class="guest-language" action="/g/${id}" method="get"><label for="guest-language">${label('language')}</label><div><select id="guest-language" name="lang"><option value=""${!target?' selected':''}>${label('original')}</option>${Object.entries(GUEST_LANGUAGES).map(([tag,name])=>`<option value="${tag}" lang="${tag}"${target===tag?' selected':''}>${esc(name)}</option>`).join('')}</select><button type="submit">${label('show')}</button></div></form></header>
  ${fallback.length?`<p class="guest-fallback" role="status">${label('fallbackNotice')}</p>`:''}
  ${sections.length?`<div class="guest-layout">
    <nav class="quick-nav" aria-labelledby="guide-nav-title"><h2 id="guide-nav-title">${label('navigation')}</h2><div class="guest-tiles">
      ${sections.map(({id,title})=>`<a class="guest-tile${id==='wifi'?' guest-tile-wifi':''}" href="#${id}">${guestIcon(id)}<span>${title}</span></a>`).join('')}
    </div></nav>
    <div class="guest-content">${sections.map(({id,title,body})=>`<section class="guest-section" id="${id}" aria-labelledby="${id}-title" tabindex="-1"><header class="guest-section-head"><span class="section-icon">${guestIcon(id)}</span><h2 id="${id}-title">${title}</h2></header>${fallback.includes(id)?`<p class="original-label">${label('originalLabel')}</p>`:''}${body}<a class="back-to-guide" href="#guide-top">${label('back')} <span aria-hidden="true">↑</span></a></section>`).join('')}</div>
  </div>`:`<section class="empty-guide" aria-labelledby="empty-guide-title"><span class="section-icon">${guestIcon('welcome')}</span><h2 id="empty-guide-title">${label('emptyTitle')}</h2><p>${label('emptyBody')}</p></section>`}
  <footer class="guest-foot">${label('footer')}</footer>
</main><script src="/guest.js" defer></script></body></html>`;
}
function qrCard(id,model,target){
  const name=esc(model.property_name),warning=previewWarning(target);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Welcome card · ${name}</title><link rel="stylesheet" href="/print.css"></head><body class="print-body">
  <header class="print-toolbar"><button type="button" id="print-welcome" hidden>Print / Save as PDF</button><p>Print using your browser · Save as PDF or print on paper</p><p>Single welcome card · A5 portrait · keep browser headers and footers off.</p><noscript>Use your browser’s Print command to print this card.</noscript></header>
  ${warning?`<aside class="print-notice" role="note">${esc(warning)}</aside>`:''}
  <main class="print-card${model.property_name.length>45||target.length>90?' print-card-long':''}"><p class="welcome-title">Welcome.</p><span class="card-eyebrow">MAKE YOURSELF AT HOME AT</span><h1>${name}</h1><p class="card-intro">A little guide to a lovely stay.</p><img src="/g/${id}/qr.svg" width="288" height="288" alt="QR code for your guest guide"><p class="scan-title">Scan. Settle in. Enjoy.</p><p class="card-description">Your host’s guide to a comfortable stay, right on your phone.</p><span class="card-url">${esc(target)}</span><footer class="card-brand">StayGuide<span aria-hidden="true">.</span></footer></main><script src="/print.js" defer></script></body></html>`;
}
function translations(env){
 const provider=env.TRANSLATION_PROVIDER??createOpenAITranslationProvider({enabled:env.TRANSLATION_LIVE_ENABLED==='true',keyProvider:()=>env.OPENAI_API_KEY});
 return createTranslationService({store:createTranslationStore(env.DB),provider});
}
async function translationBody(request,limit=4096){
 const reader=request.body?.getReader();if(!reader)return null;let text='',bytes=0;const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>limit)return null;text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}
 catch{return null;}finally{try{await reader.cancel();}catch{}reader.releaseLock();}
}
export async function handleRequest(request,env){
  const url=new URL(request.url),path=url.pathname,method=request.method;
  try{
    if(path==='/api/guides'&&method==='POST'){
      const payload=await request.json().catch(()=>null);let model;
      try{model=validatePatch(DEFAULTS,payload);}catch(e){return error(e.message,400);}
      const id=random(8),token=random(32),time=new Date().toISOString();
      const stored=versionGuide(model);
      await env.DB.prepare('INSERT INTO guides (id, edit_token_hash, content_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(id,await hash(token),stored.contentJson,time,time).run();
      return json({id,token,revision:stored.revision,guide_url:`/g/${id}`,qr_url:`/g/${id}/qr.svg`},201);
    }
    let m=path.match(/^\/api\/guides\/([a-f0-9]{16})\/translation-sources\/([^/]+)$/);
    if(m&&(method==='GET'||method==='PATCH')){
      const row=await lookup(env.DB,m[1]);if(!row)return error('Not found',404);
      if(!(await checkOwner(request,row)))return error('Not authorized',401);
      if(!Object.hasOwn(TRANSLATABLE_SECTIONS,m[2]))return error('Not found',404);
      // Independent of provider construction/enablement and the legacy generation POST.
      const service=createTranslationService({store:createTranslationStore(env.DB)});
      let result;
      if(method==='GET')result=await service.sourceMetadata(row.id,m[2]);
      else{
        const body=await translationBody(request);
        if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json'||!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2||!Object.hasOwn(body,'sourceLanguage')||!Object.hasOwn(body,'expectedSourceVersion'))return error('Invalid source declaration',400);
        result=await service.declareSourceLanguage(row.id,m[2],body.sourceLanguage,body.expectedSourceVersion);
      }
      if(result.status==='ok')return json(result.metadata);
      if(result.status==='not_found')return error('Not found',404);
      if(result.status==='invalid')return error('Invalid source declaration',400);
      if(result.status==='conflict')return json({error:'This section was updated. Reload its source metadata before declaring a language.',code:'source_version_conflict'},409);
      return json({error:'Source metadata is unavailable.',code:'source_metadata_unavailable'},500);
    }
    m=path.match(/^\/api\/guides\/([a-f0-9]{16})\/translation-capabilities$/);
    if(m&&method==='GET'){
      const row=await lookup(env.DB,m[1]);if(!row)return error('Not found',404);
      if(!(await checkOwner(request,row)))return error('Not authorized',401);
      const q=url.searchParams,section=q.get('section'),sourceLanguage=q.get('sourceLanguage'),target=q.get('targetLanguage'),version=Number(q.get('expectedSourceVersion'));
      if([...q.keys()].length!==4||[...q.keys()].some(k=>!['section','sourceLanguage','targetLanguage','expectedSourceVersion'].includes(k))||!Object.hasOwn(TRANSLATABLE_SECTIONS,section)||!isGenerationLocale(sourceLanguage)||!isGenerationLocale(target)||!Number.isSafeInteger(version)||version<1||String(version)!==q.get('expectedSourceVersion'))return error('Invalid capability request',400);
      // No adapter construction, live flag or key lookup. This binding is server-owned
      // and supplied only by isolated offline tests, never by request/browser data.
      const testOnly=env.TRANSLATION_OFFLINE_TEST===true&&env.TRANSLATION_PROVIDER?.mode==='openai'&&env.TRANSLATION_PROVIDER.enabled===true;
      const capability=state=>json({generationAvailable:state==='available',testOnly,state,sourceVersion:version});
      if(!testOnly)return capability('unavailable');
      const store=createTranslationStore(env.DB),source=await store.source(row.id,section),c=TRANSLATION_CONFIG;
      if(!source?.source_language)return capability('source_required');
      if(source.source_language!==sourceLanguage||source.source_version!==version)return capability('source_changed');
      if(sourceLanguage===target)return capability('same_language');
      if(await store.cached(row.id,section,target,c.model,c.promptVersion,'openai'))return capability('cached');
      const attempt=await store.attempted(row.id,section,sourceLanguage,target,version,c.model,c.promptVersion,'openai');
      if(attempt)return capability(attempt.status==='reserved'&&attempt.lease_until>Date.now()?'attempt_pending':'attempt_terminal');
      const raw=JSON.parse(source.source_text),text=TRANSLATABLE_SECTIONS[section].map(k=>raw[k]??'').join('\n');
      if(!text.trim())return capability('empty');
      if([...text].length>c.maxSourceCodePoints)return capability('input_limit');
      return capability('available');
    }
    m=path.match(/^\/api\/guides\/([a-f0-9]{16})\/translations$/);
    if(m&&(method==='POST'||method==='GET'||method==='PATCH')){
      const row=await lookup(env.DB,m[1]);if(!row)return error('Not found',404);
      if(!(await checkOwner(request,row)))return error('Not authorized',401);
      if(method==='PATCH'){
        // 96 KiB includes two 3,200-byte fields plus their JSON-escaped previous
        // snapshot (even worst-case control-character escaping), with a hard cap.
        const body=await translationBody(request,98304),keys=['section','targetLanguage','fields','expected'];
        const expected=body?.expected,fields=body?.fields,expectedKeys=['sourceVersion','translationId','translatedText'];
        if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json'||!body||Array.isArray(body)||Object.keys(body).length!==keys.length||Object.keys(body).some(k=>!keys.includes(k))||!Object.hasOwn(TRANSLATABLE_SECTIONS,body.section)||!isGenerationLocale(body.targetLanguage)||!expected||Array.isArray(expected)||Object.keys(expected).length!==3||Object.keys(expected).some(k=>!expectedKeys.includes(k))||!Number.isSafeInteger(expected.sourceVersion)||expected.sourceVersion<1||typeof expected.translationId!=='string'||!expected.translationId.length||expected.translationId.length>128||typeof expected.translatedText!=='string'||new TextEncoder().encode(expected.translatedText).length>40000||!fields||Array.isArray(fields)||Object.keys(fields).sort().join()!==TRANSLATABLE_SECTIONS[body.section].slice().sort().join()||!Object.values(fields).every(v=>typeof v==='string'&&new TextEncoder().encode(v).length<=3200&&!/(?:sk-[A-Za-z0-9_-]{20,}|Bearer\s|-----BEGIN.*PRIVATE KEY)/.test(v)))return error('Invalid correction request',400);
        // A storage-only OpenAI-mode boundary: never resolve live configuration,
        // injected generation providers, credentials or any transport for correction.
        const store=createTranslationStore(env.DB),source=await store.source(row.id,body.section);
        const service=createTranslationService({store,provider:{mode:'openai',enabled:false,async translate(){throw Error('Generation unavailable');}}});
        const applied=isGenerationLocale(source?.source_language)&&await service.correct(row.id,body.section,body.targetLanguage,fields,expected);
        return applied?json({status:'corrected'}):json({error:'The correction could not be saved. Review the latest saved translation before trying again.',code:'correction_conflict'},409);
      }
      const service=translations(env);
      if(method==='GET')return json(await service.view(row.id,url.searchParams.get('section'),url.searchParams.get('lang')));
      const body=await translationBody(request);
      if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json'||!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==4||Object.keys(body).some(k=>!['section','sourceLanguage','targetLanguage','expectedSourceVersion'].includes(k))||!Object.hasOwn(TRANSLATABLE_SECTIONS,body.section)||!isGenerationLocale(body.sourceLanguage)||!isGenerationLocale(body.targetLanguage)||!Number.isSafeInteger(body.expectedSourceVersion)||body.expectedSourceVersion<1)return error('Invalid translation request',400);
      const result=await service.generate(row.id,body.section,body.targetLanguage,body.sourceLanguage,body.expectedSourceVersion);
      return json(result,result.status==='translated'||result.status==='original'?200:result.category==='live_disabled'?503:result.category==='source_not_found'?404:result.category==='translation_timeout_uncertain'?504:result.status==='failed'?502:409);
    }
    m=path.match(/^\/api\/guides\/([a-f0-9]{16})$/);
    if(m&&(method==='GET'||method==='PATCH')){
      const row=await lookup(env.DB,m[1]);if(!row)return error('Not found',404);
      if(!(await checkOwner(request,row)))return error('Not authorized',401);
      const revision=await guideRevision(row);
      if(method==='GET')return json({id:row.id,guide:parseRow(row),revision,updated_at:row.updated_at},200,{ETag:'"'+revision+'"'});
      const expected=request.headers.get('If-Match');
      if(expected===null)return error('Reload this guide before saving: a content revision is required.',428);
      const match=/^"([a-f0-9]{64})"$/.exec(expected);
      if(!match)return error('Invalid guide revision.',400);
      if(match[1]!==revision)return guideConflict();
      const patch=await request.json().catch(()=>null);let model;
      try{model=validatePatch(parseRow(row),patch);}catch(e){return error(e.message,400);}
      const now=new Date().toISOString(),stored=versionGuide(model);
      const saved=await env.DB.prepare(UPDATE_GUIDE_SQL).bind(stored.contentJson,now,row.id,row.content_json,row.edit_token_hash).all();
      if(!directWriteSucceeded(saved))return guideConflict();
      return json({id:row.id,guide:model,revision:stored.revision,updated_at:now},200,{ETag:'"'+stored.revision+'"'});
    }
    m=path.match(/^\/g\/([a-f0-9]{16})(?:\/(qr\.svg|card))?$/);
    if(m&&method==='GET'){
      const target=new URL(`/g/${m[1]}`,url.origin).href;
      if(m[2]){const row=await lookup(env.DB,m[1]);if(!row)return html('<h1>Guide not found</h1>',404);const model=parseRow(row);
        if(m[2]==='qr.svg')return new Response(qrSvg(target),{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
        return html(qrCard(m[1],model,target));
      }
      const selection=guestSelection(url);
      if(selection.redirect)return new Response(null,{status:303,headers:{Location:`/g/${m[1]}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
      let saved;
      try{saved=await readSavedGuide(env.DB,m[1],selection.target);}
      catch{
        // A failed translation read cannot remove an otherwise readable guide.
        const row=await lookup(env.DB,m[1]);if(!row)return html('<h1>Guide not found</h1>',404);
        const model=parseRow(row);saved={model,languages:{},fallback:selection.target?Object.entries(TRANSLATABLE_SECTIONS).filter(([,keys])=>keys.some(k=>hasText(model[k]))).map(([key])=>key):[]};
      }
      return html(guestPage(m[1],saved.model,{...selection,...saved}));
    }
    if(method==='GET'&&env.ASSETS)return env.ASSETS.fetch(request);
    return new Response('Not found',{status:404});
  }catch(err){console.error('StayGuide request failed');return error('Unexpected server error',500);}
}
export default {fetch:handleRequest};
