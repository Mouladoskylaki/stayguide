// Explicit opt-in local workerd/D1 verification; installed tooling and disposable cloned state only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTranslationStore,TRANSLATION_SQL as SQL} from '../src/translation-store.js';
import {createTranslationService} from '../src/translation-service.js';
const root=fileURLToPath(new URL('..',import.meta.url));assert.equal(process.argv.length,3);
const qa=await fs.realpath(path.resolve(process.argv[2]));assert((qa.startsWith(path.join(root,'.local/qa/sg-p31-w4b-a-'))||qa.startsWith(path.join(root,'.local/qa/sg-p31-w4b-b-'))));
const {Miniflare,convertV4MiniflareOptions}=await import(path.join(root,'.local/tooling/sg-p31-w2/node_modules/miniflare/dist/src/index.js'));
const esbuild=await import(path.join(root,'.local/tooling/sg-p31-w2/node_modules/esbuild/lib/main.js'));
const script=`import {handleRequest} from './src/worker.js';import {TRANSLATION_SQL as SQL} from './src/translation-store.js';
let armed=false,arrivals=0,providerReads=0;const writes=[];
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/__test/arm'){armed=true;return Response.json({armed});}if(url.pathname==='/__test/stats')return Response.json({arrivals,providerReads,writes});
const db={prepare(sql){const s=env.DB.prepare(sql);if(sql!==SQL.declare)return s;return {bind(...args){return {async all(){if(armed){arrivals++;if(arrivals===2)armed=false;await env.BARRIER.fetch('http://barrier.invalid/');}const result=await s.bind(...args).all();writes.push({changes:result.meta.changes,rows:result.results});return result;}};}};}};
const bindings={DB:db};for(const key of ['TRANSLATION_PROVIDER','TRANSLATION_LIVE_ENABLED','OPENAI_API_KEY'])Object.defineProperty(bindings,key,{get(){providerReads++;throw Error('Forbidden provider/credential access');}});return handleRequest(request,bindings);}};`;
const built=await esbuild.build({stdin:{contents:script,resolveDir:root},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,logLevel:'silent'});
let arrivals=0,release;const barrier=new Promise(r=>release=r);let outbound=0;
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-11-10',host:'127.0.0.1',port:0,cf:false,resourcePersistencePath:path.join(qa,'state/v3'),d1Databases:{DB:'00000000-0000-0000-0000-000000000101'},serviceBindings:{BARRIER:async()=>{if(++arrivals===2)release();await barrier;return new Response('released');}},outboundService:()=>{outbound++;throw Error('Outbound denied');}}));
let owner,db;const report={runtime:'actual local workerd/D1',provider:'none; guarded credential/provider getters',checks:[]};
const rows=async sql=>(await db.prepare(sql).all()).results;
const snapshot=async()=>{const x={};for(const table of ['guides','translation_sources','translations','translation_attempts','translation_policy'])x[table]=await rows('SELECT * FROM '+table+' ORDER BY rowid');return x;};
const endpoint=section=>'/api/guides/'+owner.id+'/translation-sources/'+section;
const request=(url,method='GET',body,headers={})=>mf.dispatchFetch('http://local.invalid'+url,{method,headers:{Authorization:'Bearer '+owner.token,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
const declare=(section,language,version)=>request(endpoint(section),'PATCH',{sourceLanguage:language,expectedSourceVersion:version});
async function test(name,fn){await fn();report.checks.push({name,status:'PASS'});console.log('PASS:',name);}
try{
 db=await mf.getD1Database('DB');
 assert.deepEqual((await rows('SELECT name FROM d1_migrations ORDER BY id')).map(x=>x.name),['0000_guides.sql','0001_translation_foundation.sql','0002_openai_translation.sql']);
 const response=await mf.dispatchFetch('http://local.invalid/api/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({property_name:'Synthetic local declaration test',welcome:'Καλώς ήρθατε. 112.',rules:'No smoking. 112.'})});assert.equal(response.status,201);owner=await response.json();
 const guideUrl='/api/guides/'+owner.id,guideResponse=await request(guideUrl),guide=await guideResponse.json(),etag=guideResponse.headers.get('ETag');
 await test('unknown-language GET and first explicit declaration never access provider',async()=>{
  const before=await snapshot();assert.deepEqual(await (await request(endpoint('welcome'))).json(),{section:'welcome',sourceLanguage:null,sourceVersion:1,declared:false});assert.deepEqual(await snapshot(),before);
  const r=await declare('welcome','el-GR',1);assert.equal(r.status,200);assert.deepEqual(await r.json(),{section:'welcome',sourceLanguage:'el-GR',sourceVersion:2,declared:true});
 });
 await test('matching no-op is atomic and stale same/different submissions return 409',async()=>{
  const before=await snapshot();assert.equal((await declare('welcome','el-GR',2)).status,200);assert.deepEqual(await snapshot(),before);
  for(const lang of ['el-GR','de-DE'])assert.equal((await declare('welcome',lang,1)).status,409);assert.deepEqual(await snapshot(),before);
 });
 const store=createTranslationStore(db),service=createTranslationService({store});let manualRules;
 await test('language change invalidates only affected translations and preserves manual content/reservations',async()=>{
  assert.equal((await declare('rules','en-GB',1)).status,200);
  for(const section of ['welcome','rules']){const source=await store.source(owner.id,section);assert(await store.claim({...source,claim_id:'stage-a-'+section,target_language:'de-DE',model:'gpt-6-luna',prompt_version:'hospitality-v1',created_ms:100000,lease_until:130000,reservation_nano:660000,provider_mode:'mock'}));assert(await store.publish('stage-a-'+section,JSON.stringify({[section]:'Synthetic 112.'}),100001));const saved=await service.view(owner.id,section,'de-DE');assert(await service.correct(owner.id,section,'de-DE',{[section]:'Manually corrected 112.'},saved.correction));}
  manualRules=await service.view(owner.id,'rules','de-DE');const before=await snapshot();const r=await declare('welcome','fr-FR',2);assert.equal(r.status,200);assert.equal((await r.json()).sourceVersion,3);
  const after=await snapshot();assert.deepEqual(after.guides,before.guides);assert.deepEqual(after.translation_attempts,before.translation_attempts);assert.deepEqual(after.translation_policy,before.translation_policy);assert.deepEqual(await service.view(owner.id,'rules','de-DE'),manualRules);assert.equal((await service.view(owner.id,'welcome','de-DE')).status,'original');
  assert(after.translations.filter(t=>t.guide_id===owner.id&&t.section==='welcome').every(t=>t.status==='stale'&&t.origin==='manual'&&t.translated_text.includes('Manually corrected')));
  const noOp=await snapshot();assert.equal((await declare('welcome','fr-FR',3)).status,200);assert.deepEqual(await snapshot(),noOp);
  const stats=await (await request('/__test/stats')).json();assert(stats.writes.some(w=>w.changes>1&&w.rows.length===1));report.triggerInclusiveChanges=stats.writes.filter(w=>w.changes>1);
 });
 await test('401/400/404 requests have no state or budget side effects',async()=>{
  const before=await snapshot();for(const method of ['GET','PATCH'])for(const Authorization of ['','Bearer wrong'])assert.equal((await request(endpoint('welcome'),method,method==='PATCH'?{sourceLanguage:'el-GR',expectedSourceVersion:3}:undefined,{Authorization})).status,401);
  for(const section of ['wifi','property_name','__proto__','unknown'])for(const method of ['GET','PATCH'])assert.equal((await request(endpoint(section),method,method==='PATCH'?{sourceLanguage:'el-GR',expectedSourceVersion:1}:undefined)).status,404);
  for(const body of [{},[],{sourceLanguage:'el-GR',expectedSourceVersion:'3'},{sourceLanguage:'el-GR',expectedSourceVersion:0},{sourceLanguage:'ja-JP',expectedSourceVersion:3},{sourceLanguage:'el-GR',expectedSourceVersion:3,extra:true}])assert.equal((await request(endpoint('welcome'),'PATCH',body)).status,400);
  const raw=await mf.dispatchFetch('http://local.invalid'+endpoint('welcome'),{method:'PATCH',headers:{Authorization:'Bearer '+owner.token,'Content-Type':'application/json'},body:' '.repeat(4097)+'{}'});assert.equal(raw.status,400);assert.deepEqual(await snapshot(),before);
 });
 await test('actual overlapping HTTP declarations yield one changed row and one 409',async()=>{
  await request('/__test/arm');const r=await Promise.all(['it-IT','es-ES'].map(lang=>declare('parking',lang,1)));assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);
  const stats=await (await request('/__test/stats')).json();assert.equal(stats.arrivals,2);assert.deepEqual(stats.writes.slice(-2).map(w=>w.rows.length).sort(),[0,1]);assert.equal((await (await request(endpoint('parking'))).json()).sourceVersion,2);report.concurrent={arrivals:stats.arrivals,returned:stats.writes.slice(-2).map(w=>w.rows.length)};
 });
 await test('legacy tags and missing source records preserve existing semantics',async()=>{
  assert(await store.setLanguage(owner.id,'additional','ja-JP'));const before=await snapshot();assert.equal((await (await request(endpoint('additional'))).json()).sourceLanguage,'ja-JP');assert.equal((await declare('additional','ja-JP',2)).status,400);assert.deepEqual(await snapshot(),before);
  await db.prepare("DELETE FROM translation_sources WHERE guide_id=?1 AND section='contact'").bind(owner.id).run();const missing=await snapshot();assert.equal((await request(endpoint('contact'))).status,404);assert.equal((await declare('contact','el-GR',1)).status,404);assert.deepEqual(await snapshot(),missing);
 });
 await test('source edits reject stale declarations and declarations leave guide ETags untouched',async()=>{
  assert.deepEqual(await (await request(guideUrl)).json(),guide);assert.equal((await request(guideUrl)).headers.get('ETag'),etag);
  const edit=await request(guideUrl,'PATCH',{welcome:'Edited original. 112.'},{'If-Match':etag});assert.equal(edit.status,200);const before=await snapshot();assert.equal((await declare('welcome','de-DE',3)).status,409);assert.deepEqual(await snapshot(),before);assert.deepEqual(await service.view(owner.id,'rules','de-DE'),manualRules);
 });
 const stats=await (await request('/__test/stats')).json();assert.equal(stats.providerReads,0);assert.equal(outbound,0);report.providerReads=0;report.outboundAttempts=0;report.status='PASS';
}catch(error){report.status='FAIL';report.error={name:error.name,message:error.message};throw error;}
finally{await mf.dispose();const name=path.join(qa,'source-language-d1-'+Date.now()+'.json');await fs.writeFile(name,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log('Evidence:',name);}
