import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLocalDb} from '../node/db.mjs';
import {createTranslationStore} from '../src/translation-store.js';
import {createTranslationService,TRANSLATION_CONFIG as CONFIG} from '../src/translation-service.js';
import {createOpenAITranslationProvider} from '../src/openai-translation-provider.js';
import {handleRequest} from '../src/worker.js';
const secret='SYNTHETIC_SERVER_ONLY_KEY';
const response=(fields={welcome:'Καλώς ήρθατε. 112.'},extra={})=>({model:CONFIG.model,service_tier:'default',status:'completed',error:null,incomplete_details:null,output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(fields)}]}],usage:{input_tokens:100,output_tokens:40,total_tokens:140,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}},...extra});
function httpMock(override){const calls=[];return {calls,async fetch(url,options){calls.push({url,options,body:JSON.parse(options.body)});if(override)return override(url,options,calls.length);return Response.json(url.endsWith('input_tokens')?{object:'response.input_tokens',input_tokens:100}:response());}};}
async function fixture({http=httpMock(),enabled=true,db=createLocalDb()}={}){
 const store=createTranslationStore(db);let keyReads=0;
 const provider=createOpenAITranslationProvider({enabled,keyProvider:()=>{keyReads++;return secret;},fetchImpl:http.fetch.bind(http)}),service=createTranslationService({store,provider});
 await db.prepare('INSERT INTO guides').bind('p','SYNTHETIC_HASH',JSON.stringify({welcome:'Welcome. 112.',wifi_password:'PRIVATE_WIFI_SENTINEL'}),'now','now').run();
 await service.setSourceLanguage('p','welcome','en-GB');
 return {db,store,service,provider,http,get keyReads(){return keyReads;}};
}
test('real adapter is disabled before credential lookup and network dispatch',async()=>{
 let reads=0,calls=0;const p=createOpenAITranslationProvider({keyProvider:()=>{reads++;return secret;},fetchImpl:()=>{calls++;throw Error('Forbidden');}});
 await assert.rejects(()=>p.translate({}),/live_disabled/);assert.equal(reads,0);assert.equal(calls,0);
 const f=await fixture({enabled:false});assert.equal((await generateSaved(f.service,'p','welcome','el-GR')).category,'live_disabled');assert.equal(f.keyReads,0);
});
test('authoritative count uses identical token-bearing payload; reservation precedes HTTP; results persist and cache',async()=>{
 const f=await fixture();const original=f.store.claim;let reserved=false;
 const service=createTranslationService({store:{...f.store,async claim(a){reserved=await original(a);return reserved;}},provider:createOpenAITranslationProvider({enabled:true,keyProvider:()=>secret,fetchImpl:async(...args)=>{assert(reserved);return f.http.fetch(...args);}})});
 const first=await generateSaved(service,'p','welcome','el-GR');assert.equal(first.status,'translated');assert.equal(first.providerMode,'openai');assert.equal(f.http.calls.length,2);
 const [count,generate]=f.http.calls;for(const key of ['model','instructions','input','reasoning','tools','text'])assert.deepEqual(count.body[key],generate.body[key]);
 assert.equal(generate.body.max_output_tokens,800);assert.equal(generate.body.store,false);assert.equal(generate.options.redirect,'error');
 assert(!count.body.input.includes('PRIVATE_WIFI_SENTINEL'));assert(!count.body.input.includes('SYNTHETIC_HASH'));
 const again=createTranslationService({store:createTranslationStore(f.db),provider:f.provider});await generateSaved(again,'p','welcome','el-GR');await again.view('p','welcome','el-GR');assert.equal(f.http.calls.length,2);
 assert(await service.correct('p','welcome','el-GR',{welcome:'Διορθωμένο. 112.'},first.correction));assert.equal((await generateSaved(service,'p','welcome','el-GR')).origin,'manual');
});
for(const count of [801,0,'100',null])test('invalid authoritative count prevents generation: '+count,async()=>{
 const f=await fixture({http:httpMock(()=>Response.json({object:'response.input_tokens',input_tokens:count}))});assert.equal((await generateSaved(f.service,'p','welcome','el-GR')).status,'failed');assert.equal(f.http.calls.length,1);
});
for(const [name,mutate] of [['model',r=>r.model='other'],['tier',r=>r.service_tier='priority'],['incomplete',r=>r.status='incomplete'],['missing usage',r=>delete r.usage],['input mismatch',r=>r.usage.input_tokens=101],['output overflow',r=>r.usage.output_tokens=801],['reasoning',r=>r.usage.output_tokens_details.reasoning_tokens=1],['missing protected',r=>r.output[0].content[0].text='{"welcome":"Missing number"}'],['secret echo',r=>r.output[0].content[0].text=JSON.stringify({welcome:secret+' 112.'})]]){
 test('invalid provider result fails closed: '+name,async()=>{
  const f=await fixture({http:httpMock(url=>{if(url.endsWith('input_tokens'))return Response.json({object:'response.input_tokens',input_tokens:100});const r=response();mutate(r);return Response.json(r);})});
  const result=await generateSaved(f.service,'p','welcome','el-GR');assert.equal(result.status,'failed');assert(!JSON.stringify(result).includes(secret));assert.equal((await f.service.view('p','welcome','el-GR')).status,'original');assert.equal(f.http.calls.length,2);
 });
}
for(const status of [401,429,500])test('HTTP '+status+' cancels response body and never retries',async()=>{
 let cancelled=0;const f=await fixture({http:httpMock(()=>new Response(new ReadableStream({cancel(){cancelled++;}}),{status}))});
 assert.equal((await generateSaved(f.service,'p','welcome','el-GR')).status,'failed');assert.equal(f.http.calls.length,1);assert.equal(cancelled,1);
});
test('transport exceptions are sanitized and connection abort handles timeout',async()=>{
 const f=await fixture({http:httpMock(()=>{throw Error(secret);})});assert.deepEqual(await generateSaved(f.service,'p','welcome','el-GR'),{status:'failed',category:'translation_unavailable'});assert.equal(f.http.calls.length,1);
 let aborted=false;const provider=createOpenAITranslationProvider({enabled:true,keyProvider:()=>secret,timeoutMs:5,fetchImpl:async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{aborted=true;reject(Error(secret));},{once:true}))});
 await assert.rejects(()=>provider.translate({instructions:'Translate',fields:{welcome:'Text'}}),/request_timeout/);assert(aborted);
});
test('mock and real cache identities are isolated, source edits invalidate and stale work cannot publish',async()=>{
 const f=await fixture();const mock=createTranslationService({store:f.store});await generateSaved(mock,'p','welcome','el-GR');assert.equal((await f.service.view('p','welcome','el-GR')).status,'original');
 await generateSaved(f.service,'p','welcome','el-GR');assert.equal(f.http.calls.length,2);assert.equal((await mock.view('p','welcome','el-GR')).providerMode,'mock');
 await f.db.prepare('UPDATE guides').bind(JSON.stringify({welcome:'Changed. 112.'}),'later','p').run();assert.equal((await f.service.view('p','welcome','el-GR')).status,'original');
 let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);const h=httpMock(async url=>{if(url.endsWith('input_tokens'))return Response.json({object:'response.input_tokens',input_tokens:100});entered();await gate;return Response.json(response());});
 const slow=createTranslationService({store:f.store,provider:createOpenAITranslationProvider({enabled:true,keyProvider:()=>secret,fetchImpl:h.fetch.bind(h)})});const work=generateSaved(slow,'p','welcome','el-GR');await started;
 assert.equal((await generateSaved(slow,'p','welcome','el-GR')).category,'attempt_pending');
 await f.db.prepare('UPDATE guides').bind(JSON.stringify({welcome:'Changed again. 112.'}),'later','p').run();release();assert.equal((await work).category,'stale_or_expired');assert.equal(h.calls.length,2);
});
test('spending exhaustion rejects before even token-count dispatch',async()=>{
 const f=await fixture(),source=await f.store.source('p','welcome');await f.store.claim({...source,claim_id:'all-budget',target_language:'de-DE',model:CONFIG.model,prompt_version:CONFIG.promptVersion,created_ms:Date.now(),lease_until:Date.now()+30000,reservation_nano:100000000,provider_mode:'openai'});
 assert.equal((await generateSaved(f.service,'p','welcome','el-GR')).category,'busy_or_limit');assert.equal(f.http.calls.length,0);assert.equal(f.keyReads,0);
});
test('authenticated host operation and guest saved-only rendering make no credential disclosure',async()=>{
 const db=createLocalDb(),http=httpMock();let keyReads=0;const provider=createOpenAITranslationProvider({enabled:true,keyProvider:()=>{keyReads++;return secret;},fetchImpl:http.fetch.bind(http)});
 const env={DB:db,TRANSLATION_PROVIDER:provider};const req=(p,method='GET',body,token)=>new Request('https://example.invalid'+p,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const created=await (await handleRequest(req('/api/guides','POST',{property_name:'Synthetic',welcome:'Welcome. 112.',wifi_password:'PRIVATE_WIFI_SENTINEL'}),env)).json();const endpoint='/api/guides/'+created.id+'/translations',body={section:'welcome',sourceLanguage:'en-GB',targetLanguage:'el-GR',expectedSourceVersion:2};
 const declared=await handleRequest(req('/api/guides/'+created.id+'/translation-sources/welcome','PATCH',{sourceLanguage:'en-GB',expectedSourceVersion:1},created.token),env);assert.equal(declared.status,200);
 for(const token of [undefined,'wrong'])assert.equal((await handleRequest(req(endpoint,'POST',body,token),env)).status,401);assert.equal(http.calls.length,0);
 const result=await handleRequest(req(endpoint,'POST',body,created.token),env);assert.equal(result.status,200);assert.equal(http.calls.length,2);
 const disabled={DB:db,get OPENAI_API_KEY(){throw Error('Guest must not read credential');}};
 for(let i=0;i<3;i++){const page=await (await handleRequest(req('/g/'+created.id+'?lang=el-GR'),disabled)).text();assert(page.includes('Καλώς ήρθατε'));assert(page.includes('lang="el-GR"'));assert(!page.includes(secret));assert(!page.includes(created.token));}
 assert.equal(http.calls.length,2);assert.equal(keyReads,1);
 const cached=await handleRequest(req(endpoint+'?section=welcome&lang=el-GR','GET',undefined,created.token),disabled);assert.equal((await cached.json()).providerMode,'openai');
 const invalid=await handleRequest(req(endpoint,'POST',{...body,targetLanguage:'invalid'},created.token),env);assert.equal(invalid.status,400);
});
test('expired deadline prevents dispatch; aborted requests never retry',async()=>{
 let calls=0;const p=createOpenAITranslationProvider({enabled:true,keyProvider:()=>secret,fetchImpl:()=>{calls++;throw Error('No dispatch allowed');}});
 await assert.rejects(()=>p.translate({instructions:'Translate',fields:{welcome:'Text'}},{deadline:Date.now()-1}),/request_timeout/);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>p.translate({instructions:'Translate',fields:{welcome:'Text'}},{signal:controller.signal}),/request_timeout/);assert.equal(calls,0);
});
test('accounting reconciles valid usage even when translated content fails validation',async()=>{
 const f=await fixture({http:httpMock(url=>Response.json(url.endsWith('input_tokens')?{object:'response.input_tokens',input_tokens:100}:response({welcome:'Missing the protected emergency number.'})))});const usage=[];
 const service=createTranslationService({store:{...f.store,async reconcile(claim,value){usage.push(value);return f.store.reconcile(claim,value);}},provider:f.provider});
 assert.equal((await generateSaved(service,'p','welcome','el-GR')).status,'failed');
 assert.equal(usage.length,1);assert.equal(usage[0].estimatedNano,30000);assert.equal(usage[0].conservativeNano,33000);
 assert.equal(await f.store.cached('p','welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'openai'),null);
 assert.equal((await service.view('p','welcome','el-GR')).status,'original');assert.equal(f.http.calls.length,2);
});
test('bounded response reader cancels oversized content without exposing raw content',async()=>{
 let cancelled=false;const http=httpMock(()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(262145));},cancel(){cancelled=true;}})));
 const f=await fixture({http});assert.equal((await generateSaved(f.service,'p','welcome','el-GR')).status,'failed');assert(cancelled);assert.equal(http.calls.length,1);
});
test('file-backed real provenance, reconciled cost and cache survive an adapter restart',async()=>{
 fs.mkdirSync('.local/qa',{recursive:true});const directory=fs.mkdtempSync('.local/qa/sg-p31-phase3b-store-'),file=directory+'/db.json';
 try{
  const f=await fixture({db:createLocalDb(file)});assert.equal((await generateSaved(f.service,'p','welcome','el-GR')).status,'translated');
  const reader=createTranslationService({store:createTranslationStore(createLocalDb(file)),provider:createOpenAITranslationProvider()});
  const saved=await reader.view('p','welcome','el-GR');assert.equal(saved.providerMode,'openai');assert.equal(saved.status,'translated');
  const state=JSON.parse(fs.readFileSync(file,'utf8')),attempt=Object.values(state.attempts)[0];assert.equal(attempt.provider_mode,'openai');assert.equal(attempt.cost_nano,33000);assert.equal(attempt.reservation_nano,660000);assert.equal(attempt.status,'completed');
  assert(!JSON.stringify(state).includes(secret));assert.equal(f.http.calls.length,2);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

// Offline callers explicitly obtain a saved expectation before submitting generation.
async function generateSaved(service,id,section,target){
 const metadata=await service.sourceMetadata(id,section);
 return service.generate(id,section,target,metadata.metadata?.sourceLanguage??'en-GB',metadata.metadata?.sourceVersion??1);
}
