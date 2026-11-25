import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import syncfs from 'node:fs';
import path from 'node:path';
import {runOneShot,runOfflineOneShot,oneShotMode,oneShotPlan,OFFLINE_DIRECTORY,LIVE_DIRECTORY} from '../scripts/translation-one-shot.mjs';
const output='Drücken Sie einmal START. Drücken Sie nicht RESET. Warten Sie 90 Sekunden, bevor Sie den Deckel öffnen; auf dem Display kann noch HOT angezeigt werden.';
const generation=text=>({model:'gpt-6-luna',service_tier:'default',status:'completed',error:null,incomplete_details:null,output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify({appliances:text??output})}]}],usage:{input_tokens:150,output_tokens:60,total_tokens:210,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}}});
async function directory(){await fs.mkdir(OFFLINE_DIRECTORY,{recursive:true,mode:0o700});return fs.mkdtemp(path.join(OFFLINE_DIRECTORY,'test-'));}
function http(override){const calls=[];return {calls,async fetch(url,options){calls.push({url,body:JSON.parse(options.body)});if(override)return override(url,options,calls.length);return Response.json(url.endsWith('input_tokens')?{object:'response.input_tokens',input_tokens:150}:generation());}};}
async function fixture(t){const dir=await directory();t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
test('default dry-run reads only frozen synthetic data; no credential, transport or guard access',async t=>{
 const open=fs.open,read=fs.readFile;let opens=0,requests=0;
 t.mock.method(fs,'open',async(...args)=>{opens++;assert(!String(args[0]).endsWith('.env.local'));return open(...args);});
 t.mock.method(fs,'readFile',async(...args)=>{assert(!String(args[0]).endsWith('.env.local'));return read(...args);});
 t.mock.method(globalThis,'fetch',()=>{requests++;throw Error('Network forbidden');});
 const result=await runOneShot([]);assert.equal(result.mode,'dry-run');assert.equal(result.credentialRead,false);assert.equal(result.guardClaimed,false);assert.equal(result.networkCalls,0);assert.equal(requests,0);assert.equal(opens,0);
 assert.equal(result.plan.caseId,'H08');assert.equal(result.plan.sourceLanguage,'en-GB');assert.equal(result.plan.targetLanguage,'de-DE');assert.equal(result.plan.reservedNano,660000);assert.equal(result.plan.maximumCountingCalls,1);assert.equal(result.plan.maximumGenerationCalls,1);
 assert.deepEqual(await runOneShot(['--dry-run']),result);
});
test('CLI has no reset, source/model/budget/path override or retry option',()=>{
 assert.equal(oneShotMode([]),'dry-run');
 for(const args of [['--reset'],['--model','other'],['--budget','1'],['--directory','elsewhere'],['--live','--retry']])assert.throws(()=>oneShotMode(args),/unsupported_arguments/);
});
test('offline execution rejects missing/native HTTP and cannot claim the live directory',async()=>{
 await assert.rejects(()=>runOfflineOneShot({directory:LIVE_DIRECTORY,fetchImpl:async()=>{throw Error('No dispatch');}}),/unsafe_directory/);
 await assert.rejects(()=>runOfflineOneShot({directory:LIVE_DIRECTORY,fetchImpl:globalThis.fetch}),/mock_transport_required/);
});
test('one fixed generation persists, survives restart and serves cached host/guest reads with no extra calls',async t=>{
 const dir=await fixture(t),mock=http(),result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});
 assert.equal(result.status,'SUCCESS');assert.equal(result.execution,'offline-mock');assert.equal(result.realTransportAttempted,false);assert.equal(result.providerMode,'openai');assert.equal(result.fields.appliances,output);
 assert.equal(result.countingCalls,1);assert.equal(result.generationCalls,1);assert.equal(result.blockedHttpAttempts,0);assert.deepEqual(result.transportCalls,{count:1,generate:1});assert.equal(mock.calls.length,2);
 assert.equal(result.reservedNano,660000);assert.equal(result.usage.estimatedNano,45000);assert.equal(result.usage.conservativeNano,49500);assert(result.persistenceVerified&&result.cacheReuseVerified&&result.guestVerified);
 const state=JSON.parse(await fs.readFile(dir+'/disposable.json','utf8'));assert.deepEqual(state.policy,{max_requests:1,per_minute:1,budget_nano:660000});assert.equal(Object.keys(state.guides).length,1);assert.equal(Object.keys(state.attempts).length,1);
 assert.equal((await fs.stat(dir+'/one-shot.jsonl')).mode&0o777,0o600);assert.equal((await fs.stat(dir+'/disposable.json')).mode&0o777,0o600);
 for(const p of ['summary.json','disposable.json','one-shot.jsonl'])assert(!(await fs.readFile(dir+'/'+p,'utf8')).includes('OFFLINE_ONE_SHOT_SENTINEL_NOT_A_KEY'));
 await assert.rejects(()=>runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)}),/one_shot_already_consumed/);assert.equal(mock.calls.length,2);
});
test('simultaneous executions admit one guard owner and one count/generation pair',async t=>{
 const dir=await fixture(t),mock=http();const results=await Promise.allSettled([1,2].map(()=>runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)})));
 assert.equal(results.filter(r=>r.status==='fulfilled'&&r.value.status==='SUCCESS').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.equal(mock.calls.length,2);
});
for(const [name,count] of [['over-limit',801],['missing',null],['ambiguous','150']]){
 test('failed '+name+' count consumes guard without generation or budget reset',async t=>{
  const dir=await fixture(t),mock=http(()=>Response.json({object:'response.input_tokens',input_tokens:count}));
  const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});assert.equal(result.status,'BLOCKED');assert.equal(result.countingCalls,1);assert.equal(result.generationCalls,0);assert.equal(result.possibleUnreportedSpend,false);assert.equal(mock.calls.length,1);
  assert.equal(result.reservedNano,660000);await assert.rejects(()=>runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)}),/one_shot_already_consumed/);
 });
}
test('failed generation with unknown usage retains reservation and never retries',async t=>{
 const dir=await fixture(t),mock=http((url)=>url.endsWith('input_tokens')?Response.json({object:'response.input_tokens',input_tokens:150}):new Response('synthetic private error',{status:500}));
 const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});assert.equal(result.status,'BLOCKED');assert.equal(result.possibleUnreportedSpend,true);assert.equal(result.reservedNano,660000);assert.equal(result.usage,null);assert.equal(mock.calls.length,2);assert(!JSON.stringify(result).includes('synthetic private error'));
});
test('generation timeout aborts transport, retains uncertain budget and consumes guard',async t=>{
 const original=globalThis.setTimeout;let timed=0,aborted=false,abortGeneration;
 t.mock.method(globalThis,'setTimeout',(callback,ms,...args)=>{const handle=original(callback,ms,...args);if(ms<=10000&&++timed===2)abortGeneration=callback;return handle;});
 const dir=await fixture(t),mock=http((url,options)=>url.endsWith('input_tokens')?Response.json({object:'response.input_tokens',input_tokens:150}):new Promise((resolve,reject)=>{const fail=()=>{aborted=true;reject(Error('synthetic timeout'));};if(options.signal.aborted)fail();else{options.signal.addEventListener('abort',fail,{once:true});queueMicrotask(abortGeneration);}}));
 const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});assert.equal(result.status,'BLOCKED');assert(aborted);assert.equal(result.possibleUnreportedSpend,true);assert.equal(result.reservedNano,660000);assert.equal(mock.calls.length,2);
 await assert.rejects(()=>runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)}),/one_shot_already_consumed/);
});
test('budget/policy tampering after counting is rejected before generation dispatch',async t=>{
 const dir=await fixture(t),mock=http(async()=>{const file=dir+'/disposable.json',state=JSON.parse(await fs.readFile(file,'utf8'));state.policy.budget_nano=660001;await fs.writeFile(file,JSON.stringify(state));return Response.json({object:'response.input_tokens',input_tokens:150});});
 const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});assert.equal(result.status,'BLOCKED');assert.equal(mock.calls.length,1);assert.equal(result.transportCalls.generate,0);assert.equal(result.reservedNano,660000);
});
test('count/generation payloads stay fixed and arbitrary source text cannot substitute',async t=>{
 const dir=await fixture(t),mock=http();assert.equal((await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)})).status,'SUCCESS');
 const plan=await oneShotPlan();for(const call of mock.calls){const input=JSON.parse(call.body.input);assert.deepEqual(input.fields,{appliances:plan.text});assert.equal(input.targetLanguage,'de-DE');assert.equal(call.body.model,'gpt-6-luna');}
 for(const key of ['model','instructions','input','reasoning','tools','text'])assert.deepEqual(mock.calls[0].body[key],mock.calls[1].body[key]);
});
for(const [name,text] of [['secret','OFFLINE_ONE_SHOT_SENTINEL_NOT_A_KEY'],['missing protected values','Unsafe output']]){
 test(name+' cannot enter saved results or successful summary',async t=>{
  const dir=await fixture(t),mock=http(url=>Response.json(url.endsWith('input_tokens')?{object:'response.input_tokens',input_tokens:150}:generation(text)));
  const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});assert.equal(result.status,'BLOCKED');assert.equal(result.reservedNano,660000);assert.equal(result.usage.conservativeNano,49500);assert.equal(result.possibleUnreportedSpend,false);
  const state=JSON.parse(await fs.readFile(dir+'/disposable.json','utf8'));assert(Object.values(state.translations).every(row=>row.status!=='ready'));
  for(const p of ['summary.json','one-shot.jsonl','disposable.json'])assert(!(await fs.readFile(dir+'/'+p,'utf8')).includes('OFFLINE_ONE_SHOT_SENTINEL_NOT_A_KEY'));
 });
}
test('source echo cannot count as successful translation even with OpenAI-shaped provenance',async t=>{
 const dir=await fixture(t),plan=await oneShotPlan(),mock=http(url=>Response.json(url.endsWith('input_tokens')?{object:'response.input_tokens',input_tokens:150}:generation(plan.text)));
 const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});assert.equal(result.status,'BLOCKED');assert.equal(result.category,'invalid_translation');assert.equal(mock.calls.length,2);
});
test('symlink output escape is rejected without HTTP dispatch',async t=>{
 const dir=await fixture(t),link=dir+'/link';await fs.symlink(dir,link);const mock=http();
 await assert.rejects(()=>runOfflineOneShot({directory:link,fetchImpl:mock.fetch.bind(mock)}),/unsafe_directory/);assert.equal(mock.calls.length,0);
});
test('pre-existing database is neither opened nor overwritten and guard remains consumed',async t=>{
 const dir=await fixture(t),file=dir+'/disposable.json';await fs.writeFile(file,'PRESERVED_EXISTING_FILE_SENTINEL');
 const read=fs.readFile;t.mock.method(fs,'readFile',async(p,...args)=>{assert.notEqual(String(p),file);return read(p,...args);});
 const mock=http(),result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});assert.equal(result.status,'BLOCKED');assert.equal(result.reservedNano,null);assert.equal(result.reservationSource,'unknown');assert.equal(mock.calls.length,0);
 assert.equal(await read(file,'utf8'),'PRESERVED_EXISTING_FILE_SENTINEL');await assert.rejects(()=>runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)}),/one_shot_already_consumed/);
});
test('empty guard from an interrupted execution blocks restart without resuming work',async t=>{
 const dir=await fixture(t);await fs.writeFile(dir+'/one-shot.jsonl','',{mode:0o600});const mock=http();
 await assert.rejects(()=>runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)}),/one_shot_already_consumed/);assert.equal(mock.calls.length,0);
});
test('persistent one-attempt budget blocks a new cache-miss operation even outside the harness guard',async t=>{
 const dir=await fixture(t),mock=http();assert.equal((await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)})).status,'SUCCESS');
 const {createLocalDb}=await import('../node/db.mjs'),{createTranslationStore}=await import('../src/translation-store.js'),{createTranslationService}=await import('../src/translation-service.js');
 const file=dir+'/disposable.json',state=JSON.parse(await fs.readFile(file,'utf8')),id=Object.keys(state.guides)[0];let calls=0;
 const service=createTranslationService({store:createTranslationStore(createLocalDb(file)),provider:{mode:'openai',enabled:true,async translate(){calls++;throw Error('Must not dispatch');}}});
 assert.equal((await service.generate(id,'appliances','fr-FR','en-GB',2)).category,'busy_or_limit');assert.equal(calls,0);assert.equal(mock.calls.length,2);
});
test('guard, reservation and request journal exist before each mocked HTTP dispatch',async t=>{
 const dir=await fixture(t),mock=http(async url=>{
  const kind=url.endsWith('input_tokens')?'count':'generate';
  const events=(await fs.readFile(dir+'/one-shot.jsonl','utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(events[0].event,'one-shot-claimed');assert.equal(events.at(-1).event,'http-reserved');assert.equal(events.at(-1).kind,kind);
  const state=JSON.parse(await fs.readFile(dir+'/disposable.json','utf8'));assert.equal(Object.values(state.attempts)[0].reservation_nano,660000);
  return Response.json(kind==='count'?{object:'response.input_tokens',input_tokens:150}:generation());
 });
 assert.equal((await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)})).status,'SUCCESS');
 const events=(await fs.readFile(dir+'/one-shot.jsonl','utf8')).trim().split('\n').map(JSON.parse);
 assert.deepEqual(events.map(event=>event.event),['one-shot-claimed','http-reserved','http-reserved','run-finished']);
});
async function assertNoRestart(dir,mock){
 const count=mock.calls.length;
 await assert.rejects(()=>runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)}),/one_shot_already_consumed/);
 assert.equal(mock.calls.length,count);
}
test('A: unreadable database after generation reports the last verified reservation, never zero',async t=>{
 const dir=await fixture(t),file=dir+'/disposable.json',read=fs.readFile;let unreadable=false;
 t.mock.method(fs,'readFile',async(p,...args)=>{if(unreadable&&String(p)===file)throw Error('SYNTHETIC_PRIVATE_READ_FAILURE');return read(p,...args);});
 const mock=http(url=>{if(url.endsWith('input_tokens'))return Response.json({object:'response.input_tokens',input_tokens:150});unreadable=true;return Response.json(generation());});
 const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});
 assert.equal(result.status,'BLOCKED');assert.equal(result.reservedNano,660000);assert.equal(result.reservationSource,'last_verified');assert.equal(result.usage,null);assert.equal(result.possibleUnreportedSpend,true);assert.equal(mock.calls.length,2);
 assert(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE_READ_FAILURE'));
 const state=JSON.parse(await read(file,'utf8'));assert.equal(Object.values(state.attempts)[0].reservation_nano,660000);
 const persisted=JSON.parse(await read(dir+'/summary.json','utf8'));assert.equal(persisted.reservedNano,660000);assert.equal(persisted.reservationSource,'last_verified');
 await assertNoRestart(dir,mock);
});
test('B: unreadable database before any checkpoint reports explicit unknown, never assumed zero',async t=>{
 const dir=await fixture(t),file=dir+'/disposable.json',read=fs.readFile;
 t.mock.method(fs,'readFile',async(p,...args)=>{if(String(p)===file)throw Error('SYNTHETIC_PRIVATE_EARLY_READ_FAILURE');return read(p,...args);});
 const mock=http(),result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});
 assert.equal(result.status,'BLOCKED');assert.equal(result.reservedNano,null);assert.equal(result.reservationSource,'unknown');assert.equal(result.possibleUnreportedSpend,false);assert.equal(mock.calls.length,0);
 const persisted=JSON.parse(await read(dir+'/summary.json','utf8'));assert(Object.hasOwn(persisted,'reservedNano'));assert.equal(persisted.reservedNano,null);assert.equal(persisted.reservationSource,'unknown');
 assert(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE_EARLY_READ_FAILURE'));await assertNoRestart(dir,mock);
});
test('C: readable validated database with no attempts reports confirmed zero',async t=>{
 const dir=await fixture(t),file=dir+'/disposable.json',open=syncfs.openSync;
 t.mock.method(console,'error',()=>{});
 t.mock.method(syncfs,'openSync',(p,...args)=>{if(String(p)===file+'.lock')throw Error('SYNTHETIC_LOCK_FAILURE');return open(p,...args);});
 const mock=http(),result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});
 assert.equal(result.status,'BLOCKED');assert.equal(result.reservedNano,0);assert.equal(result.reservationSource,'database');assert.equal(result.possibleUnreportedSpend,false);assert.equal(mock.calls.length,0);
 assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')).attempts,{});await assertNoRestart(dir,mock);
});
test('D: readable valid reserved state is preferred to a checkpoint on generation failure',async t=>{
 const dir=await fixture(t),mock=http(url=>url.endsWith('input_tokens')?Response.json({object:'response.input_tokens',input_tokens:150}):new Response('Private provider failure',{status:500}));
 const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});
 assert.equal(result.status,'BLOCKED');assert.equal(result.reservedNano,660000);assert.equal(result.reservationSource,'database');assert.equal(result.possibleUnreportedSpend,true);assert.equal(mock.calls.length,2);await assertNoRestart(dir,mock);
});
test('malformed readable reservation data falls back to the verified checkpoint',async t=>{
 const dir=await fixture(t),file=dir+'/disposable.json',read=fs.readFile;let malformed=false;
 t.mock.method(fs,'readFile',async(p,...args)=>malformed&&String(p)===file?JSON.stringify({format:2,policy:{budget_nano:660000,max_requests:1,per_minute:1}}):read(p,...args));
 const mock=http(url=>{if(url.endsWith('input_tokens'))return Response.json({object:'response.input_tokens',input_tokens:150});malformed=true;return Response.json(generation());});
 const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});
 assert.equal(result.status,'BLOCKED');assert.equal(result.reservedNano,660000);assert.equal(result.reservationSource,'last_verified');assert.equal(result.possibleUnreportedSpend,true);assert.equal(mock.calls.length,2);await assertNoRestart(dir,mock);
});
test('a readable zero that contradicts a prior reservation cannot silently refund it',async t=>{
 const dir=await fixture(t),file=dir+'/disposable.json',read=fs.readFile;let regressed=false;
 t.mock.method(fs,'readFile',async(p,...args)=>{const text=await read(p,...args);if(regressed&&String(p)===file){const state=JSON.parse(text);state.attempts={};return JSON.stringify(state);}return text;});
 const mock=http(url=>{if(url.endsWith('input_tokens'))return Response.json({object:'response.input_tokens',input_tokens:150});regressed=true;return Response.json(generation());});
 const result=await runOfflineOneShot({directory:dir,fetchImpl:mock.fetch.bind(mock)});
 assert.equal(result.status,'BLOCKED');assert.equal(result.reservedNano,660000);assert.equal(result.reservationSource,'last_verified');assert.equal(mock.calls.length,2);await assertNoRestart(dir,mock);
});
