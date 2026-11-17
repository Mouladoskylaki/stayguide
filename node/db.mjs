// File-backed D1-compatible adapter used ONLY for local development and tests.
import fs from 'node:fs';
import path from 'node:path';
import {TRANSLATION_SQL} from '../src/translation-store.js';
import {TRANSLATABLE_SECTIONS} from '../src/translation-service.js';
const clone=value=>structuredClone(value);
const sourceKey=(id,section)=>JSON.stringify([id,section]);
const entryKey=a=>JSON.stringify([a.guide_id,a.section,a.source_language,a.target_language,a.source_version,a.model,a.prompt_version]);
export function createLocalDb(file=null){
 let state;
 function load(){
  if(file&&fs.existsSync(file)){
   try{const data=JSON.parse(fs.readFileSync(file,'utf8'));state=data.format===2?data:{format:2,guides:data};}
   catch{throw Error('Local DB file could not be read');}
  }
  state??={format:2,guides:{}};
  state.sources??={};state.translations??={};state.attempts??={};
  state.policy??={budget_nano:100000000,max_requests:8,per_minute:4};
  for(const row of Object.values(state.guides))syncSources(row);
 }
 function syncSources(row){
  const guide=JSON.parse(row.content_json);
  for(const [section,keys] of Object.entries(TRANSLATABLE_SECTIONS)){
   const key=sourceKey(row.id,section),text=JSON.stringify(Object.fromEntries(keys.map(k=>[k,guide[k]??'']))),old=state.sources[key];
   if(!old)state.sources[key]={guide_id:row.id,section,source_text:text,source_language:null,source_version:1};
   else if(old.source_text!==text){old.source_text=text;old.source_version++;invalidate(row.id,section);}
  }
 }
 function invalidate(id,section){for(const t of Object.values(state.translations))if(t.guide_id===id&&t.section===section)t.status='stale';}
 function persist(){
  if(!file)return;
  const temporary=file+'.tmp';let handle;
  try{handle=fs.openSync(temporary,'w',0o600);fs.writeFileSync(handle,JSON.stringify(state));fs.fsyncSync(handle);fs.closeSync(handle);handle=null;fs.renameSync(temporary,file);}
  finally{if(handle!==undefined&&handle!==null)fs.closeSync(handle);}
 }
 function current(t){const s=state.sources[sourceKey(t.guide_id,t.section)];return s&&s.source_version===t.source_version&&s.source_language===t.source_language;}
 function execute(sql,p,read=false){
  const operation=Object.keys(TRANSLATION_SQL).find(k=>TRANSLATION_SQL[k]===sql);
  if(operation){
   const [id,section]=p,s=state.sources[sourceKey(id,section)];
   if(operation==='source')return clone(s??null);
   if(operation==='cached')return clone(Object.values(state.translations).find(t=>t.guide_id===id&&t.section===section&&t.target_language===p[2]&&t.model===p[3]&&t.prompt_version===p[4]&&t.status==='ready'&&current(t))??null);
   if(operation==='language'){
    if(!s||s.source_language===p[2])return 0;s.source_language=p[2];s.source_version++;invalidate(id,section);return 1;
   }
   if(operation==='claim'){
    const a=Object.fromEntries(['claim_id','guide_id','section','source_language','target_language','source_version','model','prompt_version','created_ms','lease_until','reservation_nano'].map((k,i)=>[k,p[i]]));
    const source=state.sources[sourceKey(a.guide_id,a.section)],attempts=Object.values(state.attempts),policy=state.policy,old=state.translations[entryKey(a)];
    if(!source||!current(a)||a.lease_until<=a.created_ms||a.reservation_nano<=0||attempts.length>=policy.max_requests||attempts.reduce((n,x)=>n+x.reservation_nano,0)+a.reservation_nano>policy.budget_nano||attempts.filter(x=>x.created_ms>=a.created_ms-60000).length>=policy.per_minute||old&&(old.status==='ready'||old.status==='pending'&&old.lease_until>a.created_ms))return 0;
    if(state.attempts[a.claim_id])throw Error('Duplicate claim');
    state.attempts[a.claim_id]={...a,status:'reserved'};
    const {created_ms,reservation_nano,...entry}=a;
    state.translations[entryKey(a)]={...entry,provider_mode:'mock',translated_text:null,status:'pending',origin:'generated'};return 1;
   }
   const t=Object.values(state.translations).find(t=>t.claim_id===id);if(!t)return 0;
   if(operation==='publish'){
    if(t.status!=='pending'||t.lease_until<=p[3]||!current(t))return 0;
    t.translated_text=p[1];t.status='ready';t.origin=p[2];state.attempts[id].status='completed';return 1;
   }
   if(operation==='fail'){if(t.status!=='pending')return 0;t.status='failed';state.attempts[id].status='failed';return 1;}
   if(operation==='manual'){
    if(t.status!=='ready'||!current(t)||t.source_version!==p[2]||t.guide_id!==p[3]||t.section!==p[4]||t.target_language!==p[5]||t.model!==p[6]||t.prompt_version!==p[7]||t.source_language!==p[8]||t.translated_text!==p[9])return 0;
    t.translated_text=p[1];t.origin='manual';return 1;
   }
  }
  if(read&&sql.startsWith('SELECT '))return clone(state.guides[p[0]]??null);
  if(sql.startsWith('INSERT ')){
   const [id,edit_token_hash,content_json,created_at,updated_at]=p;if(state.guides[id])throw Error('Duplicate property');
   const row={id,edit_token_hash,content_json,created_at,updated_at};state.guides[id]=row;syncSources(row);return 1;
  }
  if(sql.startsWith('UPDATE ')){
   const [content_json,updated_at,id]=p,row=state.guides[id];if(!row)throw Error('Unknown property');
   Object.assign(row,{content_json,updated_at});syncSources(row);return 1;
  }
  throw Error('Unsupported local query');
 }
 load();
 return {prepare(sql){let params=[];return {
  bind(...values){params=values;return this;},
  async first(){load();return execute(sql,params,true);},
  async run(){
   let lock;const snapshot=clone(state);
   try{
    if(file){fs.mkdirSync(path.dirname(file),{recursive:true});lock=fs.openSync(file+'.lock','wx',0o600);}
    load();const changes=execute(sql,params);persist();return {success:true,meta:{changes}};
   }catch(error){state=snapshot;throw error;}
   finally{if(lock!==undefined){fs.closeSync(lock);fs.unlinkSync(file+'.lock');}}
  }
 };}};
}
