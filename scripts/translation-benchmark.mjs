// SG-P31 Phase 2A: synthetic fixtures only. No provider transport or credential access.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const CORPUS_SHA256='d08695f229067cda36a8d1113b97cb243b7914c51e1655c8822622702d9d78fd';
export const LOCALES=Object.freeze(['en-GB','el-GR','de-DE','fr-FR','es-ES','it-IT','ja-JP','zh-Hans','ar']);
export const VARIANTS=Object.freeze([
  {id:'openai-luna',provider:'OpenAI API',model:'gpt-6-luna'},
  {id:'gemini-flash-lite',provider:'Google Gemini Developer API',model:'gemini-3.5-flash-lite'},
  {id:'google-nmt',provider:'Google Cloud Translation',model:'NMT'},
  {id:'google-tllm',provider:'Google Cloud Translation',model:'Translation LLM'},
  {id:'deepl-quality',provider:'DeepL API',model:'quality_optimized'}
].map(Object.freeze));
const root=fileURLToPath(new URL('../',import.meta.url));
const fixtureDir=new URL('../tests/fixtures/translation/',import.meta.url);
export const OUTPUT_DIR=path.join(root,'.local/qa/sg-p31-phase2a');
const fail=message=>{throw new Error(message);};
const clone=value=>JSON.parse(JSON.stringify(value));

export function parseCorpus(bytes){
  if(createHash('sha256').update(bytes).digest('hex')!==CORPUS_SHA256)fail('Frozen corpus integrity mismatch.');
  const rows=bytes.toString('utf8').trimEnd().split('\n').map(line=>JSON.parse(line));
  if(rows.length!==24||new Set(rows.map(row=>row.id)).size!==24)fail('Invalid corpus inventory.');
  for(const row of rows){
    if(!['en-GB','el-GR'].includes(row.lang)||!row.text||!row.must||!Array.isArray(row.keep)||
       row.keep.some(value=>typeof value!=='string'||!row.text.includes(value))||[...row.text].length>1200)fail('Invalid frozen corpus record.');
  }
  return rows;
}
export async function loadCorpus(){return parseCorpus(await fs.readFile(new URL('corpus.jsonl',fixtureDir)));}
// Every public entry rechecks the frozen data; caller-supplied prose cannot enter the run.
function approvedCorpus(rows){
  const bytes=Buffer.from(rows.map(row=>JSON.stringify(row)).join('\n')+'\n');
  parseCorpus(bytes);
}
export function generateManifest(rows){
  approvedCorpus(rows);
  const jobs=[];
  for(const variant of VARIANTS)for(const row of rows)for(const target of LOCALES){
    if(target===row.lang)continue;
    jobs.push({jobId:`${variant.id}:${row.id}:${row.lang}:${target}`,caseId:row.id,
      sourceLanguage:row.lang,targetLanguage:target,section:row.section,
      protectedStrings:[...row.keep],expectedSemanticChecks:[row.must],sourceText:row.text,
      providerVariant:variant.id,provider:variant.provider,model:variant.model});
  }
  return {schemaVersion:1,mode:'offline-mock',corpusSha256:CORPUS_SHA256,sourceLanguages:['en-GB','el-GR'],
    sourceCoverageNotice:'English/Greek sources only; seven other languages are targets, not validated authoring sources.',
    jobsPerVariant:192,totalJobs:960,jobs};
}
export function validateManifest(manifest,rows){
  if(!isDeepStrictEqual(manifest,generateManifest(rows)))fail('Manifest differs from the approved directional matrix.');
  return true;
}
// Stable shuffle: seed 3101, no dates, external randomness or runtime measurements.
export function orderedJobs(manifest){
  let state=3101;
  const jobs=[...manifest.jobs].sort((a,b)=>a.jobId<b.jobId?-1:a.jobId>b.jobId?1:0);
  for(let i=jobs.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;
    const j=state%(i+1);[jobs[i],jobs[j]]=[jobs[j],jobs[i]];}
  return jobs;
}
export function mockResponses(manifest,{exerciseErrors=false}={}){
  const responses=[];
  for(const [index,job] of orderedJobs(manifest).entries()){
    // This is deliberately untranslated source, never a claim of model output quality.
    const response={jobId:job.jobId,simulated:true,status:'ok',output:`[MOCK ONLY — NOT TRANSLATED]\n${job.sourceText}`,error:null};
    if(exerciseErrors){
      if(index%41===0)continue; // missing result
      if(index%41===1)response.output=17; // malformed output
      if(index%41===2){response.status='error';response.output=null;response.error='simulated-unavailable';}
      if(index%41===3&&job.protectedStrings.length)response.output='[MOCK ONLY — PROTECTED STRING OMITTED]';
    }
    responses.push(response);
  }
  return responses;
}
const criteria=['meaningPreservation','negationAndSafety','numbersAndTimes','namesAndAddresses',
  'terminology','naturalLanguageQuality','missingOrInventedInformation'];
