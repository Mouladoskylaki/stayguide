import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createLocalDb} from '../node/db.mjs';
import {createTranslationStore,TRANSLATION_SQL as SQL} from '../src/translation-store.js';
import {createTranslationService,createMockTranslationProvider,TRANSLATION_CONFIG as CONFIG} from '../src/translation-service.js';
const id='0123456789abcdef';
const insert='INSERT INTO guides (id, edit_token_hash, content_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)';
const update='UPDATE guides SET content_json = ?1, updated_at = ?2 WHERE id = ?3';
const guide={property_name:'Synthetic property',welcome:'Welcome! Call 112.',rules:'Do not smoke.',checkin:'After 16:00.',checkout:'Before 10:00.',wifi_password:'EXCLUDED_WIFI_SENTINEL',wifi_name:'EXCLUDED_NETWORK'};
async function setup({db=createLocalDb(),provider,clock={value:100000}}={}){
 await db.prepare(insert).bind(id,'EXCLUDED_AUTH_HASH',JSON.stringify(guide),'now','now').run();
 const store=createTranslationStore(db),service=createTranslationService({store,provider,now:()=>clock.value});
 const edit=async patch=>{const row=await db.prepare('SELECT * FROM guides WHERE id=?1').bind(id).first();return db.prepare(update).bind(JSON.stringify({...JSON.parse(row.content_json),...patch}),'later',id).run();};
 return {db,store,service,edit,clock};
}
function spyProvider(transform=fields=>fields){let calls=0,payload;return {mode:'mock',get calls(){return calls;},get payload(){return payload;},async translate(p){calls++;payload=p;return {fields:transform(p.fields),usage:{inputTokens:200,outputTokens:100,reasoningTokens:0}};}};}
test('source language is unknown until explicitly declared; views never generate',async()=>{
 const p=spyProvider(),{service}=await setup({provider:p});
 assert.equal((await service.view(id,'welcome','el-GR')).language,null);
 assert.equal((await service.generate(id,'welcome','el-GR')).category,'source_language_required');
 assert.equal(p.calls,0);await service.setSourceLanguage(id,'welcome','el-GR');
 assert.equal((await service.view(id,'welcome','el-GR')).status,'original');
 assert.equal((await service.view(id,'welcome','invalid')).status,'original');
 await assert.rejects(()=>service.setSourceLanguage(id,'welcome','invalid'));
});
test('cache storage, separate targets, manual correction and property isolation',async()=>{
 const p=spyProvider(),{service}=await setup({provider:p});await service.setSourceLanguage(id,'welcome','en-GB');
 const first=await service.generate(id,'welcome','el-GR');assert.equal(first.status,'translated');assert.equal(first.providerMode,'mock');
 for(let i=0;i<4;i++){await service.view(id,'welcome','el-GR');await service.generate(id,'welcome','el-GR');}assert.equal(p.calls,1);
 await service.generate(id,'welcome','de-DE');assert.equal(p.calls,2);
 assert.equal(await service.correct(id,'welcome','el-GR',{welcome:'A corrected welcome. Call 112.'},first.correction),true);
 assert.equal((await service.generate(id,'welcome','el-GR')).origin,'manual');assert.equal(p.calls,2);
 assert.equal((await service.view('missing','welcome','el-GR')).status,'missing');
});
test('editing one section invalidates it and preserves other sections and manual content',async()=>{
 const {service,edit}=await setup();for(const section of ['welcome','rules'])await service.setSourceLanguage(id,section,'en-GB');
 await service.generate(id,'welcome','el-GR');await service.generate(id,'rules','el-GR');
 await service.correct(id,'rules','el-GR',{rules:'Do not smoke. Thank you.'},(await service.view(id,'rules','el-GR')).correction);
 await edit({welcome:'A new welcome! Call 112.'});assert.equal((await service.view(id,'welcome','el-GR')).status,'original');
 assert.equal((await service.view(id,'rules','el-GR')).origin,'manual');
 await service.generate(id,'welcome','el-GR');assert.equal((await service.view(id,'welcome','el-GR')).status,'translated');
 await edit({wifi_password:'ANOTHER_EXCLUDED_VALUE'});assert.equal((await service.view(id,'welcome','el-GR')).status,'translated');
 await edit({welcome:'A new welcome! Call 112.'});assert.equal((await service.view(id,'welcome','el-GR')).status,'translated');
});
test('arrival groups both fields and language changes invalidate previous translations',async()=>{
 const {service,edit}=await setup();await service.setSourceLanguage(id,'arrival','en-GB');await service.generate(id,'arrival','el-GR');
 await edit({checkout:'Before 11:00.'});assert.equal((await service.view(id,'arrival','el-GR')).status,'original');
 await service.setSourceLanguage(id,'arrival','de-DE');assert.equal((await service.view(id,'arrival','el-GR')).language,'de-DE');
});
test('concurrent requests from independent services claim exactly once',async()=>{
 let release,entered;const started=new Promise(r=>entered=r),pending=new Promise(r=>release=r);let calls=0;
 const provider={mode:'mock',async translate(p){calls++;entered();await pending;return {fields:p.fields,usage:{inputTokens:100,outputTokens:100,reasoningTokens:0}};}};
 const {db,store,service}=await setup({provider});await service.setSourceLanguage(id,'welcome','en-GB');
 const first=service.generate(id,'welcome','el-GR');await started;
 const other=createTranslationService({store:createTranslationStore(db),provider,now:()=>100000});
 assert.equal((await other.generate(id,'welcome','el-GR')).category,'busy_or_limit');release();assert.equal((await first).status,'translated');assert.equal(calls,1);
});
test('expired lease can be reclaimed but old holder cannot publish; reservations stay consumed',async()=>{
 const {store}=await setup();await store.setLanguage(id,'welcome','en-GB');const s=await store.source(id,'welcome');
 const a={...s,claim_id:'first',target_language:'el-GR',model:CONFIG.model,prompt_version:CONFIG.promptVersion,created_ms:100000,lease_until:100010,reservation_nano:CONFIG.reservationNano};
 assert.equal(await store.claim(a),true);assert.equal(await store.claim({...a,claim_id:'second',created_ms:100011,lease_until:100100}),true);
 assert.equal(await store.publish('first','{}',100012),false);assert.equal(await store.publish('second','{}',100101),false);
});
test('source edits during provider work reject stale results',async()=>{
 let release,entered;const started=new Promise(r=>entered=r),pending=new Promise(r=>release=r);
 const p={mode:'mock',async translate(payload){entered();await pending;return {fields:payload.fields,usage:{inputTokens:100,outputTokens:100,reasoningTokens:0}};}};
 const {service,edit}=await setup({provider:p});await service.setSourceLanguage(id,'welcome','en-GB');
 const work=service.generate(id,'welcome','el-GR');await started;await edit({welcome:'Changed source.'});release();
 assert.equal((await work).category,'stale_or_expired');assert.equal((await service.view(id,'welcome','el-GR')).status,'original');
});
test('provider failures are sanitized and protected values/output bounds are enforced',async()=>{
 for(const behavior of ['throw','missing','badUsage','reasoning','labels']){
  const p=spyProvider();p.translate=async payload=>{
   if(behavior==='throw')throw Error('DO_NOT_LOG_PRIVATE_ERROR');
   return {fields:behavior==='missing'?{}:behavior==='labels'?{welcome:'No number here.'}:payload.fields,usage:{inputTokens:100,outputTokens:behavior==='badUsage'?801:100,reasoningTokens:behavior==='reasoning'?1:0}};
  };
  const {service}=await setup({provider:p});await service.setSourceLanguage(id,'welcome','en-GB');
  assert.deepEqual(await service.generate(id,'welcome','el-GR'),{status:'failed',category:'translation_unavailable'});
  assert.equal((await service.view(id,'welcome','el-GR')).status,'original');
 }
});
test('strict projection excludes secrets, identifiers and Wi-Fi fields from provider payload',async()=>{
 const p=spyProvider(),{service}=await setup({provider:p});await service.setSourceLanguage(id,'welcome','en-GB');await service.generate(id,'welcome','el-GR');
 const payload=JSON.stringify(p.payload);for(const value of [id,'EXCLUDED_WIFI_SENTINEL','EXCLUDED_AUTH_HASH','EXCLUDED_NETWORK','Synthetic property'])assert(!payload.includes(value));
 assert.deepEqual(Object.keys(p.payload).sort(),['fields','instructions','protectedStrings','sourceLanguage','targetLanguage']);
 assert.equal((await service.generate(id,'wifi','el-GR')).category,'invalid_selection');
 assert.throws(()=>createTranslationService({store:{},provider:{mode:'live',translate(){}}}),/mock/);
});
test('oversized or credential-like source never reaches the mock provider',async()=>{
 const p=spyProvider(),{service,edit}=await setup({provider:p});await service.setSourceLanguage(id,'welcome','en-GB');
 await edit({welcome:'a'.repeat(1201)});assert.equal((await service.generate(id,'welcome','el-GR')).category,'input_limit');
 await edit({welcome:'Bearer SYNTHETIC_CREDENTIAL'});assert.equal((await service.generate(id,'welcome','el-GR')).status,'failed');assert.equal(p.calls,0);
});
test('append-only reservations, request limit and minute rate gate work together',async()=>{
 const {store}=await setup();await store.setLanguage(id,'welcome','en-GB');const s=await store.source(id,'welcome');
 const a={...s,claim_id:'large',target_language:'el-GR',model:CONFIG.model,prompt_version:CONFIG.promptVersion,created_ms:100000,lease_until:100010,reservation_nano:100000000};
 assert(await store.claim(a));await store.fail('large');assert.equal(await store.claim({...a,claim_id:'over',created_ms:100020,lease_until:100030,reservation_nano:1}),false);
 const fresh=await setup();await fresh.store.setLanguage(id,'welcome','en-GB');const source=await fresh.store.source(id,'welcome');
 for(let i=0;i<8;i++){
  const at=200000+Math.floor(i/4)*61000;
  assert(await fresh.store.claim({...a,...source,claim_id:'q'+i,created_ms:at,lease_until:at+10,reservation_nano:1}));await fresh.store.fail('q'+i);
  if(i===3)assert.equal(await fresh.store.claim({...a,...source,claim_id:'rate',created_ms:at,lease_until:at+10,reservation_nano:1}),false);
 }
 assert.equal(await fresh.store.claim({...a,...source,claim_id:'ninth',created_ms:500000,lease_until:500010,reservation_nano:1}),false);
});
test('legacy JSON guides persist translations across independent adapter instances',async()=>{
 fs.mkdirSync('.local/qa',{recursive:true});const dir=fs.mkdtempSync('.local/qa/sg-p31-phase3a-'),file=path.join(dir,'guides.json');
 try{
  const legacy={[id]:{id,edit_token_hash:'HASH_ONLY',content_json:JSON.stringify(guide),created_at:'now',updated_at:'now'}};fs.writeFileSync(file,JSON.stringify(legacy));
  const before=fs.readFileSync(file,'utf8'),db=createLocalDb(file);assert.equal(fs.readFileSync(file,'utf8'),before);
  const service=createTranslationService({store:createTranslationStore(db)});await service.setSourceLanguage(id,'welcome','en-GB');await service.generate(id,'welcome','el-GR');
  const other=createTranslationService({store:createTranslationStore(createLocalDb(file))});assert.equal((await other.view(id,'welcome','el-GR')).status,'translated');
  assert.equal(JSON.parse((await db.prepare('SELECT * FROM guides WHERE id=?1').bind(id).first()).content_json).wifi_password,guide.wifi_password);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('generation deadline fails safely without retry or late publication',async t=>{
 let expire,calls=0;const provider={mode:'mock',translate(){calls++;return new Promise(()=>{});}};
 const {service}=await setup({provider});await service.setSourceLanguage(id,'welcome','en-GB');
 t.mock.method(globalThis,'setTimeout',callback=>{expire=callback;return 'mock-timer';});t.mock.method(globalThis,'clearTimeout',()=>{});
 const work=service.generate(id,'welcome','el-GR');for(let i=0;i<100&&!expire;i++)await Promise.resolve();assert.equal(typeof expire,'function');expire();
 assert.equal((await work).status,'failed');assert.equal(calls,1);assert.equal((await service.view(id,'welcome','el-GR')).status,'original');
});
test('read failures expose no storage error details and do not invoke the provider',async()=>{
 const p=spyProvider(),service=createTranslationService({store:{async source(){throw Error('PRIVATE_STORAGE_DETAIL');}},provider:p});
 assert.deepEqual(await service.view(id,'welcome','el-GR'),{status:'unavailable',fields:{},language:null});assert.equal(p.calls,0);
});
test('file-backed local claims reload current state across independent adapters and fail closed on lock contention',async()=>{
 fs.mkdirSync('.local/qa',{recursive:true});const dir=fs.mkdtempSync('.local/qa/sg-p31-phase3a-'),file=path.join(dir,'db.json');
 try{
  const first=await setup({db:createLocalDb(file)});await first.service.setSourceLanguage(id,'welcome','en-GB');const second=createTranslationStore(createLocalDb(file));
  const s=await first.store.source(id,'welcome'),a={...s,claim_id:'a',target_language:'el-GR',model:CONFIG.model,prompt_version:CONFIG.promptVersion,created_ms:100000,lease_until:130000,reservation_nano:660000};
  const claims=await Promise.all([first.store.claim(a),second.claim({...a,claim_id:'b'})]);assert.deepEqual(claims,[true,false]);
  fs.writeFileSync(file+'.lock','test lock');await assert.rejects(()=>second.claim({...a,claim_id:'c',target_language:'de-DE'}));
  assert.equal(fs.readFileSync(file+'.lock','utf8'),'test lock');fs.unlinkSync(file+'.lock');
  assert.equal(await second.claim({...a,claim_id:'c',target_language:'de-DE'}),true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('translation HTTP access requires authorization and public guest views stay read-only',async()=>{
 const {handleRequest}=await import('../src/worker.js');const {db}=await setup();
 assert.equal((await handleRequest(new Request('https://example.invalid/api/guides/'+id+'/translations',{method:'POST'}),{DB:db})).status,401);
 for(let i=0;i<3;i++){const response=await handleRequest(new Request('https://example.invalid/g/'+id),{DB:db});assert.equal(response.status,200);assert.match(await response.text(),/Welcome!/);}
});
async function readyCorrection(){
 const fixture=await setup();await fixture.service.setSourceLanguage(id,'welcome','en-GB');
 await fixture.service.generate(id,'welcome','el-GR');
 return {...fixture,expected:(await fixture.service.view(id,'welcome','el-GR')).correction};
}
test('valid correction carries submitted source and exact translation identity',async()=>{
 const {service,expected}=await readyCorrection();
 assert.equal(await service.correct(id,'welcome','el-GR',{welcome:'Corrected welcome. Call 112.'},expected),true);
 const saved=await service.view(id,'welcome','el-GR');assert.equal(saved.origin,'manual');assert.equal(saved.correction.translationId,expected.translationId);
});
test('old correction after source edit and regeneration cannot change newer content',async()=>{
 const {service,edit,expected}=await readyCorrection();await edit({welcome:'New arrival text. Call 112.'});await service.generate(id,'welcome','el-GR');
 const before=await service.view(id,'welcome','el-GR');
 assert.equal(await service.correct(id,'welcome','el-GR',{welcome:'Old correction. Call 112.'},expected),false);
 assert.deepEqual(await service.view(id,'welcome','el-GR'),before);
});
test('source edit and regeneration between correction reads reject the original expectations',async()=>{
 const {service,store,edit,expected}=await readyCorrection();let changed=false;
 const wrapped={...store,async source(...args){const old=await store.source(...args);if(!changed){changed=true;await edit({welcome:'New source between reads. Call 112.'});await service.generate(id,'welcome','el-GR');}return old;}};
 const editor=createTranslationService({store:wrapped,now:()=>100000});
 assert.equal(await editor.correct(id,'welcome','el-GR',{welcome:'Correction of old source. Call 112.'},expected),false);
 assert.equal((await service.view(id,'welcome','el-GR')).fields.welcome,'New source between reads. Call 112.');
});
test('translation replacement between reads and atomic update rejects stale identity',async()=>{
 const {service,store,edit,expected}=await readyCorrection();
 const wrapped={...store,async correct(args){await edit({welcome:'Replacement source. Call 112.'});await service.generate(id,'welcome','el-GR');return store.correct(args);}};
 const editor=createTranslationService({store:wrapped,now:()=>100000});
 assert.equal(await editor.correct(id,'welcome','el-GR',{welcome:'Stale correction. Call 112.'},expected),false);
 assert.equal((await service.view(id,'welcome','el-GR')).fields.welcome,'Replacement source. Call 112.');
});
test('wrong identity and missing, malformed or stale source expectations fail closed',async()=>{
 const {service,expected}=await readyCorrection(),before=await service.view(id,'welcome','el-GR');
 for(const submitted of [undefined,null,{}, {...expected,sourceVersion:undefined},{...expected,sourceVersion:0},{...expected,sourceVersion:String(expected.sourceVersion)}, {...expected,sourceVersion:expected.sourceVersion-1},{...expected,translationId:'wrong'}, {...expected,translationId:''},{...expected,translatedText:undefined},{...expected,translatedText:'old text'}]){
  assert.equal(await service.correct(id,'welcome','el-GR',{welcome:'Must not apply. Call 112.'},submitted),false);
 }
 assert.deepEqual(await service.view(id,'welcome','el-GR'),before);
});
test('concurrent corrections sharing a snapshot cannot silently overwrite one another',async()=>{
 const {service,expected}=await readyCorrection();
 const results=await Promise.all(['First','Second'].map(label=>service.correct(id,'welcome','el-GR',{welcome:label+' correction. Call 112.'},expected)));
 assert.equal(results.filter(Boolean).length,1);const saved=await service.view(id,'welcome','el-GR');
 assert.equal(saved.fields.welcome,(results[0]?'First':'Second')+' correction. Call 112.');assert.equal(saved.origin,'manual');
});
test('manual text replacement after reads is fenced by the submitted text snapshot',async()=>{
 const {service,store,expected}=await readyCorrection();
 const wrapped={...store,async correct(args){assert.equal(await service.correct(id,'welcome','el-GR',{welcome:'Winning correction. Call 112.'},expected),true);return store.correct(args);}};
 assert.equal(await createTranslationService({store:wrapped}).correct(id,'welcome','el-GR',{welcome:'Losing correction. Call 112.'},expected),false);
 assert.equal((await service.view(id,'welcome','el-GR')).fields.welcome,'Winning correction. Call 112.');
});
test('source-language storage failures return false without raw error details',async()=>{
 for(const setLanguage of [()=>{throw Error('SYNTHETIC_PRIVATE_DATABASE_DETAIL');},async()=>{throw Error('SYNTHETIC_PRIVATE_DATABASE_DETAIL');}]){
  const service=createTranslationService({store:{setLanguage}});
  assert.equal(await service.setSourceLanguage(id,'welcome','en-GB'),false);
 }
});
test('correction source/cache/update storage failures return false without raw error details',async()=>{
 const {store,expected}=await readyCorrection();
 for(const method of ['source','cached','correct']){
  const service=createTranslationService({store:{...store,[method]:async()=>{throw Error('SYNTHETIC_PRIVATE_DATABASE_DETAIL');}}});
  assert.equal(await service.correct(id,'welcome','el-GR',{welcome:'Corrected. Call 112.'},expected),false);
 }
});
