import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLocalDb} from '../node/db.mjs';
import {handleRequest} from '../src/worker.js';
import {createTranslationStore,TRANSLATION_SQL as SQL} from '../src/translation-store.js';
import {createTranslationService} from '../src/translation-service.js';
async function fixture(t){
 fs.mkdirSync('.local/qa',{recursive:true});const dir=fs.mkdtempSync('.local/qa/sg-w4b-a-test-'),file=dir+'/disposable.json';t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const db=createLocalDb(file),env={DB:db};
 for(const key of ['TRANSLATION_PROVIDER','TRANSLATION_LIVE_ENABLED','OPENAI_API_KEY'])Object.defineProperty(env,key,{get(){throw Error('PROVIDER_OR_CREDENTIAL_ACCESS_FORBIDDEN');}});
 const create=await handleRequest(new Request('https://test.invalid/api/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({property_name:'Synthetic mixed-language guide',welcome:'Καλώς ήρθατε. 112.',rules:'No smoking. 112.'})}),env),owner=await create.json();
 const guide='/api/guides/'+owner.id,url=guide+'/translation-sources/welcome';
 const request=(path=url,method='GET',body,headers={})=>new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+owner.token,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 return {db,env,owner,guide,url,request,snapshot:()=>fs.readFileSync(file,'utf8'),state:()=>JSON.parse(fs.readFileSync(file,'utf8')),call:(method='GET',body,path=url,headers)=>handleRequest(request(path,method,body,headers),env)};
}
const declare=(language,version)=>({sourceLanguage:language,expectedSourceVersion:version});
test('owner metadata GET preserves unknown language, exposes only four fields and reads no provider configuration',async t=>{
 const f=await fixture(t),before=f.snapshot();const response=await f.call();assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.deepEqual(await response.json(),{section:'welcome',sourceLanguage:null,sourceVersion:1,declared:false});assert.equal(f.snapshot(),before);
});
test('first declaration and identical-language no-op preserve guide revision/content and unrelated metadata',async t=>{
 const f=await fixture(t),original=await (await f.call('GET',undefined,f.guide)).json(),etag=(await f.call('GET',undefined,f.guide)).headers.get('ETag');
 const response=await f.call('PATCH',declare('el-GR',1));assert.equal(response.status,200);assert.deepEqual(await response.json(),{section:'welcome',sourceLanguage:'el-GR',sourceVersion:2,declared:true});
 const before=f.snapshot();assert.equal((await f.call('PATCH',declare('el-GR',2))).status,200);assert.equal(f.snapshot(),before);
 assert.deepEqual(await (await f.call('GET',undefined,f.guide)).json(),original);assert.equal((await f.call('GET',undefined,f.guide)).headers.get('ETag'),etag);
 assert.equal(Object.values(f.state().sources).find(x=>x.section==='rules').source_language,null);assert.deepEqual(f.state().attempts,{});
});
test('section-only invalidation preserves other manual corrections, attempts, reservations and source prose',async t=>{
 const f=await fixture(t),store=createTranslationStore(f.db),service=createTranslationService({store});
 for(const section of ['welcome','rules']){
  const lang=section==='welcome'?'el-GR':'en-GB';assert(await store.setLanguage(f.owner.id,section,lang));const source=await store.source(f.owner.id,section);
  assert(await store.claim({...source,claim_id:section+'-fixture',target_language:'de-DE',model:'gpt-6-luna',prompt_version:'hospitality-v1',created_ms:100000,lease_until:130000,reservation_nano:660000,provider_mode:'mock'}));
  assert(await store.publish(section+'-fixture',JSON.stringify({[section]:'Synthetic translation. 112.'}),100001));
  const saved=await service.view(f.owner.id,section,'de-DE');assert(await service.correct(f.owner.id,section,'de-DE',{[section]:'Synthetic manual correction. 112.'},saved.correction));
 }
 const before=f.state(),oldWelcome=await store.source(f.owner.id,'welcome'),rules=await service.view(f.owner.id,'rules','de-DE');
 const result=await f.call('PATCH',declare('fr-FR',oldWelcome.source_version));assert.equal(result.status,200);
 const after=f.state();assert.deepEqual(after.guides,before.guides);assert.deepEqual(after.attempts,before.attempts);assert.deepEqual(after.policy,before.policy);
 assert.equal((await store.source(f.owner.id,'welcome')).source_text,oldWelcome.source_text);assert.equal((await service.view(f.owner.id,'welcome','de-DE')).status,'original');assert.deepEqual(await service.view(f.owner.id,'rules','de-DE'),rules);
 for(const row of Object.values(after.translations))if(row.section==='welcome'){assert.equal(row.status,'stale');assert.equal(row.origin,'manual');assert(row.translated_text.includes('Synthetic manual'));}
});
test('stale different and same-language submissions always conflict without mutations',async t=>{
 const f=await fixture(t);assert.equal((await f.call('PATCH',declare('el-GR',1))).status,200);const before=f.snapshot();
 for(const lang of ['el-GR','de-DE']){const r=await f.call('PATCH',declare(lang,1));assert.equal(r.status,409);assert.equal((await r.json()).code,'source_version_conflict');assert.equal(f.snapshot(),before);}
});
test('two competing declarations admit one winner; sequential identical expectations cannot silently refresh',async t=>{
 const f=await fixture(t),responses=await Promise.all(['el-GR','de-DE'].map(lang=>f.call('PATCH',declare(lang,1))));assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 const current=await (await f.call()).json();assert.equal(current.sourceVersion,2);assert.equal(current.sourceLanguage,(await responses.find(r=>r.status===200).json()).sourceLanguage);
});
test('unauthorized reads/writes reveal no metadata, never parse the body and change no state',async t=>{
 const f=await fixture(t),before=f.snapshot();
 for(const method of ['GET','PATCH'])for(const auth of ['', 'Bearer wrong']){
  const req=f.request(f.url,method,method==='PATCH'?declare('el-GR',1):undefined,{Authorization:auth});Object.defineProperty(req,'body',{get(){throw Error('BODY_MUST_NOT_BE_READ');}});
  const r=await handleRequest(req,f.env);assert.equal(r.status,401);assert.deepEqual(await r.json(),{error:'Not authorized'});assert.equal(f.snapshot(),before);
 }
});
test('unknown guides/sections/prototype names and missing metadata rows return 404',async t=>{
 const f=await fixture(t),before=f.snapshot();
 for(const path of ['/api/guides/'+'0'.repeat(16)+'/translation-sources/welcome',...['wifi','property_name','unknown','__proto__','constructor'].map(s=>f.guide+'/translation-sources/'+s)])for(const method of ['GET','PATCH'])assert.equal((await f.call(method,method==='PATCH'?declare('el-GR',1):undefined,path)).status,404);
 const original=f.env.DB;f.env.DB={prepare(sql){if(sql===SQL.source)return {bind(){return {first:async()=>null};}};if(sql===SQL.declare)return {bind(){return {all:async()=>({success:true,results:[]})};}};return original.prepare(sql);}};
 for(const method of ['GET','PATCH'])assert.equal((await f.call(method,method==='PATCH'?declare('el-GR',1):undefined)).status,404);assert.equal(f.snapshot(),before);
});
test('malformed, additional fields, unsupported locales and invalid versions reject without mutations',async t=>{
 const f=await fixture(t),before=f.snapshot();
 const invalid=[null,[],1,'text',{}, {sourceLanguage:'el-GR'}, {...declare('el-GR',1),extra:1},...['en-US','ja-JP','ar','__proto__',null,2].map(x=>declare(x,1)),...[null,0,-1,1.5,'1',Number.MAX_SAFE_INTEGER+1].map(v=>declare('el-GR',v))];
 for(const body of invalid){assert.equal((await f.call('PATCH',body)).status,400);assert.equal(f.snapshot(),before);}
 for(const [raw,type] of [['{broken','application/json'],['','application/json'],[JSON.stringify(declare('el-GR',1)),'text/plain'],[' '.repeat(4097)+JSON.stringify(declare('el-GR',1)),'application/json']]){
  const req=new Request('https://test.invalid'+f.url,{method:'PATCH',headers:{Authorization:'Bearer '+f.owner.token,'Content-Type':type},body:raw});assert.equal((await handleRequest(req,f.env)).status,400);assert.equal(f.snapshot(),before);
 }
});
test('legacy source tags outside the milestone remain unchanged on read and rejected PATCH',async t=>{
 const f=await fixture(t),store=createTranslationStore(f.db);assert(await store.setLanguage(f.owner.id,'welcome','ja-JP'));const before=f.snapshot();
 assert.deepEqual(await (await f.call()).json(),{section:'welcome',sourceLanguage:'ja-JP',sourceVersion:2,declared:true});assert.equal((await f.call('PATCH',declare('ja-JP',2))).status,400);assert.equal(f.snapshot(),before);
});
test('intervening source edit at the SQL boundary rejects the old declaration',async t=>{
 const f=await fixture(t),original=f.db;let race=true;
 f.env.DB={prepare(sql){const statement=original.prepare(sql);if(sql!==SQL.declare)return statement;return {bind(...args){return {async all(){if(race){race=false;assert(await createTranslationStore(original).setLanguage(f.owner.id,'welcome','fr-FR'));}return statement.bind(...args).all();}};}};}};
 assert.equal((await f.call('PATCH',declare('el-GR',1))).status,409);assert.equal((await (await f.call()).json()).sourceLanguage,'fr-FR');assert.deepEqual(f.state().attempts,{});
});
test('successful response comes from atomic RETURNING, not a later metadata read',async()=>{
 const service=createTranslationService({store:{declareLanguage:async()=>({section:'welcome',source_language:'el-GR',source_version:2}),source(){throw Error('NO_FOLLOWUP_READ');}}});
 assert.deepEqual(await service.declareSourceLanguage('g','welcome','el-GR',1),{status:'ok',metadata:{section:'welcome',sourceLanguage:'el-GR',sourceVersion:2,declared:true}});
});
test('storage exceptions and malformed direct-row results are sanitized and never reported as success',async t=>{
 const f=await fixture(t),before=f.snapshot(),original=f.db;
 for(const fake of [null,{success:true,results:[{applied:1},{applied:1}],meta:{changes:10}},{success:false,results:[{applied:1}]},{success:true,meta:{changes:1}}]){
  f.env.DB={prepare(sql){if(sql===SQL.declare)return {bind(){return {all:async()=>{if(fake===null)throw Error('SYNTHETIC_SENSITIVE_DATABASE_DETAIL');return fake;}};}};return original.prepare(sql);}};
  const r=await f.call('PATCH',declare('el-GR',1));assert.equal(r.status,500);assert.equal((await r.json()).code,'source_metadata_unavailable');assert.equal(f.snapshot(),before);
 }
 f.env.DB={prepare(sql){if(sql===SQL.source)return {bind(){return {first:async()=>{throw Error('SYNTHETIC_SENSITIVE_DATABASE_DETAIL');}};}};return original.prepare(sql);}};
 const r=await f.call();assert.equal(r.status,500);assert(!JSON.stringify(await r.json()).includes('SYNTHETIC_SENSITIVE_DATABASE_DETAIL'));assert.equal(f.snapshot(),before);
});
