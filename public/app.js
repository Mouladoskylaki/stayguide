import {previewWarning,qrFilename,qrPngBlob} from './qr-tools.js';
const STORAGE = 'stayguide-demo-properties';
const ACTIVE = 'stayguide-demo-active';
const FIELDS = [
  { id:'welcome', title:'Welcome & property', icon:'✳', hint:'Make guests feel at home.', fields:[['property_name','Property name','text','e.g. The Little Olive House'],['welcome','Welcome message','textarea','A few kind words to welcome your guests.']]},
  { id:'wifi', title:'Wi-Fi', icon:'⌁', hint:'The first thing every guest asks.', fields:[['wifi_name','Network name','text','e.g. OliveHouse_Guest'],['wifi_password','Wi-Fi password','text','Your network password']]},
  { id:'arrival', title:'Check-in & check-out', icon:'◷', hint:'Arrival and departure made easy.', fields:[['checkin','Check-in','textarea','e.g. From 3:00 PM. The entrance is on the garden side.'],['checkout','Check-out','textarea','e.g. Before 11:00 AM. Please leave keys on the table.']]},
  { id:'rules', title:'House rules', icon:'⌂', hint:'A few thoughtful ground rules.', fields:[['rules','House rules','textarea','e.g. No smoking indoors. Quiet hours after 10 PM.']]},
  { id:'appliances', title:'How things work', icon:'⚙', hint:'Appliances and useful instructions.', fields:[['appliances','Appliances & equipment','textarea','e.g. How to use the air conditioning, coffee machine and hot water.']]},
  { id:'parking', title:'Parking & transport', icon:'↗', hint:'Help them find their way.', fields:[['parking','Parking & getting around','textarea','e.g. Free parking in front of the property.']]},
  { id:'local_tips', title:'Local favourites', icon:'♡', hint:'Your best neighbourhood tips.', fields:[['local_tips','Places to explore','textarea','e.g. Our favourite bakery is two streets away.']]},
  { id:'emergency', title:'Emergency information', icon:'✚', hint:'Useful numbers and information.', fields:[['emergency','Emergency information','textarea','e.g. Emergency services: 112. Nearest hospital: ...']]},
  { id:'contact', title:'Contact your host', icon:'✉', hint:'An easy way to get in touch.', fields:[['contact','Contact details','textarea','e.g. Call or message on ...']]},
  { id:'additional', title:'Good to know', icon:'◎', hint:'Everything else worth sharing.', fields:[['additional','Additional information','textarea','e.g. Bin collection is on Tuesday.']]}
];
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
  if(!confirm('Keep a recovery copy in this browser and start a new property list? Existing guides will not be deleted from the server.'))return;
  try{
    // Copy exact original strings before replacing either working key. Never log them.
    const backup={properties:localStorage.getItem(STORAGE),active:localStorage.getItem(ACTIVE)};
    let key='stayguide-demo-recovery-'+Date.now();
    while(localStorage.getItem(key)!==null)key+='-copy';
    localStorage.setItem(key,JSON.stringify(backup));
    localStorage.setItem(STORAGE,'[]');localStorage.setItem(ACTIVE,'');
    restoreState();
  }catch{
    $('#recovery-message').textContent='Browser storage could not be updated. No recovery copy has been removed. Allow browser storage or free some space, then try again.';
    showRecovery();
  }
});
function showEmpty(){ $('#empty-state').hidden=false;$('#editor-shell').hidden=true;clearGuidePresentation();}
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
  $('#qr-destination').textContent='';$('#qr-property-name').textContent='';
  $('#guide-progress').hidden=true;
  $('#progress-summary').textContent='';$('#progress-counts').textContent='';
  $('#section-progress').value=0;$('#progress-checklist').replaceChildren();
  $('#card-preview-name').textContent='';$('#card-preview-qr').removeAttribute('src');
  $('#property-identity').textContent='·';$('#property-identity').removeAttribute('data-tone');
  $('#card-counter').textContent='Loading sections…';
  for(const id of ['view-link','download-qr','print-card']){
    $('#'+id).removeAttribute('href');$('#'+id).setAttribute('aria-disabled','true');
  }
  $('#copy-link').disabled=true;$('#copy-link').textContent='Copy guest link';
  $('#editor-grid').querySelectorAll('button').forEach(button=>{
    button.disabled=true;button.setAttribute('data-state','loading');button.removeAttribute('aria-label');
    const state=button.querySelector('.editor-card-state');if(state)state.textContent='Loading…';
  });
}
function setStatus(msg){ $('#save-status').textContent=msg; }
async function api(path,options={}){
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Something went wrong');return data;
}
async function createGuide(model){
  if(storageProblem)return;
  const data=await api('/api/guides',{method:'POST',body:JSON.stringify(model)});
  guides.push({id:data.id,token:data.token});activeId=data.id;if(persist())await loadActive();
}
function getEntry(){return guides.find(g=>g.id===activeId);}
async function loadActive(){
  const version=++loadVersion;
  current=null;closeEditor();clearGuidePresentation();
  $('#property-tabs').querySelectorAll('button').forEach(button=>{
    const selected=button.getAttribute('data-guide-id')===activeId;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  revealPropertyTab();
  const entry=getEntry();if(storageProblem)return;
  if(!entry){showEmpty();return;}
  const isCurrent=()=>version===loadVersion&&activeId===entry.id&&!storageProblem;
  $('#editor-shell').setAttribute('aria-busy','true');
  $('#property-heading').textContent='Loading guide…';setStatus('Loading…');
  try{
    const d=await api(`/api/guides/${entry.id}`,{headers:{Authorization:`Bearer ${entry.token}`}});
    if(!isCurrent())return;
    if(d.id!==entry.id)throw new Error();
    current=d.guide;render();if(!storageProblem)showEditor();
  }catch{
    if(!isCurrent())return;
    showEmpty();$('#empty-state h2').textContent='This guide is unavailable.';
    $('#empty-state p').textContent='Please reload to try again. Your saved property list has not been removed.';
  }finally{if(isCurrent())$('#editor-shell').removeAttribute('aria-busy');}
}
function render(){
  const host=$('#property-tabs'),restoreTabFocus=document.activeElement?.parentElement===host;host.replaceChildren();
  guides.forEach((g,index)=>{
    const selected=g.id===activeId,name=selected?current.property_name:(g.label||`Property ${index+1}`);
    const b=document.createElement('button');b.type='button';b.className='property-tab'+(selected?' active':'');
    b.setAttribute('data-guide-id',g.id);b.setAttribute('data-tone',identityTone(g.id));
    b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',name);b.title=name;
    const identity=document.createElement('span');identity.className='property-identity';identity.setAttribute('aria-hidden','true');identity.textContent=propertyInitials(name);
    const label=document.createElement('span');label.className='property-tab-label';label.textContent=name;
    b.append(identity);b.append(label);
    b.addEventListener('click',()=>{activeId=g.id;if(persist())loadActive();});host.append(b);
  });
  const entry=getEntry();entry.label=current.property_name;if(!persist())return;
  $('#property-heading').textContent=current.property_name;
  $('#property-identity').textContent=propertyInitials(current.property_name);
  $('#property-identity').setAttribute('data-tone',identityTone(activeId));
  const link=`${location.origin}/g/${activeId}`;
  $('#view-link').href=link;$('#download-qr').href=`/g/${activeId}/qr.svg`;$('#print-card').href=`/g/${activeId}/card`;
  for(const id of ['view-link','download-qr','print-card'])$('#'+id).removeAttribute('aria-disabled');
  $('#copy-link').disabled=false;$('#copy-link').textContent='Copy guest link';
  $('#open-qr').disabled=false;$('#download-qr').download=qrFilename(current.property_name,'svg');
  const grid=$('#editor-grid');grid.replaceChildren();
  for(const sec of FIELDS){
    const state=sectionState(sec,current),label={empty:'Empty',started:'Started',complete:'Complete'}[state];
    const b=document.createElement('button');b.type='button';b.className='editor-card';
    b.setAttribute('data-section',sec.id);b.setAttribute('data-state',state);
    b.setAttribute('aria-label',`${sec.title}: ${label}. ${state==='empty'?'Add information':'Edit section'}`);
    b.innerHTML=`<span class="editor-icon">${sectionIcon(sec.id)}</span><span class="editor-card-copy"><strong>${esc(sec.title)}</strong><small>${esc(sec.hint)}</small></span><span class="editor-card-footer"><span class="editor-card-state">${sectionStatusMark(state)}${label}</span><span class="editor-card-action">${state==='empty'?'Add':'Edit'} <span aria-hidden="true">→</span></span></span>`;
    b.addEventListener('click',()=>openEditor(sec,b));grid.append(b);
  }
  const checklist=$('#progress-checklist');checklist.replaceChildren();
  for(const sec of FIELDS){
    const state=sectionState(sec,current),item=document.createElement('li');
    item.setAttribute('data-section',sec.id);item.setAttribute('data-state',state);
    item.innerHTML=`${sectionStatusMark(state)}<span>${esc(sec.title)}</span><small>${{complete:'Complete',started:'Started',empty:'Empty'}[state]}</small>`;
    checklist.append(item);
  }
  const progress=guideProgress(current);
  $('#progress-summary').textContent=`${progress.complete} of ${progress.total} sections complete`;
  $('#progress-counts').textContent=`${progress.started} started · ${progress.empty} empty`;
  $('#section-progress').max=progress.total;$('#section-progress').value=progress.complete;
  $('#guide-progress').hidden=false;
  $('#card-counter').textContent=`${FIELDS.length} editable sections`;
  if(restoreTabFocus)host.querySelector('.property-tab.active')?.focus({preventScroll:true});
  revealPropertyTab();
  setStatus('All changes saved');
}
// Context changes force-close the editor; user dismissal goes through requestEditorClose.
let initialFields = {};
let editorOpener = null;
let editorSaving = false;
function editorValues(){
  const form=new FormData($('#section-form'));
  return Object.fromEntries(editing.fields.map(([key])=>[key,String(form.get(key)||'')]));
}
function setEditorSaving(saving){
  editorSaving=saving;
  $('#drawer-fields').disabled=saving;
  for(const id of ['save-editor','cancel-editor','close-drawer'])$('#'+id).disabled=saving;
  $('#save-editor').textContent=saving?'Saving…':'Save changes';
  $('#section-form').setAttribute('aria-busy',String(saving));
  $('#editor-status').textContent=saving?'Saving your changes. Please wait.':'';
  if(saving)$('#editor-status').focus({preventScroll:true});
}
function openEditor(section,opener){
  if(!current||storageProblem||editing)return;
  editorVersion++;
  editing=section;editorOpener=opener;
  initialFields=Object.fromEntries(section.fields.map(([key,,type])=>[key,type==='textarea'?String(current[key]||'').replace(/\r\n?/g,'\n'):String(current[key]||'').replace(/[\r\n]/g,'')]));
  $('#drawer-title').textContent=section.title;
  $('#drawer-description').textContent=section.hint;
  $('#drawer-fields').innerHTML=section.fields.map(([key,label,type,hint])=>`<div class="form-field"><label for="edit-${key}">${esc(label)}</label>${type==='textarea'?`<textarea id="edit-${key}" name="${key}" placeholder="${esc(hint)}" rows="5">${esc(initialFields[key])}</textarea>`:`<input id="edit-${key}" name="${key}" type="text" value="${esc(initialFields[key])}" placeholder="${esc(hint)}" ${key==='property_name'?'required maxlength="80"':''}>`}</div>`).join('');
  $('#editor-error').hidden=true;$('#editor-error').textContent='';
  setEditorSaving(false);
  const drawer=$('#editor-drawer');drawer.hidden=false;drawer.showModal();
  drawer.querySelector('input,textarea')?.focus();
  document.body.classList.add('drawer-open');
  sizeEditor();
}
function closeEditor(restoreFocus=false){
  const opener=editorOpener;
  editorVersion++;saveVersion++;editing=null;editorOpener=null;
  $('#discard-dialog').close();$('#discard-dialog').hidden=true;
  $('#editor-drawer').close();$('#editor-drawer').hidden=true;
  $('#drawer-overlay').hidden=true;
  document.body.classList.remove('drawer-open');setEditorSaving(false);
  if(restoreFocus&&opener?.isConnected)opener.focus({preventScroll:true});
}
function requestEditorClose(){
  if(!editing||editorSaving)return;
  const values=editorValues();
  if(editing.fields.some(([key])=>values[key]!==initialFields[key])){
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
  e.preventDefault();if(!editing||!current||storageProblem||editorSaving)return;
  const patch=editorValues(),sectionId=editing.id;
  if('property_name' in patch&&!patch.property_name.trim()){
    $('#editor-error').textContent='Please enter a property name.';
    $('#editor-error').hidden=false;$('#edit-property_name').focus();return;
  }
  const entry=getEntry(),version=loadVersion,drawer=editorVersion,save=++saveVersion;
  const isCurrent=()=>version===loadVersion&&entry.id===activeId&&drawer===editorVersion&&save===saveVersion&&!storageProblem;
  $('#editor-error').hidden=true;setEditorSaving(true);
  try{
    const d=await api(`/api/guides/${entry.id}`,{method:'PATCH',headers:{Authorization:`Bearer ${entry.token}`},body:JSON.stringify(patch)});
    if(!isCurrent())return;
    if(d.id!==entry.id)throw new Error();
    current=d.guide;closeEditor();render();
    if(!storageProblem)$('#editor-grid').querySelector(`[data-section="${sectionId}"]`)?.focus({preventScroll:true});
  }catch{
    if(isCurrent()){
      setEditorSaving(false);
      $('#editor-error').textContent='Your changes couldn’t be saved. They are still here. Check your connection and choose Save changes to try again.';
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
  const controls=[...$('#'+id).querySelectorAll('button,input,textarea,a[href],[tabindex]')].filter(el=>!el.matches(':disabled')&&el.tabIndex>=0&&el.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(!first){e.preventDefault();return;}
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
function closeQr(restoreFocus=false){
  qrVersion++;
  const opener=qrOpener;qrOpener=null;
  $('#qr-workspace').close();$('#qr-workspace').hidden=true;
  $('#download-png').disabled=false;$('#download-png').textContent='Download QR';
  $('#qr-download-status').textContent='';$('#qr-download-error').hidden=true;
  document.body.classList.remove('qr-open');
  if(restoreFocus&&opener?.isConnected)opener.focus({preventScroll:true});
}
$('#open-qr').addEventListener('click',()=>{
  if(!current||storageProblem)return;
  qrOpener=$('#open-qr');qrVersion++;
  $('#qr-property-name').textContent=current.property_name;
  $('#card-preview-name').textContent=current.property_name;$('#card-preview-qr').src='/g/'+activeId+'/qr.svg';
  const link=location.origin+'/g/'+activeId;
  $('#qr-destination').href=link;$('#qr-destination').textContent=link;
  const warning=previewWarning(link);$('#qr-url-warning').textContent=warning;$('#qr-url-warning').hidden=!warning;
  $('#qr-preview').src='/g/'+activeId+'/qr.svg';$('#qr-preview').alt='QR code for '+current.property_name+' guest guide';
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
    $('#qr-download-error').textContent='The QR preview couldn’t load. Close and reopen this workspace to retry, or open the welcome card.';$('#qr-download-error').hidden=false;
  }
});
$('#download-png').addEventListener('click',async()=>{
  if(!current||storageProblem||!$('#qr-workspace').open||$('#download-png').disabled)return;
  const id=activeId,name=current.property_name,load=loadVersion,version=qrVersion;
  const isCurrent=()=>current&&!storageProblem&&activeId===id&&load===loadVersion&&version===qrVersion&&$('#qr-workspace').open;
  $('#download-png').disabled=true;$('#download-png').textContent='Preparing…';
  $('#qr-download-error').hidden=true;$('#qr-download-status').textContent='Preparing your PNG image…';
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
    $('#qr-download-status').textContent='Your PNG download is ready. If it didn’t save, try again or use SVG.';
  }catch{
    if(isCurrent()){
      $('#qr-download-status').textContent='';$('#qr-download-error').textContent='Your QR image couldn’t be downloaded. Try Download QR again, or choose Download SVG.';
      $('#qr-download-error').hidden=false;$('#qr-download-error').focus();
    }
  }finally{if(isCurrent()){$('#download-png').disabled=false;$('#download-png').textContent='Download QR';}}
});
$('#create-form').addEventListener('submit',async e=>{
  e.preventDefault();const name=$('#first-name').value.trim();if(!name)return;
  const btn=$('#create-form button');btn.disabled=true;btn.textContent='Creating…';
  try{await createGuide({property_name:name});$('#first-name').value='';}
  catch(err){alert(err.message);}finally{btn.disabled=false;btn.textContent='Create my guide ↗';}
});
function newProperty(){if(storageProblem)return;loadVersion++;current=null;closeEditor();showEmpty();$('#first-name').focus();}
$('#new-property').addEventListener('click',newProperty);
$('#copy-link').addEventListener('click',async()=>{
  if(!current||storageProblem)return;
  const id=activeId,version=loadVersion,link=`${location.origin}/g/${id}`;
  const isCurrent=()=>current&&!storageProblem&&activeId===id&&loadVersion===version;
  try{await navigator.clipboard.writeText(link);if(isCurrent())$('#copy-link').textContent='Copied ✓';}
  catch{if(isCurrent())prompt('Copy your guest link:',link);}
});
restoreState();
