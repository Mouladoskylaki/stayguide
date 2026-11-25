import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHostI18n,HOST_LANGUAGES} from '../public/host-i18n.js';
import fs from 'node:fs';
import {handleRequest} from '../src/worker.js';
import {createLocalDb} from '../node/db.mjs';

const helpers=fs.readFileSync(new URL('../public/qr-tools.js',import.meta.url),'utf8').replaceAll('export ','');
const source=helpers+'\n'+fs.readFileSync(new URL('../public/guide-content.js',import.meta.url),'utf8').replaceAll('export ','')+'\n'+fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'');
const STORAGE='stayguide-demo-properties',ACTIVE='stayguide-demo-active';
const a={id:'a'.repeat(16),token:'a'.repeat(64)},b={id:'b'.repeat(16),token:'b'.repeat(64)};
const response=(entry,name)=>({id:entry.id,revision:'1'.repeat(64),guide:{property_name:name,wifi_name:name+' network'}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// Run the actual host entrypoint, with only its browser boundary replaced.
function dashboard(initial={},options={}){
  const values=new Map(Object.entries(initial)),writes=[],requests=[],alerts=[],prompts=[],confirmations=[],capabilityRequests=[];
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
    focus(){this.focused=true;}
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
    URL,URLSearchParams,createHostI18n,HOST_LANGUAGES,document:{documentElement:{lang:"en-GB"},querySelectorAll:()=>[...nodes.values()].filter(n=>Object.keys(n.attributes).some(a=>a.startsWith("data-i18n"))),querySelector:element,createElement:()=>new Element(),body:new Element(),addEventListener(){}},
    localStorage,location:{origin:'http://localhost'},navigator:{clipboard:{writeText:options.writeClipboard||(async()=>{})}},
    confirm:msg=>{confirmations.push(msg);return options.confirm!==false;},alert:msg=>alerts.push(msg),prompt:msg=>prompts.push(msg),
    FormData:class {get(key){return element('#drawer-fields').disabled?'':options.form?.[key]??'';}},
    fetch:(path,init)=>{
      if(options.ownerApi){requests.push({path,init});return options.ownerApi(path,init);}
      if(path.includes('/translation-capabilities?')){
        capabilityRequests.push({path,init});if(options.capabilityError)return Promise.reject(Error('PRIVATE_CAPABILITY_ERROR'));
        const version=Number(new URL(path,'http://localhost').searchParams.get('expectedSourceVersion'));
        return Promise.resolve({ok:true,json:async()=>({generationAvailable:false,testOnly:false,state:'unavailable',sourceVersion:version,...options.capability})});
      }
      return new Promise((resolve,reject)=>requests.push({path,init,fail:reject,reply:(body,ok=true,status=ok?200:503)=>resolve({ok,status,json:async()=>body})}));
    }
  });
  vm.runInContext(source,context);
  return {values,writes,requests,alerts,prompts,confirmations,capabilityRequests,element,run:code=>vm.runInContext(code,context),options};
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
  assert.equal(d.requests[2].init.headers['If-Match'],'"'+'1'.repeat(64)+'"');
  assert.equal(JSON.parse(d.requests[2].init.body).wifi_name,'Saved network');
  d.requests[2].reply(response(b,'Beta saved'));await saving;
  assert.equal(d.element('#property-heading').textContent,'Beta saved');assert.equal(d.element('#editor-drawer').hidden,true);
});

