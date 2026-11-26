// Actual disposable LOCAL D1 only. No provider, credential or external access.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTranslationStore} from '../src/translation-store.js';
const root=fileURLToPath(new URL('..',import.meta.url));assert.equal(process.argv.length,3);const qa=await fs.realpath(process.argv[2]);assert(qa.startsWith(path.join(root,'.local/qa/sg-p31-w4b-b-c3-')));
const tooling=path.join(root,'.local/tooling/sg-p31-w2/node_modules'),{Miniflare,convertV4MiniflareOptions}=await import(path.join(tooling,'miniflare/dist/src/index.js')),esbuild=await import(path.join(tooling,'esbuild/lib/main.js'));
const script=`import {handleRequest} from './src/worker.js';import {TRANSLATION_SQL as SQL} from './src/translation-store.js';
let armed=false,arrivals=0;const writes=[];
export default {async fetch(request,env){const url=new URL(request.url);
if(url.pathname==='/__test/arm'){armed=true;arrivals=0;return Response.json({armed});}
if(url.pathname==='/__test/stats')return Response.json({arrivals,writes});
const db={prepare(sql){const s=env.DB.prepare(sql);if(sql!==SQL.manual)return s;return {bind(...args){return {async all(){if(armed){arrivals++;if(arrivals===2)armed=false;await env.BARRIER.fetch('http://barrier.invalid/');}const r=await s.bind(...args).all();writes.push({changes:r.meta.changes,returned:r.results.length});return r;}};}};}};
const bindings={DB:db};for(const k of ['OPENAI_API_KEY','TRANSLATION_PROVIDER','TRANSLATION_LIVE_ENABLED'])Object.defineProperty(bindings,k,{get(){throw Error('SYNTHETIC_FORBIDDEN_PROVIDER_ACCESS');}});
return handleRequest(request,request.method==='PATCH'&&url.pathname.endsWith('/translations')?bindings:{DB:db});}};`;
const built=await esbuild.build({stdin:{contents:script,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false,logLevel:'silent'});
let arrivals=0,release,outbound=0;const gate=new Promise(r=>release=r);
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-11-10',host:'127.0.0.1',port:0,cf:false,resourcePersistencePath:path.join(qa,'state/v3'),d1Databases:{DB:'00000000-0000-0000-0000-000000000101'},serviceBindings:{BARRIER:async()=>{if(++arrivals===2)release();await gate;return new Response('released');}},outboundService:()=>{outbound++;throw Error('External access forbidden');}}));
const report={runtime:'actual disposable LOCAL workerd/D1',providerCalls:0,checks:[]};let owner,db,store;
const request=(url,method='GET',body,token=owner?.token,headers={})=>mf.dispatchFetch('http://local.invalid'+url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)}),base=()=>'/api/guides/'+owner.id;
const view=async(section='welcome')=>(await request(base()+'/translations?section='+section+'&lang=de-DE')).json();
const patch=b=>request(base()+'/translations','PATCH',b);
const snapshot=async()=>{const v={};for(const t of ['guides','translation_sources','translations','translation_attempts'])v[t]=(await db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()).results;return v;};
const seed=async(section,fields,mode='openai',target='de-DE')=>{assert.equal((await request(base()+'/translation-sources/'+section,'PATCH',{sourceLanguage:'en-GB',expectedSourceVersion:1})).status,200);const s=await store.source(owner.id,section),id='synthetic-'+section+'-'+mode;assert(await store.claim({...s,claim_id:id,target_language:target,model:'gpt-6-luna',prompt_version:'hospitality-v1',provider_mode:mode,created_ms:Date.now(),lease_until:Date.now()+30000,reservation_nano:660000}));assert(await store.publish(id,JSON.stringify(fields),Date.now()));};
const check=async(name,fn)=>{await fn();report.checks.push({name,status:'PASS'});console.log('PASS:',name);};let body;
try{
 db=await mf.getD1Database('DB');store=createTranslationStore(db);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM d1_migrations').first()).n,3);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM guides').first()).n,0);
 owner=await (await request('/api/guides','POST',{property_name:'Synthetic correction D1',welcome:'Welcome. Call 112.',checkin:'Arrive 15:00.',checkout:'Leave 11:00.',rules:'No smoking.'})).json();assert(owner.id&&owner.token);
 await seed('welcome',{welcome:'Willkommen. 112.'});const v=await view();body={section:'welcome',targetLanguage:'de-DE',fields:{welcome:'Korrigiert.\n\n112.'},expected:v.correction};
 await check('authentication and strict invalid requests are read-only',async()=>{
  const before=await snapshot();assert.equal((await request(base()+'/translations','PATCH',body,'invalid')).status,401);
  for(const b of [{...body,extra:1},{...body,section:'wifi'},{...body,targetLanguage:'ar'},{...body,fields:{welcome:1}},{...body,expected:{}},{...body,fields:{welcome:'x'.repeat(3201)}}])assert.equal((await patch(b)).status,400);
  assert.deepEqual(await snapshot(),before);
 });
 await check('current correction writes one direct row; source/guide and reservation/attempts unchanged',async()=>{
  const before=await snapshot();assert.equal((await patch(body)).status,200);const v=await view();assert.equal(v.origin,'manual');assert.deepEqual(v.fields,body.fields);const after=await snapshot();for(const t of ['guides','translation_sources','translation_attempts'])assert.deepEqual(after[t],before[t]);
 });
 await check('overlapping HTTP corrections reach the actual atomic manual CAS; one winner',async()=>{
  const v=await view();const a={...body,expected:v.correction,fields:{welcome:'First winner. 112.'}},b={...a,fields:{welcome:'Second winner. 112.'}};
  await request('/__test/arm');const replies=await Promise.all([patch(a),patch(b)]);assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);const stats=await (await request('/__test/stats')).json();assert.equal(stats.arrivals,2);assert.deepEqual(stats.writes.slice(-2).map(x=>x.returned).sort(),[0,1]);report.overlap=stats;assert([a.fields.welcome,b.fields.welcome].includes((await view()).fields.welcome));
 });
 await check('two-field arrival and body larger than old 4KiB limit persist independently',async()=>{
  await seed('arrival',{checkin:'Ankunft 15:00.',checkout:'Abreise 11:00.'});const v=await view('arrival'),fields={checkin:'a'.repeat(3000)+' 15:00.',checkout:'b'.repeat(3000)+' 11:00.'};assert.equal((await patch({section:'arrival',targetLanguage:'de-DE',fields,expected:v.correction})).status,200);assert.deepEqual((await view('arrival')).fields,fields);
 });
 await check('wrong identity/snapshot and protected/empty fields cannot overwrite current data',async()=>{
  const v=await view(),before=await snapshot();for(const b of [{...body,expected:{...v.correction,translationId:'wrong'}},{...body,expected:{...v.correction,translatedText:'wrong'}},{...body,expected:v.correction,fields:{welcome:'No preserved number.'}},{...body,expected:v.correction,fields:{welcome:''}}])assert.equal((await patch(b)).status,409);assert.deepEqual(await snapshot(),before);
 });
 await check('source content/language changes fence old corrections; guest reads remain saved-only',async()=>{
  const previous=await view(),guide=await (await request(base())).json();assert.equal((await request(base(),'PATCH',{welcome:'New source. 112.'},owner.token,{'If-Match':'"'+guide.revision+'"'})).status,200);const before=await snapshot();assert.equal((await patch({...body,expected:previous.correction})).status,409);assert.deepEqual(await snapshot(),before);
  const arr=await view('arrival');assert.equal((await request(base()+'/translation-sources/arrival','PATCH',{sourceLanguage:'el-GR',expectedSourceVersion:2})).status,200);assert.equal((await patch({section:'arrival',targetLanguage:'de-DE',fields:arr.fields,expected:arr.correction})).status,409);const html=await (await request('/g/'+owner.id+'?lang=de-DE')).text();assert(html.includes('New source. 112.'));assert(!html.includes(owner.token));
 });
 await check('mock storage cannot substitute for a current OpenAI translation',async()=>{
  await seed('rules',{rules:'Mock rules.'},'mock');const before=await snapshot();assert.equal((await patch({section:'rules',targetLanguage:'de-DE',fields:{rules:'Corrected rules.'},expected:{sourceVersion:2,translationId:'synthetic-rules-mock',translatedText:JSON.stringify({rules:'Mock rules.'})}})).status,409);assert.deepEqual(await snapshot(),before);
 });
 assert.equal(outbound,0);report.externalRequests=outbound;report.status='PASS';await fs.writeFile(path.join(qa,'correction-results.json'),JSON.stringify(report,null,2)+'\n');
}finally{await mf.dispose();}
