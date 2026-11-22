import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handleRequest} from '../src/worker.js';
import {createLocalDb} from '../node/db.mjs';
import {createTranslationStore} from '../src/translation-store.js';
import {createTranslationService} from '../src/translation-service.js';
import {UPDATE_GUIDE_SQL,GUIDE_REVISION_FIELD,versionGuide} from '../src/guide-store.js';
const initial={property_name:'Synthetic House',welcome:'Welcome. Call 112.',rules:'No smoking.',wifi_password:'SYNTHETIC_WIFI'};
async function setup(db=createLocalDb()){
 const env={DB:db};
 const request=(id,method='GET',body,revision,token)=>new Request('https://example.invalid/api/guides'+(id?'/'+id:''),{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(revision!==undefined?{'If-Match':revision}:{})},body:body?JSON.stringify(body):undefined});
 const created=await (await handleRequest(request(null,'POST',initial),env)).json();
 const call=(method='GET',body,revision,token=created.token)=>handleRequest(request(created.id,method,body,revision,token),env);
 return {db,env,created,call,read:async()=>{const r=await call();assert.equal(r.status,200);return r.json();}};
}
const etag=revision=>'"'+revision+'"';
test('two simultaneous editors with the same revision admit one atomic save',async()=>{
 const f=await setup(),a=await f.read(),b=await f.read();assert.equal(a.revision,b.revision);
 const results=await Promise.all(['A','B'].map(text=>f.call('PATCH',{welcome:text},etag(a.revision))));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const winner=await results.find(r=>r.status===200).json(),saved=await f.read();
 assert.equal(saved.guide.welcome,winner.guide.welcome);assert.equal(saved.revision,winner.revision);assert.notEqual(saved.revision,a.revision);
 assert.equal((await f.call('PATCH',{rules:'Stale different section'},etag(b.revision))).status,409);
 assert.equal((await f.read()).guide.rules,initial.rules);
});
test('GET and successful PATCH return strong revisions; metadata never enters guest/model output',async()=>{
 const f=await setup(),r=await f.call(),data=await r.json();assert.match(data.revision,/^[a-f0-9]{64}$/);assert.equal(r.headers.get('ETag'),etag(data.revision));
 assert(!Object.hasOwn(data.guide,GUIDE_REVISION_FIELD));
 const saved=await f.call('PATCH',{rules:'Updated'},etag(data.revision)),next=await saved.json();assert.equal(saved.headers.get('ETag'),etag(next.revision));assert.notEqual(next.revision,data.revision);
 const page=await (await handleRequest(new Request('https://example.invalid/g/'+f.created.id),f.env)).text();assert(!page.includes(GUIDE_REVISION_FIELD));assert(!page.includes(next.revision));assert(!page.includes(f.created.token));
});
test('legacy clients and malformed, wildcard, weak or multiple revisions cannot bypass preconditions',async()=>{
 const f=await setup(),before=await f.read();
 assert.equal((await f.call('PATCH',{welcome:'Legacy client'})).status,428);
 for(const value of ['',before.revision,'*','W/'+etag(before.revision),etag(before.revision)+', '+etag(before.revision),'"123"'])assert.equal((await f.call('PATCH',{welcome:'Invalid'},value)).status,400);
 assert.deepEqual(await f.read(),before);
 assert.equal((await f.call('PATCH',{[GUIDE_REVISION_FIELD]:'a'.repeat(64)},etag(before.revision))).status,400);
});
test('authorization precedes revision validation and no forbidden request can write',async()=>{
 const f=await setup(),before=await f.read();
 for(const token of ['', 'wrong'])for(const revision of [undefined,'*',etag(before.revision)])assert.equal((await f.call('PATCH',{welcome:'Forbidden'},revision,token)).status,401);
 assert.deepEqual(await f.read(),before);
});
test('fresh nonce prevents ABA/reverted-content and no-op saves from reviving an old revision',async()=>{
 const f=await setup(),a=await f.read();
 const b=await (await f.call('PATCH',{welcome:'Temporary'},etag(a.revision))).json();
 const c=await (await f.call('PATCH',{welcome:a.guide.welcome},etag(b.revision))).json();
 assert.notEqual(a.revision,c.revision);assert.equal((await f.call('PATCH',{rules:'Old'},etag(a.revision))).status,409);
 const d=await (await f.call('PATCH',{},etag(c.revision))).json();assert.notEqual(c.revision,d.revision);
});
test('legacy rows get read-only stable revisions and adopt nonce only on successful save',async()=>{
 const db=createLocalDb(),id='0123456789abcdef',token='synthetic_token';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)),hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const content=JSON.stringify(initial);await db.prepare('INSERT INTO guides').bind(id,hash,content,'now','now').run();
 const call=(method='GET',body,rev)=>handleRequest(new Request('https://example.invalid/api/guides/'+id,{method,headers:{Authorization:'Bearer '+token,...(rev?{'If-Match':etag(rev)}:{})},body:body?JSON.stringify(body):undefined}),{DB:db});
 const a=await (await call()).json(),b=await (await call()).json();assert.equal(a.revision,b.revision);assert.equal((await db.prepare('SELECT * FROM guides WHERE id=?1').bind(id).first()).content_json,content);
 const next=await (await call('PATCH',{welcome:'Legacy updated'},a.revision)).json();assert.notEqual(next.revision,a.revision);assert(!Object.hasOwn(next.guide,GUIDE_REVISION_FIELD));
});
test('a write between service read and update is rejected by SQL, not only a read/check',async()=>{
 const db=createLocalDb(),f=await setup(db),a=await f.read();let intercepted=false;
 const raced={prepare(sql){const statement=db.prepare(sql);if(sql!==UPDATE_GUIDE_SQL)return statement;
  return {bind(...args){return {async run(){intercepted=true;const newer=versionGuide({...initial,welcome:'Intervening writer'});await db.prepare('UPDATE guides').bind(newer.contentJson,'same timestamp',f.created.id).run();return db.prepare(sql).bind(...args).run();}};}};
 }};
 f.env.DB=raced;assert.equal((await f.call('PATCH',{welcome:'Must not overwrite'},etag(a.revision))).status,409);assert(intercepted);f.env.DB=db;assert.equal((await f.read()).guide.welcome,'Intervening writer');
});
test('accepted save invalidates changed section only; conflict preserves sources, manual results and reservations',async t=>{
 fs.mkdirSync('.local/qa',{recursive:true});const directory=fs.mkdtempSync('.local/qa/sg-w1-translations-');t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const file=directory+'/disposable.json';
 const f=await setup(createLocalDb(file)),store=createTranslationStore(f.db),service=createTranslationService({store});
 for(const section of ['welcome','rules']){await service.setSourceLanguage(f.created.id,section,'en-GB');const t=await service.generate(f.created.id,section,'de-DE');assert.equal(t.status,'translated');assert(await service.correct(f.created.id,section,'de-DE',t.fields,t.correction));}
 const stale=await f.read(),rules=await store.source(f.created.id,'rules'),welcome=await store.source(f.created.id,'welcome');
 assert.equal((await f.call('PATCH',{welcome:'Changed. Call 112.'},etag(stale.revision))).status,200);
 assert.equal((await store.source(f.created.id,'welcome')).source_version,welcome.source_version+1);assert.deepEqual(await store.source(f.created.id,'rules'),rules);assert.equal((await service.view(f.created.id,'rules','de-DE')).origin,'manual');
 const current=await f.read(),beforeRules=await service.view(f.created.id,'rules','de-DE'),snapshot=fs.readFileSync(file,'utf8');
 assert.equal((await f.call('PATCH',{rules:'Rejected'},etag(stale.revision))).status,409);
 assert.deepEqual(await f.read(),current);assert.deepEqual(await store.source(f.created.id,'rules'),rules);assert.deepEqual(await service.view(f.created.id,'rules','de-DE'),beforeRules);
 assert.equal(fs.readFileSync(file,'utf8'),snapshot);assert.equal(Object.values(JSON.parse(snapshot).attempts).reduce((n,a)=>n+a.reservation_nano,0),1320000);
});
test('independent file-backed adapters atomically compare exact stored bytes and ownership',async t=>{
 fs.mkdirSync('.local/qa',{recursive:true});const directory=fs.mkdtempSync('.local/qa/sg-w1-');t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const file=directory+'/disposable.json';
 const f=await setup(createLocalDb(file)),snapshot=fs.readFileSync(file,'utf8'),row=Object.values(JSON.parse(snapshot).guides)[0],other=createLocalDb(file);
 assert.equal((await other.prepare(UPDATE_GUIDE_SQL).bind(row.content_json,'same',row.id,row.content_json,'wrong owner').run()).meta.changes,0);assert.equal(fs.readFileSync(file,'utf8'),snapshot);
 const values=['First','Second'].map(welcome=>versionGuide({...initial,welcome}).contentJson);
 const results=await Promise.all([f.db,other].map((db,i)=>db.prepare(UPDATE_GUIDE_SQL).bind(values[i],'identical time',row.id,row.content_json,row.edit_token_hash).run()));
 assert.deepEqual(results.map(r=>r.meta.changes).sort(),[0,1]);const state=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(state.guides[row.id].content_json,values[results.findIndex(r=>r.meta.changes===1)]);
 const held=fs.readFileSync(file,'utf8');assert.equal((await other.prepare(UPDATE_GUIDE_SQL).bind(values[1],'identical time',row.id,row.content_json,row.edit_token_hash).run()).meta.changes,0);assert.equal(fs.readFileSync(file,'utf8'),held);
});
