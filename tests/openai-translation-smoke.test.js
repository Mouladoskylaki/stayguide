import {test} from 'node:test';
import https from 'node:https';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import {loadCorpus,CORPUS_SHA256} from '../scripts/translation-benchmark.mjs';
import {MODEL,MAX_INPUT,MAX_OUTPUT,MAX_CALLS,makePlan,validatePlan,modeFromArgs,newState,
  beforeCount,beforeGeneration,reserveCost,countFromResponse,usageFromResponse,translationFromResponse,
  executePlan,runSmoke,claimJournal,QA_DIR,SmokeError,transport,TIMEOUT_MS} from '../scripts/openai-translation-smoke.mjs';
const rows=await loadCorpus(),plan=makePlan(rows),copy=value=>JSON.parse(JSON.stringify(value));
const fakeSecret='OFFLINE_SENTINEL_NOT_A_CREDENTIAL';
function generated({input=100,output=40,text='Synthetic output',...extra}={}){
 return {model:MODEL,status:'completed',service_tier:'default',error:null,incomplete_details:null,
  output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text}]}],
  usage:{input_tokens:input,output_tokens:output,total_tokens:input+output,
   input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}},...extra};
}
function mockIO(override){
 const events=[],calls=[];
 return {events,calls,secret:fakeSecret,async persist(value){events.push(copy(value));},async call(kind,body){
  calls.push({kind,body:copy(body)});
  if(override)return override(kind,body,calls.length);
  return {latencyMs:10,data:kind==='count'?{object:'response.input_tokens',input_tokens:100}:generated()};
 }};
}
test('subset is exactly eight frozen-manifest OpenAI jobs with approved directions',()=>{
 assert.equal(plan.corpusSha256,CORPUS_SHA256);assert.equal(plan.jobs.length,8);
 assert.equal(new Set(plan.jobs.map(j=>j.jobId)).size,8);
 assert.deepEqual(plan.jobs.map(j=>[j.caseId,j.targetLanguage]),[['H02','el-GR'],['H03','de-DE'],['H04','el-GR'],['H05','de-DE'],['H07','el-GR'],['H08','de-DE'],['H21','en-GB'],['H23','de-DE']]);
 assert.ok(plan.jobs.every(j=>j.model===MODEL&&[...j.sourceText].length<=1200));
 assert.equal(plan.jobs[0].generation.service_tier,'default');assert.equal(plan.jobs[0].generation.store,false);
 assert.equal(plan.jobs[0].generation.max_output_tokens,800);assert.equal(plan.jobs[0].generation.reasoning.effort,'none');
 assert.equal(plan.worstCaseReservationUsd,0.00528);
});
test('counted token-bearing fields are immutable and identical to generation payload',()=>{
 for(const job of plan.jobs){for(const key of ['model','input','instructions','reasoning','tools'])assert.deepEqual(job.counted[key],job.generation[key]);
  assert.ok(Object.isFrozen(job.counted));assert.throws(()=>job.generation.model='another');}
 const changed=copy(plan);changed.jobs[0].sourceText='Other';assert.throws(()=>validatePlan(changed,rows),/plan_changed/);
});
test('dry-run defaults refuse arbitrary model/url/provider/corpus arguments',()=>{
 assert.equal(modeFromArgs([]),'dry-run');assert.equal(modeFromArgs(['--dry-run']),'dry-run');assert.equal(modeFromArgs(['--live']),'live');
 for(const args of [['--model','other'],['--url','https://example.com'],['--corpus','elsewhere'],['--live','--retry']])assert.throws(()=>modeFromArgs(args),/unsupported_arguments/);
});
test('budget guard and category-specific request counters reject all excess',()=>{
 assert.equal(MAX_CALLS,8);assert.equal(MAX_INPUT,800);assert.equal(MAX_OUTPUT,800);
 assert.throws(()=>newState(100000001),/budget_limit/);assert.throws(()=>reserveCost(801),/input_limit/);
 const state=newState();for(let i=0;i<8;i++){beforeCount(state);beforeGeneration(state,800);}
 assert.throws(()=>beforeCount(state),/count_request_limit/);assert.throws(()=>beforeGeneration(state,800),/generation_request_limit/);
 assert.throws(()=>beforeGeneration(newState(1),100),/budget_exhausted/);assert.equal(state.reservedNanousd,5280000);
});
test('count endpoint demands authoritative object and integer token count',()=>{
 assert.equal(countFromResponse({object:'response.input_tokens',input_tokens:100}),100);
 for(const data of [null,{}, {object:'response.input_tokens',input_tokens:'100'}, {object:'response.input_tokens',input_tokens:0}])assert.throws(()=>countFromResponse(data),/invalid_count/);
});
test('reported usage covers reasoning/cached/write tokens without double counting',()=>{
 const data=generated();data.usage.input_tokens_details={cached_tokens:20,cache_write_tokens:10};
 data.usage.output_tokens_details.reasoning_tokens=5;const u=usageFromResponse(data,100);
 assert.equal(u.inputTokens,100);assert.equal(u.reasoningTokens,5);assert.equal(u.estimatedStandardNanousd,29700);
 assert.equal(u.estimatedConservativeNanousd,32670);
 delete data.usage.input_tokens_details.cache_write_tokens;
 assert.equal(usageFromResponse(data,100).estimatedStandardNanousd,40200);
});
for(const [name,mutate] of [['missing',r=>delete r.usage],['mismatched count',r=>r.usage.input_tokens=101],
 ['too much output',r=>r.usage.output_tokens=801],['bad total',r=>r.usage.total_tokens=1],
 ['missing reasoning',r=>delete r.usage.output_tokens_details],['impossible cache',r=>r.usage.input_tokens_details.cached_tokens=200]]){
 test('inconsistent usage rejected: '+name,()=>{const data=generated();mutate(data);assert.throws(()=>usageFromResponse(data,100),/invalid_usage/);});
}
test('sequential run counts once immediately before generation with write-ahead reservations',async()=>{
 const io=mockIO(),state=await executePlan(plan,rows,io);
 assert.equal(state.status,'SUCCESS');assert.equal(state.countingCalls,8);assert.equal(state.generationCalls,8);
 assert.equal(state.inputTokens,800);assert.equal(state.outputTokens,320);assert.equal(state.countingLatencyMs,80);
 assert.equal(state.generationLatencyMs,80);assert.equal(state.humanReview,'PENDING HUMAN REVIEW');
 assert.deepEqual(io.calls.map(c=>c.kind),Array(8).fill(['count','generate']).flat());
 for(let i=0;i<8;i++)for(const key of ['model','instructions','input','reasoning','tools'])assert.deepEqual(io.calls[2*i].body[key],io.calls[2*i+1].body[key]);
 assert.equal(io.events.filter(e=>e.event==='generation-reserved').length,8);
 assert.ok(io.events.filter(e=>e.event==='generation-reserved').every(e=>e.state.reservedNanousd>0));
});
test('over-limit counted input skips safely without changing prompt or adding jobs',async()=>{
 const io=mockIO((kind)=>({latencyMs:1,data:kind==='count'?{object:'response.input_tokens',input_tokens:801}:generated()}));
 const state=await executePlan(plan,rows,io);assert.equal(state.countingCalls,8);assert.equal(state.generationCalls,0);
 assert.ok(state.jobs.every(j=>j.status==='skipped-input-limit'));assert.equal(state.reservedNanousd,0);
});
test('count errors or ambiguous data stop with zero generation and no automatic retries',async()=>{
 for(const call of [()=>{throw new SmokeError('authentication');},()=>({latencyMs:1,data:{}})]){
  const io=mockIO(call),state=await executePlan(plan,rows,io);assert.equal(state.status,'BLOCKED');
  assert.equal(state.countingCalls,1);assert.equal(state.generationCalls,0);assert.equal(io.calls.length,1);
 }
});
test('budget exhaustion stops after counting and before any charged request',async()=>{
 const io=mockIO(),state=await executePlan(plan,rows,io,newState(1));
 assert.equal(state.errorCategory,'budget_exhausted');assert.equal(state.generationCalls,0);assert.equal(io.calls.length,1);
});
for(const category of ['authentication','project_access','model_or_endpoint_unavailable','billing_or_rate_limit','request_timeout']){
 test('generation stops once on '+category,async()=>{
  const io=mockIO(kind=>{if(kind==='count')return {latencyMs:1,data:{object:'response.input_tokens',input_tokens:100}};throw new SmokeError(category);});
  const state=await executePlan(plan,rows,io);assert.equal(state.countingCalls,1);assert.equal(state.generationCalls,1);
  assert.equal(state.errorCategory,category);assert.equal(state.possibleUnreportedSpend,true);assert.ok(state.reservedNanousd>0);
 });
}
test('missing generation usage stops and preserves uncertain worst-case reservation',async()=>{
 const io=mockIO(kind=>({latencyMs:1,data:kind==='count'?{object:'response.input_tokens',input_tokens:100}:generated({usage:null})}));
 const state=await executePlan(plan,rows,io);assert.equal(state.errorCategory,'invalid_usage');assert.equal(io.calls.length,2);
 assert.equal(state.possibleUnreportedSpend,true);assert.equal(state.inputTokens,0);
});
test('secret echoes and unknown raw exceptions never reach persisted output',async()=>{
 assert.throws(()=>translationFromResponse(generated({text:fakeSecret}),fakeSecret),/secret_output_rejected/);
 const io=mockIO(kind=>{if(kind==='count')return {latencyMs:1,data:{object:'response.input_tokens',input_tokens:100}};throw Error(fakeSecret);});
 const state=await executePlan(plan,rows,io);assert.equal(state.errorCategory,'transport_or_io_failure');
 assert.ok(!JSON.stringify(io.events).includes(fakeSecret));
 const secretIO=mockIO(kind=>({latencyMs:1,data:kind==='count'?{object:'response.input_tokens',input_tokens:100}:generated({text:fakeSecret})}));
 await executePlan(plan,rows,secretIO);assert.ok(!JSON.stringify(secretIO.events).includes(fakeSecret));
});
test('unexpected returned model/tier/refusal are rejected while valid usage remains recorded',async()=>{
 for(const extra of [{model:'other'},{service_tier:'priority'},{status:'incomplete'}]){
  const io=mockIO(kind=>({latencyMs:1,data:kind==='count'?{object:'response.input_tokens',input_tokens:100}:generated(extra)}));
  const state=await executePlan(plan,rows,io);assert.equal(state.errorCategory,'unexpected_response');assert.equal(state.inputTokens,100);
  assert.equal(state.countingCalls,1);assert.equal(state.generationCalls,1);
 }
});
test('dry-run performs no network request and does not read the credential',async()=>{
 const https=(await import('node:https')).default,oldRequest=https.request,oldRead=fs.readFile,oldOpen=fs.open,oldFetch=globalThis.fetch;
 let attempts=0;const deny=()=>{attempts++;throw Error('Forbidden operation');};
 try{
  https.request=deny;globalThis.fetch=deny;
  fs.open=async(...args)=>{assert.ok(!String(args[0]).includes('.env.local'));return oldOpen(...args);};
  fs.readFile=async(...args)=>{assert.ok(!String(args[0]).includes('.env.local'));return oldRead(...args);};
  syncBuiltinESMExports();const result=await runSmoke([]);
  assert.equal(result.networkCalls,0);assert.equal(result.credentialRead,false);assert.equal(attempts,0);
 }finally{https.request=oldRequest;globalThis.fetch=oldFetch;fs.readFile=oldRead;fs.open=oldOpen;syncBuiltinESMExports();}
});
test('durable one-shot journal refuses a second claim without permitting repeat calls',async()=>{
 const directory=QA_DIR+'/offline-tests/claim-'+Date.now();const first=await claimJournal(directory);
 await first.persist({event:'test-only',simulated:true});await first.close();
 await assert.rejects(()=>claimJournal(directory),/one_shot_already_claimed/);
 const contents=await fs.readFile(directory+'/one-shot.jsonl','utf8');assert.equal(contents.trim().split('\n').length,2);
 assert.ok(!contents.includes(fakeSecret));
});