export function pendingHumanReview(){return {status:'pending',reviewer:null,
  scores:Object.fromEntries(criteria.map(key=>[key,null])),criticalErrorClassification:null,notes:null};}
const measurements=()=>({provenance:'unavailable-offline',inputTokens:null,outputTokens:null,
  actualBilledCost:null,currency:null,latencyMs:null});

export function evaluateResponses(manifest,rows,responses){
  validateManifest(manifest,rows);
  if(!Array.isArray(responses))fail('Responses must be an array.');
  const allowed=new Set(manifest.jobs.map(job=>job.jobId)),byId=new Map();
  let unrecognizedRecords=0;
  for(const response of responses){
    if(!response||typeof response!=='object'||!allowed.has(response.jobId)){unrecognizedRecords++;continue;}
    const items=byId.get(response.jobId)||[];items.push(response);byId.set(response.jobId,items);
  }
  const results=manifest.jobs.map(job=>{
    const entries=byId.get(job.jobId)||[],findings=[];
    let status='ok',output=null,error=null;
    const response=entries[0];
    if(entries.length===0){status='missing';findings.push('missing-result');}
    else if(entries.length!==1){status='malformed';findings.push('duplicate-result');}
    else if(!isDeepStrictEqual(Object.keys(response).sort(),['error','jobId','output','simulated','status'])||
      response.simulated!==true||!['ok','error'].includes(response.status)||
      (response.status==='ok'&&(typeof response.output!=='string'||!response.output.trim()||response.output.length>20000||response.error!==null))||
      (response.status==='error'&&(response.output!==null||response.error!=='simulated-unavailable'))){
      status='malformed';findings.push('malformed-result');
    }else if(response.status==='error'){status='error';error='simulated-unavailable';findings.push('simulated-provider-error');}
    else output=response.output;
    const missing=output===null?[]:job.protectedStrings.filter(value=>!output.includes(value));
    if(missing.length)findings.push('protected-string-missing');
    return {schemaVersion:1,mode:'offline-mock',simulated:true,jobId:job.jobId,caseId:job.caseId,
      providerVariant:job.providerVariant,provider:job.provider,model:job.model,
      sourceLanguage:job.sourceLanguage,targetLanguage:job.targetLanguage,requestStatus:status,
      translationOutput:output,error,measurements:measurements(),
      automatedValidation:{findings,protectedStrings:{status:output===null?'not-checked':missing.length?'fail':'pass',missing},
        semanticAssessment:'pending-qualified-human-review'},humanReview:pendingHumanReview()};
  });
  const counts={ok:0,error:0,missing:0,malformed:0,protectedStringFailures:0};
  for(const row of results){counts[row.requestStatus]++;if(row.automatedValidation.protectedStrings.status==='fail')counts.protectedStringFailures++;}
  return {schemaVersion:1,mode:'offline-mock',corpusSha256:CORPUS_SHA256,total:results.length,
    counts,unrecognizedRecords,humanReviewStatus:'pending',realTranslationsTested:false,results};
}

