// SG-P31 Phase 3B: preparation only. CLI defaults to a side-effect-free dry-run.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {loadCorpus,CORPUS_SHA256} from './translation-benchmark.mjs';
import {createLocalDb} from '../node/db.mjs';
import {handleRequest} from '../src/worker.js';
import {createTranslationStore} from '../src/translation-store.js';
import {createTranslationService,TRANSLATION_CONFIG as CONFIG} from '../src/translation-service.js';
import {createOpenAITranslationProvider} from '../src/openai-translation-provider.js';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const LIVE_DIRECTORY=path.join(ROOT,'.local/qa/sg-p31-phase3b-one-shot');
export const OFFLINE_DIRECTORY=path.join(ROOT,'.local/qa/sg-p31-phase3b-one-shot-offline');
const POLICY=Object.freeze({budget_nano:660000,max_requests:1,per_minute:1});
const OFFLINE_SECRET='OFFLINE_ONE_SHOT_SENTINEL_NOT_A_KEY';
class HarnessError extends Error{}
const requireSafe=(ok,category)=>{if(!ok)throw new HarnessError(category);};
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function oneShotPlan(){
 requireSafe(CONFIG.model==='gpt-6-luna'&&CONFIG.processing==='Standard Global'&&CONFIG.promptVersion==='hospitality-v1'&&CONFIG.maxInputTokens===800&&CONFIG.maxOutputTokens===800&&CONFIG.reservationNano===660000&&CONFIG.liveEnabled===false,'configuration_changed');
 const row=(await loadCorpus()).find(row=>row.id==='H08');
 requireSafe(row?.section==='appliances'&&row.lang==='en-GB','fixture_changed');
 return Object.freeze({caseId:'H08',section:'appliances',sourceLanguage:'en-GB',targetLanguage:'de-DE',text:row.text,corpusSha256:CORPUS_SHA256,model:CONFIG.model,processing:CONFIG.processing,promptVersion:CONFIG.promptVersion,inputLimit:800,outputLimit:800,maximumCountingCalls:1,maximumGenerationCalls:1,concurrency:1,retries:0,reservedNano:660000,maximumReservedUsd:0.00066});
}
export function oneShotMode(args){
 requireSafe(args.length===0||args.length===1&&['--dry-run','--live'].includes(args[0]),'unsupported_arguments');
 return args[0]==='--live'?'live':'dry-run';
}
async function prepareDirectory(directory,base){
 directory=path.resolve(directory);const relative=path.relative(base,directory);
 requireSafe(relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative),'unsafe_directory');
 let cursor=ROOT;
 for(const part of path.relative(ROOT,directory).split(path.sep)){
  cursor=path.join(cursor,part);
  try{const stat=await fs.lstat(cursor);requireSafe(stat.isDirectory()&&!stat.isSymbolicLink(),'unsafe_directory');}
  catch(error){if(error.code==='ENOENT'){
    await fs.mkdir(cursor,{mode:0o700});const parent=await fs.open(path.dirname(cursor),constants.O_RDONLY|constants.O_NOFOLLOW);
    try{await parent.sync();}finally{await parent.close();}
   }else throw error;}
 }
 return directory;
}
async function claim(directory,base,execution,plan){
 directory=await prepareDirectory(directory,base);let handle;
 try{handle=await fs.open(path.join(directory,'one-shot.jsonl'),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);}
 catch(error){throw new HarnessError(error.code==='EEXIST'?'one_shot_already_consumed':'guard_unavailable');}
 try{
  await handle.writeFile(JSON.stringify({event:'one-shot-claimed',execution,plan,maximumCountingCalls:1,maximumGenerationCalls:1,reservedNano:660000})+'\n');await handle.sync();
  const parent=await fs.open(directory,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{await parent.sync();}finally{await parent.close();}
 }catch{await handle.close();throw new HarnessError('guard_persistence_failed');}
 return {directory,async record(value){await handle.writeFile(JSON.stringify(value)+'\n');await handle.sync();},close:()=>handle.close()};
}
async function writeExclusive(file,value){
 const handle=await fs.open(file,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();}finally{await handle.close();}
}
// This function is referenced only by the future CLI live branch, never by dry-run/offline tests.
async function readAuthorizedCredential(){
 const file=path.join(ROOT,'.env.local');let handle;
 try{
  handle=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);const stat=await handle.stat();
  requireSafe(stat.isFile()&&(stat.mode&0o777)===0o600&&stat.size<16384,'credential_protection');
  const match=/^OPENAI_API_KEY=(sk-[A-Za-z0-9_-]{20,})\n$/.exec(await handle.readFile('utf8'));
  requireSafe(match,'credential_format');return match[1];
 }catch(error){throw new HarnessError(error instanceof HarnessError?error.message:'credential_unavailable');}
 finally{await handle?.close();}
}
function checkLiveRuntime(){
 requireSafe(!process.env.NODE_OPTIONS&&!process.env.NODE_DEBUG&&!process.env.NODE_DEBUG_NATIVE&&!process.env.SSLKEYLOGFILE&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=='0'&&process.execArgv.length===0,'unsafe_runtime');
}
function verifiedReservation(state){
 requireSafe(state?.format===2&&isDeepStrictEqual(state.policy,POLICY)&&state.attempts&&typeof state.attempts==='object'&&!Array.isArray(state.attempts),'invalid_reservation_state');
 const attempts=Object.values(state.attempts);
 requireSafe(attempts.length<=1&&attempts.every(a=>a&&Number.isSafeInteger(a.reservation_nano)&&a.reservation_nano===660000&&a.provider_mode==='openai'),'invalid_reservation_state');
 return attempts.reduce((sum,a)=>sum+a.reservation_nano,0);
}
async function execute({directory,base,execution,fetchImpl,getCredential,preflight=()=>{}}){
 const plan=await oneShotPlan();
 const journal=await claim(directory,base,execution,plan);directory=journal.directory;
 const file=path.join(directory,'disposable.json');
 const counters={countingCalls:0,generationCalls:0,blockedHttpAttempts:0},transportCalls={count:0,generate:0};let active=0,secret,summary,dbCreated=false,lastVerifiedReservation=null;
 try{
  preflight();
  // Fresh exclusive file; never load another database or reset a previous run.
  await writeExclusive(file,{format:2,guides:{},sources:{},translations:{},attempts:{},policy:POLICY});dbCreated=true;
  const db=createLocalDb(file);
  secret=await getCredential();
  const wrappedFetch=async(url,options)=>{
   const kind=url==='https://api.openai.com/v1/responses/input_tokens'?'count':url==='https://api.openai.com/v1/responses'?'generate':null;
   const field=kind==='count'?'countingCalls':'generationCalls';
   if(!kind||active||counters[field]>=1||kind==='generate'&&counters.countingCalls!==1){counters.blockedHttpAttempts++;throw new HarnessError('request_limit');}
   const body=JSON.parse(options.body),input=JSON.parse(body.input);
   requireSafe(body.model===plan.model&&body.instructions===CONFIG.instructions&&isDeepStrictEqual(body.tools,[])&&isDeepStrictEqual(body.reasoning,{effort:'none'})&&options.method==='POST'&&options.redirect==='error','unapproved_request');
   requireSafe(isDeepStrictEqual(input,{sourceLanguage:plan.sourceLanguage,targetLanguage:plan.targetLanguage,fields:{appliances:plan.text},protectedStrings:['START','RESET','90','HOT']}),'unapproved_payload');
   if(kind==='generate')requireSafe(body.max_output_tokens===800&&body.service_tier==='default'&&body.store===false&&body.stream===false&&body.truncation==='disabled','unapproved_generation');
   counters[field]++;active++;
   try{
    const state=JSON.parse(await fs.readFile(file,'utf8')),attempts=Object.values(state.attempts);
    requireSafe(isDeepStrictEqual(state.policy,POLICY)&&attempts.length===1&&attempts[0].reservation_nano===660000&&attempts[0].provider_mode==='openai','reservation_missing');
    lastVerifiedReservation=verifiedReservation(state);
    await journal.record({event:'http-reserved',kind,...counters,requestSha256:createHash('sha256').update(options.body).digest('hex')});
    requireSafe(!options.signal?.aborted&&Date.now()<attempts[0].lease_until,'request_deadline');
    transportCalls[kind]++;return await fetchImpl(url,options);
   }finally{active--;}
  };
  const provider=createOpenAITranslationProvider({enabled:true,keyProvider:()=>secret,fetchImpl:wrappedFetch});
  const env={DB:db,TRANSLATION_PROVIDER:provider}; // Isolated request context, not normal application enablement.
  const request=(pathname,method='GET',body,token)=>new Request('https://one-shot.invalid'+pathname,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  const created=await handleRequest(request('/api/guides','POST',{property_name:'SG-P31 H08 Synthetic Review',appliances:plan.text}),env);
  requireSafe(created.status===201,'fixture_creation_failed');const {id,token}=await created.json();
  const body={section:plan.section,sourceLanguage:plan.sourceLanguage,targetLanguage:plan.targetLanguage};
  const endpoint='/api/guides/'+id+'/translations';
  // Compatibility for synthetic OFFLINE callers only. The consumed live path is unchanged.
  if(execution==='offline-mock'){
   const declared=await handleRequest(request('/api/guides/'+id+'/translation-sources/'+plan.section,'PATCH',{sourceLanguage:plan.sourceLanguage,expectedSourceVersion:1},token),env);
   requireSafe(declared.status===200,'offline_declaration_failed');
   body.expectedSourceVersion=(await declared.json()).sourceVersion;
  }
  const generated=await handleRequest(request(endpoint,'POST',body,token),env);const result=await generated.json();
  requireSafe(generated.status===200&&result.status==='translated'&&result.providerMode==='openai','generation_failed');
  const text=result.fields?.appliances;
  requireSafe(typeof text==='string'&&text!==plan.text&&['START','RESET','90','HOT'].every(value=>text.includes(value))&&!text.includes(secret),'invalid_translation');
  // A reopened adapter and default-disabled provider verify saved state, not an in-process result.
  const reopened=createLocalDb(file),reader=createTranslationService({store:createTranslationStore(reopened),provider:createOpenAITranslationProvider()});
  for(let i=0;i<3;i++){
   const saved=await reader.view(id,plan.section,plan.targetLanguage);requireSafe(saved.status==='translated'&&saved.providerMode==='openai'&&isDeepStrictEqual(saved.fields,result.fields),'persistence_failed');
   const cached=await handleRequest(request(endpoint,'POST',body,token),env);requireSafe(cached.status===200&&isDeepStrictEqual((await cached.json()).fields,result.fields),'cache_failed');
   const page=await handleRequest(request('/g/'+id+'?lang='+plan.targetLanguage),{DB:reopened});const html=await page.text();
   requireSafe(page.status===200&&html.includes(escape(text))&&html.includes('lang="de-DE"')&&!html.includes(secret)&&!html.includes(token),'guest_projection_failed');
  }
  const state=JSON.parse(await fs.readFile(file,'utf8')),attempts=Object.values(state.attempts),entries=Object.values(state.translations),usage=JSON.parse(attempts[0]?.usage_json??'null');
  requireSafe(isDeepStrictEqual(state.policy,POLICY)&&attempts.length===1&&attempts[0].reservation_nano===660000&&attempts[0].status==='completed'&&entries.length===1&&entries[0].provider_mode==='openai'&&entries[0].status==='ready','ledger_failed');
  requireSafe(usage&&usage.inputTokens>0&&usage.inputTokens<=800&&usage.outputTokens>0&&usage.outputTokens<=800&&usage.reasoningTokens===0&&attempts[0].cost_nano===usage.conservativeNano&&usage.conservativeNano<=660000,'usage_failed');
  requireSafe(counters.countingCalls===1&&counters.generationCalls===1&&counters.blockedHttpAttempts===0,'request_totals_failed');
  summary={status:'SUCCESS',execution,plan,realTransportAttempted:execution==='authorized-live',transportCalls,...counters,providerMode:'openai',caseId:plan.caseId,targetLanguage:plan.targetLanguage,reservedNano:660000,reservationSource:'database',usage,fields:result.fields,persistenceVerified:true,cacheReuseVerified:true,guestVerified:true,humanReview:'PENDING HUMAN REVIEW',retryAuthorized:false};
 }catch(error){
  let reservedNano=lastVerifiedReservation,reservationSource=lastVerifiedReservation===null?'unknown':'last_verified',usage=null;
  try{
   requireSafe(dbCreated,'database_not_created');const state=JSON.parse(await fs.readFile(file,'utf8'));
   const current=verifiedReservation(state);
   // Reservations are never refunded/reset: a smaller total contradicts the checkpoint.
   requireSafe(lastVerifiedReservation===null||current>=lastVerifiedReservation,'reservation_regressed');
   reservedNano=current;reservationSource='database';
   // Usage failure must not erase independently verified reservation information.
   try{usage=JSON.parse(Object.values(state.attempts)[0]?.usage_json??'null');}catch{}
  }catch{}
  summary={status:'BLOCKED',execution,plan,realTransportAttempted:execution==='authorized-live'&&(transportCalls.count+transportCalls.generate>0),transportCalls,...counters,reservedNano,reservationSource,usage,possibleUnreportedSpend:transportCalls.generate>0&&!usage,category:error instanceof HarnessError?error.message:'verification_or_io_failure',retryAuthorized:false};
 }finally{
  try{await journal.record({event:'run-finished',summary});await writeExclusive(path.join(directory,'summary.json'),summary);}
  finally{secret=undefined;await journal.close();}
 }
 return summary;
}
export async function runOfflineOneShot({directory,fetchImpl}){
 requireSafe(typeof fetchImpl==='function'&&fetchImpl!==globalThis.fetch,'mock_transport_required');
 return execute({directory,base:OFFLINE_DIRECTORY,execution:'offline-mock',fetchImpl,getCredential:()=>OFFLINE_SECRET});
}
export async function runOneShot(args=[]){
 const mode=oneShotMode(args),plan=await oneShotPlan();
 if(mode==='dry-run')return {mode,networkCalls:0,credentialRead:false,guardClaimed:false,plan};
 return execute({directory:LIVE_DIRECTORY,base:LIVE_DIRECTORY,execution:'authorized-live',fetchImpl:globalThis.fetch,getCredential:readAuthorizedCredential,preflight:checkLiveRuntime});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await runOneShot(process.argv.slice(2));console.log(JSON.stringify(result,null,2));if(result.status&&result.status!=='SUCCESS')process.exitCode=1;}
 catch(error){console.error(JSON.stringify({status:'BLOCKED',category:error instanceof HarnessError?error.message:'harness_unavailable',retryAuthorized:false}));process.exitCode=1;}
}
