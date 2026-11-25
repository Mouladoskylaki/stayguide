// Isolated offline Worker integration. No real transport or credentials.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLocalDb} from '../node/db.mjs';
import {handleRequest} from '../src/worker.js';
import {createTranslationStore} from '../src/translation-store.js';
import {TRANSLATION_CONFIG as CONFIG} from '../src/translation-service.js';
async function fixture(t,{offline=true,provider}={}){
 fs.mkdirSync('.local/qa',{recursive:true});const dir=fs.mkdtempSync('.local/qa/sg-p31-w4b-c2-api-');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=dir+'/disposable.json';
 const db=createLocalDb(file);let calls=0,keys=0;
 provider??={mode:'openai',enabled:true,async translate(p){calls++;return {fields:Object.fromEntries(Object.entries(p.fields).map(([k,v])=>[k,'SYNTHETIC '+v])),usage:{inputTokens:100,outputTokens:40,reasoningTokens:0,estimatedNano:30000,conservativeNano:33000}};}};
 const env={DB:db,TRANSLATION_OFFLINE_TEST:offline,TRANSLATION_PROVIDER:provider,get OPENAI_API_KEY(){keys++;throw Error('PRIVATE_KEY_ACCESS_FORBIDDEN');},get TRANSLATION_LIVE_ENABLED(){throw Error('Live configuration must not be read');}};
 const request=(path,method='GET',body,token=owner?.token,extra={})=>handleRequest(new Request('https://offline.invalid'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined}),env);
 let owner;owner=await (await request('/api/guides','POST',{property_name:'Synthetic C2 owner',welcome:'Welcome. Call 112.'})).json();const base='/api/guides/'+owner.id;
 const body={section:'welcome',sourceLanguage:'en-GB',targetLanguage:'de-DE',expectedSourceVersion:2};
 const cap=(patch={},token=owner.token)=>request(base+'/translation-capabilities?'+new URLSearchParams({...body,...patch}), 'GET',undefined,token);
 const declare=async()=>{const r=await request(base+'/translation-sources/welcome','PATCH',{sourceLanguage:'en-GB',expectedSourceVersion:1});assert.equal(r.status,200);};
 return {db,env,owner,base,body,request,cap,declare,store:createTranslationStore(db),snapshot:()=>fs.readFileSync(file,'utf8'),get calls(){return calls;},get keys(){return keys;}};
}
test('capability defaults disabled and does not inspect live configuration, provider or key',async t=>{
 const f=await fixture(t,{offline:false});Object.defineProperty(f.env,'TRANSLATION_PROVIDER',{get(){throw Error('PRIVATE_PROVIDER_CONFIG');}});const before=f.snapshot();
 const r=await f.cap();assert.equal(r.status,200);assert.deepEqual(await r.json(),{generationAvailable:false,testOnly:false,state:'unavailable',sourceVersion:2});assert.equal(f.snapshot(),before);assert.equal(f.keys,0);
});
test('capabilities require ownership and exact bounded version/language selection',async t=>{
 const f=await fixture(t);const before=f.snapshot();assert.equal((await f.cap({},'wrong')).status,401);
 for(const patch of [{expectedSourceVersion:'2e0'},{expectedSourceVersion:0},{expectedSourceVersion:'9007199254740992'},{sourceLanguage:'ja-JP'},{section:'wifi'},{targetLanguage:'ar'}])assert.equal((await f.cap(patch)).status,400);
 assert.equal((await f.request(f.base+'/translation-capabilities?'+new URLSearchParams({...f.body,offlineTest:'true'}))).status,400);
 assert.equal(f.snapshot(),before);assert.equal(f.calls,0);assert.equal(f.keys,0);
});
test('a browser header or query cannot enable default-disabled capabilities',async t=>{
 const f=await fixture(t,{offline:false});const r=await f.request(f.base+'/translation-capabilities?'+new URLSearchParams(f.body),'GET',undefined,f.owner.token,{'X-Translation-Offline-Test':'true'});assert.equal((await r.json()).generationAvailable,false);assert.equal(f.calls,0);
});
test('fake-enabled capability is read-only; explicit generation persists and reuses saved/manual results',async t=>{
 const f=await fixture(t);await f.declare();const before=f.snapshot();const c=await (await f.cap()).json();assert.equal(c.generationAvailable,true);assert.equal(c.testOnly,true);assert.equal(f.snapshot(),before);assert.equal(f.calls,0);
 const result=await (await f.request(f.base+'/translations','POST',f.body)).json();assert.equal(result.status,'translated');assert.equal(f.calls,1);
 assert.equal((await (await f.cap()).json()).state,'cached');assert.equal(f.calls,1);
 assert(await f.store.correct({translationId:result.correction.translationId,sourceVersion:2,guideId:f.owner.id,section:'welcome',targetLanguage:'de-DE',model:CONFIG.model,promptVersion:CONFIG.promptVersion,sourceLanguage:'en-GB',previousText:result.correction.translatedText,translatedText:JSON.stringify({welcome:'Manually corrected. Call 112.'})}));
 const cached=await (await f.request(f.base+'/translations','POST',f.body)).json();assert.equal(cached.origin,'manual');assert.equal(f.calls,1);
 const state=JSON.parse(f.snapshot());assert.equal(Object.keys(state.attempts).length,1);assert.equal(Object.values(state.attempts)[0].reservation_nano,660000);assert.equal(Object.values(state.attempts)[0].cost_nano,33000);assert.equal(f.keys,0);
});
test('pending, failed and expired identities are not advertised as available',async t=>{
 const f=await fixture(t);await f.declare();const s=await f.store.source(f.owner.id,'welcome');
 const claim={...s,claim_id:'pending',target_language:'de-DE',model:CONFIG.model,prompt_version:CONFIG.promptVersion,provider_mode:'openai',created_ms:Date.now(),lease_until:Date.now()+30000,reservation_nano:660000};assert(await f.store.claim(claim));
 assert.equal((await (await f.cap()).json()).state,'attempt_pending');assert(await f.store.fail('pending'));assert.equal((await (await f.cap()).json()).state,'attempt_terminal');
 assert(await f.store.claim({...claim,claim_id:'expired',target_language:'fr-FR',created_ms:1,lease_until:2}));const before=f.snapshot();assert.equal((await (await f.cap({targetLanguage:'fr-FR'})).json()).state,'attempt_terminal');assert.equal(f.snapshot(),before);assert.equal(f.calls,0);
});
test('missing declarations, stale versions, same language and source limits are blocked without attempts',async t=>{
 const f=await fixture(t);assert.equal((await (await f.cap({expectedSourceVersion:1})).json()).state,'source_required');await f.declare();
 assert.equal((await (await f.cap({expectedSourceVersion:1})).json()).state,'source_changed');assert.equal((await (await f.cap({targetLanguage:'en-GB'})).json()).state,'same_language');
 for(const [text,expected] of [['','empty'],['a'.repeat(1201),'input_limit']]){
  const row=await (await f.request(f.base)).json();assert.equal((await f.request(f.base,'PATCH',{welcome:text},f.owner.token,{'If-Match':'"'+row.revision+'"'})).status,200);
  const s=await f.store.source(f.owner.id,'welcome');assert.equal((await (await f.cap({expectedSourceVersion:s.source_version})).json()).state,expected);
 }
 assert.equal(Object.keys(JSON.parse(f.snapshot()).attempts).length,0);assert.equal(f.calls,0);
});
