import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const STORAGE='stayguide-demo-properties',ACTIVE='stayguide-demo-active';
const a={id:'a'.repeat(16),token:'a'.repeat(64)},b={id:'b'.repeat(16),token:'b'.repeat(64)};
const response=(entry,name)=>({id:entry.id,guide:{property_name:name,wifi_name:name+' network'}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// Run the actual host entrypoint, with only its browser boundary replaced.
function dashboard(initial={},options={}){
  const values=new Map(Object.entries(initial)),writes=[],requests=[],alerts=[];
  class Element {
    constructor(){this.hidden=false;this.disabled=false;this.children=[];this.listeners={};this.attributes={};this.textContent='';this.value='';this.classList={add(){},remove(){}};}
    addEventListener(type,fn){this.listeners[type]=fn;}
    append(child){this.children.push(child);}
    replaceChildren(){this.children=[];}
    querySelector(){return element('#input');}
    querySelectorAll(){return this.children;}
    setAttribute(k,v){this.attributes[k]=v;}
    removeAttribute(k){delete this.attributes[k];if(k==='href')delete this.href;}
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
    document:{querySelector:element,createElement:()=>new Element(),body:new Element(),addEventListener(){}},
    localStorage,location:{origin:'http://localhost'},navigator:{clipboard:{writeText:async()=>{}}},
    confirm:()=>options.confirm!==false,alert:msg=>alerts.push(msg),prompt(){},
    FormData:class {get(key){return options.form?.[key]??'';}},
    fetch:(path,init)=>new Promise((resolve,reject)=>requests.push({path,init,fail:reject,reply:(body,ok=true)=>resolve({ok,json:async()=>body})}))
  });
  vm.runInContext(source,context);
  return {values,writes,requests,alerts,element,run:code=>vm.runInContext(code,context),options};
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
test('a newer save in the same editor owns the resulting UI',async()=>{
  const d=await loaded();d.element('#editor-grid').children[1].click();
  const first=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  const second=d.element('#section-form').listeners.submit({preventDefault(){},target:{}});
  d.requests[1].reply(response(a,'Older save'));await first;
  assert.equal(d.element('#save-editor').disabled,true);
  assert.equal(d.element('#editor-drawer').hidden,false);
  d.requests[2].reply(response(a,'Latest save'));await second;
  assert.equal(d.element('#property-heading').textContent,'Latest save');
});
