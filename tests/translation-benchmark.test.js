import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {CORPUS_SHA256,LOCALES,VARIANTS,loadCorpus,parseCorpus,generateManifest,validateManifest,
  orderedJobs,mockResponses,evaluateResponses,pendingHumanReview,loadProposal,OUTPUT_DIR,runOffline,validateArguments} from '../scripts/translation-benchmark.mjs';
const rows=await loadCorpus(),manifest=generateManifest(rows),copy=value=>JSON.parse(JSON.stringify(value));
const corpusBytes=fs.readFileSync(new URL('./fixtures/translation/corpus.jsonl',import.meta.url));
test('frozen corpus bytes match approved report and 24 unique synthetic records',()=>{
  const report=fs.readFileSync(new URL('../docs/SG_P31_PHASE1_RESEARCH.md',import.meta.url),'utf8');
  assert.equal(corpusBytes.toString(),report.split('```jsonl\n')[1].split('\n```')[0]+'\n');
  assert.equal(crypto.createHash('sha256').update(corpusBytes).digest('hex'),CORPUS_SHA256);
  assert.equal(rows.length,24);assert.equal(new Set(rows.map(row=>row.id)).size,24);
  assert.equal(rows.filter(row=>row.lang==='en-GB').length,20);assert.equal(rows.filter(row=>row.lang==='el-GR').length,4);
});
test('changed corpus bytes or caller prose are rejected before manifest construction',()=>{
  assert.throws(()=>parseCorpus(Buffer.concat([corpusBytes,Buffer.from(' ')])),/integrity/);
  const modified=copy(rows);modified[0].text='Unapproved data';assert.throws(()=>generateManifest(modified),/integrity/);
});
test('exact 192 directional jobs per variant; no duplicate or same-language job',()=>{
  assert.equal(manifest.jobs.length,960);assert.equal(new Set(manifest.jobs.map(job=>job.jobId)).size,960);
  for(const variant of VARIANTS){
    const jobs=manifest.jobs.filter(job=>job.providerVariant===variant.id);assert.equal(jobs.length,192);
    assert.equal(jobs.filter(job=>job.sourceLanguage==='en-GB').length,160);
    assert.equal(jobs.filter(job=>job.sourceLanguage==='el-GR').length,32);
    assert.equal(new Set(jobs.map(job=>job.sourceLanguage+':'+job.targetLanguage)).size,16);
    for(const job of jobs){assert.notEqual(job.sourceLanguage,job.targetLanguage);assert.ok(LOCALES.includes(job.targetLanguage));
      const source=rows.find(row=>row.id===job.caseId);assert.equal(job.section,source.section);
      assert.deepEqual(job.protectedStrings,source.keep);assert.deepEqual(job.expectedSemanticChecks,[source.must]);}
  }
});
for(const [label,change] of [
  ['duplicate',m=>m.jobs[1]=copy(m.jobs[0])],['missing',m=>m.jobs.pop()],
  ['wrong target',m=>m.jobs[0].targetLanguage='en-GB'],['unapproved source',m=>m.jobs[0].sourceLanguage='de-DE'],
  ['provider substitution',m=>m.jobs[0].model='other'],['lost semantic check',m=>m.jobs[0].expectedSemanticChecks=[]]
])test('manifest validation rejects '+label,()=>{
  const modified=copy(manifest);change(modified);assert.throws(()=>validateManifest(modified,rows),/Manifest/);
});
test('seeded order and mock outputs are deterministic without translated-quality claims',()=>{
  assert.deepEqual(orderedJobs(manifest),orderedJobs(manifest));
  assert.notDeepEqual(orderedJobs(manifest).map(j=>j.jobId),manifest.jobs.map(j=>j.jobId));
  assert.deepEqual(mockResponses(manifest),mockResponses(manifest));
  assert.deepEqual(mockResponses(manifest,{exerciseErrors:true}),mockResponses(manifest,{exerciseErrors:true}));
  const report=evaluateResponses(manifest,rows,mockResponses(manifest));
  assert.equal(report.counts.ok,960);assert.equal(report.counts.protectedStringFailures,0);
  assert.equal(report.realTranslationsTested,false);
  assert.ok(report.results.every(row=>row.translationOutput.startsWith('[MOCK ONLY — NOT TRANSLATED]')));
});
test('error exercise detects missing, malformed, simulated errors and protected omissions',()=>{
  const report=evaluateResponses(manifest,rows,mockResponses(manifest,{exerciseErrors:true}));
  for(const key of ['missing','malformed','error','protectedStringFailures'])assert.ok(report.counts[key]>0,key);
  assert.equal(report.unrecognizedRecords,0);assert.equal(report.results.length,960);
});
test('protected string validation preserves exact Unicode identifiers without semantic pass',()=>{
  const responses=mockResponses(manifest),job=manifest.jobs.find(j=>j.caseId==='H22');
  const response=responses.find(r=>r.jobId===job.jobId);response.output=response.output.replace('G-14','G-41');
  const result=evaluateResponses(manifest,rows,responses).results.find(r=>r.jobId===job.jobId);
  assert.deepEqual(result.automatedValidation.protectedStrings.missing,['G-14']);
  assert.equal(result.automatedValidation.semanticAssessment,'pending-qualified-human-review');
});
test('duplicate/unexpected results and unavailable responses are surfaced without raw unknown fields',()=>{
  const responses=mockResponses(manifest);responses.push(copy(responses[0]),{jobId:'unknown',authorization:'DO-NOT-REFLECT'},null);
  const report=evaluateResponses(manifest,rows,responses);
  assert.equal(report.counts.malformed,1);assert.equal(report.unrecognizedRecords,2);
  assert.ok(!JSON.stringify(report).includes('DO-NOT-REFLECT'));
  assert.equal(evaluateResponses(manifest,rows,[]).counts.missing,960);
  assert.throws(()=>evaluateResponses(manifest,rows,null),/array/);
});
for(const [label,change] of [
 ['false measurement',r=>r.inputTokens=42],['missing simulation label',r=>delete r.simulated],
 ['false live result',r=>r.simulated=false],['empty output',r=>r.output=' '],['unknown status',r=>r.status='maybe'],
 ['raw exception',r=>{r.status='error';r.output=null;r.error='DO-NOT-REFLECT';}]
])test('result format rejects '+label,()=>{
 const responses=mockResponses(manifest);change(responses[0]);
 const report=evaluateResponses(manifest,rows,responses);assert.equal(report.counts.malformed,1);
 assert.ok(!JSON.stringify(report).includes('DO-NOT-REFLECT'));
});
test('all measured metrics and human scores remain null even on successful mock rows',()=>{
 const report=evaluateResponses(manifest,rows,mockResponses(manifest));
 for(const row of report.results){assert.equal(row.mode,'offline-mock');assert.equal(row.simulated,true);
  assert.equal(row.measurements.provenance,'unavailable-offline');
  for(const key of ['inputTokens','outputTokens','actualBilledCost','currency','latencyMs'])assert.equal(row.measurements[key],null);
  assert.deepEqual(row.humanReview,pendingHumanReview());assert.ok(Object.values(row.humanReview.scores).every(v=>v===null));}
});
test('proposed limits and regional arithmetic remain unapproved and match Phase 1',async()=>{
 const c=await loadProposal();assert.equal(c.liveExecutionEnabled,false);assert.equal(c.status,'proposal-only-not-authorized');
 assert.equal(c.limits.maximumRetriesPerJob,1);assert.equal(c.limits.maximumAttemptsAllVariants,1920);
 assert.equal(c.limits.pricedVariantsUsageCeilingUsd,30);assert.equal(c.limits.specialistOutputCharactersValidationOnly,2400);
 assert.equal(c.variants.at(-1).usageEstimateUsd,null);
 assert.equal(c.variants.slice(0,4).reduce((sum,v)=>sum+Math.round(v.usageEstimateUsd*1e6),0),24084480);
 assert.equal(Math.round(c.variants[0].usageEstimateUsd*1.1*1e6),202752);
 assert.equal(Math.round(c.optionalOpenAIRegionalScenario.combinedPricedEstimateUsd*1e6),24102912);
});
test('harness imports only audited built-ins and has no network/credential/environment transport',()=>{
 const source=fs.readFileSync(new URL('../scripts/translation-benchmark.mjs',import.meta.url),'utf8');
 const imports=[...source.matchAll(/from '([^']+)'/g)].map(match=>match[1]);
 assert.deepEqual(imports,['node:fs/promises','node:fs','node:crypto','node:util','node:url','node:path']);
 assert.ok(!/\bfetch\s*\(|\bimport\s*\(|process\.env|https?:\/\/|\.env\b|Authorization/.test(source));
});
test('complete offline run traps network, DNS and subprocess primitives and repeats byte-for-byte',async()=>{
 let attempts=0;const patches=[];
 const deny=()=>{attempts++;throw Error('Network or child execution attempted');};
 const patch=(object,key)=>{patches.push([object,key,object[key],Object.hasOwn(object,key)]);object[key]=deny;};
 try{
  patch(globalThis,'fetch');patch(globalThis,'WebSocket');
  for(const name of ['http','https','http2','net','tls','dgram','dns','child_process']){
   const m=(await import('node:'+name)).default;
   for(const key of ['request','get','connect','createConnection','createSocket','lookup','resolve','spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])if(typeof m[key]==='function')patch(m,key);
   if(m.Socket?.prototype?.connect)patch(m.Socket.prototype,'connect');
   if(name==='dns')for(const key of Object.keys(m.promises))if(typeof m.promises[key]==='function')patch(m.promises,key);
  }
  syncBuiltinESMExports();
  const first=await runOffline();
  const artifacts=['manifest.json','mock-results.json','human-review-template.json','proposed-execution.json'];
  const bytes=artifacts.map(name=>fs.readFileSync(OUTPUT_DIR+'/'+name));
  const second=await runOffline();assert.equal(attempts,0);assert.deepEqual(first,second);assert.equal(first.totalJobs,960);
  for(const [index,name] of artifacts.entries())assert.deepEqual(fs.readFileSync(OUTPUT_DIR+'/'+name),bytes[index]);
  const review=JSON.parse(fs.readFileSync(OUTPUT_DIR+'/human-review-template.json','utf8'));
  assert.equal(review.status,'pending');assert.equal(review.reviews.length,960);
  assert.ok(review.reviews.every(r=>Object.values(r.scores).every(v=>v===null)&&r.criticalErrorClassification===null));
 }finally{
  for(const [object,key,original,existed] of patches.reverse()){if(existed)object[key]=original;else delete object[key];}
  syncBuiltinESMExports();
 }
});
test('argument validation refuses live mode and arbitrary input/output flags',()=>{
 assert.doesNotThrow(()=>validateArguments([]));
 for(const args of [['--live'],['--input','private-file'],['--output','elsewhere']])assert.throws(()=>validateArguments(args),/accepts no arguments/);
});
