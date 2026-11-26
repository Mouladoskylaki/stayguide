// W6 synthetic saved fixtures only. Guest requests have hostile provider bindings.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {handleRequest} from '../src/worker.js';
import {createLocalDb} from '../node/db.mjs';
import {createTranslationStore,TRANSLATION_SQL as SQL} from '../src/translation-store.js';
import {GUEST_CATALOGS} from '../src/guest-i18n.js';
const original={property_name:'Synthetic <Villa> & φίλοι',wifi_name:'Unchanged network',wifi_password:'Synthetic WiFi value',welcome:'Welcome. Call 112.',checkin:'Arrive 15:00.',checkout:'Leave 11:00.',rules:'No smoking.',parking:'Park here.'};
async function fixture(t,model=original){
 fs.mkdirSync('.local/qa',{recursive:true});const dir=fs.mkdtempSync('.local/qa/sg-p31-w6-unit-');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=dir+'/disposable.json',db=createLocalDb(file),store=createTranslationStore(db);let queries=0,bindings=0,inject;
 const wrapped={prepare(sql){const s=db.prepare(sql);if(sql!==SQL.snapshot)return s;return {bind(...args){s.bind(...args);return {async all(){queries++;if(inject)await inject(queries);return s.all();}};}};}};
 const env={DB:wrapped};for(const key of ['OPENAI_API_KEY','TRANSLATION_PROVIDER','TRANSLATION_LIVE_ENABLED'])Object.defineProperty(env,key,{get(){bindings++;throw Error('SYNTHETIC_PRIVATE_BINDING');}});
 const response=await handleRequest(new Request('https://offline.invalid/api/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(model)}),{DB:db}),owner=await response.json();assert.equal(response.status,201);const base='/g/'+owner.id;
 const get=(suffix='')=>handleRequest(new Request('https://offline.invalid'+base+suffix),env);
 const seed=async(section,target,fields,{mode='openai',status='ready',source='en-GB',manual=false}={})=>{const current=await store.source(owner.id,section);if(current.source_language!==source)assert(await store.setLanguage(owner.id,section,source));const s=await store.source(owner.id,section),id=section+'-'+target+'-'+mode;assert(await store.claim({...s,claim_id:id,target_language:target,model:'gpt-6-luna',prompt_version:'hospitality-v1',provider_mode:mode,created_ms:1,lease_until:9999999999999,reservation_nano:660000}));if(status==='ready'){assert(await store.publish(id,JSON.stringify(fields),2));if(manual)assert(await store.correct({translationId:id,translatedText:JSON.stringify(fields),sourceVersion:s.source_version,guideId:owner.id,section,targetLanguage:target,model:'gpt-6-luna',promptVersion:'hospitality-v1',sourceLanguage:source,previousText:JSON.stringify(fields)}));}else if(status==='failed')assert(await store.fail(id));};
 const patch=async fields=>{const r=await handleRequest(new Request('https://offline.invalid/api/guides/'+owner.id,{headers:{Authorization:'Bearer '+owner.token}}),{DB:db});const g=await r.json();assert.equal((await handleRequest(new Request('https://offline.invalid/api/guides/'+owner.id,{method:'PATCH',headers:{Authorization:'Bearer '+owner.token,'Content-Type':'application/json','If-Match':'"'+g.revision+'"'},body:JSON.stringify(fields)}),{DB:db})).status,200);};
 return {db,store,owner,base,get,seed,patch,snapshot:()=>fs.readFileSync(file),inject:fn=>inject=fn,get queries(){return queries;},get bindings(){return bindings;}};
}
test('six guest catalogs have exact key/placeholder parity and no runtime imports',()=>{
 const keys=Object.keys(GUEST_CATALOGS['en-GB']).sort();assert.equal(keys.length,31);assert.equal(Object.keys(GUEST_CATALOGS).length,6);
 for(const [locale,c] of Object.entries(GUEST_CATALOGS))for(const key of keys){assert.deepEqual(Object.keys(c).sort(),keys);assert.equal(typeof c[key],'string');assert(c[key].trim());assert.deepEqual(c[key].match(/\{\w+\}/g)||[],GUEST_CATALOGS['en-GB'][key].match(/\{\w+\}/g)||[]);assert(!fs.readFileSync('src/guest-locales/'+locale+'.js','utf8').includes('import '));}
});
for(const locale of Object.keys(GUEST_CATALOGS))test('saved-only SSR in '+locale+' preserves originals and does not read providers or mutate DB',async t=>{
 const f=await fixture(t);if(locale!=='en-GB')await f.seed('welcome',locale,{welcome:'Synthetic '+locale+'. 112.'});else assert(await f.store.setLanguage(f.owner.id,'welcome','en-GB'));
 const before=f.snapshot(),r=await f.get('?lang='+locale),page=await r.text();assert.equal(r.status,200);assert(page.includes('<html lang="'+locale+'">'));assert(page.includes('method="get"'));assert(page.includes('action="'+f.base+'"'));assert(page.includes(GUEST_CATALOGS[locale].show));assert(page.includes('<h1 lang="">Synthetic &lt;Villa&gt; &amp; φίλοι</h1>'));assert(page.includes('Unchanged network'));assert(page.includes('Synthetic WiFi value'));assert(page.includes(locale==='en-GB'?'Welcome. Call 112.':'Synthetic '+locale+'. 112.'));assert(page.includes('<span lang="'+locale+'">'));assert(!page.includes(f.owner.token));assert(!page.includes('translationId'));assert(!page.includes('translatedText'));assert(!page.includes('reservation_nano'));assert.equal(f.queries,2);assert.equal(f.bindings,0);assert.deepEqual(f.snapshot(),before);
 assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.equal(r.headers.get('Cache-Control'),'no-store');assert(r.headers.get('Content-Security-Policy').includes("default-src 'self'"));
});
test('original option canonicalizes empty lang and invalid/repeated parameters without reflecting them',async t=>{
 const f=await fixture(t);for(const query of ['?lang=','?lang=de-DE&lang=fr-FR','?lang=de-DE&lang=de-DE','?lang=ja-JP','?lang=%3Cscript%3E','?lang=DE-de','?lang=de-DE%00']){const r=await f.get(query);assert.equal(r.status,303);assert.equal(r.headers.get('Location'),f.base);assert.equal(await r.text(),'');}const page=await (await f.get()).text();assert(page.includes('<option value="" selected>'));assert(page.includes('<span lang="">Welcome. Call 112.</span>'));assert(!page.includes('class="guest-fallback"'));assert.equal(f.bindings,0);
});
test('known original language has no false missing warning; undeclared and legacy sources retain correct tags',async t=>{
 const f=await fixture(t,{property_name:'Known original',welcome:'Γεια σας. 112.'});assert(await f.store.setLanguage(f.owner.id,'welcome','el-GR'));let page=await (await f.get('?lang=el-GR')).text();assert(!page.includes('class="guest-fallback"'));assert(page.includes('<span lang="el-GR">'));
 assert(await f.store.setLanguage(f.owner.id,'welcome','ja-JP'));page=await (await f.get('?lang=de-DE')).text();assert(page.includes('<span lang="ja-JP">'));assert(page.includes(GUEST_CATALOGS['de-DE'].fallbackNotice));
 assert(await f.store.setLanguage(f.owner.id,'welcome','<script>bad-language</script>'));page=await (await f.get('?lang=de-DE')).text();assert(page.includes('<span lang="">'));assert(!page.includes('bad-language'));
});
test('current manual arrival fields and mixed original content are shown without exposing correction metadata',async t=>{
 const f=await fixture(t);await f.seed('arrival','de-DE',{checkin:'Ankunft 15:00.',checkout:'Abreise 11:00.'},{manual:true});const page=await (await f.get('?lang=de-DE')).text();assert(page.includes('Ankunft 15:00.'));assert(page.includes('Abreise 11:00.'));assert(page.includes('Welcome. Call 112.'));assert(page.includes('<span lang="">Welcome.'));assert.equal((page.match(/class="guest-fallback"/g)||[]).length,1);assert(!page.includes('arrival-de-DE-openai'));assert(!page.includes('claim_id'));
});
for(const status of ['pending','failed','mock','stale','invalid'])test(status+' saved output is never presented as current',async t=>{
 const f=await fixture(t);await f.seed('welcome','de-DE',{welcome:status==='invalid'?'Wrong number.':'EXCLUDED OUTPUT 112.'},{mode:status==='mock'?'mock':'openai',status:status==='pending'||status==='failed'?status:'ready'});if(status==='stale')await f.patch({welcome:'Fresh original. 112.'});const before=f.snapshot(),page=await (await f.get('?lang=de-DE')).text();assert(!page.includes('EXCLUDED OUTPUT'));assert(!page.includes('Wrong number.'));assert(page.includes(status==='stale'?'Fresh original. 112.':'Welcome. Call 112.'));assert(page.includes(GUEST_CATALOGS['de-DE'].fallbackNotice));assert.deepEqual(f.snapshot(),before);assert.equal(f.bindings,0);
});
test('source edit between reads discards old translation and uses newest original snapshot',async t=>{
 const f=await fixture(t);await f.seed('welcome','de-DE',{welcome:'OLD OVERLAY 112.'});f.inject(async n=>{if(n===2)await f.patch({welcome:'New source during render. 112.'});});const page=await (await f.get('?lang=de-DE')).text();assert(page.includes('New source during render. 112.'));assert(!page.includes('OLD OVERLAY'));assert(page.includes('<span lang="en-GB">'));assert.equal(f.queries,2);
});
test('source-language change between reads invalidates overlay without guessing English',async t=>{
 const f=await fixture(t);await f.seed('welcome','de-DE',{welcome:'OLD OVERLAY 112.'});f.inject(async n=>{if(n===2)assert(await f.store.setLanguage(f.owner.id,'welcome','el-GR'));});const page=await (await f.get('?lang=de-DE')).text();assert(!page.includes('OLD OVERLAY'));assert(page.includes('<span lang="el-GR">Welcome. Call 112.</span>'));
});
test('manual correction during render fences the candidate; next request uses the current correction',async t=>{
 const f=await fixture(t);await f.seed('welcome','de-DE',{welcome:'Before correction. 112.'});f.inject(async n=>{if(n===2){const c=await f.store.cached(f.owner.id,'welcome','de-DE','gpt-6-luna','hospitality-v1','openai');assert(await f.store.correct({translationId:c.claim_id,translatedText:JSON.stringify({welcome:'Latest correction. 112.'}),sourceVersion:c.source_version,guideId:f.owner.id,section:'welcome',targetLanguage:'de-DE',model:c.model,promptVersion:c.prompt_version,sourceLanguage:c.source_language,previousText:c.translated_text}));}});let page=await (await f.get('?lang=de-DE')).text();assert(!page.includes('Before correction.'));assert(!page.includes('Latest correction.'));assert(page.includes('Welcome. Call 112.'));page=await (await f.get('?lang=de-DE')).text();assert(page.includes('Latest correction. 112.'));
});
test('storage read failure keeps readable original content with unknown language and safe notice',async t=>{
 const f=await fixture(t);f.inject(async()=>{throw Error('SYNTHETIC_PRIVATE_STORAGE_FAILURE');});const r=await f.get('?lang=fr-FR'),page=await r.text();assert.equal(r.status,200);assert(page.includes('Welcome. Call 112.'));assert(page.includes('<span lang="">'));assert(page.includes(GUEST_CATALOGS['fr-FR'].fallbackNotice));assert(!page.includes('PRIVATE_STORAGE'));
});
test('translations belong only to their own guide and all untrusted text is escaped',async t=>{
 const f=await fixture(t,{...original,welcome:'<script>112</script>'});await f.seed('welcome','de-DE',{welcome:'<img src=x onerror=alert(1)>112'});const page=await (await f.get('?lang=de-DE')).text();assert(page.includes('&lt;img src=x onerror=alert(1)&gt;112'));assert(!page.includes('<img'));const created=await handleRequest(new Request('https://offline.invalid/api/guides',{method:'POST',body:JSON.stringify({property_name:'Other guide',welcome:'Other original 112.'})}),{DB:f.db});const other=await created.json();const r=await handleRequest(new Request('https://offline.invalid/g/'+other.id+'?lang=de-DE'),{DB:f.db});const html=await r.text();assert(html.includes('Other original'));assert(!html.includes('onerror=alert'));assert(!html.includes(other.token));
});
test('empty guide is localized without invented sections or missing-translation warning',async t=>{
 const f=await fixture(t,{property_name:'Empty guide'});for(const locale of Object.keys(GUEST_CATALOGS)){const page=await (await f.get('?lang='+locale)).text();assert(page.includes(GUEST_CATALOGS[locale].emptyTitle));assert(!page.includes('class="guest-fallback"'));assert(!page.includes('class="guest-section"'));}
});
test('stable QR remains original and local snapshot count/timing is recorded without mutations',async t=>{
 const f=await fixture(t);const before=f.snapshot(),start=performance.now();for(let i=0;i<20;i++)assert.equal((await f.get('?lang=es-ES')).status,200);const elapsed=performance.now()-start;assert.equal(f.queries,40);assert.deepEqual(f.snapshot(),before);const a=await (await f.get('/qr.svg')).text(),b=await (await f.get('/qr.svg?lang=de-DE')).text();assert.equal(a,b);assert(!a.includes('lang='));console.log('W6 local adapter sample:',JSON.stringify({requests:20,snapshotReads:40,totalMs:Number(elapsed.toFixed(3)),meanMs:Number((elapsed/20).toFixed(3)),providerBindingReads:f.bindings}));
});
