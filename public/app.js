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
const $ = selector => document.querySelector(selector);
const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let guides = JSON.parse(localStorage.getItem(STORAGE) || '[]');
let current = null;
let activeId = localStorage.getItem(ACTIVE) || guides[0]?.id;
let editing = null;
function persist(){localStorage.setItem(STORAGE,JSON.stringify(guides));localStorage.setItem(ACTIVE,activeId||'');}
function showEmpty(){ $('#empty-state').hidden=false;$('#editor-shell').hidden=true;}
function showEditor(){ $('#empty-state').hidden=true;$('#editor-shell').hidden=false;}
function setStatus(msg){ $('#save-status').textContent=msg; }
async function api(path,options={}){
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Something went wrong');return data;
}
async function createGuide(model){
  const data=await api('/api/guides',{method:'POST',body:JSON.stringify(model)});
  guides.push({id:data.id,token:data.token});activeId=data.id;persist();await loadActive();
}
function getEntry(){return guides.find(g=>g.id===activeId);}
async function loadActive(){
  const entry=getEntry();if(!entry){showEmpty();return;}
  try{
    const d=await api(`/api/guides/${entry.id}`,{headers:{Authorization:`Bearer ${entry.token}`}});
    current=d.guide;render();showEditor();
  }catch(e){showEmpty();$('#empty-state h2').textContent='This guide is unavailable.';$('#empty-state p').textContent=e.message;}
}
function render(){
  const host=$('#property-tabs');host.replaceChildren();
  guides.forEach((g,index)=>{
    const b=document.createElement('button');b.type='button';b.className='property-tab'+(g.id===activeId?' active':'');b.textContent=g.id===activeId?current.property_name:(g.label||`Property ${index+1}`);b.addEventListener('click',()=>{activeId=g.id;persist();loadActive();});host.append(b);
  });
  const entry=getEntry();entry.label=current.property_name;persist();
  $('#property-heading').textContent=current.property_name;
  const link=`${location.origin}/g/${activeId}`;
  $('#view-link').href=link;$('#download-qr').href=`/g/${activeId}/qr.svg`;$('#print-card').href=`/g/${activeId}/card`;
  const grid=$('#editor-grid');grid.replaceChildren();let done=0;
  for(const sec of FIELDS){const filled=sec.fields.some(([key])=>Boolean(current[key]?.trim()));if(filled)done++;
    const b=document.createElement('button');b.type='button';b.className='editor-card';
    b.innerHTML=`<span class="editor-icon">${sec.icon}</span><span class="editor-card-copy"><strong>${esc(sec.title)}</strong><small>${esc(sec.hint)}</small></span><span class="editor-card-state">${filled?'Added ✓':'Add ↗'}</span>`;
    b.addEventListener('click',()=>openEditor(sec));grid.append(b);
  }
  $('#card-counter').textContent=`${done} of ${FIELDS.length} sections started`;
  setStatus('All changes saved');
}
function openEditor(section){
  editing=section;$('#drawer-title').textContent=section.title;
  $('#drawer-fields').innerHTML=section.fields.map(([key,label,type,hint])=>`<div class="form-field"><label for="edit-${key}">${esc(label)}</label>${type==='textarea'?`<textarea id="edit-${key}" name="${key}" placeholder="${esc(hint)}" rows="5">${esc(current[key]||'')}</textarea>`:`<input id="edit-${key}" name="${key}" type="text" value="${esc(current[key]||'')}" placeholder="${esc(hint)}">`}</div>`).join('')+`<p class="field-tip">Changes to this section are reflected instantly in the same guest link after saving.</p>`;
  $('#editor-drawer').hidden=false;$('#drawer-overlay').hidden=false;$('#editor-drawer').querySelector('input,textarea')?.focus();
  document.body.classList.add('drawer-open');
}
function closeEditor(){editing=null;$('#editor-drawer').hidden=true;$('#drawer-overlay').hidden=true;document.body.classList.remove('drawer-open');}
$('#section-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!editing)return;const form=new FormData(e.target);const patch={};for(const [key] of editing.fields)patch[key]=String(form.get(key)||'');
  const b=$('#save-editor');b.disabled=true;b.textContent='Saving…';
  try{const entry=getEntry();const d=await api(`/api/guides/${activeId}`,{method:'PATCH',headers:{Authorization:`Bearer ${entry.token}`},body:JSON.stringify(patch)});current=d.guide;closeEditor();render();}
  catch(err){alert(err.message);}
  finally{b.disabled=false;b.textContent='Save changes';}
});
$('#close-drawer').addEventListener('click',closeEditor);$('#cancel-editor').addEventListener('click',closeEditor);$('#drawer-overlay').addEventListener('click',closeEditor);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&editing)closeEditor();});
$('#create-form').addEventListener('submit',async e=>{
  e.preventDefault();const name=$('#first-name').value.trim();if(!name)return;
  const btn=$('#create-form button');btn.disabled=true;btn.textContent='Creating…';
  try{await createGuide({property_name:name});$('#first-name').value='';}
  catch(err){alert(err.message);}finally{btn.disabled=false;btn.textContent='Create my guide ↗';}
});
function newProperty(){showEmpty();$('#first-name').focus();}
$('#new-property').addEventListener('click',newProperty);$('#add-tab').addEventListener('click',newProperty);
$('#copy-link').addEventListener('click',async()=>{
  const link=`${location.origin}/g/${activeId}`;try{await navigator.clipboard.writeText(link);$('#copy-link').textContent='Copied ✓';}
  catch{prompt('Copy your guest link:',link);}
});
if(guides.length)loadActive();else showEmpty();
