import {createHostI18n,HOST_LANGUAGES} from './host-i18n.js';
import {previewWarning,qrFilename,qrPngBlob} from './qr-tools.js';
import {FIELDS} from './guide-content.js';
const STORAGE = 'stayguide-demo-properties';
const ACTIVE = 'stayguide-demo-active';
let hostStorage;try{hostStorage=globalThis.localStorage;}catch{/* Storage may be blocked by browser policy. */}
const hostI18n=createHostI18n({storage:hostStorage,languages:navigator.languages||[navigator.language]});
const t=(key,values)=>hostI18n.t(key,values);
const ui=(selector,key,values)=>hostI18n.text($(selector),key,values);
const tr=(key,values={})=>`<span data-i18n="${esc(key)}" data-i18n-values="${esc(JSON.stringify(values))}">${esc(t(key,values))}</span>`;

// Local, decorative line icons. Section names remain the accessible labels.
const SECTION_ICONS = {
  welcome:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  wifi:'<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".8"/>',
  arrival:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h3"/>',
  rules:'<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  appliances:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M7 5.5h.01m3 0h.01"/><circle cx="12" cy="14" r="4"/>',
  parking:'<path d="m5 8 2-4h10l2 4m-16 5 2-5h14l2 5v6H3Z"/><path d="M3 13h18M6 19v2m12-2v2M6 10h1m10 0h1"/>',
  local_tips:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  emergency:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
  contact:'<path d="M7 3H4a1 1 0 0 0-1 1c0 9 8 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a15 15 0 0 1-7-7l2-2Z"/>',
  additional:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>'
};
const sectionStatusMark=state=>`<span class="section-state-mark" aria-hidden="true">${state==='complete'?'✓':''}</span>`;
const sectionIcon=id=>`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SECTION_ICONS[id]}</svg>`;
function propertyInitials(name){
  const words=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length)return '·';
  return (words.length>1?Array.from(words[0])[0]+Array.from(words.at(-1))[0]:Array.from(words[0]).slice(0,2).join('')).toLocaleUpperCase();
}
function identityTone(id){return parseInt(id.slice(-2),16)%4;}
function sectionState(section,model){
  const filled=section.fields.filter(([key])=>typeof model[key]==='string'&&model[key].trim()).length;
  return filled===section.fields.length?'complete':filled?'started':'empty';
}
function guideProgress(model){
  const counts={complete:0,started:0,empty:0,total:FIELDS.length};
  for(const section of FIELDS)counts[sectionState(section,model)]++;
  return counts;
}
const $ = selector => document.querySelector(selector);
// Native disclosure stays compact below editing on small screens.
const progressLayout=typeof matchMedia==='function'?matchMedia('(min-width: 1200px)'):null;
const updateProgressLayout=()=>{$('#progress-checklist-details').open=!!progressLayout?.matches;};
updateProgressLayout();progressLayout?.addEventListener('change',updateProgressLayout);
const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let guides = [];
let current = null;
let currentRevision = null;
let activeId;
let editing = null;
let storageProblem = false;
let loadVersion = 0;
let editorVersion = 0;
let saveVersion = 0;
let qrVersion = 0;
let qrOpener = null;

