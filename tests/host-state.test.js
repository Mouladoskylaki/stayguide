import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const helpers=fs.readFileSync(new URL('../public/qr-tools.js',import.meta.url),'utf8').replaceAll('export ','');
const source=helpers+'\n'+fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
const STORAGE='stayguide-demo-properties',ACTIVE='stayguide-demo-active';
const a={id:'a'.repeat(16),token:'a'.repeat(64)},b={id:'b'.repeat(16),token:'b'.repeat(64)};
const response=(entry,name)=>({id:entry.id,guide:{property_name:name,wifi_name:name+' network'}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// Run the actual host entrypoint, with only its browser boundary replaced.
function dashboard(initial={},options={}){
  const values=new Map(Object.entries(initial)),writes=[],requests=[],alerts=[],prompts=[];
  class Element {
    constructor(){this.hidden=false;this.disabled=false;this.children=[];this.listeners={};this.attributes={};this.textContent='';this.value='';this.classList={add(){},remove(){},contains:name=>this.className?.split(' ').includes(name),toggle:(name,on)=>{const classes=new Set((this.className||'').split(' ').filter(Boolean));if(on)classes.add(name);else classes.delete(name);this.className=[...classes].join(' ');}};}
    addEventListener(type,fn){this.listeners[type]=fn;}
    append(child){this.children.push(child);}
    replaceChildren(){this.children=[];}
    querySelector(){return element('#input');}
    querySelectorAll(){return this.children;}
    setAttribute(k,v){this.attributes[k]=String(v);}
    getAttribute(k){return this.attributes[k]??null;}
    removeAttribute(k){delete this.attributes[k];if(k==='href')delete this.href;}
    showModal(){this.open=true;}
    close(){this.open=false;}
    focus(){}
    click(){return this.listeners.click?.();}
  }
  const nodes=new Map();
  function element(selector){if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);}
  element('#state-recovery').hidden=true;element('#editor-shell').hidden=true;
  const localStorage={
    getItem(key){if(options.readFailure)throw Error('private storage details');return values.get(key)??null;},
    setItem(key,value){if(options.writeFailure||writes.length===options.failAfter)throw Error('private storage details');values.set(key,String(value));writes.push(key);}
  };
  const context=vm.createContext({
    URL,document:{querySelector:element,createElement:()=>new Element(),body:new Element(),addEventListener(){}},
    localStorage,location:{origin:'http://localhost'},navigator:{clipboard:{writeText:options.writeClipboard||(async()=>{})}},
    confirm:()=>options.confirm!==false,alert:msg=>alerts.push(msg),prompt:msg=>prompts.push(msg),
    FormData:class {get(key){return options.form?.[key]??'';}},
    fetch:(path,init)=>new Promise((resolve,reject)=>requests.push({path,init,fail:reject,reply:(body,ok=true)=>resolve({ok,json:async()=>body})}))
  });
  vm.runInContext(source,context);
  return {values,writes,requests,alerts,prompts,element,run:code=>vm.runInContext(code,context),options};
}

for(const [name,raw] of [
  ['malformed JSON','{broken'],['null','null'],['object','{}'],['string','"unexpected"'],
  ['non-object entry','[null]'],['missing token',JSON.stringify([{id:a.id}])],
  ['invalid ID',JSON.stringify([{...a,id:'invalid'}])],['invalid token',JSON.stringify([{...a,token:42}])],
  ['invalid label',JSON.stringify([{...a,label:{}}])],['duplicate IDs',JSON.stringify([a,a])],
  ['mixed valid and invalid entries',JSON.stringify([a,null])]
]){
  test('invalid saved state: '+name+' is preserved with recovery UI',()=>{
    const d=dashboard({[STORAGE]:raw});
    assert.equal(d.element('#state-recovery').hidden,false);
    assert.equal(d.element('#empty-state').hidden,true);
    assert.equal(d.element('#new-property').disabled,true);
    assert.equal(d.writes.length,0);assert.equal(d.requests.length,0);
    assert.ok(d.values.get(STORAGE)===raw);
    d.run('newProperty(); createGuide({property_name:"Blocked"})');
    assert.equal(d.requests.length,0);
  });
}
test('invalid active state preserves both original keys',()=>{
  const raw=JSON.stringify([a]);const d=dashboard({[STORAGE]:raw,[ACTIVE]:'unexpected'});
  assert.equal(d.element('#state-recovery').hidden,false);assert.equal(d.writes.length,0);
  assert.ok(d.values.get(STORAGE)===raw);assert.equal(d.values.get(ACTIVE),'unexpected');
});
test('fresh browser starts normally without writing storage',()=>{
  const d=dashboard();assert.equal(d.element('#state-recovery').hidden,true);
  assert.equal(d.element('#empty-state').hidden,false);assert.equal(d.writes.length,0);
});
test('recovery cancellation and retry do not replace invalid data',()=>{
  const raw='{broken';const d=dashboard({[STORAGE]:raw},{confirm:false});
  d.element('#reset-state').click();d.element('#retry-state').click();
  assert.equal(d.writes.length,0);assert.ok(d.values.get(STORAGE)===raw);
});
test('explicit fresh start backs up exact originals before replacement and preserves old backups',()=>{
  const raw='{broken',oldKey='stayguide-demo-recovery-old';
  const d=dashboard({[STORAGE]:raw,[ACTIVE]:a.id,[oldKey]:'existing recovery copy'});
  d.element('#reset-state').click();
  assert.match(d.writes[0],/^stayguide-demo-recovery-/);
  const copy=JSON.parse(d.values.get(d.writes[0]));
  assert.ok(copy.properties===raw);assert.ok(copy.active===a.id);
  assert.equal(d.values.get(oldKey),'existing recovery copy');assert.equal(d.values.get(STORAGE),'[]');
  assert.equal(d.element('#state-recovery').hidden,true);assert.equal(d.element('#new-property').disabled,false);
});
test('storage read or backup failure leaves recovery usable without leaking exception details',()=>{
  for(const options of [{readFailure:true},{writeFailure:true}]){
    const d=dashboard({[STORAGE]:'{broken'},options);d.element('#reset-state').click();
    assert.equal(d.element('#state-recovery').hidden,false);assert.equal(d.writes.length,0);
    assert.equal(d.alerts.length,0);assert.equal(d.element('#recovery-message').textContent.includes('private storage details'),false);
  }
});
test('retry loads repaired state and preserves correct owner authorization',async()=>{
  const d=dashboard({[STORAGE]:'{broken'});d.values.set(STORAGE,JSON.stringify([a]));
  d.element('#retry-state').click();assert.equal(d.requests.length,1);
  assert.ok(d.requests[0].init.headers.Authorization==='Bearer '+a.token);
  d.requests[0].reply(response(a,'Alpha'));await tick();
  assert.equal(d.element('#property-heading').textContent,'Alpha');assert.equal(d.element('#editor-shell').hidden,false);
});
async function loaded(){
  const d=dashboard({[STORAGE]:JSON.stringify([a,b]),[ACTIVE]:a.id});
  d.requests[0].reply(response(a,'Alpha'));await tick();return d;
}
test('out-of-order loads keep selected property, content, labels, links and auth associated',async()=>{
  const d=await loaded();const tabs=d.element('#property-tabs').children;
  tabs[1].click();assert.equal(d.element('#copy-link').disabled,true);
  assert.equal(d.element('#view-link').href,undefined);
  d.element('#editor-grid').children[0].click();assert.equal(d.run('editing'),null);
  tabs[0].click();d.requests[2].reply(response(a,'Alpha latest'));await tick();
  d.requests[1].reply(response(b,'Beta stale'));await tick();
  assert.equal(d.element('#property-heading').textContent,'Alpha latest');
  assert.equal(d.run('current.wifi_name'),'Alpha latest network');
  assert.equal(d.element('#view-link').href,'http://localhost/g/'+a.id);
  assert.ok(d.requests[1].init.headers.Authorization==='Bearer '+b.token);
  const saved=JSON.parse(d.values.get(STORAGE));assert.equal(saved[0].label,'Alpha latest');assert.equal(saved[1].label,undefined);
});
test('A-B-A switching ignores an older response even for the same property ID',async()=>{
  const d=await loaded();const tabs=d.element('#property-tabs').children;
  tabs[0].click();tabs[1].click();tabs[0].click();
  d.requests[3].reply(response(a,'Newest'));await tick();
  d.requests[1].reply(response(a,'Old Alpha'));d.requests[2].fail(Error('Old Beta failure'));await tick();
  assert.equal(d.element('#property-heading').textContent,'Newest');assert.equal(d.element('#editor-shell').hidden,false);
});
test('late success cannot undo the selected property load failure',async()=>{
  const d=await loaded();const tabs=d.element('#property-tabs').children;
  tabs[0].click();tabs[1].click();d.requests[2].fail(Error('Unavailable'));await tick();
  d.requests[1].reply(response(a,'Old'));await tick();assert.equal(d.element('#editor-shell').hidden,true);
  assert.equal(d.element('#empty-state h2').textContent,'This guide is unavailable.');
});
test('leaving for add-property invalidates pending loads',async()=>{
  const d=await loaded();d.element('#property-tabs').children[1].click();d.element('#new-property').click();
  d.requests[1].reply(response(b,'Late'));await tick();assert.equal(d.element('#editor-shell').hidden,true);
});
test('mismatched response ID cannot render or relabel the active property',async()=>{
  const d=await loaded();d.element('#property-tabs').children[1].click();
  d.requests[1].reply(response(a,'Wrong property'));await tick();
  assert.equal(d.element('#editor-shell').hidden,true);assert.equal(JSON.parse(d.values.get(STORAGE))[1].label,undefined);
});
test('late edit success or failure cannot replace another selected property',async()=>{
  for(const success of [true,false]){
    const d=await loaded();d.element('#editor-grid').children[1].click();
    const saving=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
    d.element('#property-tabs').children[1].click();d.requests[2].reply(response(b,'Beta'));await tick();
    if(success)d.requests[1].reply(response(a,'Edited Alpha'));else d.requests[1].fail(Error('Old edit error'));
    await saving;assert.equal(d.element('#property-heading').textContent,'Beta');assert.equal(d.alerts.length,0);
  }
});
test('normal editing saves to the selected property with its owner token',async()=>{
  const d=await loaded();d.element('#property-tabs').children[1].click();d.requests[1].reply(response(b,'Beta'));await tick();
  d.element('#editor-grid').children[1].click();d.options.form={wifi_name:'Saved network'};
  const saving=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  assert.equal(d.requests[2].path,'/api/guides/'+b.id);assert.equal(d.requests[2].init.method,'PATCH');
  assert.ok(d.requests[2].init.headers.Authorization==='Bearer '+b.token);
  assert.equal(JSON.parse(d.requests[2].init.body).wifi_name,'Saved network');
  d.requests[2].reply(response(b,'Beta saved'));await saving;
  assert.equal(d.element('#property-heading').textContent,'Beta saved');assert.equal(d.element('#editor-drawer').hidden,true);
});

test('a failed reset after backup retains recoverable original strings',()=>{
  const raw='{broken';const d=dashboard({[STORAGE]:raw,[ACTIVE]:a.id},{failAfter:1});
  d.element('#reset-state').click();
  const copy=JSON.parse(d.values.get(d.writes[0]));
  assert.ok(copy.properties===raw&&copy.active===a.id);
  assert.equal(d.element('#state-recovery').hidden,false);
});
test('stale save completion does not unlock a newer save',async()=>{
  const d=await loaded();d.element('#editor-grid').children[1].click();
  const first=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  d.element('#property-tabs').children[1].click();d.requests[2].reply(response(b,'Beta'));await tick();
  d.element('#editor-grid').children[1].click();
  const second=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  d.requests[1].reply(response(a,'Old Alpha'));await first;
  assert.equal(d.element('#save-editor').disabled,true);
  d.requests[3].reply(response(b,'Saved Beta'));await second;
  assert.equal(d.element('#save-editor').disabled,false);
  assert.equal(d.element('#property-heading').textContent,'Saved Beta');
});
test('duplicate saves and dismissal are blocked until the pending save settles',async()=>{
  const d=await loaded();d.element('#editor-grid').children[1].click();
  const first=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  await d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  d.element('#cancel-editor').click();
  assert.equal(d.requests.length,2);
  assert.equal(d.element('#editor-drawer').hidden,false);
  assert.equal(d.element('#save-editor').disabled,true);
  d.requests[1].reply(response(a,'Saved once'));await first;
  assert.equal(d.element('#property-heading').textContent,'Saved once');
});
test('unchanged fields close directly; edited and reverted values do not warn',async()=>{
  const d=await loaded();d.element('#editor-grid').children[1].click();
  d.options.form={wifi_name:'Alpha network'};
  d.element('#cancel-editor').click();
  assert.equal(d.element('#editor-drawer').hidden,true);
  assert.notEqual(d.element('#discard-dialog').open,true);
});
test('dirty dismissal preserves values until explicit discard, including Escape',async()=>{
  const d=await loaded();d.element('#editor-grid').children[1].click();
  d.options.form={wifi_name:'Draft network'};
  d.element('#editor-drawer').listeners.cancel({preventDefault(){}});
  assert.equal(d.element('#discard-dialog').open,true);
  d.element('#keep-editing').click();
  assert.equal(d.element('#editor-drawer').hidden,false);
  assert.equal(d.options.form.wifi_name,'Draft network');
  d.element('#close-drawer').click();d.element('#discard-changes').click();
  assert.equal(d.element('#editor-drawer').hidden,true);assert.equal(d.requests.length,1);
});
test('failed save retains draft, reports a sanitized inline error and permits retry',async()=>{
  const d=await loaded();d.element('#editor-grid').children[1].click();
  d.options.form={wifi_name:'Draft network'};
  const first=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  d.requests[1].fail(Error('private response details'));await first;
  assert.equal(d.element('#editor-drawer').hidden,false);
  assert.equal(d.element('#editor-error').hidden,false);
  assert.match(d.element('#editor-error').textContent,/try again/);
  assert.ok(!d.element('#editor-error').textContent.includes('private'));
  assert.equal(d.alerts.length,0);assert.equal(d.options.form.wifi_name,'Draft network');
  assert.equal(d.element('#save-editor').disabled,false);
  const retry=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  assert.equal(JSON.parse(d.requests[2].init.body).wifi_name,'Draft network');
  d.requests[2].reply(response(a,'Saved retry'));await retry;
  assert.equal(d.element('#editor-drawer').hidden,true);
});
test('blank property name receives inline validation without an API request',async()=>{
  const d=await loaded();d.element('#editor-grid').children[0].click();d.options.form={property_name:'   '};
  await d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  assert.equal(d.requests.length,1);assert.equal(d.element('#editor-error').hidden,false);
});

const progressOf=(d,model)=>JSON.parse(d.run(`JSON.stringify(guideProgress(${JSON.stringify(model)}))`));
for(const [name,model,expected] of [
  ['empty',{},[0,0,10]],
  ['name alone',{property_name:'House'},[0,1,9]],
  ['partial multi-field sections',{property_name:'House',wifi_name:'Network',checkin:'After 3'},[0,3,7]],
  ['mixed complete and started',{property_name:'House',welcome:'Welcome',wifi_name:'Network',rules:'Quiet hours'},[2,1,7]],
  ['whitespace only',{property_name:'  ',welcome:'\n',wifi_name:' '},[0,0,10]]
]){
  test('saved progress: '+name,()=>{
    const d=dashboard(),p=progressOf(d,model);
    assert.deepEqual([p.complete,p.started,p.empty],expected);assert.equal(p.total,10);
  });
}
test('all ten sections complete only when all existing fields have text',()=>{
  const d=dashboard();const model=d.run(`Object.fromEntries(FIELDS.flatMap(s=>s.fields.map(([key])=>[key,'Saved text'])))`);
  assert.deepEqual(progressOf(d,model),{complete:10,started:0,empty:0,total:10});
  delete model.checkout;
  assert.deepEqual(progressOf(d,model),{complete:9,started:1,empty:0,total:10});
});
test('property initials handle whitespace, single names and Unicode without new stored fields',()=>{
  const d=dashboard();
  assert.equal(d.run(`propertyInitials(' Sea View Villa ')`),'SV');
  assert.equal(d.run(`propertyInitials('Cottage')`),'CO');
  assert.equal(d.run(`propertyInitials('Σπίτι Θέα')`),'ΣΘ');
  assert.equal(d.run(`propertyInitials('')`),'·');
});
test('ten cards report saved empty/started/complete states and explicit editing actions',async()=>{
  const d=dashboard({[STORAGE]:JSON.stringify([a]),[ACTIVE]:a.id});
  d.requests[0].reply({id:a.id,guide:{property_name:'House',wifi_name:'Network',rules:'Saved rule'}});await tick();
  const cards=d.element('#editor-grid').children;assert.equal(cards.length,10);
  assert.equal(cards[0].getAttribute('data-state'),'started');
  assert.equal(cards[1].getAttribute('data-state'),'started');
  assert.equal(cards[2].getAttribute('data-state'),'empty');
  assert.equal(cards[3].getAttribute('data-state'),'complete');
  assert.match(cards[3].getAttribute('aria-label'),/Complete.*Edit section/);
  assert.match(cards[2].getAttribute('aria-label'),/Empty.*Add information/);
  assert.equal(d.element('#progress-summary').textContent,'1 of 10 sections complete');
  assert.equal(d.element('#progress-counts').textContent,'2 started · 7 empty');
});
test('progress updates only after successful save and stays accurate after reload',async()=>{
  const d=await loaded();
  d.element('#editor-grid').children[0].click();d.options.form={property_name:'Alpha',welcome:'Welcome'};
  const saving=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  assert.equal(d.element('#progress-summary').textContent,'0 of 10 sections complete');
  const model={property_name:'Alpha',welcome:'Welcome',wifi_name:'Alpha network'};
  d.requests[1].reply({id:a.id,guide:model});await saving;
  assert.equal(d.element('#progress-summary').textContent,'1 of 10 sections complete');
  assert.equal(d.element('#section-progress').value,1);
  const reload=dashboard(Object.fromEntries(d.values));reload.requests[0].reply({id:a.id,guide:model});await tick();
  assert.equal(reload.element('#progress-summary').textContent,'1 of 10 sections complete');
  assert.equal(reload.element('#progress-counts').textContent,'1 started · 8 empty');
});
test('switching hides progress and disables all quick actions; stale results cannot replace selected progress',async()=>{
  const d=await loaded(),tabs=d.element('#property-tabs').children;
  tabs[0].click();tabs[1].click();
  assert.equal(d.element('#guide-progress').hidden,true);assert.equal(d.element('#progress-summary').textContent,'');
  assert.equal(d.element('#copy-link').disabled,true);
  for(const id of ['view-link','download-qr','print-card']){
    assert.equal(d.element('#'+id).href,undefined);assert.equal(d.element('#'+id).getAttribute('aria-disabled'),'true');
  }
  d.requests[2].reply({id:b.id,guide:{property_name:'Beta',rules:'Saved rule'}});await tick();
  d.requests[1].reply({id:a.id,guide:{property_name:'Alpha',welcome:'Saved',rules:'Saved',contact:'Saved'}});await tick();
  assert.equal(d.element('#progress-summary').textContent,'1 of 10 sections complete');
  assert.equal(d.element('#progress-counts').textContent,'1 started · 8 empty');
  assert.equal(d.element('#view-link').href,'http://localhost/g/'+b.id);
  assert.equal(d.element('#download-qr').href,'/g/'+b.id+'/qr.svg');
  assert.equal(d.element('#print-card').href,'/g/'+b.id+'/card');
  assert.equal(d.element('#copy-link').disabled,false);
  for(const id of ['view-link','download-qr','print-card'])assert.equal(d.element('#'+id).getAttribute('aria-disabled'),null);
});
test('stale failure cannot hide the current progress; current failure removes its actions',async()=>{
  const d=await loaded(),tabs=d.element('#property-tabs').children;
  tabs[0].click();tabs[1].click();d.requests[2].reply({id:b.id,guide:{property_name:'Beta',contact:'Saved'}});await tick();
  d.requests[1].fail(Error('Stale load'));await tick();
  assert.equal(d.element('#guide-progress').hidden,false);assert.equal(d.element('#section-progress').value,1);
  d.element('#property-tabs').children[0].click();d.requests[3].fail(Error('Current failure'));await tick();
  assert.equal(d.element('#guide-progress').hidden,true);assert.equal(d.element('#copy-link').disabled,true);
  assert.equal(d.element('#view-link').href,undefined);
});
test('inactive identity labels preserve long names and use text rather than HTML',async()=>{
  const name='<img src=x onerror=alert(1)> '+ 'x'.repeat(40);
  const d=dashboard({[STORAGE]:JSON.stringify([{...a,label:name},b]),[ACTIVE]:b.id});
  d.requests[0].reply(response(b,'Beta'));await tick();
  const tab=d.element('#property-tabs').children[0];
  assert.equal(tab.getAttribute('aria-label'),name);assert.equal(tab.children[1].textContent,name);
  assert.equal(tab.innerHTML,undefined);assert.equal(tab.children[0].getAttribute('aria-hidden'),'true');
});
test('late clipboard completion or failure cannot claim a different selected property was copied',async()=>{
  for(const fail of [false,true]){
    let resolve,reject;
    const d=dashboard({[STORAGE]:JSON.stringify([a,b]),[ACTIVE]:a.id},{writeClipboard:()=>new Promise((yes,no)=>{resolve=yes;reject=no;})});
    d.requests[0].reply(response(a,'Alpha'));await tick();
    const copying=d.element('#copy-link').click();d.element('#property-tabs').children[1].click();
    d.requests[1].reply(response(b,'Beta'));await tick();
    if(fail)reject(Error('Clipboard failed'));else resolve();await copying;
    assert.equal(d.element('#copy-link').textContent,'Copy guest link');assert.equal(d.prompts.length,0);
  }
});
test('rejected drafts do not advance saved progress',async()=>{
  const d=await loaded();d.element('#editor-grid').children[0].click();
  d.options.form={property_name:'Alpha',welcome:'Unsaved draft'};
  const saving=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  d.requests[1].reply({error:'Save failed'},false);await saving;
  assert.equal(d.element('#progress-summary').textContent,'0 of 10 sections complete');
  assert.equal(d.element('#progress-counts').textContent,'2 started · 8 empty');
});
test('a stale save cannot apply its more-complete progress to the current property',async()=>{
  const d=await loaded();d.element('#editor-grid').children[0].click();d.options.form={property_name:'Alpha',welcome:'Draft'};
  const saving=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  d.element('#property-tabs').children[1].click();
  d.requests[2].reply({id:b.id,guide:{property_name:'Beta',contact:'Saved contact'}});await tick();
  d.requests[1].reply({id:a.id,guide:{property_name:'Alpha',welcome:'Saved welcome',rules:'Saved rules',contact:'Saved contact'}});await saving;
  assert.equal(d.element('#progress-summary').textContent,'1 of 10 sections complete');
  assert.equal(d.element('#progress-counts').textContent,'1 started · 8 empty');
});

test('editor baseline normalizes browser line endings without losing multiline content',async()=>{
  const d=await loaded();d.run("current.welcome='First line\\r\\nSecond line'");
  d.element('#editor-grid').children[0].click();
  assert.equal(d.run('initialFields.welcome'),'First line\nSecond line');
  d.options.form={property_name:'Alpha',welcome:'First line\nSecond line'};
  d.element('#cancel-editor').click();
  assert.equal(d.element('#editor-drawer').hidden,true);
});


test('QR workspace uses the active property, safe filenames and a local-link warning',async()=>{
  const d=await loaded();d.element('#open-qr').click();
  assert.equal(d.element('#qr-workspace').open,true);
  assert.equal(d.element('#qr-property-name').textContent,'Alpha');
  assert.equal(d.element('#qr-destination').textContent,'http://localhost/g/'+a.id);
  assert.equal(d.element('#qr-preview').src,'/g/'+a.id+'/qr.svg');
  assert.equal(d.element('#download-qr').download,'alpha-qr.svg');
  assert.equal(d.element('#qr-url-warning').hidden,false);
  assert.match(d.element('#qr-url-warning').textContent,/unsuitable for permanent/);
  d.element('#property-tabs').children[1].click();
  assert.equal(d.element('#qr-workspace').hidden,true);assert.equal(d.element('#open-qr').disabled,true);
  assert.equal(d.element('#qr-destination').textContent,'');
  d.requests[1].reply(response(b,'Beta'));await tick();d.element('#open-qr').click();
  assert.equal(d.element('#qr-property-name').textContent,'Beta');
  assert.equal(d.element('#qr-destination').href,'http://localhost/g/'+b.id);
});
test('stale QR download completion cannot unlock or overwrite another property workspace',async()=>{
  const d=await loaded();d.element('#open-qr').click();
  const first=d.element('#download-png').click();
  assert.equal(d.requests[1].path,'/g/'+a.id+'/qr.svg');
  assert.equal(d.requests[1].init.credentials,'same-origin');assert.equal(d.requests[1].init.headers,undefined);
  d.element('#property-tabs').children[1].click();d.requests[2].reply(response(b,'Beta'));await tick();
  d.element('#open-qr').click();const second=d.element('#download-png').click();
  d.requests[1].fail(Error('private old failure'));await first;
  assert.equal(d.element('#download-png').disabled,true);
  assert.equal(d.element('#qr-download-error').hidden,true);
  assert.equal(d.element('#qr-property-name').textContent,'Beta');
  d.requests[3].fail(Error('private current failure'));await second;
  assert.equal(d.element('#download-png').disabled,false);
  assert.equal(d.element('#qr-download-error').hidden,false);
  assert.ok(!d.element('#qr-download-error').textContent.includes('private'));
});

test('SG-UX-01 checklist mirrors saved section states and clears on property switch',async()=>{
  const d=await loaded();
  const checklist=d.element('#progress-checklist').children,cards=d.element('#editor-grid').children;
  assert.equal(checklist.length,10);
  checklist.forEach((row,i)=>{assert.equal(row.getAttribute('data-section'),cards[i].getAttribute('data-section'));assert.equal(row.getAttribute('data-state'),cards[i].getAttribute('data-state'));});
  assert.match(checklist[0].innerHTML,/Started/);assert.match(checklist[2].innerHTML,/Empty/);
  d.element('#open-qr').click();assert.equal(d.element('#card-preview-name').textContent,'Alpha');
  assert.equal(d.element('#card-preview-qr').src,d.element('#qr-preview').src);
  d.element('#property-tabs').children[1].click();
  assert.equal(d.element('#progress-checklist').children.length,0);
  assert.equal(d.element('#card-preview-name').textContent,'');
  assert.equal(d.element('#card-preview-qr').getAttribute('src'),null);
});