test('successful saves advance the retained revision for the next edit',async()=>{
  const d=await loaded();d.element('#editor-grid').children[1].click();d.options.form={wifi_name:'First save'};
  const saving=d.element('#section-form').listeners.submit({preventDefault(){}});
  assert.equal(d.requests[1].init.headers['If-Match'],'"'+'1'.repeat(64)+'"');
  d.requests[1].reply({...response(a,'First save'),revision:'3'.repeat(64)});await saving;
  d.element('#editor-grid').children[1].click();d.options.form={wifi_name:'Second save'};
  const second=d.element('#section-form').listeners.submit({preventDefault(){}});
  assert.equal(d.requests[2].init.headers['If-Match'],'"'+'3'.repeat(64)+'"');d.requests[2].reply({...response(a,'Second save'),revision:'4'.repeat(64)});await second;
});
test('409 keeps the draft and stale revision, announces conflict and never retries or refreshes automatically',async()=>{
  const d=await loaded();d.element('#editor-grid').children[1].click();d.options.form={wifi_name:'My unsaved text'};
  const saving=d.element('#section-form').listeners.submit({preventDefault(){}});
  d.requests[1].reply({error:'Changed elsewhere',revision:'9'.repeat(64)},false,409);await saving;
  assert.equal(d.options.form.wifi_name,'My unsaved text');assert.equal(d.run('currentRevision'),'1'.repeat(64));
  assert.equal(d.element('#editor-drawer').open,true);assert.equal(d.element('#save-editor').disabled,true);assert.equal(d.element('#drawer-fields').disabled,false);
  assert.match(d.element('#editor-error').textContent,/another tab or device/);assert.match(d.element('#editor-error').textContent,/Copy your changes/);assert.equal(d.element('#editor-error').focused,true);
  await d.element('#section-form').listeners.submit({preventDefault(){}});assert.equal(d.requests.length,2);
});
test('missing revision from a legacy server fails closed before editor rendering',async()=>{
  const d=dashboard({[STORAGE]:JSON.stringify([a]),[ACTIVE]:a.id});d.requests[0].reply({id:a.id,guide:{property_name:'Legacy'}});await tick();
  assert.equal(d.element('#editor-shell').hidden,true);assert.equal(d.run('currentRevision'),null);
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
  d.requests[0].reply({id:a.id,revision:'1'.repeat(64),guide:{property_name:'House',wifi_name:'Network',rules:'Saved rule'}});await tick();
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
  d.requests[1].reply({id:a.id,revision:'1'.repeat(64),guide:model});await saving;
  assert.equal(d.element('#progress-summary').textContent,'1 of 10 sections complete');
  assert.equal(d.element('#section-progress').value,1);
  const reload=dashboard(Object.fromEntries(d.values));reload.requests[0].reply({id:a.id,revision:'1'.repeat(64),guide:model});await tick();
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
  d.requests[2].reply({id:b.id,revision:'2'.repeat(64),guide:{property_name:'Beta',rules:'Saved rule'}});await tick();
  d.requests[1].reply({id:a.id,revision:'1'.repeat(64),guide:{property_name:'Alpha',welcome:'Saved',rules:'Saved',contact:'Saved'}});await tick();
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
  tabs[0].click();tabs[1].click();d.requests[2].reply({id:b.id,revision:'2'.repeat(64),guide:{property_name:'Beta',contact:'Saved'}});await tick();
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
  d.requests[2].reply({id:b.id,revision:'2'.repeat(64),guide:{property_name:'Beta',contact:'Saved contact'}});await tick();
  d.requests[1].reply({id:a.id,revision:'1'.repeat(64),guide:{property_name:'Alpha',welcome:'Saved welcome',rules:'Saved rules',contact:'Saved contact'}});await saving;
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

test('book exports ignore unsaved editor drafts and saving contexts',async()=>{
  const d=await loaded();d.element('#open-qr').click();
  d.run('editing={id:"welcome"}');await d.element('#book-form').listeners.submit({preventDefault(){}});
  assert.equal(d.run('bookTools'),undefined);assert.equal(d.element('#book-controls').disabled,false);
  d.run('editing=null;editorSaving=true');await d.element('#book-form').listeners.submit({preventDefault(){}});
  assert.equal(d.run('bookTools'),undefined);
});
test('book export captures accepted saved model once and guards duplicate submissions',async()=>{
  const d=await loaded();d.options.form={'book-size':'A4'};d.element('#open-qr').click();
  d.run('globalThis.bookCalls=0;globalThis.bookCaptured=null;bookTools=Promise.resolve({bookSnapshot(model,url){bookCaptured={...model};return {name:model.property_name,destination:url}},generateBook(snapshot,size,guard){bookCalls++;return new Promise(resolve=>globalThis.finishBook=()=>resolve(null))}})');
  const first=d.element('#book-form').listeners.submit({preventDefault(){}});await tick();
  await d.element('#book-form').listeners.submit({preventDefault(){}});
  assert.equal(d.run('bookCalls'),1);assert.equal(d.run('bookCaptured.property_name'),'Alpha');assert.equal(d.element('#book-controls').disabled,true);
  d.run('finishBook()');await first;assert.equal(d.element('#book-controls').disabled,false);
});
test('book errors from a closed or switched workspace cannot change the next property',async()=>{
 const d=await loaded();d.options.form={'book-size':'A5'};d.element('#open-qr').click();
 d.run('bookTools=Promise.resolve({bookSnapshot(model,url){return {name:model.property_name,destination:url}},generateBook(){return new Promise((resolve,reject)=>globalThis.rejectBook=reject)}})');
 const pending=d.element('#book-form').listeners.submit({preventDefault(){}});await tick();
 d.element('#property-tabs').children[1].click();d.requests.at(-1).reply(response(b,'Beta'));await tick();
 d.element('#open-qr').click();d.run('rejectBook(Error("PRIVATE exception details"))');await pending;
 assert.equal(d.element('#book-property-name').textContent,'For Beta');assert.equal(d.element('#book-status').textContent,'');assert.equal(d.element('#book-error').hidden,true);assert.equal(d.element('#book-controls').disabled,false);
});
test('book generation errors are private and retry controls recover',async()=>{
 const d=await loaded();d.options.form={'book-size':'A4'};d.element('#open-qr').click();
 d.run('bookTools=Promise.resolve({BookContentError:class extends Error{},bookSnapshot(){return {}},generateBook(){throw Error("private-secret-do-not-show")}})');
 await d.element('#book-form').listeners.submit({preventDefault(){}});
 assert.equal(d.element('#book-controls').disabled,false);assert.equal(d.element('#book-error').hidden,false);assert.ok(!d.element('#book-error').textContent.includes('private-secret'));assert.ok(d.element('#book-error').textContent.includes('retry'));
});
test('known owner credentials pasted into a Wi-Fi field cannot enter the PDF generator',async()=>{
 const d=await loaded();d.options.form={'book-size':'A4'};d.run('current.wifi_password=guides[0].token');d.element('#open-qr').click();
 d.run('bookTools=Promise.resolve({BookContentError:class extends Error{},bookSnapshot(){throw Error("must not project")},generateBook(){throw Error("must not generate")}})');
 await d.element('#book-form').listeners.submit({preventDefault(){}});
 assert.ok(d.element('#book-error').textContent.includes('owner editing credentials'));assert.ok(!d.element('#book-error').textContent.includes(a.token));assert.equal(d.element('#book-controls').disabled,false);
});

test('host locale switching retains actual editor draft, identity, revision and property storage with zero requests',async()=>{
 const d=await loaded();d.element('#editor-grid').children[1].click();d.options.form={wifi_name:'Unsaved Wi-Fi draft',wifi_password:'Synthetic draft'};
 const before=d.run('JSON.stringify({guides,current,currentRevision,activeId,initialFields,editorVersion,saveVersion,loadVersion,qrVersion})'),requests=d.requests.length,writes=d.writes.length,opener=d.run('editorOpener');
 for(const locale of ['el-GR','de-DE','fr-FR','it-IT','es-ES','en-GB']){
  d.run('hostI18n.setLocale('+JSON.stringify(locale)+');applyHostLanguage()');
  assert.equal(d.run('JSON.stringify({guides,current,currentRevision,activeId,initialFields,editorVersion,saveVersion,loadVersion,qrVersion})'),before);
  assert.equal(d.element('#editor-drawer').open,true);assert.equal(d.run('editorOpener'),opener);assert.equal(d.options.form.wifi_name,'Unsaved Wi-Fi draft');assert.equal(d.requests.length,requests);
  assert.equal(d.element('#save-editor').textContent,d.run('t("Save changes")'));
 }
 assert.deepEqual(d.writes.slice(writes),Array(6).fill('stayguide-host-locale'));
});
test('locale repaint keeps conflict draft and rejection state; save remains blocked',async()=>{
 const d=await loaded();d.element('#editor-grid').children[1].click();d.options.form={wifi_name:'Conflict draft'};
 const saving=d.element('#section-form').listeners.submit({preventDefault(){}});d.requests[1].reply({error:'conflict'},false,409);await saving;
 d.run('hostI18n.setLocale("el-GR");applyHostLanguage()');assert.equal(d.run('editorConflict'),true);assert.equal(d.element('#save-editor').disabled,true);assert.equal(d.options.form.wifi_name,'Conflict draft');
 assert.match(d.element('#editor-error').textContent,/άλλη καρτέλα/);await d.element('#section-form').listeners.submit({preventDefault(){}});assert.equal(d.requests.length,2);
});
test('locale repaint during a pending save preserves operation and sends original content only',async()=>{
 const d=await loaded();d.element('#editor-grid').children[1].click();d.options.form={wifi_name:'Authored network'};
 const saving=d.element('#section-form').listeners.submit({preventDefault(){}});d.run('hostI18n.setLocale("de-DE");applyHostLanguage()');
 assert.equal(d.run('editorSaving'),true);assert.equal(d.element('#save-editor').disabled,true);assert.equal(d.element('#save-editor').textContent,'Wird gespeichert…');
 assert.equal(JSON.parse(d.requests[1].init.body).wifi_name,'Authored network');d.requests[1].reply({...response(a,'Alpha'),revision:'2'.repeat(64)});await saving;
 assert.equal(d.run('currentRevision'),'2'.repeat(64));assert.equal(d.element('#save-status').textContent,'Alle Änderungen gespeichert');
});
test('host PDF validation errors localize field names and details without exposing unknown exceptions',()=>{
 const d=dashboard();d.run('hostI18n.setLocale("el-GR")');
 const errors=[
  'Property name contains characters unsupported by the book font (U+1F600). Edit that saved field and use supported text. Nothing was removed or replaced.',
  'Property name may contain private access or authentication information. Remove it from the saved guest content before exporting; share private arrival instructions separately.'
 ];
 for(const message of errors){d.run('const e'+errors.indexOf(message)+'=hostBookError('+JSON.stringify(message)+');ui("#book-error",e'+errors.indexOf(message)+'.key,e'+errors.indexOf(message)+'.values)');assert.match(d.element('#book-error').textContent,/Όνομα καταλύματος/);assert(!d.element('#book-error').textContent.includes('Property name'));}
 d.run('const unknown=hostBookError("SYNTHETIC_PRIVATE_DB_ERROR");ui("#book-error",unknown.key,unknown.values)');assert(!d.element('#book-error').textContent.includes('SYNTHETIC_PRIVATE_DB_ERROR'));
});

// C1: execute the real host UI with controlled owner-API replies, never a provider.
const sourceMeta=(language=null,version=1)=>({section:'welcome',sourceLanguage:language,sourceVersion:version,declared:language!==null});
async function translationEditor(metadata=sourceMeta()){
 const d=await loaded();d.options.form={property_name:'Alpha',welcome:''};d.element('#editor-grid').children[0].click();
 assert.equal(d.requests.length,1);d.element('#section-translations').open=true;
 const load=d.run('readSourceMetadata()');d.requests.at(-1).reply(metadata);await load;return d;
}
async function savedView(d,result,metadata=sourceMeta('en-GB',2),target='de-DE'){
 d.element('#translation-target').value=target;const read=d.run('readSavedTranslation()');d.requests.at(-1).reply(result);await tick();d.requests.at(-1).reply(metadata);await read;
}
const savedTranslation=(origin='generated',fields={welcome:'Saved German text.'},version=2)=>({status:'translated',language:'de-DE',providerMode:'openai',origin,fields,correction:{sourceVersion:version}});
test('C1 disclosure is optional, Wi-Fi ineligible and source is never inferred from UI locale',async()=>{
 const d=await translationEditor();assert.equal(d.element('#translation-source').value,'');assert.equal(d.element('#translation-target').disabled,true);assert.equal(d.element('#save-source-language').disabled,true);
 assert.equal(d.element('#translation-status').textContent,'Source language not declared.');
 const count=d.requests.length;
 for(const locale of Object.keys(HOST_LANGUAGES)){d.run(`hostI18n.setLocale(${JSON.stringify(locale)});applyHostLanguage()`);assert.equal(d.element('#translation-source').value,'');assert.equal(d.requests.length,count);}
 d.run('closeEditor();openEditor(FIELDS[1])');assert.equal(d.element('#section-translations').hidden,true);assert.equal(d.requests.length,count);
 assert.equal(d.run('translationSections.length'),9);
});
test('C1 first declaration submits only the exact saved source version and never guide content',async()=>{
 const d=await translationEditor();const before=d.run('JSON.stringify({current,currentRevision})');d.element('#translation-source').value='el-GR';
 const save=d.run('saveSourceLanguage()');const req=d.requests.at(-1);assert.equal(req.path,'/api/guides/'+a.id+'/translation-sources/welcome');assert.equal(req.init.method,'PATCH');assert.equal(req.init.headers.Authorization,'Bearer '+a.token);
 assert.deepEqual(JSON.parse(req.init.body),{sourceLanguage:'el-GR',expectedSourceVersion:1});assert.equal(d.element('#drawer-fields').disabled,true);assert.equal(d.element('#save-editor').disabled,true);
 const count=d.requests.length;await d.run('saveSourceLanguage()');await d.element('#section-form').listeners.submit({preventDefault(){}});assert.equal(d.requests.length,count);
 req.reply(sourceMeta('el-GR',2));await save;assert.equal(d.confirmations.length,0);assert.equal(d.element('#translation-status').textContent,'Source language saved.');assert.equal(d.run('JSON.stringify({current,currentRevision})'),before);
});
test('C1 same-language action is a no-op; changing a declared language needs explicit confirmation',async()=>{
 const d=await translationEditor(sourceMeta('en-GB',7));const count=d.requests.length;await d.run('saveSourceLanguage()');assert.equal(d.requests.length,count);assert.equal(d.confirmations.length,0);
 d.element('#translation-source').value='fr-FR';d.options.confirm=false;await d.run('saveSourceLanguage()');assert.equal(d.requests.length,count);assert.equal(d.confirmations.length,1);
 assert(d.confirmations[0].includes('previous translations will become unavailable'));
 d.options.confirm=true;const save=d.run('saveSourceLanguage()');assert.deepEqual(JSON.parse(d.requests.at(-1).init.body),{sourceLanguage:'fr-FR',expectedSourceVersion:7});d.requests.at(-1).reply(sourceMeta('fr-FR',8));await save;
 assert.equal(d.element('#translation-source').value,'fr-FR');
});
test('C1 409 never refreshes and resubmits; a fresh expectation requires an explicit read and choice',async()=>{
 const d=await translationEditor(sourceMeta('en-GB',2));d.element('#translation-source').value='fr-FR';const work=d.run('saveSourceLanguage()');d.requests.at(-1).reply({error:'PRIVATE SERVER DETAIL'},false,409);await work;
 assert(d.element('#translation-status').textContent.includes('changed elsewhere'));assert(!d.element('#translation-status').textContent.includes('PRIVATE'));assert.equal(d.element('#translation-source').disabled,true);
 const count=d.requests.length;await d.run('saveSourceLanguage()');assert.equal(d.requests.length,count);
 const refresh=d.run('readSourceMetadata()');d.requests.at(-1).reply(sourceMeta('de-DE',3));await refresh;assert.equal(d.requests.length,count+1);assert.equal(d.element('#translation-source').value,'de-DE');
 d.element('#translation-source').value='fr-FR';const save=d.run('saveSourceLanguage()');assert.equal(JSON.parse(d.requests.at(-1).init.body).expectedSourceVersion,3);d.requests.at(-1).reply(sourceMeta('fr-FR',4));await save;
});
test('C1 unsaved drafts and active guide saves block declaration without losing text',async()=>{
 const d=await translationEditor(sourceMeta('en-GB',2));d.options.form.welcome='Unsaved draft';d.element('#drawer-fields').listeners.input();d.element('#translation-source').value='fr-FR';const count=d.requests.length;await d.run('saveSourceLanguage()');assert.equal(d.requests.length,count);assert.equal(d.element('#translation-source').disabled,true);assert.equal(d.options.form.welcome,'Unsaved draft');
 d.options.form.welcome='';d.element('#drawer-fields').listeners.input();const saving=d.element('#section-form').listeners.submit({preventDefault(){}});const after=d.requests.length;await d.run('saveSourceLanguage()');assert.equal(d.requests.length,after);d.requests.at(-1).fail(Error('PRIVATE NETWORK DETAIL'));await saving;
 assert.equal(d.run('editorSaving'),false);assert.equal(d.options.form.welcome,'');
});
test('C1 saved/manual previews use plain text and accept only current OpenAI provenance',async()=>{
 for(const origin of ['generated','manual']){
  const d=await translationEditor(sourceMeta('en-GB',2));await savedView(d,savedTranslation(origin,{welcome:'<img src=x onerror=alert(1)>'}));assert.equal(d.element('#translation-preview').hidden,false);assert.equal(d.element('#translation-preview').children[1].textContent,'<img src=x onerror=alert(1)>');assert.equal(d.element('#translation-preview').children[1].innerHTML,undefined);
  assert.equal(d.element('#translation-status').textContent,origin==='manual'?'Manually corrected translation available.':'Current saved translation available.');
  assert.equal(d.element('#translation-preview').getAttribute('lang'),null);assert.equal(d.element('#translation-preview').children[1].getAttribute('lang'),'de-DE');
  assert(d.requests.filter(r=>r.path.includes('/translations?')).every(r=>!r.init.method||r.init.method==='GET'));
 }
 const d=await translationEditor(sourceMeta('en-GB',2));await savedView(d,{...savedTranslation(),providerMode:'mock'});assert.equal(d.element('#translation-preview').hidden,true);assert.equal(d.element('#translation-status').textContent,'Test output is not a saved AI translation.');
});
test('C1 original/missing views make no claims about safe generation or earlier attempts',async()=>{
 const d=await translationEditor(sourceMeta('en-GB',2));await savedView(d,{status:'original',language:'en-GB',fields:{welcome:'Original'}});assert.equal(d.element('#translation-status').textContent,'No current saved translation available.');assert.equal(d.element('#translation-preview').hidden,true);
 await savedView(d,{status:'original',language:'en-GB',fields:{welcome:'Original'}},sourceMeta('en-GB',2),'en-GB');assert.equal(d.element('#translation-status').textContent,'This is the original language.');
});
test('C1 stale source or cached version cannot be presented as current',async()=>{
 for(const version of [1,3]){
  const d=await translationEditor(sourceMeta('en-GB',2));await savedView(d,savedTranslation('generated',undefined,version));assert.equal(d.element('#translation-preview').hidden,true);assert(d.element('#translation-status').textContent.includes('could not be loaded'));
 }
 const d=await translationEditor(sourceMeta('en-GB',2));await savedView(d,savedTranslation(),sourceMeta('en-GB',3));assert.equal(d.element('#translation-preview').hidden,true);assert.equal(d.element('#translation-source').disabled,true);assert.equal(d.run('sectionTranslations.metadata.sourceVersion'),2);
});
test('C1 network, unauthorized and malformed replies are sanitized and never retried automatically',async()=>{
 for(const value of [null,{...sourceMeta(),sourceVersion:'1'},{...sourceMeta(),section:'rules'}]){
  const d=await translationEditor(value);assert.equal(d.element('#translation-source').disabled,true);assert.equal(d.requests.length,2);assert(d.element('#translation-status').textContent.includes('could not be loaded'));
 }
 const d=await translationEditor(sourceMeta('en-GB',2));d.element('#translation-source').value='fr-FR';const save=d.run('saveSourceLanguage()');d.requests.at(-1).fail(Error('PRIVATE_TRANSPORT_FAILURE'));await save;assert.equal(d.element('#translation-source').disabled,true);assert(!d.element('#translation-status').textContent.includes('PRIVATE'));assert.equal(d.requests.length,3);
 const e=await translationEditor(sourceMeta('en-GB',2));e.element('#translation-target').value='de-DE';const read=e.run('readSavedTranslation()');e.requests.at(-1).reply({error:'PRIVATE_AUTH'},false,401);await read;assert.equal(e.element('#translation-preview').hidden,true);assert.equal(e.requests.length,3);
});
test('C1 late metadata or source writes cannot repaint another property or a reopened editor',async()=>{
 for(const kind of ['read','write']){
  const d=await translationEditor(sourceMeta('en-GB',2));let work;
  if(kind==='read')work=d.run('readSourceMetadata()');else{d.element('#translation-source').value='fr-FR';work=d.run('saveSourceLanguage()');}
  const old=d.requests.at(-1);d.element('#property-tabs').children[1].click();d.requests.at(-1).reply(response(b,'Beta'));await tick();old.reply(sourceMeta('fr-FR',3));await work;
  assert.equal(d.element('#property-heading').textContent,'Beta');assert.equal(d.element('#translation-source-state').textContent,'');assert.equal(d.run('sectionTranslations'),null);
 }
 const d=await translationEditor();const old=d.run('readSourceMetadata()'),req=d.requests.at(-1);d.run('closeEditor();openEditor(FIELDS[0])');req.reply(sourceMeta('fr-FR',2));await old;assert.equal(d.element('#translation-source').value,'');
});
test('C1 target races, closing disclosure and typing discard obsolete results',async()=>{
 const d=await translationEditor(sourceMeta('en-GB',2));d.element('#translation-target').value='de-DE';const old=d.run('readSavedTranslation()'),first=d.requests.at(-1);d.element('#translation-target').value='fr-FR';const latest=d.run('readSavedTranslation()');
 d.requests.at(-1).reply({status:'original',language:'en-GB'});await tick();d.requests.at(-1).reply(sourceMeta('en-GB',2));await latest;first.reply(savedTranslation());await old;assert.equal(d.element('#translation-preview').hidden,true);
 d.element('#translation-target').value='de-DE';const work=d.run('readSavedTranslation()'),req=d.requests.at(-1);d.options.form.welcome='Draft during fetch';d.element('#drawer-fields').listeners.input();req.reply(savedTranslation());await work;assert.equal(d.element('#translation-preview').hidden,true);assert.equal(d.run('sectionTranslations.busy'),'');assert.equal(d.options.form.welcome,'Draft during fetch');
 d.options.form.welcome='';d.element('#drawer-fields').listeners.input();assert.equal(d.element('#refresh-translations').disabled,false);
});
test('C1 language switching preserves selected content languages, drafts and translated prose',async()=>{
 const d=await translationEditor(sourceMeta('en-GB',2));await savedView(d,savedTranslation());const count=d.requests.length,text=d.element('#translation-preview').children[1].textContent;
 for(const locale of Object.keys(HOST_LANGUAGES)){d.run(`hostI18n.setLocale(${JSON.stringify(locale)});applyHostLanguage()`);assert.equal(d.element('#translation-source').value,'en-GB');assert.equal(d.element('#translation-target').value,'de-DE');assert.equal(d.element('#translation-preview').children[1].textContent,text);assert.equal(d.requests.length,count);}
});
test('C1 disabled fields during a clean source write do not create a false dirty draft or discard prompt',async()=>{
 const d=await translationEditor();d.element('#translation-source').value='en-GB';const save=d.run('saveSourceLanguage()'),req=d.requests.at(-1);
 assert.equal(d.element('#drawer-fields').disabled,true);assert.equal(d.run('editorDirty()'),false);assert.equal(d.options.form.property_name,'Alpha');
 d.run('requestEditorClose()');assert.equal(d.element('#editor-drawer').open,false);assert.notEqual(d.element('#discard-dialog').open,true);
 req.reply(sourceMeta('en-GB',2));await save;assert.equal(d.run('sectionTranslations'),null);assert.equal(d.element('#translation-source-state').textContent,'');
});
test('C1 all nine section identities use their own owner metadata route; property-name and Wi-Fi fields are never sent',async()=>{
 const d=await loaded();const sections=JSON.parse(d.run('JSON.stringify(translationSections)'));
 for(const section of sections){
  d.run(`closeEditor();openEditor(FIELDS.find(s=>s.id===${JSON.stringify(section)}))`);d.options.form=JSON.parse(d.run('JSON.stringify(initialFields)'));d.element('#section-translations').open=true;
  const read=d.run('readSourceMetadata()'),request=d.requests.at(-1);assert.equal(request.path,`/api/guides/${a.id}/translation-sources/${section}`);assert.equal(request.init.body,undefined);assert.equal(request.init.headers.Authorization,'Bearer '+a.token);
  request.reply({...sourceMeta(),section});await read;assert.equal(d.element('#section-translations').hidden,false);assert.equal(d.element('#translation-source').value,'');
 }
 assert.equal(sections.length,9);assert(!sections.includes('wifi'));
});

async function generationEditor(){
 const d=await loaded();d.run("current.welcome='Original. 112.'");d.options.form={property_name:'Alpha',welcome:'Original. 112.'};d.element('#editor-grid').children[0].click();d.element('#section-translations').open=true;
 const meta=d.run('readSourceMetadata()');d.requests.at(-1).reply(sourceMeta('en-GB',2));await meta;
 d.options.capability={generationAvailable:true,testOnly:true,state:'available'};await savedView(d,{status:'original',language:'en-GB',fields:{welcome:'Original. 112.'}});return d;
}
async function confirmSavedGeneration(d,post){
 const result=savedTranslation('generated',{welcome:'Synthetic German. 112.'});post.reply(result);await tick();d.requests.at(-1).reply(result);await tick();d.requests.at(-1).reply(sourceMeta('en-GB',2));
}
test('C2 defaults unavailable and capability errors cannot cause a generation request',async()=>{
 const d=await translationEditor(sourceMeta('en-GB',2));d.options.form={property_name:'Alpha',welcome:''};await savedView(d,{status:'original',language:'en-GB'});assert.equal(d.element('#generate-translation').hidden,true);const count=d.requests.length;await d.run('generateSectionTranslation()');assert.equal(d.requests.length,count);
 d.options.capabilityError=true;await savedView(d,{status:'original',language:'en-GB'});assert.equal(d.element('#generate-translation').hidden,true);assert(d.element('#translation-generation-status').textContent.includes('could not be checked'));
});
test('C2 explicit action sends exactly the observed four fields once and verifies saved output',async()=>{
 const d=await generationEditor();assert.equal(d.element('#generate-translation').hidden,false);assert.equal(d.element('#generate-translation').disabled,false);
 const before=d.run('JSON.stringify({current,currentRevision})');const work=d.run('generateSectionTranslation()'),post=d.requests.at(-1);assert.equal(post.init.method,'POST');assert.deepEqual(JSON.parse(post.init.body),{section:'welcome',sourceLanguage:'en-GB',targetLanguage:'de-DE',expectedSourceVersion:2});assert(d.confirmations.at(-1).includes('saved text'));assert.equal(post.init.headers.Authorization,'Bearer '+a.token);
 const count=d.requests.length;await d.run('generateSectionTranslation()');assert.equal(d.requests.length,count);await confirmSavedGeneration(d,post);await work;
 assert.equal(d.element('#translation-generation-status').textContent,'Test translation saved and verified.');assert.equal(d.element('#translation-preview').hidden,false);assert.equal(d.element('#generate-translation').hidden,true);assert.equal(d.run('JSON.stringify({current,currentRevision})'),before);
});
test('C2 declined consent, missing source, empty/long input and drafts never dispatch',async()=>{
 const d=await generationEditor();d.options.confirm=false;let count=d.requests.length;await d.run('generateSectionTranslation()');assert.equal(d.requests.length,count);d.options.confirm=true;
 for(const code of ["current.welcome='';initialFields.welcome='';", "current.welcome='a'.repeat(1201);initialFields.welcome=current.welcome;", "sectionTranslations.metadata.sourceLanguage=null;sectionTranslations.metadata.declared=false;"]){
  d.run(code);d.options.form.welcome=d.run('current.welcome');await d.run('generateSectionTranslation()');assert.equal(d.requests.length,count);
 }
 const e=await generationEditor();e.options.form.welcome='Unsaved';e.element('#drawer-fields').listeners.input();count=e.requests.length;await e.run('generateSectionTranslation()');assert.equal(e.requests.length,count);
});
for(const [category,message] of [['attempt_pending','already in progress'],['attempt_terminal','cannot be repeated'],['input_limit','too long'],['busy_or_limit','limit'],['translation_unavailable','failed'],['translation_timeout_uncertain','uncertain'],['source_version_changed','section changed']]){
 test('C2 '+category+' is localized, sanitized and has no redispatch or Retry action',async()=>{
  const d=await generationEditor(),work=d.run('generateSectionTranslation()');d.requests.at(-1).reply({error:'PRIVATE DETAIL',category},false,409);await work;assert(d.element('#translation-generation-status').textContent.includes(message));assert(!d.element('#translation-generation-status').textContent.includes(category));assert.equal(d.element('#generate-translation').hidden,true);
  const count=d.requests.length;await d.run('generateSectionTranslation()');assert.equal(d.requests.length,count);
 });
}
test('C2 network uncertainty consumes the local identity; refresh cannot redispatch it',async()=>{
 const d=await generationEditor(),work=d.run('generateSectionTranslation()');d.requests.at(-1).fail(Error('PRIVATE_NETWORK'));await work;assert(d.element('#translation-generation-status').textContent.includes('could not be confirmed'));
 const refresh=d.run('readSourceMetadata()');d.requests.at(-1).reply(sourceMeta('en-GB',2));await tick();assert.equal(d.element('#translation-target').value,'de-DE');d.requests.at(-1).reply({status:'original',language:'en-GB'});await tick();d.requests.at(-1).reply(sourceMeta('en-GB',2));await refresh;
 assert.equal(d.element('#generate-translation').hidden,true);const count=d.requests.length;await d.run('generateSectionTranslation()');assert.equal(d.requests.length,count);
});
test('C2 stale generation responses cannot repaint another editor or overwrite a draft',async()=>{
 for(const switcher of [d=>{d.options.form.welcome='New unsaved draft';d.element('#drawer-fields').listeners.input();},d=>d.run('closeEditor();openEditor(FIELDS[2])'),d=>d.run(`activeId=${JSON.stringify(b.id)};loadActive()`)]){
  const d=await generationEditor(),work=d.run('generateSectionTranslation()'),post=d.requests.at(-1);switcher(d);post.reply(savedTranslation());await work;assert.equal(d.element('#translation-preview').hidden,true);assert.notEqual(d.element('#translation-generation-status').textContent,'Test translation saved and verified.');
 }
});
test('C2 malformed success or failed saved verification cannot announce success',async()=>{
 const d=await generationEditor(),work=d.run('generateSectionTranslation()');d.requests.at(-1).reply({...savedTranslation(),providerMode:'mock'});await work;assert.notEqual(d.element('#translation-generation-status').textContent,'Test translation saved and verified.');assert.equal(d.element('#generate-translation').hidden,true);
 const e=await generationEditor(),other=e.run('generateSectionTranslation()');e.requests.at(-1).reply(savedTranslation());await tick();e.requests.at(-1).fail(Error('PRIVATE_READ'));await other;assert.notEqual(e.element('#translation-generation-status').textContent,'Test translation saved and verified.');
});
test('C2 safe refresh preserves a valid target, clears old output and reads current saved status only',async()=>{
 const d=await generationEditor();await savedView(d,savedTranslation());const count=d.requests.length,work=d.run('readSourceMetadata()');assert.equal(d.element('#translation-target').value,'de-DE');assert.equal(d.element('#translation-preview').hidden,true);
 d.requests.at(-1).reply(sourceMeta('en-GB',3));await tick();d.requests.at(-1).reply({status:'original',language:'en-GB'});await tick();d.requests.at(-1).reply(sourceMeta('en-GB',3));await work;assert.equal(d.element('#translation-target').value,'de-DE');assert.equal(d.element('#translation-preview').hidden,true);assert(d.requests.slice(count).every(r=>!r.init.method||r.init.method==='GET'));
});
test('C2 capability pending/terminal states remain unavailable after an editor reload',async()=>{
 for(const state of ['attempt_pending','attempt_terminal']){
  const d=await generationEditor();d.options.capability={generationAvailable:false,testOnly:true,state};await savedView(d,{status:'original',language:'en-GB'});assert.equal(d.element('#generate-translation').hidden,true);assert(d.element('#translation-generation-status').textContent.length>0);const n=d.requests.length;await d.run('generateSectionTranslation()');assert.equal(d.requests.length,n);
 }
});
test('C2 actual host UI -> authenticated Worker -> fake provider -> storage -> saved read',async()=>{
 let calls=0,keys=0;const db=createLocalDb(),env={DB:db,TRANSLATION_OFFLINE_TEST:true,TRANSLATION_PROVIDER:{mode:'openai',enabled:true,async translate(p){calls++;return {fields:{welcome:'Synthetic German. 112.'},usage:{inputTokens:100,outputTokens:40,reasoningTokens:0,estimatedNano:30000,conservativeNano:33000}};}},get OPENAI_API_KEY(){keys++;throw Error('Credential forbidden');}};
 const ownerApi=(path,init={})=>handleRequest(new Request('https://offline.invalid'+path,init),env);
 const owner=await (await ownerApi('/api/guides',{method:'POST',body:JSON.stringify({property_name:'Synthetic UI owner',welcome:'Original. 112.'}),headers:{'Content-Type':'application/json'}})).json();
 assert.equal((await ownerApi('/api/guides/'+owner.id+'/translation-sources/welcome',{method:'PATCH',headers:{Authorization:'Bearer '+owner.token,'Content-Type':'application/json'},body:JSON.stringify({sourceLanguage:'en-GB',expectedSourceVersion:1})})).status,200);
 const d=dashboard({[STORAGE]:JSON.stringify([owner]),[ACTIVE]:owner.id},{ownerApi,form:{property_name:'Synthetic UI owner',welcome:'Original. 112.'}});
 for(let i=0;i<100&&!d.run('!!current');i++)await tick();assert(d.run('!!current'));d.element('#editor-grid').children[0].click();d.element('#section-translations').open=true;await d.run('readSourceMetadata()');d.element('#translation-target').value='de-DE';await d.run('readSavedTranslation()');assert.equal(calls,0);
 await Promise.all([d.run('generateSectionTranslation()'),d.run('generateSectionTranslation()')]);assert.equal(calls,1);assert.equal(keys,0);assert.equal(d.element('#translation-generation-status').textContent,'Test translation saved and verified.');assert.equal(d.element('#translation-preview').children[1].textContent,'Synthetic German. 112.');
 await d.run('readSourceMetadata()');assert.equal(d.element('#translation-target').value,'de-DE');assert.equal(calls,1);await d.run('generateSectionTranslation()');assert.equal(calls,1);
 assert.equal(d.requests.filter(r=>r.init?.method==='POST'&&r.path.endsWith('/translations')).length,1);
});
