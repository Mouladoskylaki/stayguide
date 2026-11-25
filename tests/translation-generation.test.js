// Offline fixtures only; no transport, credentials or live provider.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocalDb} from '../node/db.mjs';
import {createTranslationStore} from '../src/translation-store.js';
import {createTranslationService,TRANSLATION_CONFIG as CONFIG} from '../src/translation-service.js';
import {handleRequest} from '../src/worker.js';
async function fixture(provider){
 const db=createLocalDb();let calls=0,claims=0;
 provider??={mode:'mock',async translate(p){calls++;return {fields:p.fields,usage:{inputTokens:100,outputTokens:50,reasoningTokens:0}};}};
 const env={DB:db,TRANSLATION_PROVIDER:provider};
 const request=(url,method='GET',body,token)=>handleRequest(new Request('https://offline.invalid'+url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
 const owner=await (await request('/api/guides','POST',{property_name:'Synthetic',welcome:'Welcome. Call 112.',rules:'No smoking.'})).json();
 const base='/api/guides/'+owner.id,store=createTranslationStore(db),original=store.claim;
 store.claim=async a=>{claims++;return original(a);};
 const service=createTranslationService({store,provider});
 const metadata=async(section='welcome')=>(await request(base+'/translation-sources/'+section,'GET',undefined,owner.token)).json();
 const declare=async(language='en-GB',section='welcome')=>request(base+'/translation-sources/'+section,'PATCH',{sourceLanguage:language,expectedSourceVersion:(await metadata(section)).sourceVersion},owner.token);
 const body={section:'welcome',sourceLanguage:'en-GB',targetLanguage:'de-DE',expectedSourceVersion:2};
 const post=(b=body,token=owner.token)=>request(base+'/translations','POST',b,token);
 const generate=(version=2)=>service.generate(owner.id,'welcome','de-DE','en-GB',version);
 const edit=async text=>db.prepare('UPDATE guides SET content_json = ?1, updated_at = ?2 WHERE id = ?3').bind(JSON.stringify({welcome:text,rules:'No smoking.'}),'later',owner.id).run();
 return {db,store,service,owner,body,request,post,metadata,declare,generate,edit,get calls(){return calls;},get claims(){return claims;}};
}
test('legacy, malformed, extra fields, wider locales and unauthenticated POSTs have no persistent effects',async()=>{
 const f=await fixture();await f.declare();const before=await f.metadata();
 const legacy={...f.body};delete legacy.expectedSourceVersion;
 for(const body of [legacy,{...f.body,extra:1},...['2',0,-1,1.5,null,Number.MAX_SAFE_INTEGER+1].map(expectedSourceVersion=>({...f.body,expectedSourceVersion})),{...f.body,targetLanguage:'ja-JP'},{...f.body,sourceLanguage:'ar'}])assert.equal((await f.post(body)).status,400);
 assert.equal((await f.post(f.body,'wrong')).status,401);assert.deepEqual(await f.metadata(),before);assert.equal(f.calls,0);
 assert.equal((await f.generate()).status,'translated');assert.equal(f.calls,1);
});
test('missing declaration and changed language never declare or invalidate',async()=>{
 const f=await fixture();assert.equal((await (await f.post({...f.body,expectedSourceVersion:1})).json()).category,'source_language_required');
 assert.equal((await f.metadata()).declared,false);await f.declare('el-GR');
 assert.equal((await (await f.post()).json()).category,'source_language_changed');assert.equal((await f.metadata()).sourceLanguage,'el-GR');assert.equal(f.calls,0);
});
test('disabled OpenAI generation preserves source metadata and creates no attempt',async()=>{
 const f=await fixture({mode:'openai',enabled:false,translate(){throw Error('Forbidden');}});await f.declare();const before=await f.metadata();
 assert.equal((await f.post()).status,503);assert.deepEqual(await f.metadata(),before);assert.equal(f.claims,0);
});
test('current cache and manual correction reuse zero additional claims; stale expectation cannot read newer cache',async()=>{
 const f=await fixture();await f.declare();const first=await f.generate();assert.equal(first.status,'translated');
 assert(await f.service.correct(f.owner.id,'welcome','de-DE',{welcome:'Manual welcome. Call 112.'},first.correction));
 assert.equal((await f.generate()).origin,'manual');assert.equal(f.calls,1);assert.equal(f.claims,1);
 await f.edit('New welcome. Call 112.');assert.equal((await f.generate()).category,'source_version_changed');assert.equal(f.claims,1);
 assert.equal((await f.generate(3)).status,'translated');assert.equal((await f.generate()).category,'source_version_changed');assert.equal(f.calls,2);assert.equal(f.claims,2);
});
test('failed attempts are terminal; independent target and new source identity remain possible',async()=>{
 let calls=0;const f=await fixture({mode:'mock',async translate(){calls++;throw Error('SYNTHETIC_PRIVATE_ERROR');}});await f.declare();
 assert.deepEqual(await f.generate(),{status:'failed',category:'translation_unavailable'});
 assert.equal((await f.generate()).category,'attempt_terminal');assert.equal(calls,1);
 await f.service.generate(f.owner.id,'welcome','fr-FR','en-GB',2);assert.equal(calls,2);
 await f.edit('New source. Call 112.');await f.generate(3);assert.equal(calls,3);
});
test('atomic claim prevents a stale source between validation and write from reserving or dispatching',async()=>{
 const f=await fixture();await f.declare();const claim=f.store.claim;
 f.store.claim=async a=>{await f.edit('New source. Call 112.');return claim(a);};
 assert.equal((await f.generate()).category,'source_version_changed');assert.equal(f.calls,0);
});
test('source replacement during cache reads cannot satisfy old expectations',async()=>{
 const f=await fixture();await f.declare();await f.generate();const cached=f.store.cached;
 f.store.cached=async(...args)=>{await f.edit('Different source. Call 112.');return cached(...args);};
 assert.equal((await f.generate()).category,'source_version_changed');assert.equal(f.calls,1);assert.equal(f.claims,1);
});
test('overlapping service generation admits one winner and preserves late publication fencing',async()=>{
 let entered,release,calls=0;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const f=await fixture({mode:'mock',async translate(p){calls++;entered();await gate;return {fields:p.fields,usage:{inputTokens:100,outputTokens:50,reasoningTokens:0}};}});await f.declare();
 const first=f.generate();await started;assert.equal((await f.generate()).category,'attempt_pending');await f.edit('Changed during work. Call 112.');release();
 assert.equal((await first).category,'stale_or_expired');assert.equal(calls,1);assert.equal((await f.service.view(f.owner.id,'welcome','de-DE')).status,'original');
});
test('expired attempt remains terminal even when no current translation is available',async()=>{
 const f=await fixture();await f.declare();const s=await f.store.source(f.owner.id,'welcome');
 assert(await f.store.claim({...s,claim_id:'expired',target_language:'de-DE',model:CONFIG.model,prompt_version:CONFIG.promptVersion,created_ms:1,lease_until:2,reservation_nano:CONFIG.reservationNano}));
 assert.equal((await f.generate()).category,'attempt_terminal');assert.equal(f.calls,0);
});
test('timeout consumes identity and late completion never publishes or permits another dispatch',async t=>{
 let expire,resolve,calls=0;const timer=globalThis.setTimeout;
 t.mock.method(globalThis,'setTimeout',(fn,ms,...args)=>{if(ms===CONFIG.leaseMs){expire=fn;return timer(()=>{},100000);}return timer(fn,ms,...args);});
 const f=await fixture({mode:'mock',async translate(p){calls++;return new Promise(r=>resolve=()=>r({fields:p.fields,usage:{inputTokens:100,outputTokens:50,reasoningTokens:0}}));}});await f.declare();
 const work=f.generate();while(!expire)await Promise.resolve();expire();assert.equal((await work).status,'failed');
 assert.equal((await f.generate()).category,'attempt_terminal');resolve();await Promise.resolve();assert.equal(calls,1);assert.equal((await f.service.view(f.owner.id,'welcome','de-DE')).status,'original');
});