// Exercise the actual HTTP implementation with an in-memory request/response and clock.
// Every request is intercepted; no credential or socket is used.
function httpHarness(t,status=200){
 const request=new EventEmitter(),response=new EventEmitter();
 let receive,tick,cleared=0,calls=0,requestDestroyed=0,responseDestroyed=0;
 request.destroy=()=>{requestDestroyed++;request.emit('error',Error('offline cleanup'));};
 response.destroy=()=>{responseDestroyed++;response.emit('error',Error('offline cleanup'));response.emit('close');};
 request.end=()=>{};response.statusCode=status;
 t.mock.method(https,'request',(options,callback)=>{
  calls++;assert.equal(options.hostname,'api.openai.com');assert.equal(options.port,443);
  assert.equal(options.path,'/v1/responses/input_tokens');receive=callback;return request;
 });
 t.mock.method(globalThis,'setTimeout',(callback,ms)=>{assert.equal(ms,TIMEOUT_MS);tick=callback;return 'offline-timer';});
 t.mock.method(globalThis,'clearTimeout',timer=>{assert.equal(timer,'offline-timer');cleared++;});
 return {request,response,headers:()=>receive(response),timeout:()=>tick(),
  get counts(){return {calls,cleared,requestDestroyed,responseDestroyed};}};
}
for(const [status,category] of [[401,'authentication'],[429,'billing_or_rate_limit'],[500,'provider_server_error']]){
 test('actual HTTP transport safely closes '+status+' without retry',async t=>{
  const h=httpHarness(t,status),pending=transport(fakeSecret)('count',{});
  const rejected=assert.rejects(pending,error=>error instanceof SmokeError&&error.category===category);
  h.headers();await rejected;
  assert.deepEqual(h.counts,{calls:1,cleared:1,requestDestroyed:1,responseDestroyed:1});
  assert.doesNotThrow(()=>{h.response.emit('error',Error(fakeSecret));h.request.emit('error',Error(fakeSecret));h.timeout();});
  assert.equal(h.counts.cleared,1);
 });
}
test('stalled non-200 response is terminated without waiting for body/end',async t=>{
 const h=httpHarness(t,401),pending=transport(fakeSecret)('count',{});
 const rejected=assert.rejects(pending,/authentication/);h.headers();await rejected;
 assert.equal(h.counts.responseDestroyed,1);assert.equal(h.counts.requestDestroyed,1);
});
test('timeout before headers destroys connection and safely handles late non-200 errors',async t=>{
 const h=httpHarness(t,429),pending=transport(fakeSecret)('count',{});
 const rejected=assert.rejects(pending,/request_timeout/);h.timeout();h.headers();
 h.response.emit('error',Error('late offline response'));await rejected;
 assert.deepEqual(h.counts,{calls:1,cleared:1,requestDestroyed:1,responseDestroyed:1});
});
test('timeout during response cleans both streams and wins subsequent end/error races',async t=>{
 const h=httpHarness(t),pending=transport(fakeSecret)('count',{});
 const rejected=assert.rejects(pending,/request_timeout/);h.headers();h.timeout();
 h.response.emit('end');h.response.emit('error',Error('late'));await rejected;
 assert.deepEqual(h.counts,{calls:1,cleared:1,requestDestroyed:1,responseDestroyed:1});
});
test('successful actual HTTP parsing clears timeout once and ignores late timeout',async t=>{
 const h=httpHarness(t),pending=transport(fakeSecret)('count',{});h.headers();
 h.response.emit('data',Buffer.from('{"input_tokens":100}'));h.response.emit('end');h.response.emit('close');h.timeout();
 assert.deepEqual((await pending).data,{input_tokens:100});
 assert.deepEqual(h.counts,{calls:1,cleared:1,requestDestroyed:0,responseDestroyed:0});
});
for(const failure of ['error','aborted','close','oversized','malformed']){
 test('actual HTTP '+failure+' fails safely with connection cleanup',async t=>{
  const h=httpHarness(t),pending=transport(fakeSecret)('count',{});
  const rejected=assert.rejects(pending,new RegExp(failure==='malformed'?'malformed_json':'response_transport_failure'));
  h.headers();
  if(failure==='oversized')h.response.emit('data',Buffer.alloc(262145));
  else if(failure==='malformed'){h.response.emit('data',Buffer.from('invalid'));h.response.emit('end');}
  else h.response.emit(failure,Error(fakeSecret));
  await rejected;assert.deepEqual(h.counts,{calls:1,cleared:1,requestDestroyed:1,responseDestroyed:1});
 });
}
test('actual HTTP request errors are sanitized and never retried',async t=>{
 const h=httpHarness(t),pending=transport(fakeSecret)('count',{});
 const rejected=assert.rejects(pending,error=>error.category==='request_transport_failure'&&!error.message.includes(fakeSecret));
 h.request.emit('error',Error(fakeSecret));await rejected;
 assert.deepEqual(h.counts,{calls:1,cleared:1,requestDestroyed:1,responseDestroyed:0});
});
// Virtual filesystem proves containment without touching the retained live journal.
function journalFilesystem(t,{symlink}={}){
 const opened=[],checked=[];
 t.mock.method(fs,'lstat',async candidate=>{
  checked.push(candidate);return {isDirectory:()=>true,isSymbolicLink:()=>candidate===symlink};
 });
 t.mock.method(fs,'open',async candidate=>{opened.push(candidate);return {writeFile:async()=>{},sync:async()=>{},close:async()=>{}};});
 return {opened,checked};
}
for(const [label,candidate] of [['QA directory',QA_DIR],['contained normalized subdirectory',QA_DIR+'/offline-tests/inner/../valid']]){
 test('journal accepts '+label,async t=>{
  const h=journalFilesystem(t),journal=await claimJournal(candidate);await journal.close();
  assert.deepEqual(h.opened,[path.join(path.resolve(candidate),'one-shot.jsonl')]);
  assert.ok(h.checked.includes(QA_DIR));
 });
}
for(const [label,candidate] of [['traversal',QA_DIR+'/../outside'],['normalized outside',path.resolve(QA_DIR,'../outside')]]){
 test('journal rejects '+label+' before filesystem access',async t=>{
  const h=journalFilesystem(t);await assert.rejects(()=>claimJournal(candidate),/unsafe_output_path/);
  assert.deepEqual(h.checked,[]);assert.deepEqual(h.opened,[]);
 });
}
test('journal rejects a symlink within the normalized QA path',async t=>{
 const h=journalFilesystem(t,{symlink:QA_DIR+'/offline-tests/link'});
 await assert.rejects(()=>claimJournal(QA_DIR+'/offline-tests/link/child'),/unsafe_output_path/);
 assert.deepEqual(h.opened,[]);
});
