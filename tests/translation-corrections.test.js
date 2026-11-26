// Offline correction API tests: persisted synthetic OpenAI-mode fixtures, never generation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocalDb} from '../node/db.mjs';
import {handleRequest} from '../src/worker.js';
import {createTranslationStore,TRANSLATION_SQL as SQL} from '../src/translation-store.js';
const model='gpt-6-luna',prompt='hospitality-v1';
async function fixture(section='welcome',sourceFields={welcome:'Welcome. Call 112.'},translated={welcome:'Willkommen. 112.'}){
 const db=createLocalDb(),store=createTranslationStore(db);let accesses=0;
 const env={DB:db,get OPENAI_API_KEY(){accesses++;throw Error('SYNTHETIC_PRIVATE_KEY');},get TRANSLATION_LIVE_ENABLED(){accesses++;throw Error('SYNTHETIC_PRIVATE_CONFIG');},get TRANSLATION_PROVIDER(){accesses++;throw Error('SYNTHETIC_PRIVATE_PROVIDER');}};
 let owner;const request=(path,method='GET',body,token=owner?.token,extra={})=>handleRequest(new Request('https://offline.invalid'+path,{method,headers:{Authorization:'Bearer '+token,...(body!==undefined?{'Content-Type':'application/json'}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)}),method==='PATCH'&&path.endsWith('/translations')?env:{DB:db});
 owner=await (await request('/api/guides','POST',{property_name:'Synthetic correction owner',...sourceFields})).json();const base='/api/guides/'+owner.id;
 assert.equal((await request(base+'/translation-sources/'+section,'PATCH',{sourceLanguage:'en-GB',expectedSourceVersion:1})).status,200);
 const src=await store.source(owner.id,section);assert(await store.claim({...src,claim_id:'synthetic-current',target_language:'de-DE',model,prompt_version:prompt,provider_mode:'openai',created_ms:Date.now(),lease_until:Date.now()+30000,reservation_nano:660000}));assert(await store.publish('synthetic-current',JSON.stringify(translated),Date.now()));
 const view=()=>request(base+'/translations?section='+section+'&lang=de-DE').then(r=>r.json()),saved=await view();assert.equal(saved.status,'translated');
 const body={section,targetLanguage:'de-DE',fields:{...translated},expected:{...saved.correction}},patch=(b=body,token=owner.token)=>request(base+'/translations','PATCH',b,token);
 const source=()=>store.source(owner.id,section);
 return {db,store,env,owner,base,request,view,body,patch,source,get accesses(){return accesses;}};
}
const sourceUpdate=async(f,fields)=>{const g=await (await f.request(f.base)).json();assert.equal((await f.request(f.base,'PATCH',fields,f.owner.token,{'If-Match':'"'+g.revision+'"'})).status,200);};
test('correction authenticates before touching the request body or provider configuration',async()=>{
 const f=await fixture();let reads=0;const req=new Request('https://offline.invalid'+f.base+'/translations',{method:'PATCH',headers:{Authorization:'Bearer invalid','Content-Type':'application/json'},body:'{}'});Object.defineProperty(req,'body',{get(){reads++;throw Error('BODY MUST NOT BE READ');}});
 assert.equal((await handleRequest(req,f.env)).status,401);assert.equal(reads,0);assert.equal(f.accesses,0);
});
test('correction succeeds with live generation disabled; exact manual snapshot persists, source and attempts unchanged',async()=>{
 const f=await fixture(),before=await f.source(),attempt=await f.store.attempted(f.owner.id,'welcome','en-GB','de-DE',2,model,prompt,'openai');f.body.fields.welcome='Hallo.\n\nBitte 112 anrufen.';
 assert.deepEqual(await (await f.patch()).json(),{status:'corrected'});const v=await f.view();assert.equal(v.origin,'manual');assert.equal(v.fields.welcome,f.body.fields.welcome);assert.equal(v.correction.translationId,f.body.expected.translationId);assert.equal(f.accesses,0);assert.deepEqual(await f.source(),before);assert.deepEqual(await f.store.attempted(f.owner.id,'welcome','en-GB','de-DE',2,model,prompt,'openai'),attempt);
 const guest=await (await f.request('/g/'+f.owner.id+'?lang=de-DE')).text();assert(guest.includes('Hallo.<br><br>Bitte 112 anrufen.'));assert(!guest.includes(f.owner.token));
});
test('strict correction contract rejects unexpected/missing keys, invalid types, locales and credential fields',async()=>{
 const f=await fixture(),before=await f.view();
 for(const b of [null,[],{}, {...f.body,extra:true},{...f.body,section:'wifi'},{...f.body,targetLanguage:'ja-JP'},{...f.body,fields:{property_name:'No'}},{...f.body,fields:{welcome:7}},{...f.body,fields:{welcome:'x'.repeat(3201)}},{...f.body,fields:{welcome:'Bearer synthetic 112'}},{...f.body,expected:{...f.body.expected,extra:1}},{...f.body,expected:{...f.body.expected,sourceVersion:'2'}},{...f.body,expected:{...f.body.expected,translationId:''}},{...f.body,expected:{...f.body.expected,translatedText:null}}]){
  assert.equal((await f.patch(b)).status,400,JSON.stringify(b));assert.deepEqual(await f.view(),before);
 }
 assert.equal((await f.request(f.base+'/translations','PATCH',f.body,f.owner.token,{'Content-Type':'text/plain'})).status,400);assert.equal(f.accesses,0);
});
test('bounded body accepts legitimate two-field text and escaped snapshot but rejects oversize',async()=>{
 const fields={checkin:'\t'.repeat(3190)+'15:00',checkout:'\t'.repeat(3190)+'11:00'},f=await fixture('arrival',{checkin:'Arrive 15:00',checkout:'Leave 11:00'},fields);
 f.body.fields={...fields,checkin:' '.repeat(3190)+'15:00'};assert(JSON.stringify(f.body).length>4096);assert.equal((await f.patch()).status,200);assert.deepEqual((await f.view()).fields,f.body.fields);
 assert.equal((await f.patch({...f.body,extra:'x'.repeat(100000)})).status,400);assert.equal(f.accesses,0);
});
test('protected strings and empty-field parity cannot be changed; no translation can be created from scratch',async()=>{
 const f=await fixture('arrival',{checkin:'Arrive 15:00. Call 112.',checkout:''},{checkin:'Ankunft 15:00. 112.',checkout:''}),before=await f.view();
 for(const fields of [{checkin:'Ankunft 16:00.',checkout:''},{checkin:'',checkout:''},{checkin:'Ankunft 15:00. 112.',checkout:'New information'}])assert.equal((await f.patch({...f.body,fields})).status,409);
 assert.equal((await f.patch({...f.body,targetLanguage:'fr-FR'})).status,409);assert.deepEqual(await f.view(),before);
});
test('concurrent corrections admit one winner and reject the stale exact snapshot',async()=>{
 const f=await fixture(),a={...f.body,fields:{welcome:'Erste Korrektur. 112.'}},b={...f.body,fields:{welcome:'Zweite Korrektur. 112.'}};
 const r=await Promise.all([f.patch(a),f.patch(b)]);assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);const v=await f.view();assert([a.fields.welcome,b.fields.welcome].includes(v.fields.welcome));assert.equal(v.origin,'manual');
 assert.equal((await f.patch(a)).status,409);assert.equal((await f.patch({...f.body,expected:{...f.body.expected,translationId:'replaced-identity'}})).status,409);assert.equal(f.accesses,0);
});
test('source content edit or source-language declaration fences corrections',async()=>{
 for(const change of [f=>sourceUpdate(f,{welcome:'New original. 112.'}),f=>f.request(f.base+'/translation-sources/welcome','PATCH',{sourceLanguage:'el-GR',expectedSourceVersion:2})]){
  const f=await fixture();await change(f);const before=await f.source();assert.equal((await f.patch()).status,409);assert.deepEqual(await f.source(),before);assert.notEqual((await f.view()).status,'translated');
 }
});
test('actual atomic update rejects a competing edit injected after service reads',async()=>{
 const f=await fixture();let intercepted=false;const db={prepare(sql){const stmt=f.db.prepare(sql);if(sql!==SQL.manual)return stmt;return {bind(...args){const bound=stmt.bind(...args);return {async all(){intercepted=true;assert(await f.store.correct({translationId:'synthetic-current',translatedText:JSON.stringify({welcome:'Concurrent winner. 112.'}),sourceVersion:2,guideId:f.owner.id,section:'welcome',targetLanguage:'de-DE',model,promptVersion:prompt,sourceLanguage:'en-GB',previousText:f.body.expected.translatedText}));return bound.all();}};}};}};
 const req=new Request('https://offline.invalid'+f.base+'/translations',{method:'PATCH',headers:{Authorization:'Bearer '+f.owner.token,'Content-Type':'application/json'},body:JSON.stringify({...f.body,fields:{welcome:'Late correction. 112.'}})});assert.equal((await handleRequest(req,{DB:db})).status,409);assert(intercepted);assert.equal((await f.view()).fields.welcome,'Concurrent winner. 112.');
});
test('storage errors return sanitized failures and never provider internals',async()=>{
 const f=await fixture(),db={prepare(sql){if(sql===SQL.manual)throw Error('SYNTHETIC_PRIVATE_DATABASE_PATH');return f.db.prepare(sql);}};
 const req=new Request('https://offline.invalid'+f.base+'/translations',{method:'PATCH',headers:{Authorization:'Bearer '+f.owner.token,'Content-Type':'application/json'},body:JSON.stringify(f.body)}),r=await handleRequest(req,{DB:db});assert.equal(r.status,409);assert(!(await r.text()).includes('PRIVATE'));
});
test('mock-only result cannot be corrected through the real-provider API',async()=>{
 const f=await fixture();const s=await f.source();assert(await f.store.claim({...s,claim_id:'mock-only',target_language:'fr-FR',model,prompt_version:prompt,provider_mode:'mock',created_ms:Date.now(),lease_until:Date.now()+30000,reservation_nano:660000}));assert(await f.store.publish('mock-only',JSON.stringify({welcome:'Mock fixture. 112.'}),Date.now()));
 assert.equal((await f.patch({...f.body,targetLanguage:'fr-FR',expected:{sourceVersion:2,translationId:'mock-only',translatedText:JSON.stringify({welcome:'Mock fixture. 112.'})}})).status,409);assert.equal((await f.store.cached(f.owner.id,'welcome','fr-FR',model,prompt,'mock')).origin,'generated');assert.equal(f.accesses,0);
});
test('source edit at the atomic write boundary cannot be corrected with stale expectations',async()=>{
 const f=await fixture();let intercepted=false;const db={prepare(sql){const stmt=f.db.prepare(sql);if(sql!==SQL.manual)return stmt;return {bind(...args){const bound=stmt.bind(...args);return {async all(){intercepted=true;await sourceUpdate(f,{welcome:'Changed at CAS. 112.'});return bound.all();}};}};}};
 const r=await handleRequest(new Request('https://offline.invalid'+f.base+'/translations',{method:'PATCH',headers:{Authorization:'Bearer '+f.owner.token,'Content-Type':'application/json'},body:JSON.stringify(f.body)}),{DB:db});assert.equal(r.status,409);assert(intercepted);assert.notEqual((await f.view()).status,'translated');assert.equal((await f.source()).source_version,3);
});
test('unsupported legacy source languages stay read-only in the milestone correction API',async()=>{
 const f=await fixture();assert(await f.store.setLanguage(f.owner.id,'welcome','ja-JP'));const s=await f.source(),text=JSON.stringify({welcome:'Legacy synthetic. 112.'});assert(await f.store.claim({...s,claim_id:'legacy-language',target_language:'de-DE',model,prompt_version:prompt,provider_mode:'openai',created_ms:Date.now(),lease_until:Date.now()+30000,reservation_nano:660000}));assert(await f.store.publish('legacy-language',text,Date.now()));const before=await f.view();assert.equal(before.status,'translated');assert.equal((await f.patch({...f.body,expected:before.correction})).status,409);assert.deepEqual(await f.view(),before);
});
test('source edit and replacement generation cannot be overwritten by an old correction',async()=>{
 const f=await fixture();await sourceUpdate(f,{welcome:'New source. 112.'});const source=await f.source(),text=JSON.stringify({welcome:'New generation fixture. 112.'});assert(await f.store.claim({...source,claim_id:'new-source-generation',target_language:'de-DE',model,prompt_version:prompt,provider_mode:'openai',created_ms:Date.now(),lease_until:Date.now()+30000,reservation_nano:660000}));assert(await f.store.publish('new-source-generation',text,Date.now()));const before=await f.view();assert.equal(before.correction.sourceVersion,3);assert.equal((await f.patch()).status,409);assert.deepEqual(await f.view(),before);assert.equal(f.accesses,0);
});
