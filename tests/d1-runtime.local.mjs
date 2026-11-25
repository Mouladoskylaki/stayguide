// Explicit opt-in, offline LOCAL workerd/D1 verification; not part of npm test.
// Run with the installed Node 24 and isolated runner after disposable Wrangler setup.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTranslationStore,TRANSLATION_SQL as SQL} from '../src/translation-store.js';
import {createTranslationService} from '../src/translation-service.js';
import {directWriteSucceeded} from '../src/db-write.js';
import {versionGuide} from '../src/guide-store.js';
const root=fileURLToPath(new URL('..',import.meta.url));
assert.equal(process.argv.length,3,'Supply the prepared disposable QA directory');
const qa=await fs.realpath(path.resolve(process.argv[2]));
assert((qa.startsWith(path.join(root,'.local/qa/sg-p31-w2-fix-'))||qa.startsWith(path.join(root,'.local/qa/sg-p31-w4b-b-'))),'Only disposable W2-fix QA directories are allowed');
const config=JSON.parse(await fs.readFile(path.join(qa,'wrangler.local.json'),'utf8'));
assert(!config.account_id&&!config.vars&&!config.secrets);
assert.equal(config.d1_databases.length,6);
for(const b of config.d1_databases)assert(/^00000000-0000-0000-0000-00000000010[1-6]$/.test(b.database_id)&&!b.remote);
const tooling=path.join(root,'.local/tooling/sg-p31-w2/node_modules');
const {Miniflare,convertV4MiniflareOptions}=await import(path.join(tooling,'miniflare/dist/src/index.js'));
const esbuild=await import(path.join(tooling,'esbuild/lib/main.js'));
const worker=`import {handleRequest} from './src/worker.js';import {UPDATE_GUIDE_SQL} from './src/guide-store.js';
let calls=0,armed=false,arrivals=0,totals=[];
const provider={mode:'openai',enabled:true,async translate(p){calls++;return {fields:Object.fromEntries(Object.entries(p.fields).map(([k,v])=>[k,'OFFLINE MOCK '+v])),usage:{inputTokens:100,outputTokens:40,reasoningTokens:0,cachedTokens:0,cacheWriteTokens:0,estimatedNano:30000,conservativeNano:33000}};}};
export default {async fetch(request,env){const p=new URL(request.url).pathname;
if(p==='/__verification/stats')return Response.json({mockCalls:calls,arrivals,totals});
if(p==='/__verification/arm'){armed=true;arrivals=0;return Response.json({armed:true});}
const wrapped={prepare(sql){const statement=env.DB.prepare(sql);if(sql!==UPDATE_GUIDE_SQL)return statement;return {bind(...args){const bound=statement.bind(...args);return {async all(){if(armed){arrivals++;if(arrivals===2)armed=false;await env.TEST_BARRIER.fetch("http://barrier.invalid/wait");}const r=await bound.all();totals.push({changes:r.meta.changes,returned:r.results.length});return r;}};}};}};
return handleRequest(request,{DB:wrapped,TRANSLATION_PROVIDER:provider});}};`;
const built=await esbuild.build({stdin:{contents:worker,resolveDir:root,sourcefile:'local-verification-worker.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,logLevel:'silent'});
const script=built.outputFiles[0].text;
let mf,outbound=0,db,leaseDb,budgetDb,created,original,manual;
const checks=[],report={runtime:'local workerd/D1 only',provider:'explicit offline mock; zero OpenAI requests',checks};
async function start(){
 let barrierArrivals=0,releaseBarrier;const barrier=new Promise(r=>releaseBarrier=r);
 mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,compatibilityDate:config.compatibility_date,host:'127.0.0.1',port:0,cf:false,resourcePersistencePath:path.join(qa,'state/v3'),serviceBindings:{TEST_BARRIER:async()=>{if(++barrierArrivals===2)releaseBarrier();await barrier;return new Response('released');}},d1Databases:Object.fromEntries(config.d1_databases.map(b=>[b.binding,b.database_id])),outboundService:()=>{outbound++;throw Error('External Worker egress prohibited');},logRequests:false}));
 db=await mf.getD1Database('DB');leaseDb=await mf.getD1Database('LEASE_DB');budgetDb=await mf.getD1Database('BUDGET_DB');
}
const rows=async(db,sql,args=[])=>(await db.prepare(sql).bind(...args).all()).results;
const one=async(db,sql,args=[])=>db.prepare(sql).bind(...args).first();
const headers=()=>({Authorization:'Bearer '+created.token,'Content-Type':'application/json'});
const endpoint=()=>'/api/guides/'+created.id;
const request=(url,method='GET',body,extra={})=>mf.dispatchFetch('http://local.invalid'+url,{method,headers:{...headers(),...extra},body:body===undefined?undefined:JSON.stringify(body)});
const read=async()=>{const r=await request(endpoint());assert.equal(r.status,200);return r.json();};
const save=async(body,revision,extra={})=>request(endpoint(),'PATCH',body,{...(revision===undefined?{}:{'If-Match':'"'+revision+'"'}),...extra});
const snapshot=async db=>{
 const state={};for(const table of ['guides','translation_sources','translations','translation_attempts','translation_policy'])state[table]=await rows(db,'SELECT * FROM '+table+' ORDER BY rowid');return state;
};
async function test(name,fn){await fn();checks.push({name,status:'PASS'});console.log('PASS:',name);}
async function synthetic(db,id){await db.prepare('INSERT INTO guides VALUES(?1,?2,?3,?4,?5)').bind(id,'SYNTHETIC_HASH',versionGuide({property_name:'Synthetic fixture',welcome:'Welcome. 112.',rules:'No smoking.'}).contentJson,'same','same').run();const store=createTranslationStore(db);assert(await store.setLanguage(id,'welcome','en-GB'));return store;}
const claim=(source,id,target,created=100000,lease=130000)=>({...source,claim_id:id,target_language:target,model:'gpt-6-luna',prompt_version:'hospitality-v1',created_ms:created,lease_until:lease,reservation_nano:660000,provider_mode:'mock'});
try{
 await start();
 await test('migrations, fresh schema, triggers and legacy/manual preservation',async()=>{
  assert.deepEqual((await rows(db,'SELECT name FROM d1_migrations ORDER BY id')).map(x=>x.name),['0000_guides.sql','0001_translation_foundation.sql','0002_openai_translation.sql']);
  const fresh=await mf.getD1Database('BOOTSTRAP_DB'),legacy=await mf.getD1Database('LEGACY_DB');
  for(const table of ['guides','translation_sources','translations','translation_attempts','translation_policy'])assert.deepEqual(await rows(db,'PRAGMA table_info('+table+')'),await rows(fresh,'PRAGMA table_info('+table+')'));
  const triggers=await rows(db,"SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name");assert.equal(triggers.length,21);assert.deepEqual(triggers,await rows(fresh,"SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name"));
  const old=await one(legacy,"SELECT * FROM guides WHERE id='legacy'");assert.equal(JSON.parse(old.content_json).welcome,'Καλώς ήρθατε. 112.');
  const t=await one(legacy,"SELECT * FROM translations WHERE claim_id='legacy-manual'");assert.equal(t.origin,'manual');assert.equal(t.provider_mode,'mock');assert.equal(t.status,'ready');assert.equal(t.translated_text,'{"welcome":"SYNTHETIC MANUAL 112."}');
  const a=await one(legacy,"SELECT * FROM translation_attempts WHERE claim_id='legacy-manual'");assert.equal(a.reservation_nano,660000);assert.equal(a.cost_nano,null);assert.equal(a.provider_mode,'mock');
  assert.deepEqual(await rows(db,'PRAGMA foreign_key_check'),[]);
 });
 await test('actual Worker creates and updates guides despite trigger-inclusive metadata',async()=>{
  const r=await mf.dispatchFetch('http://local.invalid/api/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({property_name:'Synthetic local D1 guide',welcome:'Welcome. 112.',rules:'No smoking.',wifi_password:'SYNTHETIC_WIFI_EXCLUDED'})});assert.equal(r.status,201);created=await r.json();original=await read();
  const changed=await save({welcome:'Changed. 112.'},original.revision);assert.equal(changed.status,200);assert.equal((await changed.json()).guide.welcome,'Changed. 112.');
  const stats=await (await request('/__verification/stats')).json();assert.equal(stats.totals.at(-1).returned,1);assert(stats.totals.at(-1).changes>1);report.guideWrite=stats.totals.at(-1);
 });
 await test('missing/malformed/stale/unauthorized revisions reject without any state change',async()=>{
  const before=await snapshot(db),current=await read();
  assert.equal((await save({welcome:'No precondition'})).status,428);
  for(const value of ['*','W/"'+current.revision+'"','"invalid"',current.revision])assert.equal((await request(endpoint(),'PATCH',{welcome:'Invalid'},{'If-Match':value})).status,400);
  assert.equal((await save({welcome:'Stale'},original.revision)).status,409);
  assert.equal((await save({welcome:'Forbidden'},current.revision,{Authorization:'Bearer wrong'})).status,401);
  assert.deepEqual(await snapshot(db),before);
 });
 await test('no-op and reverted-content saves issue fresh revisions without timestamp reliance',async()=>{
  const a=await read(),source=await one(db,SQL.source,[created.id,'welcome']);
  const noop=await save({},a.revision);assert.equal(noop.status,200);const b=await noop.json();assert.notEqual(b.revision,a.revision);assert.equal((await one(db,SQL.source,[created.id,'welcome'])).source_version,source.source_version);
  const altered=await (await save({welcome:'Temporary. 112.'},b.revision)).json();
  const restored=await (await save({welcome:a.guide.welcome},altered.revision)).json();assert.notEqual(restored.revision,a.revision);assert.equal((await save({rules:'Old writer'},a.revision)).status,409);
 });
 await test('translation persistence/cache/provenance and protected-field exclusion through actual Worker/D1',async()=>{
  for(const section of ['welcome','rules']){const declared=await request(endpoint()+'/translation-sources/'+section,'PATCH',{sourceLanguage:'en-GB',expectedSourceVersion:(await one(db,SQL.source,[created.id,section])).source_version});assert.equal(declared.status,200);const r=await request(endpoint()+'/translations','POST',{section,sourceLanguage:'en-GB',targetLanguage:'de-DE',expectedSourceVersion:(await one(db,SQL.source,[created.id,section])).source_version});assert.equal(r.status,200);assert.equal((await r.json()).providerMode,'openai');}
  const before=await (await request('/__verification/stats')).json();assert.equal(before.mockCalls,2);
  const cache=await request(endpoint()+'/translations','POST',{section:'welcome',sourceLanguage:'en-GB',targetLanguage:'de-DE',expectedSourceVersion:(await one(db,SQL.source,[created.id,'welcome'])).source_version});assert.equal(cache.status,200);
  const page=await (await request('/g/'+created.id+'?lang=de-DE')).text();assert(page.includes('OFFLINE MOCK Changed. 112.'));assert(!page.includes(created.token));
  assert.equal((await (await request('/__verification/stats')).json()).mockCalls,2);
  assert.equal((await one(db,'SELECT COUNT(*) AS n FROM translation_attempts')).n,2);
  assert((await rows(db,'SELECT translated_text FROM translations')).every(t=>!t.translated_text.includes('SYNTHETIC_WIFI_EXCLUDED')));
 });
 await test('manual correction CAS, section invalidation and rejected-write reservation preservation',async()=>{
  const store=createTranslationStore(db),provider={mode:'openai',enabled:false,translate(){throw Error('No provider execution allowed');}},service=createTranslationService({store,provider});
  const t=await service.view(created.id,'rules','de-DE');assert.equal(t.status,'translated');assert(await service.correct(created.id,'rules','de-DE',{rules:'Corrected no smoking.'},t.correction));assert.equal(await service.correct(created.id,'rules','de-DE',{rules:'Stale correction'},t.correction),false);
  manual=await service.view(created.id,'rules','de-DE');assert.equal(manual.origin,'manual');
  const old=await read(),rules=await store.source(created.id,'rules'),welcome=await store.source(created.id,'welcome');
  assert.equal((await save({welcome:'Edited source. 112.'},old.revision)).status,200);
  assert.equal((await store.source(created.id,'welcome')).source_version,welcome.source_version+1);assert.deepEqual(await store.source(created.id,'rules'),rules);assert.deepEqual(await service.view(created.id,'rules','de-DE'),manual);assert.equal((await service.view(created.id,'welcome','de-DE')).status,'original');
  const before=await snapshot(db);assert.equal((await save({rules:'Must not overwrite'},old.revision)).status,409);assert.deepEqual(await snapshot(db),before);
  const regenerated=await request(endpoint()+'/translations','POST',{section:'welcome',sourceLanguage:'en-GB',targetLanguage:'de-DE',expectedSourceVersion:(await one(db,SQL.source,[created.id,'welcome'])).source_version});assert.equal(regenerated.status,200);
 });
 await test('concurrent actual HTTP saves reach the atomic D1 update with the same prior revision',async()=>{
  const old=await read();await request('/__verification/arm');
  const responses=await Promise.all(['Writer A. 112.','Writer B. 112.'].map(welcome=>save({welcome},old.revision)));
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);const winner=await responses.find(r=>r.status===200).json();assert.equal((await read()).guide.welcome,winner.guide.welcome);
  const stats=await (await request('/__verification/stats')).json();assert.equal(stats.arrivals,2);assert.deepEqual(stats.totals.slice(-2).map(r=>r.returned).sort(),[0,1]);report.concurrentGuide={arrivals:stats.arrivals,results:stats.totals.slice(-2)};
 });
 await test('concurrent D1 claim RPCs admit one claim/reservation for a shared identity',async()=>{
  const store=await synthetic(leaseDb,'lease-fixture'),source=await store.source('lease-fixture','welcome');
  let release;const gate=new Promise(r=>release=r);let submitted=0;
  const attempts=['claim-a','claim-b'].map(id=>(async()=>{await gate;submitted++;return store.claim(claim(source,id,'de-DE'));})());release();
  const admitted=await Promise.all(attempts);assert.equal(submitted,2);assert.deepEqual(admitted.slice().sort(),[false,true]);
  assert.equal((await one(leaseDb,'SELECT COUNT(*) AS n,SUM(reservation_nano) AS reserved FROM translation_attempts')).n,1);
  assert.equal((await one(leaseDb,'SELECT SUM(reservation_nano) AS reserved FROM translation_attempts')).reserved,660000);report.concurrentClaims={submitted,admitted};
  const owner=['claim-a','claim-b'][admitted.findIndex(Boolean)];
  assert.equal(await store.claim(claim(source,'replacement','de-DE',130001,160001)),false);
  const before=await snapshot(leaseDb);assert.equal(await store.publish(owner,JSON.stringify({welcome:'Old 112.'}),130002),false);assert.deepEqual(await snapshot(leaseDb),before);
  assert.equal(await store.publish('replacement',JSON.stringify({welcome:'New 112.'}),130002),false);assert.equal((await one(leaseDb,'SELECT SUM(reservation_nano) AS reserved FROM translation_attempts')).reserved,660000);
 });
 await test('budget reservation race and failure/missing-row results preserve the ledger',async()=>{
  const store=await synthetic(budgetDb,'budget-fixture'),source=await store.source('budget-fixture','welcome');await budgetDb.prepare('UPDATE translation_policy SET budget_nano=660000').run();
  const result=await Promise.all(['de-DE','fr-FR'].map((target,i)=>store.claim(claim(source,'budget-'+i,target))));assert.deepEqual(result.slice().sort(),[false,true]);
  const owner='budget-'+result.findIndex(Boolean);assert(await store.fail(owner));const before=await snapshot(budgetDb);assert.equal(await store.fail(owner),false);assert.equal(await store.publish('missing','{}',100001),false);assert.deepEqual(await snapshot(budgetDb),before);
  const raw=await budgetDb.prepare(SQL.language).bind('absent','welcome','de-DE').all();assert.deepEqual(raw.results,[]);assert.equal(directWriteSucceeded(raw),false);
  const prior=await snapshot(budgetDb);await assert.rejects(()=>budgetDb.batch([budgetDb.prepare("UPDATE guides SET updated_at='rollback-probe' WHERE id='budget-fixture'"),budgetDb.prepare("UPDATE translations SET status='not-a-valid-status'")]));assert.deepEqual(await snapshot(budgetDb),prior);
 });
 await test('runtime restart preserves saved content, manual corrections and zero-generation guest reads',async()=>{
  const saved=await read();await mf.dispose();mf=undefined;await start();assert.deepEqual(await read(),saved);
  const page=await (await request('/g/'+created.id+'?lang=de-DE')).text();assert(page.includes('Corrected no smoking.'));assert.equal((await (await request('/__verification/stats')).json()).mockCalls,0);
  const store=createTranslationStore(db);assert.equal((await store.cached(created.id,'rules','de-DE','gpt-6-luna','hospitality-v1','openai')).origin,'manual');
 });
 assert.equal(outbound,0);report.status='PASS';report.outboundAttempts=outbound;
}catch(error){report.status='FAIL';report.error={name:error.name,message:error.message};throw error;}
finally{
 if(mf)await mf.dispose();
 const filename=path.join(qa,'d1-runtime-results-'+Date.now()+'.json');await fs.writeFile(filename,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log('Evidence:',filename);
}
