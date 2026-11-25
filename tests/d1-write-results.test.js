import {test} from 'node:test';
import assert from 'node:assert/strict';
import {directWriteSucceeded} from '../src/db-write.js';
import {createLocalDb} from '../node/db.mjs';
import {handleRequest} from '../src/worker.js';
import {createTranslationStore} from '../src/translation-store.js';
import {createTranslationService} from '../src/translation-service.js';
const result=(results,changes=2,success=true)=>({success,results,meta:{changes}});
test('trigger-inclusive totals do not replace the exact direct RETURNING result',()=>{
 for(const changes of [1,2,10])assert.equal(directWriteSucceeded(result([{applied:1}],changes)),true);
 // Both the original exact-one check and a blind positive-count check are insufficient.
 assert.equal(result([{applied:1}]).meta.changes===1,false);
 for(const r of [result([],1),result([],10),result([{applied:1},{applied:1}],1),result([{applied:0}],1),result([{applied:1}],1,false),{success:true,meta:{changes:1}},null])assert.equal(directWriteSucceeded(r),false);
});
function triggerTotals(db){
 const calls=[];
 return {calls,prepare(sql){const statement=db.prepare(sql);return {bind(...args){const bound=statement.bind(...args);return {
  first:()=>bound.first(),
  async all(){calls.push(sql);const r=await bound.all();return {...r,meta:{changes:r.results.length?10:0}};},
  run:()=>bound.run()
 };}};}};
}
test('actual guide handler acknowledges a committed trigger-bearing update via RETURNING',async()=>{
 const db=triggerTotals(createLocalDb()),env={DB:db};
 const req=(path,method='GET',body,headers={})=>new Request('https://example.invalid'+path,{method,headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});
 const created=await (await handleRequest(req('/api/guides','POST',{property_name:'Synthetic',welcome:'Original'}),env)).json();
 const endpoint='/api/guides/'+created.id,headers={Authorization:'Bearer '+created.token};
 const a=await (await handleRequest(req(endpoint,'GET',undefined,headers),env)).json();
 const saved=await handleRequest(req(endpoint,'PATCH',{welcome:'Updated'},{...headers,'If-Match':'"'+a.revision+'"'}),env);
 assert.equal(saved.status,200);assert.equal((await saved.json()).guide.welcome,'Updated');assert.equal(db.calls.length,1);assert.match(db.calls[0],/RETURNING 1 AS applied$/);
 assert.equal((await handleRequest(req(endpoint,'PATCH',{welcome:'Stale'},{...headers,'If-Match':'"'+a.revision+'"'}),env)).status,409);
});
test('translation language, claim, publication, reconciliation, correction and failure use direct results',async()=>{
 const local=createLocalDb();await local.prepare('INSERT INTO guides').bind('g','SYNTHETIC_HASH',JSON.stringify({welcome:'Welcome. 112.',rules:'No smoking.'}),'same','same').run();
 const db=triggerTotals(local),store=createTranslationStore(db),service=createTranslationService({store});
 assert(await service.setSourceLanguage('g','welcome','en-GB'));
 const translated=await generateSaved(service,'g','welcome','de-DE');assert.equal(translated.status,'translated');
 assert(await service.correct('g','welcome','de-DE',{welcome:'Corrected. 112.'},translated.correction));
 assert.equal(await service.correct('g','welcome','de-DE',{welcome:'Stale. 112.'},translated.correction),false);
 const source=await store.source('g','welcome');
 const args={...source,claim_id:'failed-claim',target_language:'fr-FR',model:'gpt-6-luna',prompt_version:'hospitality-v1',created_ms:Date.now(),lease_until:Date.now()+30000,reservation_nano:660000,provider_mode:'openai'};
 assert(await store.claim(args));assert(await store.reconcile('failed-claim',{conservativeNano:33000}));assert(await store.fail('failed-claim'));assert.equal(await store.fail('failed-claim'),false);assert.equal(await store.publish('missing','{}',Date.now()),false);
 assert(db.calls.every(sql=>sql.endsWith(' RETURNING 1 AS applied')));
});
test('returned write results from the local adapter persist through all and first, not read-only shortcuts',async()=>{
 const db=createLocalDb();await db.prepare('INSERT INTO guides').bind('g','HASH',JSON.stringify({welcome:'Source'}),'same','same').run();
 const store=createTranslationStore(db);assert(await store.setLanguage('g','welcome','en-GB'));assert.equal(await store.setLanguage('g','welcome','en-GB'),false);
 const {TRANSLATION_SQL}=await import('../src/translation-store.js');
 assert.deepEqual(await db.prepare(TRANSLATION_SQL.language).bind('g','welcome','de-DE').first(),{applied:1});
 assert.equal((await store.source('g','welcome')).source_language,'de-DE');
 assert.equal(await db.prepare(TRANSLATION_SQL.language).bind('missing','welcome','de-DE').first(),null);
});

// Offline callers explicitly obtain a saved expectation before submitting generation.
async function generateSaved(service,id,section,target){
 const metadata=await service.sourceMetadata(id,section);
 return service.generate(id,section,target,metadata.metadata?.sourceLanguage??'en-GB',metadata.metadata?.sourceVersion??1);
}
