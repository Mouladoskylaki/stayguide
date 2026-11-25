// Explicit opt-in: actual disposable local workerd/D1, fake provider only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTranslationStore,TRANSLATION_SQL as SQL} from '../src/translation-store.js';
const root=fileURLToPath(new URL('..',import.meta.url));
assert.equal(process.argv.length,3);
const qa=await fs.realpath(process.argv[2]);assert(qa.startsWith(path.join(root,'.local/qa/sg-p31-w4b-b-')));
const tooling=path.join(root,'.local/tooling/sg-p31-w2/node_modules');
const {Miniflare,convertV4MiniflareOptions}=await import(path.join(tooling,'miniflare/dist/src/index.js'));
const esbuild=await import(path.join(tooling,'esbuild/lib/main.js'));
const script=`import {handleRequest} from './src/worker.js';import {TRANSLATION_SQL as SQL} from './src/translation-store.js';
let armed=false,arrivals=0,calls=0,mode='success';const writes=[];
const provider={mode:'openai',enabled:true,async translate(p){calls++;if(mode==='fail')throw Error('SYNTHETIC_PRIVATE_FAILURE');return {fields:Object.fromEntries(Object.entries(p.fields).map(([k,v])=>[k,'OFFLINE '+v])),usage:{inputTokens:100,outputTokens:40,reasoningTokens:0,conservativeNano:33000,estimatedNano:30000}};}};
export default {async fetch(request,env){const url=new URL(request.url);
if(url.pathname==='/__test/arm'){armed=true;arrivals=0;return Response.json({armed});}
if(url.pathname==='/__test/fail'){mode='fail';return Response.json({mode});}
if(url.pathname==='/__test/stats')return Response.json({arrivals,calls,writes});
const db={prepare(sql){const s=env.DB.prepare(sql);if(sql!==SQL.claim)return s;return {bind(...args){return {async all(){if(armed){arrivals++;if(arrivals===2)armed=false;await env.BARRIER.fetch('http://barrier.invalid/');}const result=await s.bind(...args).all();writes.push({changes:result.meta.changes,returned:result.results.length});return result;}};}};}};
return handleRequest(request,{DB:db,TRANSLATION_PROVIDER:provider,TRANSLATION_OFFLINE_TEST:true});}};`;
const built=await esbuild.build({stdin:{contents:script,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false,logLevel:'silent'});
let arrivals=0,release,outbound=0;const gate=new Promise(r=>release=r);
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-11-10',host:'127.0.0.1',port:0,cf:false,resourcePersistencePath:path.join(qa,'state/v3'),d1Databases:{DB:'00000000-0000-0000-0000-000000000101'},serviceBindings:{BARRIER:async()=>{if(++arrivals===2)release();await gate;return new Response('released');}},outboundService:()=>{outbound++;throw Error('External access forbidden');}}));
const report={runtime:'actual LOCAL workerd/D1',provider:'deterministic fake, no network provider',checks:[]};
let owner,db;
const request=(url,method='GET',body,token=owner?.token)=>mf.dispatchFetch('http://local.invalid'+url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const endpoint=()=>'/api/guides/'+owner.id;
const body={section:'welcome',sourceLanguage:'en-GB',targetLanguage:'de-DE',expectedSourceVersion:2};
const post=(b=body,token=owner.token)=>request(endpoint()+'/translations','POST',b,token);
const capability=(version=2,target='de-DE',token=owner.token)=>request(endpoint()+'/translation-capabilities?'+new URLSearchParams({section:'welcome',sourceLanguage:'en-GB',targetLanguage:target,expectedSourceVersion:String(version)}),'GET',undefined,token);
const one=(sql,args=[])=>db.prepare(sql).bind(...args).first();
const snapshot=async()=>{const result={};for(const t of ['translation_sources','translations','translation_attempts'])result[t]=(await db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()).results;return result;};
const check=async(name,fn)=>{await fn();report.checks.push({name,status:'PASS'});console.log('PASS:',name);};
try{
 db=await mf.getD1Database('DB');
 assert.equal((await one("SELECT COUNT(*) AS n FROM d1_migrations")).n,3);
 // The supplied cloned state must be empty synthetic fixtures, never live state.
 assert.equal((await one('SELECT COUNT(*) AS n FROM guides')).n,0);
 await db.prepare('UPDATE translation_policy SET max_requests=100,per_minute=100').run();
 owner=await (await request('/api/guides','POST',{property_name:'Synthetic D1 generation',welcome:'Welcome. Call 112.',rules:'No smoking.'})).json();assert(owner.id&&owner.token);
 await check('unauthorized/legacy/missing declaration have no metadata or ledger effects',async()=>{
  const before=await snapshot();assert.equal((await capability(1,'de-DE','wrong')).status,401);assert.equal((await (await capability(1)).json()).state,'source_required');assert.equal((await post(body,'wrong')).status,401);
  const old={...body};delete old.expectedSourceVersion;assert.equal((await post(old)).status,400);
  assert.equal((await (await post({...body,expectedSourceVersion:1})).json()).category,'source_language_required');assert.deepEqual(await snapshot(),before);
 });
 await check('explicit declaration then overlapping HTTP requests reach atomic D1 claims',async()=>{
  assert.equal((await request(endpoint()+'/translation-sources/welcome','PATCH',{sourceLanguage:'en-GB',expectedSourceVersion:1})).status,200);
  const before=await snapshot();assert.equal((await (await capability()).json()).state,'available');assert.deepEqual(await snapshot(),before);
  await request('/__test/arm');const replies=await Promise.all([post(),post()]);assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);
  const stats=await (await request('/__test/stats')).json();assert.equal(stats.arrivals,2);assert.equal(stats.calls,1);assert.deepEqual(stats.writes.map(w=>w.returned).sort(),[0,1]);report.overlap=stats;
  assert.equal((await one('SELECT SUM(reservation_nano) AS n FROM translation_attempts')).n,660000);
 });
 await check('cache and manual correction return with no further claims/provider calls',async()=>{
  const store=createTranslationStore(db),cached=await store.cached(owner.id,'welcome','de-DE','gpt-6-luna','hospitality-v1','openai');
  assert(await store.correct({translationId:cached.claim_id,translatedText:JSON.stringify({welcome:'Manual. Call 112.'}),sourceVersion:2,guideId:owner.id,section:'welcome',targetLanguage:'de-DE',model:cached.model,promptVersion:cached.prompt_version,sourceLanguage:'en-GB',previousText:cached.translated_text}));
  const before=await (await request('/__test/stats')).json();const ledger=await snapshot();assert.equal((await (await capability()).json()).state,'cached');assert.deepEqual(await snapshot(),ledger);assert.equal((await (await post()).json()).origin,'manual');assert.deepEqual(await (await request('/__test/stats')).json(),before);
  const page=await (await request('/g/'+owner.id+'?lang=de-DE')).text();assert(page.includes('Manual. Call 112.'));assert(!page.includes(owner.token));
 });
 await check('source edit invalidates only affected section; stale expectation cannot read/cache/claim',async()=>{
  const guide=await (await request(endpoint())).json();assert.equal((await request(endpoint(),'PATCH',{welcome:'New welcome. Call 112.'})).status,428);
  const changed=await mf.dispatchFetch('http://local.invalid'+endpoint(),{method:'PATCH',headers:{Authorization:'Bearer '+owner.token,'Content-Type':'application/json','If-Match':'"'+guide.revision+'"'},body:JSON.stringify({welcome:'New welcome. Call 112.'})});assert.equal(changed.status,200);
  const before=await snapshot();assert.equal((await (await post()).json()).category,'source_version_changed');assert.deepEqual(await snapshot(),before);
  assert.equal((await post({...body,expectedSourceVersion:3})).status,200);
 });
 await check('failed generation is terminal and retains reservation/reconciliation history',async()=>{
  await request('/__test/fail');const b={...body,targetLanguage:'fr-FR',expectedSourceVersion:3};assert.equal((await (await post(b)).json()).status,'failed');
  const before=await snapshot(),stats=await (await request('/__test/stats')).json();assert.equal((await (await capability(3,'fr-FR')).json()).state,'attempt_terminal');assert.equal((await (await post(b)).json()).category,'attempt_terminal');assert.deepEqual(await snapshot(),before);assert.deepEqual(await (await request('/__test/stats')).json(),stats);
 });
 await check('expired attempt rejects replacement claim even without an active translation',async()=>{
  const store=createTranslationStore(db),source=await store.source(owner.id,'welcome');const a={...source,claim_id:'expired-local-fixture',target_language:'it-IT',model:'gpt-6-luna',prompt_version:'hospitality-v1',provider_mode:'openai',created_ms:1,lease_until:2,reservation_nano:660000};
  assert(await store.claim(a));const before=await snapshot();assert.equal(await store.claim({...a,claim_id:'forbidden-replacement',created_ms:3,lease_until:4}),false);assert.deepEqual(await snapshot(),before);
  assert.equal((await (await post({...body,targetLanguage:'it-IT',expectedSourceVersion:3})).json()).category,'attempt_terminal');
 });
 assert.equal(outbound,0);report.externalWorkerRequests=outbound;report.status='PASS';
 await fs.writeFile(path.join(qa,'generation-results.json'),JSON.stringify(report,null,2)+'\n');
}finally{await mf.dispose();}