function showRecovery(){
  storageProblem=true;loadVersion++;current=null;closeEditor();clearGuidePresentation();
  $('#state-recovery').hidden=false;$('#empty-state').hidden=true;$('#editor-shell').hidden=true;
  $('#new-property').disabled=true;
}
function restoreState(){
  try{
    const raw=localStorage.getItem(STORAGE),savedActive=localStorage.getItem(ACTIVE);
    const saved=raw===null?[]:JSON.parse(raw);
    const ids=new Set();
    if(!Array.isArray(saved))throw new Error();
    for(const entry of saved){
      if(!entry||typeof entry!=='object'||Array.isArray(entry)||
        typeof entry.id!=='string'||!/^[a-f0-9]{16}$/.test(entry.id)||
        typeof entry.token!=='string'||!/^[a-f0-9]{64}$/.test(entry.token)||
        (entry.label!==undefined&&typeof entry.label!=='string')||ids.has(entry.id))throw new Error();
      ids.add(entry.id);
    }
    if(savedActive&&(!/^[a-f0-9]{16}$/.test(savedActive)||!saved.length))throw new Error();
    guides=saved;activeId=ids.has(savedActive)?savedActive:saved[0]?.id;
    storageProblem=false;$('#state-recovery').hidden=true;$('#new-property').disabled=false;
    if(guides.length)loadActive();else showEmpty();
  }catch{showRecovery();}
}
function persist(){
  if(storageProblem)return false;
  try{
    localStorage.setItem(STORAGE,JSON.stringify(guides));localStorage.setItem(ACTIVE,activeId||'');
    return true;
  }catch{showRecovery();return false;}
}
$('#retry-state').addEventListener('click',restoreState);
$('#reset-state').addEventListener('click',()=>{
  if(!confirm(t('Keep a recovery copy in this browser and start a new property list? Existing guides will not be deleted from the server.')))return;
  try{
    // Copy exact original strings before replacing either working key. Never log them.
    const backup={properties:localStorage.getItem(STORAGE),active:localStorage.getItem(ACTIVE)};
    let key='stayguide-demo-recovery-'+Date.now();
    while(localStorage.getItem(key)!==null)key+='-copy';
    localStorage.setItem(key,JSON.stringify(backup));
    localStorage.setItem(STORAGE,'[]');localStorage.setItem(ACTIVE,'');
    restoreState();
  }catch{
    hostI18n.text($('#recovery-message'),"Browser storage could not be updated. No recovery copy has been removed. Allow browser storage or free some space, then try again.");
    showRecovery();
  }
});
function showEmpty(){ ui('#empty-state h2',"Let's make your first guide.");ui('#empty-state p','No signup, no complicated setup. Just a lovely place to start.');$('#empty-state').hidden=false;$('#editor-shell').hidden=true;clearGuidePresentation();}
function showEditor(){ $('#empty-state').hidden=true;$('#editor-shell').hidden=false;revealPropertyTab();}
function updatePropertyScroll(){
  const host=$('#property-tabs');
  if(!host.parentElement)return;
  host.parentElement.dataset.scrollLeft=String(host.scrollLeft>1);
  host.parentElement.dataset.scrollRight=String(host.scrollWidth-host.clientWidth-host.scrollLeft>1);
}
function revealPropertyTab(tab){
  const host=$('#property-tabs');
  if(!host.clientWidth)return; // Initial render can happen while the editor is hidden.
  tab=tab||host.querySelector('.property-tab.active');
  if(tab){
    const viewport=host.getBoundingClientRect(),bounds=tab.getBoundingClientRect(),inset=14;
    if(bounds.left<viewport.left+inset)host.scrollLeft+=bounds.left-viewport.left-inset;
    else if(bounds.right>viewport.right-inset)host.scrollLeft+=bounds.right-viewport.right+inset;
  }
  updatePropertyScroll();
}
$('#property-tabs').addEventListener('scroll',updatePropertyScroll,{passive:true});
$('#property-tabs').addEventListener('focusin',event=>{
  if(event.target.classList.contains('property-tab'))revealPropertyTab(event.target);
});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>revealPropertyTab()).observe($('#property-tabs'));
function clearGuidePresentation(){
  closeQr();
  $('#open-qr').disabled=true;
  $('#qr-preview').removeAttribute('src');$('#qr-destination').removeAttribute('href');
  hostI18n.text($('#qr-destination'),'');hostI18n.text($('#qr-property-name'),'');
  $('#guide-progress').hidden=true;
  hostI18n.text($('#progress-summary'),'');hostI18n.text($('#progress-counts'),'');
  $('#section-progress').value=0;$('#progress-checklist').replaceChildren();
  hostI18n.text($('#card-preview-name'),'');$('#card-preview-qr').removeAttribute('src');
  $('#property-identity').textContent='·';$('#property-identity').removeAttribute('data-tone');
  hostI18n.text($('#card-counter'),"Loading sections…");
  for(const id of ['view-link','download-qr','print-card']){
    $('#'+id).removeAttribute('href');$('#'+id).setAttribute('aria-disabled','true');
  }
  $('#copy-link').disabled=true;hostI18n.text($('#copy-link'),"Copy guest link");
  $('#editor-grid').querySelectorAll('button').forEach(button=>{
    button.disabled=true;button.setAttribute('data-state','loading');button.removeAttribute('aria-label');
    const state=button.querySelector('.editor-card-state');if(state)hostI18n.text(state,"Loading…");
  });
}
function setStatus(msg){ ui('#save-status',msg); }
async function api(path,options={}){
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await response.json();if(!response.ok){const error=new Error(data.error||'Something went wrong');error.status=response.status;error.category=typeof data.category==='string'?data.category:null;throw error;}return data;
}
async function createGuide(model){
  if(storageProblem)return;
  const data=await api('/api/guides',{method:'POST',body:JSON.stringify(model)});
  guides.push({id:data.id,token:data.token});activeId=data.id;if(persist())await loadActive();
}
function getEntry(){return guides.find(g=>g.id===activeId);}
async function loadActive(){
  const version=++loadVersion;
  current=null;currentRevision=null;closeEditor();clearGuidePresentation();
  $('#property-tabs').querySelectorAll('button').forEach(button=>{
    const selected=button.getAttribute('data-guide-id')===activeId;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  revealPropertyTab();
  const entry=getEntry();if(storageProblem)return;
  if(!entry){showEmpty();return;}
  const isCurrent=()=>version===loadVersion&&activeId===entry.id&&!storageProblem;
  $('#editor-shell').setAttribute('aria-busy','true');
  hostI18n.text($('#property-heading'),"Loading guide…");setStatus('Loading…');
  try{
    const d=await api(`/api/guides/${entry.id}`,{headers:{Authorization:`Bearer ${entry.token}`}});
    if(!isCurrent())return;
    if(d.id!==entry.id||!isGuideRevision(d.revision))throw new Error();
    current=d.guide;currentRevision=d.revision;render();if(!storageProblem)showEditor();
  }catch{
    if(!isCurrent())return;
    showEmpty();hostI18n.text($('#empty-state h2'),"This guide is unavailable.");
    hostI18n.text($('#empty-state p'),"Please reload to try again. Your saved property list has not been removed.");
  }finally{if(isCurrent())$('#editor-shell').removeAttribute('aria-busy');}
}
function render(){
  if($('#qr-workspace').open)closeQr();
  const host=$('#property-tabs'),restoreTabFocus=document.activeElement?.parentElement===host;host.replaceChildren();
  guides.forEach((g,index)=>{
    const selected=g.id===activeId,name=selected?current.property_name:(g.label||t('Property {number}',{number:index+1}));
    const b=document.createElement('button');b.type='button';b.className='property-tab'+(selected?' active':'');
    b.setAttribute('data-guide-id',g.id);b.setAttribute('data-tone',identityTone(g.id));
    b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',name);b.title=name;
    const identity=document.createElement('span');identity.className='property-identity';identity.setAttribute('aria-hidden','true');identity.textContent=propertyInitials(name);
    const label=document.createElement('span');label.className='property-tab-label';label.textContent=name;
    b.append(identity);b.append(label);
    b.addEventListener('click',()=>{activeId=g.id;if(persist())loadActive();});host.append(b);
  });
  const entry=getEntry();entry.label=current.property_name;if(!persist())return;
  $('#property-heading').removeAttribute('data-i18n');$('#property-heading').textContent=current.property_name;
  $('#property-identity').textContent=propertyInitials(current.property_name);
  $('#property-identity').setAttribute('data-tone',identityTone(activeId));
  const link=`${location.origin}/g/${activeId}`;
  $('#view-link').href=link;$('#download-qr').href=`/g/${activeId}/qr.svg`;$('#print-card').href=`/g/${activeId}/card`;
  for(const id of ['view-link','download-qr','print-card'])$('#'+id).removeAttribute('aria-disabled');
  $('#copy-link').disabled=false;hostI18n.text($('#copy-link'),"Copy guest link");
  $('#open-qr').disabled=false;$('#download-qr').download=qrFilename(current.property_name,'svg');
  const grid=$('#editor-grid');grid.replaceChildren();
  for(const sec of FIELDS){
    const state=sectionState(sec,current),label={empty:'Empty',started:'Started',complete:'Complete'}[state];
    const b=document.createElement('button');b.type='button';b.className='editor-card';
    b.setAttribute('data-section',sec.id);b.setAttribute('data-state',state);
    hostI18n.text(b,'{section}: {state}. {action}',{section:{key:sec.title},state:{key:label},action:{key:state==='empty'?'Add information':'Edit section'}},'aria-label');
    b.innerHTML=`<span class="editor-icon">${sectionIcon(sec.id)}</span><span class="editor-card-copy"><strong>${tr(sec.title)}</strong><small>${tr(sec.hint)}</small></span><span class="editor-card-footer"><span class="editor-card-state">${sectionStatusMark(state)}${tr(label)}</span><span class="editor-card-action">${tr(state==='empty'?'Add':'Edit')} <span aria-hidden="true">→</span></span></span>`;
    b.addEventListener('click',()=>openEditor(sec,b));grid.append(b);
  }
  const checklist=$('#progress-checklist');checklist.replaceChildren();
  for(const sec of FIELDS){
    const state=sectionState(sec,current),item=document.createElement('li');
    item.setAttribute('data-section',sec.id);item.setAttribute('data-state',state);
    item.innerHTML=`${sectionStatusMark(state)}<span>${tr(sec.title)}</span><small>${tr({complete:'Complete',started:'Started',empty:'Empty'}[state])}</small>`;
    checklist.append(item);
  }
  const progress=guideProgress(current);
  ui('#progress-summary','{complete} of {total} sections complete',progress);
  ui('#progress-counts','{started} started · {empty} empty',progress);
  $('#section-progress').max=progress.total;$('#section-progress').value=progress.complete;
  $('#guide-progress').hidden=false;
  ui('#card-counter','{count} editable sections',{count:FIELDS.length});
  if(restoreTabFocus)host.querySelector('.property-tab.active')?.focus({preventScroll:true});
  revealPropertyTab();
  setStatus('All changes saved');
}
// Context changes force-close the editor; user dismissal goes through requestEditorClose.
let initialFields = {};
let editorOpener = null;
let editorSaving = false;
let editorConflict = false;
let sectionTranslations=null;
const generationAttempts=new Map();
const generationIdentity=(s,target)=>JSON.stringify([s.id,s.section,s.metadata?.sourceLanguage,target,s.metadata?.sourceVersion]);
const translationSections=['welcome','arrival','rules','appliances','parking','local_tips','emergency','contact','additional'];
// Source writes start only from a clean draft and temporarily disable the fields.
// FormData omits disabled controls; that must not masquerade as changed text.
const editorDirty=()=>!!editing&&sectionTranslations?.busy!=='source'&&editing.fields.some(([key])=>editorValues()[key]!==initialFields[key]);
function translationContext(state){return state===sectionTranslations&&editing?.id===state.section&&editorVersion===state.editor&&loadVersion===state.load&&activeId===state.id&&!storageProblem;}
function translationPreviewClear(){if(sectionTranslations){sectionTranslations.hasSaved=false;sectionTranslations.capability=null;}const node=$('#translation-preview');node.replaceChildren();node.hidden=true;node.removeAttribute('lang');}
function translationOptions(select,empty){
  select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';hostI18n.text(placeholder,empty);select.append(placeholder);
  for(const [locale,name] of Object.entries(HOST_LANGUAGES)){const option=document.createElement('option');option.value=locale;option.lang=locale;option.textContent=name;select.append(option);}
}
function resetSectionTranslations(){
  sectionTranslations=null;$('#section-translations').open=false;$('#section-translations').hidden=!editing||!translationSections.includes(editing.id);
  translationPreviewClear();ui('#translation-source-state','');ui('#translation-status','');
  translationOptions($('#translation-source'),'Choose the source language');translationOptions($('#translation-target'),'Choose a target language');
  if(editing&&translationSections.includes(editing.id)){
    const entry=getEntry();sectionTranslations={id:entry.id,token:entry.token,section:editing.id,editor:editorVersion,load:loadVersion,serial:0,metadata:null,busy:'',locked:false,status:'Choose a target language to view saved text.',dirty:false,capability:null,hasSaved:false,generationStatus:''};
  }
  updateTranslationControls();
}
function updateTranslationControls(){
  const s=sectionTranslations;if(!s)return;
  $('#drawer-fields').disabled=editorSaving||s.busy==='source';
  const dirty=editorSaving?s.dirty:editorDirty();
  if(dirty&&!s.dirty&&s.busy!=='source'){s.serial++;s.busy='';translationPreviewClear();s.status='Saved status may be outdated. Refresh to review it.';}
  s.dirty=dirty;
  const blocked=dirty||editorSaving||editorConflict||s.locked||!s.metadata||!!s.busy;
  const proposed=$('#translation-source').value;
  $('#translation-source').disabled=blocked;
  $('#save-source-language').disabled=blocked||!Object.hasOwn(HOST_LANGUAGES,proposed)||proposed===s.metadata?.sourceLanguage;
  $('#translation-target').disabled=dirty||editorSaving||editorConflict||s.locked||!s.metadata?.declared||s.busy==='metadata'||s.busy==='source'||s.busy==='generation'||proposed!==s.metadata?.sourceLanguage;
  $('#refresh-translations').disabled=dirty||editorSaving||editorConflict||!!s.busy;
  $('#drawer-fields').disabled=editorSaving||s.busy==='source';
  $('#save-editor').disabled=editorSaving||editorConflict||s.busy==='source';
  ui('#translation-status',dirty||editorSaving?'Save or discard your text changes before using translation settings.':s.status);
  updateGenerationControls(s);
}
function validSourceMetadata(value,section){return value?.section===section&&Number.isSafeInteger(value.sourceVersion)&&value.sourceVersion>0&&typeof value.declared==='boolean'&&(value.sourceLanguage===null&&!value.declared||typeof value.sourceLanguage==='string'&&/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(value.sourceLanguage)&&value.declared);}
function showSourceMetadata(s){
  translationOptions($('#translation-source'),'Choose the source language');
  const language=s.metadata.sourceLanguage;
  if(language&&!Object.hasOwn(HOST_LANGUAGES,language)){
    const option=document.createElement('option');option.value=language;option.disabled=true;hostI18n.text(option,'Previously declared language ({language})',{language});$('#translation-source').append(option);
  }
  $('#translation-source').value=language||'';
  ui('#translation-source-state',language?'Saved source language: {language}':'Source language not declared.',{language:HOST_LANGUAGES[language]||language});
}
async function readSourceMetadata(){
  const s=sectionTranslations;if(!s||!translationContext(s)||!$('#section-translations').open||editorDirty()||editorSaving||editorConflict||s.busy==='source'||s.busy==='generation')return;
  const keptTarget=$('#translation-target').value;
  const serial=++s.serial;s.generationStatus='';s.busy='metadata';s.locked=true;s.metadata=null;s.status='Loading saved translation status…';translationPreviewClear();$('#translation-target').value=Object.hasOwn(HOST_LANGUAGES,keptTarget)?keptTarget:'';updateTranslationControls();
  try{
    const value=await api(`/api/guides/${s.id}/translation-sources/${s.section}`,{headers:{Authorization:`Bearer ${s.token}`},cache:'no-store'});
    if(!translationContext(s)||serial!==s.serial||!$('#section-translations').open)return;
    if(!validSourceMetadata(value,s.section))throw Error();
    s.metadata={...value};s.locked=false;showSourceMetadata(s);s.status=value.declared?'Choose a target language to view saved text.':'Source language not declared.';
  }catch{if(translationContext(s)&&serial===s.serial){s.status='Saved status could not be loaded. Check your connection, then refresh.';s.locked=true;}}
  finally{if(translationContext(s)&&serial===s.serial){s.busy='';updateTranslationControls();}}
  if(translationContext(s)&&serial===s.serial&&!s.locked&&s.metadata?.declared&&Object.hasOwn(HOST_LANGUAGES,keptTarget)&&!editorDirty())await readSavedTranslation();
}
async function saveSourceLanguage(){
  const s=sectionTranslations,language=$('#translation-source').value;
  if(!s||!translationContext(s)||!$('#section-translations').open||editorDirty()||editorSaving||editorConflict||s.busy||s.locked||!s.metadata||!Object.hasOwn(HOST_LANGUAGES,language)||language===s.metadata.sourceLanguage)return;
  if(s.metadata.declared&&!confirm(t('Change this section’s source language? Its previous translations will become unavailable. Your original text will stay unchanged.')))return;
  const expected=s.metadata.sourceVersion,serial=++s.serial,restoreFocus=document.activeElement===$('#save-source-language');s.busy='source';s.status='Saving source language…';translationPreviewClear();$('#translation-target').value='';updateTranslationControls();
  try{
    const value=await api(`/api/guides/${s.id}/translation-sources/${s.section}`,{method:'PATCH',headers:{Authorization:`Bearer ${s.token}`},body:JSON.stringify({sourceLanguage:language,expectedSourceVersion:expected})});
    if(!translationContext(s)||serial!==s.serial)return;
    if(!validSourceMetadata(value,s.section)||value.sourceLanguage!==language||value.sourceVersion!==expected+1)throw Error();
    s.metadata={...value};showSourceMetadata(s);s.status='Source language saved.';
  }catch(error){if(translationContext(s)&&serial===s.serial){s.locked=true;s.status=error.status===409?'This section changed elsewhere. Refresh its saved status before choosing again. Your text is unchanged.':'The source language could not be confirmed. Refresh its saved status before choosing again.';}}
  finally{if(translationContext(s)&&serial===s.serial){s.busy='';updateTranslationControls();if(restoreFocus&&$('#section-translations').open&&(document.activeElement===$('#save-source-language')||document.activeElement===document.body))$(s.locked?'#refresh-translations':'#translation-source').focus({preventScroll:true});}}
}
async function readSavedTranslation(){
  const s=sectionTranslations,target=$('#translation-target').value;
  if(!s||!translationContext(s)||!$('#section-translations').open||editorDirty()||editorSaving||editorConflict||s.locked||!s.metadata?.declared||s.busy==='source'||s.busy==='metadata'||!Object.hasOwn(HOST_LANGUAGES,target)||$('#translation-source').value!==s.metadata.sourceLanguage)return;
  const expected={...s.metadata},serial=++s.serial;s.generationStatus='';s.busy='view';s.status='Loading saved translation status…';translationPreviewClear();updateTranslationControls();
  try{
    const result=await api(`/api/guides/${s.id}/translations?section=${encodeURIComponent(s.section)}&lang=${encodeURIComponent(target)}`,{headers:{Authorization:`Bearer ${s.token}`},cache:'no-store'});
    if(!translationContext(s)||serial!==s.serial)return;
    // The saved-only GET has no expectation argument. Confirm its source snapshot separately.
    const metadata=await api(`/api/guides/${s.id}/translation-sources/${s.section}`,{headers:{Authorization:`Bearer ${s.token}`},cache:'no-store'});
    if(!translationContext(s)||serial!==s.serial)return;
    if(!validSourceMetadata(metadata,s.section)||metadata.sourceVersion!==expected.sourceVersion||metadata.sourceLanguage!==expected.sourceLanguage){s.locked=true;s.status='Saved status may be outdated. Refresh to review it.';return;}
    if(result.status==='translated'&&result.providerMode==='openai'){
      const keys=editing.fields.map(([key])=>key).filter(key=>key!=='property_name');
      if(result.language!==target||result.correction?.sourceVersion!==expected.sourceVersion||!['manual','generated'].includes(result.origin)||!result.fields||Object.keys(result.fields).sort().join()!==keys.sort().join()||!keys.every(key=>typeof result.fields[key]==='string'))throw Error();
      const preview=$('#translation-preview');
      for(const [key,label] of editing.fields){if(key==='property_name')continue;const dt=document.createElement('dt'),dd=document.createElement('dd');hostI18n.text(dt,label);dd.setAttribute('lang',target);dd.textContent=result.fields[key];preview.append(dt);preview.append(dd);}
      preview.hidden=false;s.hasSaved=true;s.status=result.origin==='manual'?'Manually corrected translation available.':'Current saved translation available.';
    }else if(result.status==='translated'&&result.providerMode==='mock')s.status='Test output is not a saved AI translation.';
    else if(result.status==='original'&&result.language===expected.sourceLanguage)s.status=target===expected.sourceLanguage?'This is the original language.':'No current saved translation available.';
    else throw Error();
    await readGenerationCapability(s,serial,target,expected);
    if(translationContext(s)&&serial===s.serial)return result;
  }catch{if(translationContext(s)&&serial===s.serial){translationPreviewClear();s.status='Saved status could not be loaded. Check your connection, then refresh.';}}
  finally{if(translationContext(s)&&serial===s.serial){s.busy='';updateTranslationControls();}}
}

const generationMessages={
 unavailable:'AI translation generation is not available yet. Saved translations can still be viewed.',
 source_required:'Choose and save the source language first.',
 source_changed:'This section changed. Refresh saved status before choosing again.',
 same_language:'Choose a target language different from the source.',
 empty:'Save some text in this section before translating.',
 input_limit:'This section is too long to translate. The limit is 1,200 characters; nothing was shortened.',
 cached:'A saved translation is already available.',
 attempt_pending:'A translation attempt is already in progress. Refresh saved status later.',
 attempt_terminal:'A previous attempt cannot be repeated. You can still view saved translations.',
 busy_or_limit:'Translation is blocked by a usage or rate limit. No retry is available.',
 translation_unavailable:'Translation failed. This attempt cannot be repeated; saved translations remain available.',
 translation_timeout_uncertain:'The translation outcome is uncertain. Do not repeat this attempt; refresh saved status later.',
 network:'The translation outcome could not be confirmed. Do not repeat this attempt; refresh saved status later.'
};
function sourceTextForTranslation(){return editing?editing.fields.filter(([key])=>key!=='property_name').map(([key])=>String(current?.[key]||'')).join('\n'):'';}
function updateGenerationControls(s){
  const c=s.capability,target=$('#translation-target').value,attempt=generationAttempts.get(generationIdentity(s,target));
  const available=c?.generationAvailable===true&&c.testOnly===true;
  const button=$('#generate-translation');button.hidden=!available||!!attempt||s.hasSaved;
  button.disabled=!available||!!attempt||s.hasSaved||!!s.busy||editorDirty()||editorSaving||editorConflict||s.locked||!s.metadata?.declared||!Object.hasOwn(HOST_LANGUAGES,target)||target===s.metadata.sourceLanguage||!sourceTextForTranslation().trim()||[...sourceTextForTranslation()].length>1200;
  ui('#translation-generation-note',c?.testOnly?'Offline test mode: new translations are synthetic. Only saved section text is sent to the test provider.':'AI translation generation is not available yet. Saved translations can still be viewed.');
  let message=s.generationStatus||attempt?.message||'';
  if(editorDirty()||editorSaving)message='Save or discard your text changes before using translation settings.';
  else if(!s.generationStatus&&c?.testOnly&&c.state!=='available')message=generationMessages[c.state]||generationMessages.unavailable;
  ui('#translation-generation-status',message);
}
async function readGenerationCapability(s,serial,target,expected){
  s.capability=null;
  try{
    const query=new URLSearchParams({section:s.section,sourceLanguage:expected.sourceLanguage,targetLanguage:target,expectedSourceVersion:String(expected.sourceVersion)});
    const cap=await api(`/api/guides/${s.id}/translation-capabilities?${query}`,{headers:{Authorization:`Bearer ${s.token}`},cache:'no-store'});
    if(!translationContext(s)||serial!==s.serial)return;
    if(typeof cap?.generationAvailable!=='boolean'||typeof cap.testOnly!=='boolean'||cap.sourceVersion!==expected.sourceVersion||!Object.hasOwn(generationMessages,cap.state)&&cap.state!=='available'||cap.generationAvailable&&(cap.testOnly!==true||cap.state!=='available'))throw Error();
    s.capability=cap;
  }catch{if(translationContext(s)&&serial===s.serial){s.capability=null;s.generationStatus='Generation availability could not be checked. Translation remains disabled.';}}
}
async function generateSectionTranslation(){
  const s=sectionTranslations,target=$('#translation-target').value;
  if(!s||!translationContext(s)||!$('#section-translations').open||editorDirty()||editorSaving||editorConflict||s.busy||s.locked||!s.metadata?.declared||s.capability?.generationAvailable!==true||s.capability.testOnly!==true||s.capability.sourceVersion!==s.metadata.sourceVersion||s.hasSaved||!Object.hasOwn(HOST_LANGUAGES,target)||target===s.metadata.sourceLanguage||$('#translation-source').value!==s.metadata.sourceLanguage||generationAttempts.has(generationIdentity(s,target)))return;
  if(!sourceTextForTranslation().trim()){s.generationStatus=generationMessages.empty;updateTranslationControls();return;}
  if([...sourceTextForTranslation()].length>1200){s.generationStatus=generationMessages.input_limit;updateTranslationControls();return;}
  if(!confirm(t('Send the saved text in this section to the translation provider? Your original text will not change.')))return;
  const expected={...s.metadata},identity=generationIdentity(s,target),serial=++s.serial;
  let verificationSerial=null;
  const record={message:'Translation is in progress…'};generationAttempts.set(identity,record);s.busy='generation';s.generationStatus=record.message;updateTranslationControls();$('#translation-generation-status').focus({preventScroll:true});
  try{
    const result=await api(`/api/guides/${s.id}/translations`,{method:'POST',headers:{Authorization:`Bearer ${s.token}`},body:JSON.stringify({section:s.section,sourceLanguage:expected.sourceLanguage,targetLanguage:target,expectedSourceVersion:expected.sourceVersion})});
    if(!translationContext(s)||serial!==s.serial)return;
    const keys=editing.fields.filter(([key])=>key!=='property_name').map(([key])=>key);
    if(result.status!=='translated'||result.providerMode!=='openai'||result.language!==target||result.correction?.sourceVersion!==expected.sourceVersion||!['generated','manual'].includes(result.origin)||!result.fields||Object.keys(result.fields).sort().join()!==keys.sort().join()||!keys.every(key=>typeof result.fields[key]==='string'))throw Error();
    s.busy='';const verification=readSavedTranslation();verificationSerial=s.serial;const saved=await verification;
    if(!translationContext(s)||s.serial!==verificationSerial)return;
    if(saved?.status!=='translated'||saved.providerMode!=='openai'||saved.correction?.sourceVersion!==expected.sourceVersion||!s.hasSaved)throw Error();
    if(saved.origin!=='manual'&&!keys.every(key=>saved.fields[key]===result.fields[key]))throw Error();
    record.message=saved.origin==='manual'?'Saved translation verified.':'Test translation saved and verified.';s.generationStatus=record.message;
  }catch(error){
    const category=({source_language_required:'source_required',source_language_changed:'source_changed',source_version_changed:'source_changed',stale_or_expired:'source_changed',live_disabled:'unavailable'})[error?.category]||error?.category;
    record.message=generationMessages[category]||generationMessages.network;
    if(translationContext(s)&&(s.serial===serial||verificationSerial!==null&&s.serial===verificationSerial)){s.generationStatus=record.message;if(['source_version_changed','source_language_changed','source_changed','stale_or_expired'].includes(error?.category))s.locked=true;}
  }finally{if(translationContext(s)&&(s.serial===serial||verificationSerial!==null&&s.serial===verificationSerial)){s.busy='';updateTranslationControls();}}
}
$('#generate-translation').addEventListener('click',generateSectionTranslation);

$('#section-translations').addEventListener('toggle',()=>{
  if($('#section-translations').open)readSourceMetadata();
  else if(sectionTranslations&&sectionTranslations.busy!=='source'){sectionTranslations.serial++;sectionTranslations.busy='';translationPreviewClear();}
});
$('#translation-source').addEventListener('change',()=>{const s=sectionTranslations;if(s&&!s.busy&&!s.locked&&!editorDirty()&&!editorSaving&&!editorConflict){s.serial++;s.generationStatus='';s.status=$('#translation-source').value===s.metadata?.sourceLanguage?'Choose a target language to view saved text.':'Save the selected source language before viewing translations.';$('#translation-target').value='';translationPreviewClear();updateTranslationControls();}});
$('#translation-target').addEventListener('change',()=>{if(['source','generation'].includes(sectionTranslations?.busy))return;if(!$('#translation-target').value&&sectionTranslations){sectionTranslations.serial++;sectionTranslations.generationStatus='';sectionTranslations.busy='';translationPreviewClear();sectionTranslations.status='Choose a target language to view saved text.';updateTranslationControls();}else readSavedTranslation();});
$('#save-source-language').addEventListener('click',saveSourceLanguage);
$('#refresh-translations').addEventListener('click',readSourceMetadata);
$('#drawer-fields').addEventListener('input',updateTranslationControls);
const isGuideRevision=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function editorValues(){
  const form=new FormData($('#section-form'));
  return Object.fromEntries(editing.fields.map(([key])=>[key,String(form.get(key)||'')]));
}
function setEditorSaving(saving){
  editorSaving=saving;
  $('#drawer-fields').disabled=saving;
  for(const id of ['save-editor','cancel-editor','close-drawer'])$('#'+id).disabled=saving||(id==='save-editor'&&editorConflict);
  ui('#save-editor',saving?'Saving…':'Save changes');
  $('#section-form').setAttribute('aria-busy',String(saving));
  ui('#editor-status',saving?'Saving your changes. Please wait.':'');
  if(saving)$('#editor-status').focus({preventScroll:true});
  updateTranslationControls();
}
function openEditor(section,opener){
  if(!current||storageProblem||editing)return;
  editorVersion++;
  editing=section;editorOpener=opener;editorConflict=false;
  initialFields=Object.fromEntries(section.fields.map(([key,,type])=>[key,type==='textarea'?String(current[key]||'').replace(/\r\n?/g,'\n'):String(current[key]||'').replace(/[\r\n]/g,'')]));
  ui('#drawer-title',section.title);
  ui('#drawer-description',section.hint);
  $('#drawer-fields').innerHTML=section.fields.map(([key,label,type,hint])=>`<div class="form-field"><label for="edit-${key}">${tr(label)}</label>${type==='textarea'?`<textarea id="edit-${key}" name="${key}" placeholder="${esc(t(hint))}" data-i18n-placeholder="${esc(hint)}" rows="5">${esc(initialFields[key])}</textarea>`:`<input id="edit-${key}" name="${key}" type="text" value="${esc(initialFields[key])}" placeholder="${esc(t(hint))}" data-i18n-placeholder="${esc(hint)}" ${key==='property_name'?'required maxlength="80"':''}>`}</div>`).join('');
  $('#editor-error').hidden=true;hostI18n.text($('#editor-error'),'');
  resetSectionTranslations();
  setEditorSaving(false);
  const drawer=$('#editor-drawer');drawer.hidden=false;drawer.showModal();
  drawer.querySelector('input,textarea')?.focus();
  document.body.classList.add('drawer-open');
  sizeEditor();
}
function closeEditor(restoreFocus=false){
  const opener=editorOpener;
  editorVersion++;saveVersion++;editing=null;editorOpener=null;
  resetSectionTranslations();
  $('#discard-dialog').close();$('#discard-dialog').hidden=true;
  $('#editor-drawer').close();$('#editor-drawer').hidden=true;
  $('#drawer-overlay').hidden=true;
  document.body.classList.remove('drawer-open');setEditorSaving(false);
  if(restoreFocus&&opener?.isConnected)opener.focus({preventScroll:true});
}
function requestEditorClose(){
  if(!editing||editorSaving)return;
  if(editorDirty()){
    $('#discard-dialog').hidden=false;$('#discard-dialog').showModal();$('#keep-editing').focus();
  }else closeEditor(true);
}
function keepEditing(){
  $('#discard-dialog').close();$('#discard-dialog').hidden=true;
}
function sizeEditor(){
  const viewport=globalThis.visualViewport;
  if(viewport&&editing){
    $('#editor-drawer').style.setProperty('--editor-height',viewport.height+'px');
    $('#editor-drawer').style.setProperty('--editor-top',viewport.offsetTop+'px');
  }
}
globalThis.visualViewport?.addEventListener('resize',sizeEditor);
globalThis.visualViewport?.addEventListener('scroll',sizeEditor);
$('#section-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!editing||!current||storageProblem||editorSaving||editorConflict||sectionTranslations?.busy==='source'||!isGuideRevision(currentRevision))return;
  const patch=editorValues(),sectionId=editing.id;
  if('property_name' in patch&&!patch.property_name.trim()){
    hostI18n.text($('#editor-error'),"Please enter a property name.");
    $('#editor-error').hidden=false;$('#edit-property_name').focus();return;
  }
  const entry=getEntry(),version=loadVersion,drawer=editorVersion,save=++saveVersion;
  const isCurrent=()=>version===loadVersion&&entry.id===activeId&&drawer===editorVersion&&save===saveVersion&&!storageProblem;
  $('#editor-error').hidden=true;setEditorSaving(true);
  try{
    const d=await api(`/api/guides/${entry.id}`,{method:'PATCH',headers:{Authorization:`Bearer ${entry.token}`,'If-Match':'"'+currentRevision+'"'},body:JSON.stringify(patch)});
    if(!isCurrent())return;
    if(d.id!==entry.id||!isGuideRevision(d.revision))throw new Error();
    current=d.guide;currentRevision=d.revision;closeEditor();render();
    if(!storageProblem)$('#editor-grid').querySelector(`[data-section="${sectionId}"]`)?.focus({preventScroll:true});
  }catch(error){
    if(isCurrent()){
      if(error.status===409)editorConflict=true;
      setEditorSaving(false);
      ui('#editor-error',editorConflict?'This guide was updated in another tab or device. Your text is still here and has not been saved. Copy your changes somewhere safe, then close this editor and reload the guide to review the latest version. We will not overwrite it.':'Your changes couldn’t be saved. They are still here. Check your connection and choose Save changes to try again.');
      $('#editor-error').hidden=false;$('#editor-error').focus();
    }
  }finally{if(save===saveVersion)setEditorSaving(false);}
});
for(const id of ['close-drawer','cancel-editor','drawer-overlay'])$('#'+id).addEventListener('click',requestEditorClose);
$('#editor-drawer').addEventListener('cancel',e=>{e.preventDefault();requestEditorClose();});
// Require both ends of a pointer gesture outside the drawer, avoiding accidental dismissal after selecting text.
let backdropPointer=false;
$('#editor-drawer').addEventListener('pointerdown',e=>{backdropPointer=e.target===$('#editor-drawer')&&outsideDrawer(e);});
$('#editor-drawer').addEventListener('click',e=>{if(backdropPointer&&e.target===$('#editor-drawer')&&outsideDrawer(e))requestEditorClose();backdropPointer=false;});
function outsideDrawer(e,dialog=$('#editor-drawer')){
  const rect=dialog.getBoundingClientRect();
  return e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom;
}
$('#keep-editing').addEventListener('click',keepEditing);
$('#discard-changes').addEventListener('click',()=>closeEditor(true));
$('#discard-dialog').addEventListener('cancel',e=>{e.preventDefault();keepEditing();});
// Native modal dialogs make the background inert; explicitly wrap Tab at the boundaries.
for(const id of ['editor-drawer','discard-dialog','qr-workspace'])$('#'+id).addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const controls=[...$('#'+id).querySelectorAll('button,input,textarea,select,a[href],[tabindex]')].filter(el=>!el.matches(':disabled')&&el.tabIndex>=0&&el.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(!first){e.preventDefault();return;}
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
function closeQr(restoreFocus=false){
  qrVersion++;
  resetBook();
  const opener=qrOpener;qrOpener=null;
  $('#qr-workspace').close();$('#qr-workspace').hidden=true;
  $('#download-png').disabled=false;hostI18n.text($('#download-png'),"Download QR");
  hostI18n.text($('#qr-download-status'),'');$('#qr-download-error').hidden=true;
  document.body.classList.remove('qr-open');
  if(restoreFocus&&opener?.isConnected)opener.focus({preventScroll:true});
}
$('#open-qr').addEventListener('click',()=>{
  if(!current||storageProblem)return;
  qrOpener=$('#open-qr');qrVersion++;
  $('#qr-property-name').removeAttribute('data-i18n');$('#qr-property-name').textContent=current.property_name;
  resetBook();ui('#book-property-name','For {name}',{name:current.property_name});
  $('#card-preview-name').removeAttribute('data-i18n');$('#card-preview-name').textContent=current.property_name;$('#card-preview-qr').src='/g/'+activeId+'/qr.svg';
  const link=location.origin+'/g/'+activeId;
  $('#qr-destination').href=link;$('#qr-destination').removeAttribute('data-i18n');$('#qr-destination').textContent=link;
  const warning=previewWarning(link);ui('#qr-url-warning',warning);$('#qr-url-warning').hidden=!warning;
  $('#qr-preview').src='/g/'+activeId+'/qr.svg';hostI18n.text($('#qr-preview'),'QR code for {name} guest guide',{name:current.property_name},'alt');
  $('#qr-workspace').hidden=false;$('#qr-workspace').showModal();
  $('#qr-workspace .qr-workspace-body').scrollTop=0;
  document.body.classList.add('qr-open');$('#close-qr').focus();
});
$('#close-qr').addEventListener('click',()=>closeQr(true));
$('#qr-workspace').addEventListener('cancel',e=>{e.preventDefault();closeQr(true);});
let qrBackdrop=false;
$('#qr-workspace').addEventListener('pointerdown',e=>{qrBackdrop=e.target===$('#qr-workspace')&&outsideDrawer(e,$('#qr-workspace'));});
$('#qr-workspace').addEventListener('click',e=>{if(qrBackdrop&&e.target===$('#qr-workspace')&&outsideDrawer(e,$('#qr-workspace')))closeQr(true);qrBackdrop=false;});
$('#qr-preview').addEventListener('error',()=>{
  if($('#qr-workspace').open&&$('#qr-preview').complete&&!$('#qr-preview').naturalWidth){
    hostI18n.text($('#qr-download-error'),"The QR preview couldn’t load. Close and reopen this workspace to retry, or open the welcome card.");$('#qr-download-error').hidden=false;
  }
});
$('#download-png').addEventListener('click',async()=>{
  if(!current||storageProblem||!$('#qr-workspace').open||$('#download-png').disabled)return;
  const id=activeId,name=current.property_name,load=loadVersion,version=qrVersion;
  const isCurrent=()=>current&&!storageProblem&&activeId===id&&load===loadVersion&&version===qrVersion&&$('#qr-workspace').open;
  $('#download-png').disabled=true;hostI18n.text($('#download-png'),"Preparing…");
  $('#qr-download-error').hidden=true;hostI18n.text($('#qr-download-status'),"Preparing your PNG image…");
  try{
    // Same-origin preview authentication may still apply; no owner-token header is attached.
    const response=await fetch('/g/'+id+'/qr.svg',{credentials:'same-origin',cache:'no-store'});
    if(!isCurrent())return;
    if(!response.ok||!response.headers.get('Content-Type')?.includes('image/svg+xml'))throw new Error();
    const svg=await response.text();if(!isCurrent())return;
    const png=await qrPngBlob(svg);if(!isCurrent())return;
    const url=URL.createObjectURL(png),link=document.createElement('a');
    link.href=url;link.download=qrFilename(name,'png');document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    hostI18n.text($('#qr-download-status'),"Your PNG download is ready. If it didn’t save, try again or use SVG.");
  }catch{
    if(isCurrent()){
      hostI18n.text($('#qr-download-status'),'');hostI18n.text($('#qr-download-error'),"Your QR image couldn’t be downloaded. Try Download QR again, or choose Download SVG.");
      $('#qr-download-error').hidden=false;$('#qr-download-error').focus();
    }
  }finally{if(isCurrent()){$('#download-png').disabled=false;hostI18n.text($('#download-png'),"Download QR");}}
});
// PDF code/font payloads are requested only by an explicit export action.
let bookTools;
function resetBook(){
  $('#book-controls').disabled=false;hostI18n.text($('#download-book'),"Download PDF");
  $('#book-form').removeAttribute('aria-busy');hostI18n.text($('#book-status'),'');
  hostI18n.text($('#book-error'),'');$('#book-error').hidden=true;hostI18n.text($('#book-property-name'),'');
}
$('#book-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!current||storageProblem||editing||editorSaving||!$('#qr-workspace').open||$('#book-controls').disabled)return;
  const model=current,id=activeId,load=loadVersion,version=qrVersion;
  const size=new FormData($('#book-form')).get('book-size');
  const isCurrent=()=>current===model&&activeId===id&&loadVersion===load&&qrVersion===version&&!storageProblem&&!editing&&!editorSaving&&$('#qr-workspace').open;
  $('#book-controls').disabled=true;hostI18n.text($('#download-book'),"Preparing…");$('#book-form').setAttribute('aria-busy','true');
  $('#book-error').hidden=true;hostI18n.text($('#book-status'),"Preparing your saved Welcome Book…");
  try{
    if(!bookTools)bookTools=import('./welcome-book.js').catch(error=>{bookTools=null;throw error;});
    const tools=await bookTools;if(!isCurrent())return;
    // Known owner credentials must never be printed, even if pasted into a guest Wi-Fi field.
    if(guides.some(entry=>FIELDS.some(section=>section.fields.some(([key])=>typeof model[key]==='string'&&model[key].includes(entry.token)))))throw new tools.BookContentError('Saved guest content contains owner editing credentials. Remove them before exporting.');
    const snapshot=tools.bookSnapshot(model,location.origin+'/g/'+id);
    const result=await tools.generateBook(snapshot,size,isCurrent);if(!result||!isCurrent())return;
    const url=URL.createObjectURL(result.blob),link=document.createElement('a');
    link.href=url;link.download=tools.bookFilename(snapshot.name,size);document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    ui('#book-status','Your {size} PDF download is ready. If it did not save, choose Download PDF again.',{size});
  }catch(error){
    if(isCurrent()){
      const tools=await bookTools?.catch(()=>null);
      if(!isCurrent())return;
      hostI18n.text($('#book-status'),'');
      const message=tools&&error instanceof tools.BookContentError?hostBookError(error.message):{key:'Your book could not be prepared. Check your connection and choose Download PDF to retry. No saved content was changed.'};
      ui('#book-error',message.key,message.values);
      $('#book-error').hidden=false;$('#book-error').focus();
    }
  }finally{if(isCurrent()){$('#book-controls').disabled=false;hostI18n.text($('#download-book'),"Download PDF");$('#book-form').removeAttribute('aria-busy');}}
});
$('#create-form').addEventListener('submit',async e=>{
  e.preventDefault();const name=$('#first-name').value.trim();if(!name)return;
  const btn=$('#create-form button');btn.disabled=true;hostI18n.text(btn,"Creating…");
  try{await createGuide({property_name:name});$('#first-name').value='';}
  catch{alert(t('Your guide could not be created. Check your connection and try again.'));}finally{btn.disabled=false;hostI18n.text(btn,"Create my guide ↗");}
});
function newProperty(){if(storageProblem)return;loadVersion++;current=null;closeEditor();showEmpty();$('#first-name').focus();}
$('#new-property').addEventListener('click',newProperty);
$('#copy-link').addEventListener('click',async()=>{
  if(!current||storageProblem)return;
  const id=activeId,version=loadVersion,link=`${location.origin}/g/${id}`;
  const isCurrent=()=>current&&!storageProblem&&activeId===id&&loadVersion===version;
  try{await navigator.clipboard.writeText(link);if(isCurrent())hostI18n.text($('#copy-link'),"Copied ✓");}
  catch{if(isCurrent())prompt(t('Copy your guest link:'),link);}
});

function hostBookError(message){
  const direct=['The guest guide destination could not be verified. Reopen QR & print.','Save a property name before exporting.','Saved guest content contains owner editing credentials. Remove them before exporting.'];
  if(direct.includes(message))return {key:message};
  for(const section of FIELDS)for(const [,label] of section.fields){
    const prefix=label+' contains characters unsupported by the book font (';
    if(message.startsWith(prefix))return {key:'{field} contains characters unsupported by the book font ({codes}). Edit that saved field and use supported text. Nothing was removed or replaced.',values:{field:{key:label},codes:message.slice(prefix.length).split(').')[0]}};
    if(message.startsWith(label+' may contain private access or authentication information.'))return {key:'{field} may contain private access or authentication information. Remove it from the saved guest content before exporting; share private arrival instructions separately.',values:{field:{key:label}}};
  }
  return {key:'Your book could not be prepared. Check your connection and choose Download PDF to retry. No saved content was changed.'};
}
function applyHostLanguage(){
  hostI18n.apply(document);
  for(const select of document.querySelectorAll?.('[data-host-language]')||[])select.value=hostI18n.locale;
  // Unnamed tabs have translated fallbacks; named property text is never translated.
  for(const button of $('#property-tabs').querySelectorAll('button')){
    const index=guides.findIndex(g=>g.id===button.getAttribute('data-guide-id')),guide=guides[index];
    if(!guide||guide.label||guide.id===activeId)continue;
    const name=t('Property {number}',{number:index+1});button.setAttribute('aria-label',name);button.title=name;
    const label=button.querySelector('.property-tab-label');if(label)label.textContent=name;
  }
  revealPropertyTab();sizeEditor();
}
for(const select of document.querySelectorAll?.('[data-host-language]')||[]){
  for(const [locale,name] of Object.entries(HOST_LANGUAGES)){
    const option=document.createElement('option');option.value=locale;option.lang=locale;option.textContent=name;select.append(option);
  }
  select.addEventListener('change',()=>{
    const result=hostI18n.setLocale(select.value);if(!result.changed){select.value=hostI18n.locale;return;}
    applyHostLanguage();
    const status=select.closest('dialog')?.querySelector('[data-language-status]')||$('#host-language-status');
    hostI18n.text(status,result.persisted?'Interface language changed.':'Language changed for this visit. Your browser could not save the preference.');
  });
}
applyHostLanguage();
restoreState();