export async function loadProposal(){
  const config=JSON.parse(await fs.readFile(new URL('proposed-live.json',fixtureDir),'utf8'));
  const limits={jobsPerVariant:192,maximumRetriesPerJob:1,maximumAttemptsPerVariant:384,
    maximumAttemptsAllVariants:1920,sourceUnicodeCodePointsPerAttempt:1200,generalModelInputTokensPerAttempt:800,
    generalModelBillableOutputTokensPerAttemptIncludingThinking:800,specialistOutputCharactersValidationOnly:2400,
    pricedVariantsUsageCeilingUsd:30,pricedVariantsCombinedStandardEstimateUsd:24.08448,
    includesDeepLCost:false,includesTaxesOrFunding:false};
  if(config.status!=='proposal-only-not-authorized'||config.liveExecutionEnabled!==false||
    !isDeepStrictEqual(config.limits,limits)||!isDeepStrictEqual(config.locales,LOCALES)||
    !isDeepStrictEqual(config.sourceLanguages,['en-GB','el-GR'])||
    !isDeepStrictEqual(config.variants.map(({id,provider,model})=>({id,provider,model})),VARIANTS))fail('Proposal changed approved limits or variants.');
  return config;
}

// Only fixed workspace-local output names are accepted; reject symlink escapes.
async function prepareOutput(){
  let cursor=root;
  for(const name of ['.local','qa','sg-p31-phase2a']){
    cursor=path.join(cursor,name);
    try{const stat=await fs.lstat(cursor);if(stat.isSymbolicLink()||!stat.isDirectory())fail('Unsafe output directory.');}
    catch(error){if(error.code==='ENOENT')await fs.mkdir(cursor);else throw error;}
  }
}
async function writeArtifact(name,data){
  const target=path.join(OUTPUT_DIR,name);
  // Refuse existing symlinks rather than following them; normal files may be refreshed.
  const handle=await fs.open(target,constants.O_WRONLY|constants.O_CREAT|constants.O_TRUNC|constants.O_NOFOLLOW);
  try{await handle.writeFile(JSON.stringify(data,null,2)+'\n');}finally{await handle.close();}
}
export async function runOffline(){
  const rows=await loadCorpus(),manifest=generateManifest(rows);validateManifest(manifest,rows);
  const proposal=await loadProposal();
  const report=evaluateResponses(manifest,rows,mockResponses(manifest,{exerciseErrors:true}));
  const humanTemplate={schemaVersion:1,status:'pending',warning:'Mock source echoes are not translations. No real quality scores exist.',
    rubric:{scale:'0 = unusable/wrong; 1 = major problems; 2 = material corrections needed; 3 = minor corrections; 4 = accurate/clear. Null = not assessed.',critical:'pending, none, critical or unresolved — qualified reviewer only',
      instruction:'Check meaning, negation/safety, quantities/times, entities, terminology, fluency, omissions and inventions; adjudicate with a second bilingual reviewer.'},
    reviews:manifest.jobs.map(job=>({jobId:job.jobId,caseId:job.caseId,sourceLanguage:job.sourceLanguage,
      targetLanguage:job.targetLanguage,expectedSemanticChecks:clone(job.expectedSemanticChecks),...pendingHumanReview()}))};
  await prepareOutput();
  await writeArtifact('manifest.json',manifest);
  await writeArtifact('mock-results.json',report);
  await writeArtifact('human-review-template.json',humanTemplate);
  await writeArtifact('proposed-execution.json',proposal);
  return {outputDirectory:OUTPUT_DIR,totalJobs:manifest.totalJobs,mode:'offline-mock',counts:report.counts,
    unexpectedRecords:report.unrecognizedRecords,realTranslationsTested:false,humanReview:'pending'};
}
export function validateArguments(args){
  if(args.length)fail('Offline benchmark accepts no arguments or live mode.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{validateArguments(process.argv.slice(2));console.log(JSON.stringify(await runOffline(),null,2));}
  catch{console.error('Offline benchmark failed validation or safe artifact writing.');process.exitCode=1;}
}
