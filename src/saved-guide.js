// Storage-only projection shared in principle with future print work, not W7 implementation.
// No provider construction, env/credential access, generation, claims or writes.
import {createTranslationStore} from './translation-store.js';
import {TRANSLATION_CONFIG as CONFIG,TRANSLATABLE_SECTIONS,fieldsFrom,validateFields} from './translation-service.js';
import {guideContent} from './guide-store.js';
import {FIELDS} from '../public/guide-content.js';
const language=value=>typeof value==='string'&&value.length<=35&&/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(value)?value:'';
const hasText=value=>typeof value==='string'&&value.trim().length>0;
function projection(rows,id,target,allowTranslations){
 if(!Array.isArray(rows)||!rows.length)throw Error('Saved guide unavailable');
 const content=rows[0].content_json;if(typeof content!=='string'||rows.some(r=>r.guide_id!==id||r.content_json!==content))throw Error('Inconsistent saved guide');
 const raw=guideContent({content_json:content}),model=Object.fromEntries(FIELDS.flatMap(s=>s.fields.map(([k])=>[k,typeof raw[k]==='string'?raw[k]:'']))),languages={},fallback=[];
 for(const [section,keys] of Object.entries(TRANSLATABLE_SECTIONS)){
  const row=rows.find(r=>r.section===section),original=Object.fromEntries(keys.map(k=>[k,model[k]]));let sourceLanguage='',sourceMatches=false;
  if(row){try{const source=JSON.parse(row.source_text);sourceMatches=Number.isSafeInteger(row.source_version)&&row.source_version>0&&keys.every(k=>typeof source[k]==='string'&&source[k]===original[k]);if(sourceMatches)sourceLanguage=language(row.source_language);}catch{}}
  let translated=false;
  if(target&&allowTranslations&&sourceMatches&&sourceLanguage&&sourceLanguage!==target&&row.target_language===target&&row.translated_source_version===row.source_version&&row.model===CONFIG.model&&row.prompt_version===CONFIG.promptVersion&&row.provider_mode==='openai'&&row.status==='ready'&&['generated','manual'].includes(row.origin)){
   try{const fields=JSON.parse(row.translated_text);if(validateFields(fields,fieldsFrom(row))){Object.assign(model,fields);translated=true;}}catch{}
  }
  for(const k of keys)languages[k]=translated?target:sourceLanguage;
  if(target&&!translated&&sourceLanguage!==target&&keys.some(k=>hasText(original[k])))fallback.push(section);
 }
 return {model,languages,fallback};
}
export async function readSavedGuide(db,id,target){
 const store=createTranslationStore(db);
 const first=await store.snapshot(id,target,CONFIG.model,CONFIG.promptVersion);
 // Parse/validate the candidate before the final read. A changed manual result,
 // source declaration, source edit or guide revision fences the entire overlay.
 const candidate=projection(first,id,target,true);
 const current=await store.snapshot(id,target,CONFIG.model,CONFIG.promptVersion);
 return JSON.stringify(first)===JSON.stringify(current)?candidate:projection(current,id,target,false);
}
