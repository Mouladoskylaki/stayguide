// Dependency-free Chrome smoke check. Uses the real Worker with an in-memory DB.
// Run: node tests/host-state.browser.mjs (requires google-chrome on PATH).
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {handleRequest} from '../src/worker.js';
import {createLocalDb} from '../node/db.mjs';
import {checkGuest} from './guest.browser.mjs';

const root=new URL('../public/',import.meta.url);
const artifacts=await fs.mkdtemp(path.join(os.tmpdir(),'sg-p20-browser-'));
const baselineCss=execFileSync('git',['show','HEAD:public/styles.css'],{cwd:fileURLToPath(new URL('..',import.meta.url))});
const db=createLocalDb();
const server=http.createServer(async(req,res)=>{
  try{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const request=new Request(origin+req.url,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined});
    const response=await handleRequest(request,{DB:db,ASSETS:{async fetch(request){
      let pathname=new URL(request.url).pathname;if(pathname==='/')pathname='/index.html';
      if(pathname==='/baseline.css')return new Response(baselineCss,{headers:{'Content-Type':'text/css'}});
      if(!/^\/[a-z.]+$/.test(pathname))return new Response('Not found',{status:404});
      try{
        const type=pathname.endsWith('.css')?'text/css':pathname.endsWith('.js')?'text/javascript':'text/html';
        return new Response(await fs.readFile(new URL(pathname.slice(1),root)),{headers:{'Content-Type':type}});
      }catch{return new Response('Not found',{status:404});}
    }}});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Smoke server error');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin='http://127.0.0.1:'+server.address().port;
const chrome=spawn(process.env.CHROME_BIN||'google-chrome',[
  '--headless','--no-sandbox','--disable-gpu','--remote-debugging-pipe','--user-data-dir='+artifacts+'/profile','about:blank'
],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let buffer='',sequence=0,session,acceptDialog=false;
const networkFailures=[],networkRequests=new Map(),navigations=[];
const pending=new Map();
chrome.on('error',()=>{for(const item of pending.values())item.reject(Error('Chrome could not start'));});
chrome.stdio[4].on('error',()=>{});
chrome.stdio[4].on('data',data=>{
  buffer+=data;let index;
  while((index=buffer.indexOf('\0'))>=0){
    const message=JSON.parse(buffer.slice(0,index));buffer=buffer.slice(index+1);
    if(message.id){const item=pending.get(message.id);if(item){clearTimeout(item.timer);pending.delete(message.id);item.resolve(message);}}
    if(message.method==='Network.requestWillBeSent')networkRequests.set(message.params.requestId,{method:message.params.request.method,api:message.params.request.url.includes('/api/guides')});
    if(message.method==='Page.frameNavigated'){const url=new URL(message.params.frame.url);navigations.push({path:url.pathname,step:url.searchParams.get('smoke')});}
    if(message.method==='Network.loadingFailed'){const p=message.params;networkFailures.push(JSON.stringify({...networkRequests.get(p.requestId),error:p.errorText,canceled:p.canceled,blocked:p.blockedReason,cors:p.corsErrorStatus?.corsError}));}
    if(message.method==='Page.javascriptDialogOpening')void send('Page.handleJavaScriptDialog',{accept:acceptDialog},session);
  }
});
function send(method,params={},sessionId){
  return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('Chrome command timed out: '+method));},10000);
    pending.set(id,{resolve,reject,timer});
    chrome.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');
  });
}
const command=(method,params={})=>send(method,params,session);
async function evaluate(expression){
  const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
  // Never print page expressions, localStorage or exception payloads: they may hold edit credentials.
  if(result.error||result.result?.exceptionDetails){
    const exception=result.result?.exceptionDetails?.exception;
    const description=exception?.description||'';
    throw Error('Browser evaluation failed: '+(exception?.className||'command error')+'; fetch failure='+description.includes('Failed to fetch')+'; JSON failure='+description.includes('JSON')+'; network='+networkFailures.slice(-3).join(',')+'; navigation='+JSON.stringify(navigations.slice(-3)));
  }
  return result.result.result.value;
}
async function waitFor(expression){
  for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,30));}
  const state=await evaluate("JSON.stringify({editorOpen:document.querySelector('#editor-drawer')?.open,errorShown:document.querySelector('#editor-error')?.hidden===false,saveDisabled:document.querySelector('#save-editor')?.disabled,offline:!navigator.onLine})");
  throw Error('Browser state did not settle; state='+state+'; network='+networkFailures.slice(-3).join(',')+'; navigation='+JSON.stringify(navigations.slice(-3)));
}
let navigationSequence=0;
async function navigate(route){
  const target=new URL(route,origin);target.searchParams.set('smoke',++navigationSequence);
  const url=target.href;
  const documentUrl=new URL(url);documentUrl.hash='';
  await command('Page.navigate',{url});
  // location can change while the previous document still reports complete.
  await waitFor(`location.href===${JSON.stringify(url)} && document.readyState==='complete' && performance.getEntriesByType('navigation')[0]?.name.split('#')[0]===${JSON.stringify(documentUrl.href)}`);
}
async function screenshot(name,width,height){
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await evaluate("document.documentElement.style.scrollBehavior='auto';document.activeElement?.blur();scrollTo({top:0,left:0,behavior:'instant'})");
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),'Page must not overflow');
  const image=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await fs.writeFile(path.join(artifacts,name+'.png'),Buffer.from(image.result.data,'base64'));
}
async function assertPropertySelector(){
  assert.ok(await evaluate(`(()=>{
    const host=document.querySelector('#property-tabs'),tab=host.querySelector('.active'),add=document.querySelector('#add-tab');
    const viewport=host.getBoundingClientRect(),selected=tab.getBoundingClientRect(),button=add.getBoundingClientRect();
    return selected.left>=viewport.left+13 && selected.right<=viewport.right-13 &&
      selected.right<button.left && button.right<=innerWidth && button.width>=44 && button.height>=44 &&
      getComputedStyle(host).scrollbarWidth==='none' && host.offsetHeight===host.clientHeight &&
      document.documentElement.scrollWidth<=innerWidth;
  })()`),'Selected tab is fully visible, scrollbar hidden and add button reachable');
}
async function assertSavedProgress(complete,started,empty){
  assert.ok(await evaluate(`!document.querySelector('#guide-progress').hidden`));
  assert.equal(await evaluate(`document.querySelector('#progress-summary').textContent`),complete+' of 10 sections complete');
  assert.equal(await evaluate(`document.querySelector('#section-progress').value`),complete);
  assert.equal(await evaluate(`document.querySelector('#progress-counts').textContent`),started+' started · '+empty+' empty');
}
async function saveSection(index,values){
  await evaluate(`document.querySelectorAll('.editor-card')[${index}].click()`);
  await evaluate(`for(const [key,value] of Object.entries(${JSON.stringify(values)}))document.querySelector('#edit-'+key).value=value;document.querySelector('#section-form').requestSubmit()`);
  await waitFor(`document.querySelector('#editor-drawer').hidden`);
}
async function checkPropertySelector(width,name){
  await command('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:false});
  await new Promise(resolve=>setTimeout(resolve,100));
  await assertPropertySelector(); // ResizeObserver keeps selection visible on viewport changes.
  await navigate('/app.html');
  await waitFor(`document.querySelector('#property-heading').textContent==='Sea View Villa'`);
  await assertPropertySelector(); // Initial render while editor was hidden.
  await assertSavedProgress(2,2,6);
  await evaluate(`document.querySelector('.property-tab').click()`);
  await waitFor(`document.querySelector('#property-heading').textContent==='Olive Apartment'`);
  await assertPropertySelector();await assertSavedProgress(0,1,9);
  await evaluate(`document.querySelectorAll('.property-tab')[1].focus()`);
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await waitFor(`document.querySelector('#property-heading').textContent==='Sea View Villa'`);
  await assertPropertySelector();
  await assertSavedProgress(2,2,6);
  assert.ok(await evaluate(`document.activeElement===document.querySelector('.property-tab.active')`),'Selection preserves property-tab keyboard focus');
  await screenshot(name,width,width===1440?1000:844);
  if(width<650){
    await evaluate(`document.querySelector('.property-strip').scrollIntoView({block:'start',behavior:'instant'})`);
    const image=await command('Page.captureScreenshot',{format:'png'});
    await fs.writeFile(path.join(artifacts,name+'-overview.png'),Buffer.from(image.result.data,'base64'));
  }
}
// Compare unaffected pages against the committed shared CSS in the same browser,
// at the same URL/viewport so even the QR image remains deterministic.
async function unchangedPage(route,name,width,height,print=false){
  console.log('Comparing '+name);
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await command('Emulation.setEmulatedMedia',{media:print?'print':'screen'});
  await navigate(route);
  await evaluate("document.documentElement.style.scrollBehavior='auto';scrollTo({top:0,behavior:'instant'})");
  await waitFor('[...document.images].every(image=>image.complete)');
  const current=(await command('Page.captureScreenshot',{format:'png'})).result.data;
  await evaluate(`document.querySelector('link[rel="stylesheet"]').href='/baseline.css'`);
  await waitFor(`[...document.styleSheets].some(sheet=>sheet.href?.endsWith('/baseline.css'))`);
  await new Promise(resolve=>setTimeout(resolve,50));
  const baseline=(await command('Page.captureScreenshot',{format:'png'})).result.data;
  assert.ok(current===baseline,name+' must match committed CSS exactly');
  await fs.writeFile(path.join(artifacts,name+'.png'),Buffer.from(current,'base64'));
  await command('Emulation.setEmulatedMedia',{media:'screen'});
}
try{
  const target=await send('Target.createTarget',{url:'about:blank'});
  session=(await send('Target.attachToTarget',{targetId:target.result.targetId,flatten:true})).result.sessionId;
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  // Native focus, dialog and keyboard checks need a foreground target throughout.
  await command('Page.bringToFront');
  await send('Browser.grantPermissions',{origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:path.join(artifacts,'downloads')});
  console.log('Checking host flows');
  await navigate('/app.html');await waitFor('typeof restoreState === "undefined" && !!document.querySelector("#create-form")');
  await evaluate(`document.querySelector('#first-name').value='Olive Apartment';document.querySelector('#create-form').requestSubmit()`);
  await waitFor(`document.querySelector('#property-heading').textContent==='Olive Apartment'`);
  await evaluate(`document.querySelector('#new-property').click();document.querySelector('#first-name').value='Sea View Villa';document.querySelector('#create-form').requestSubmit()`);
  await waitFor(`document.querySelector('#property-heading').textContent==='Sea View Villa'`);
  await evaluate(`window.actualFetch=fetch;window.loads=[];window.fetch=(url,options={})=>{
    if(String(url).startsWith('/api/guides/')&&!options.method){
      return new Promise((resolve,reject)=>loads.push({release:()=>actualFetch(url,options).then(resolve,reject),fail:()=>reject(Error('Old load failed'))}));
    }
    return actualFetch(url,options);
  };
  document.querySelectorAll('.property-tab')[0].click();document.querySelectorAll('.property-tab')[1].click()`);
  assert.ok(await evaluate(`document.querySelector('#copy-link').disabled && ['view-link','download-qr','print-card'].every(id=>!document.querySelector('#'+id).hasAttribute('href')&&document.querySelector('#'+id).getAttribute('aria-disabled')==='true') && document.querySelector('#guide-progress').hidden && document.querySelector('#progress-summary').textContent===''`));
  await evaluate('loads[1].release()');await waitFor(`document.querySelector('#save-status').textContent==='All changes saved'`);
  await evaluate('loads[0].release()');await new Promise(r=>setTimeout(r,100));
  assert.equal(await evaluate(`document.querySelector('#property-heading').textContent`),'Sea View Villa');
  await evaluate(`document.querySelectorAll('.property-tab')[0].click();document.querySelectorAll('.property-tab')[1].click();loads[3].release()`);
  await waitFor(`document.querySelector('#save-status').textContent==='All changes saved'`);
  await evaluate('loads[2].fail()');await new Promise(r=>setTimeout(r,50));
  assert.ok(await evaluate(`!document.querySelector('#editor-shell').hidden && document.querySelector('#property-heading').textContent==='Sea View Villa'`));
  await evaluate(`fetch=actualFetch;document.querySelectorAll('.editor-card')[1].click();document.querySelector('#edit-wifi_name').value='Villa Guest';document.querySelector('#section-form').requestSubmit()`);
  await waitFor(`document.querySelector('#editor-drawer').hidden`);
  const guest=await evaluate(`new URL(document.querySelector('#view-link').href).pathname`);
  assert.ok(await evaluate(`(async()=>{const entries=JSON.parse(localStorage.getItem('stayguide-demo-properties'));const selected=entries.find(e=>document.querySelector('#view-link').href.endsWith(e.id));const r=await fetch('/api/guides/'+selected.id,{headers:{Authorization:'Bearer '+selected.token}});return (await r.json()).guide.wifi_name==='Villa Guest'})()`));
  // All data below is saved through the existing editor, not inferred from drafts.
  await saveSection(0,{welcome:'Welcome to your little place by the sea.'});
  await saveSection(3,{rules:'Please keep the house smoke-free. Thank you.'});
  await saveSection(2,{checkin:'Check in after 15:00.'});
  await assertSavedProgress(2,2,6);
  assert.ok(await evaluate(`document.querySelectorAll('.editor-card').length===10 && document.querySelector('[data-section="wifi"]').dataset.state==='started' && document.querySelector('[data-section="arrival"]').dataset.state==='started' && document.querySelector('[data-section="welcome"]').dataset.state==='complete'`));
  assert.ok(await evaluate(`document.querySelectorAll('.property-tab .property-identity').length===2 && !document.querySelector('.property-tabs img') && document.querySelector('.property-tab.active').getAttribute('aria-pressed')==='true' && document.querySelector('#property-identity').textContent==='SV'`));
  assert.ok(await evaluate(`document.querySelectorAll('#view-link').length===1 && document.querySelector('.guide-actions').children.length===4`));
  console.log('Capturing responsive shell');
  await checkPropertySelector(1440,'host-desktop');
  assert.ok(await evaluate(`getComputedStyle(document.querySelector('.host-sidebar')).position==='sticky' && document.querySelector('.host-sidebar').getBoundingClientRect().width===232`));
  for(const [name,width] of [['host-mobile',390],['host-320',320]]){
    await checkPropertySelector(width,name);
    assert.ok(await evaluate(`getComputedStyle(document.querySelector('.host-sidebar')).position==='static' && document.querySelector('.host-sidebar').getBoundingClientRect().height<100`));
    assert.ok(await evaluate(`[...document.querySelectorAll('.host-nav a')].filter(a=>a.getBoundingClientRect().height).every(a=>a.getBoundingClientRect().height>=44)`));
  }
  // At the narrowest viewport, editor cards remain reachable and editable.
  await evaluate(`document.querySelector('.editor-grid').scrollIntoView({block:'start',behavior:'instant'})`);
  assert.ok(await evaluate(`[...document.querySelectorAll('.editor-card')].every(card=>card.clientWidth>=100&&card.scrollWidth<=card.clientWidth&&card.getBoundingClientRect().height>=44)`));
  const cardsImage=await command('Page.captureScreenshot',{format:'png'});
  await fs.writeFile(path.join(artifacts,'editor-cards-320.png'),Buffer.from(cardsImage.result.data,'base64'));
  await evaluate(`document.querySelectorAll('.editor-card')[1].click();document.querySelector('#edit-wifi_name').value='Villa Guest';document.querySelector('#section-form').requestSubmit()`);
  await waitFor(`document.querySelector('#editor-drawer').hidden`);
  // Many properties and an 80-character name: retained scrolling, cue state and
  // complete active-tab bounds without page overflow. Test records stay in memory.
  await evaluate(`(async()=>{
    localStorage.setItem('__tabs-original-properties',localStorage.getItem('stayguide-demo-properties'));
    localStorage.setItem('__tabs-original-active',localStorage.getItem('stayguide-demo-active'));
    const entries=JSON.parse(localStorage.getItem('stayguide-demo-properties'));
    for(let i=0;i<6;i++){
      const name=i===5?('A long seaside property '+ 'x'.repeat(80)).slice(0,80):'Guest Cottage '+(i+1);
      const response=await fetch('/api/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({property_name:name})});
      const data=await response.json();entries.push({id:data.id,token:data.token,label:name});
    }
    localStorage.setItem('stayguide-demo-properties',JSON.stringify(entries));
    localStorage.setItem('stayguide-demo-active',entries.at(-1).id);
  })()`);
  await navigate('/app.html');await waitFor(`document.querySelectorAll('.property-tab').length===8`);
  await assertPropertySelector();
  await screenshot('property-tabs-many-320',320,844);
  assert.ok(await evaluate(`document.querySelector('#property-tabs').scrollLeft>0&&document.querySelector('.property-strip').dataset.scrollLeft==='true'`));
  await evaluate(`document.querySelector('#property-tabs').scrollLeft=0`);
  await waitFor(`document.querySelector('.property-strip').dataset.scrollRight==='true'&&document.querySelector('.property-strip').dataset.scrollLeft==='false'`);
  const wheelPoint=await evaluate(`(()=>{const box=document.querySelector('#property-tabs').getBoundingClientRect();return {x:box.x+box.width/2,y:box.y+box.height/2}})()`);
  await command('Input.dispatchMouseEvent',{type:'mouseWheel',...wheelPoint,deltaX:100,deltaY:0});
  await waitFor(`document.querySelector('#property-tabs').scrollLeft>0`);
  await evaluate(`document.querySelector('.property-tab.active').focus()`);await assertPropertySelector();
  await evaluate(`localStorage.setItem('stayguide-demo-properties',localStorage.getItem('__tabs-original-properties'));localStorage.setItem('stayguide-demo-active',localStorage.getItem('__tabs-original-active'));localStorage.removeItem('__tabs-original-properties');localStorage.removeItem('__tabs-original-active')`);
  await navigate('/app.html');await waitFor(`document.querySelector('#property-heading').textContent==='Sea View Villa'`);
  console.log('PASS: selector resize/reload/click/keyboard at 1440/390/320, many/long tabs, wheel scrolling/cues, visible add button and narrow editor cards.');
  await assertSavedProgress(2,2,6);
  await evaluate(`document.querySelector('.progress-help').open=true`);
  await evaluate(`document.querySelector('#guide-progress').scrollIntoView({block:'start',behavior:'instant'})`);
  const explained=await command('Page.captureScreenshot',{format:'png'});
  await fs.writeFile(path.join(artifacts,'progress-explained-320.png'),Buffer.from(explained.result.data,'base64'));
  await evaluate(`document.querySelector('.progress-help').open=false`);
  console.log('PASS: saved progress after UI saves/reloads/switches, partial multi-field states, identity placeholders, and one safe quick-action group.');
  // Native clipboard, QR download and the existing print-card link.
  console.log('Checking clipboard and downloads');
  await command('Page.bringToFront');
  await evaluate(`document.querySelector('#copy-link').click()`);
  await waitFor(`document.querySelector('#copy-link').textContent.includes('Copied')`);
  assert.ok(await evaluate(`(async()=>await navigator.clipboard.readText()===document.querySelector('#view-link').href)()`));
  await evaluate(`document.querySelector('#download-qr').click()`);
  let downloaded=false;
  for(let i=0;i<100;i++){
    const files=await fs.readdir(path.join(artifacts,'downloads')).catch(()=>[]);
    if(files.includes('stayguide-qr.svg')){downloaded=true;break;}
    await new Promise(resolve=>setTimeout(resolve,30));
  }
  assert.ok(downloaded,'QR download completes');
  assert.ok((await fs.readFile(path.join(artifacts,'downloads/stayguide-qr.svg'),'utf8')).includes('<svg'));
  assert.ok(await evaluate(`document.querySelector('#print-card').getAttribute('href')===new URL(document.querySelector('#view-link').href).pathname+'/card'`));
  // Native navigation/skip-link keyboard behavior and host reduced-motion styles.
  console.log('Checking keyboard and motion');
  await navigate('/app.html');
  await waitFor(`document.querySelector('#property-heading').textContent==='Sea View Villa'`);
  await evaluate(`document.querySelector('.property-tab').focus()`);
  assert.ok(await evaluate(`getComputedStyle(document.activeElement).outlineOffset==='-3px'`));
  await evaluate(`document.querySelector('.skip-link').focus()`);
  assert.ok(await evaluate(`getComputedStyle(document.activeElement).outlineStyle==='solid'`));
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.ok(await evaluate(`document.activeElement.id==='dashboard-main'`));
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.ok(await evaluate(`getComputedStyle(document.querySelector('.editor-card')).transitionDuration==='0s'`));
  await command('Emulation.setEmulatedMedia',{features:[]});
  await screenshot('host-tablet',768,1000);

  console.log('Checking SG-P12 modal editor');
  const key=async(key,shift=false)=>{
    await command('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,modifiers:shift?8:0,windowsVirtualKeyCode:key==='Tab'?9:27});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='Tab'?9:27});
  };
  for(let i=0;i<10;i++){
    await evaluate(`document.querySelectorAll('.editor-card')[${i}].click()`);
    assert.ok(await evaluate("document.querySelector('#editor-drawer').open && document.activeElement.matches('input,textarea')"));
    await evaluate("document.querySelector('#new-property').focus()");
    assert.ok(await evaluate("document.querySelector('#editor-drawer').contains(document.activeElement)"));
    await evaluate("document.querySelector('#save-editor').focus()");
    await key('Tab');
    assert.equal(await evaluate('document.activeElement.id'),'close-drawer');
    await key('Tab',true);
    assert.equal(await evaluate('document.activeElement.id'),'save-editor');
    if(i%2)await key('Escape');else await evaluate("document.querySelector('#cancel-editor').click()");
    assert.ok(await evaluate(`document.querySelector('#editor-drawer').hidden && document.activeElement===document.querySelectorAll('.editor-card')[${i}]`));
  }
  await evaluate("document.querySelectorAll('.editor-card')[0].click();window.originalWelcome=document.querySelector('#edit-welcome').value;document.querySelector('#edit-welcome').value='A thoughtful welcome.\\nMake yourself at home.'");
  for(const width of [1440,390,320]){
    // Open at the target width rather than capturing Chrome's top-layer resize repaint.
    await evaluate("document.querySelector('#cancel-editor').click();document.querySelector('#discard-changes').click()");
    await command('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:false});
    await evaluate("document.querySelectorAll('.editor-card')[0].click();document.querySelector('#edit-welcome').value='A thoughtful welcome.\\nMake yourself at home.'");
    await screenshot('editor-open-'+width,width,width===1440?1000:844);
    assert.ok(await evaluate(`(()=>{
      const d=document.querySelector('#editor-drawer'),b=document.querySelector('#save-editor').getBoundingClientRect();
      return d.scrollWidth<=d.clientWidth && b.bottom<=innerHeight && b.width>=44 && b.height>=44 &&
        getComputedStyle(document.querySelector('#edit-property_name')).fontSize==='16px';
    })()`));
  }
  // Actual keyboard commands on a reduced viewport; this emulates available space, not an OS keyboard.
  await command('Emulation.setDeviceMetricsOverride',{width:320,height:400,deviceScaleFactor:1,mobile:false});
  await evaluate("document.querySelector('#edit-welcome').style.height='700px';document.querySelector('#edit-welcome').focus();document.querySelector('.drawer-scroll').scrollTop=500");
  assert.ok(await evaluate("document.querySelector('.drawer-scroll').scrollTop>0 && document.querySelector('#save-editor').getBoundingClientRect().bottom<=innerHeight"));
  await evaluate("document.querySelector('#edit-welcome').style.height='';document.querySelector('#edit-welcome').value=window.originalWelcome;document.querySelector('#cancel-editor').click()");
  assert.ok(await evaluate("document.querySelector('#editor-drawer').hidden && !document.querySelector('#discard-dialog').open"));
  await evaluate("document.querySelectorAll('.editor-card')[0].click();document.querySelector('#edit-welcome').value='Unsaved welcome';document.querySelector('#close-drawer').click()");
  assert.ok(await evaluate("document.querySelector('#discard-dialog').open && document.activeElement.id==='keep-editing'"));
  await screenshot('editor-unsaved-320',320,844);
  await key('Escape');
  assert.ok(await evaluate("!document.querySelector('#discard-dialog').open && document.querySelector('#edit-welcome').value==='Unsaved welcome'"));
  // Native backdrop pointer click opens the same dirty confirmation.
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await command('Input.dispatchMouseEvent',{type:'mousePressed',x:300,y:300,button:'left',clickCount:1});
  await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:300,y:300,button:'left',clickCount:1});
  await waitFor("document.querySelector('#discard-dialog').open");
  await evaluate("document.querySelector('#keep-editing').click()");
  // Controlled failed response, then a slow retry. No guide credentials enter diagnostics.
  await evaluate(`window.editorFetch=window.fetch;window.editorPatchCount=0;window.fetch=(url,init)=>{
    if(init?.method==='PATCH'){window.editorPatchCount++;return Promise.resolve(new Response('{}',{status:503}));}
    return window.editorFetch(url,init);
  };document.querySelector('#section-form').requestSubmit()`);
  await waitFor("!document.querySelector('#editor-error').hidden");
  assert.ok(await evaluate("document.querySelector('#edit-welcome').value==='Unsaved welcome' && !document.querySelector('#save-editor').disabled && document.activeElement.id==='editor-error'"));
  await screenshot('editor-error-390',390,844);
  await evaluate(`window.fetch=(url,init)=>{
    if(init?.method==='PATCH'){window.editorPatchCount++;return new Promise(resolve=>window.finishEditorSave=()=>window.editorFetch(url,init).then(resolve));}
    return window.editorFetch(url,init);
  };document.querySelector('#section-form').requestSubmit();document.querySelector('#section-form').dispatchEvent(new Event('submit',{cancelable:true}));`);
  await key('Escape');
  assert.ok(await evaluate("window.editorPatchCount===2 && document.querySelector('#editor-drawer').open && !document.querySelector('#discard-dialog').open && document.querySelector('#drawer-fields').disabled && document.activeElement.id==='editor-status'"));
  await evaluate("window.finishEditorSave()");
  await waitFor("document.querySelector('#editor-drawer').hidden");
  assert.ok(await evaluate("document.activeElement.dataset.section==='welcome'"));
  await evaluate("window.fetch=window.editorFetch");
  // Explicit dirty discard leaves saved content intact.
  await evaluate("document.querySelectorAll('.editor-card')[0].click();document.querySelector('#edit-welcome').value='Discard this';document.querySelector('#cancel-editor').click();document.querySelector('#discard-changes').click();document.querySelectorAll('.editor-card')[0].click()");
  assert.equal(await evaluate("document.querySelector('#edit-welcome').value"),'Unsaved welcome');
  await key('Escape');

  for(const fail of [false,true]){
    await evaluate(`document.querySelectorAll('.editor-card')[0].click();document.querySelector('#edit-welcome').value='Old property draft';
      window.fetch=(url,init)=>{
        if(init?.method==='PATCH')return new Promise(resolve=>window.releaseOldEditor=()=>${fail?"Promise.resolve(new Response('{}',{status:503})).then(resolve)":"window.editorFetch(url,init).then(resolve)"});
        return window.editorFetch(url,init);
      };document.querySelector('#section-form').requestSubmit();document.querySelectorAll('.property-tab')[0].click()`);
    await waitFor("document.querySelector('#property-heading').textContent==='Olive Apartment'");
    await evaluate("document.querySelectorAll('.editor-card')[1].click();document.querySelector('#edit-wifi_name').value='Current property draft';window.releaseOldEditor()");
    await new Promise(r=>setTimeout(r,80));
    assert.ok(await evaluate("document.querySelector('#property-heading').textContent==='Olive Apartment' && document.querySelector('#editor-drawer').open && document.querySelector('#edit-wifi_name').value==='Current property draft' && !document.querySelector('#save-editor').disabled && document.querySelector('#editor-error').hidden"));
    await evaluate("window.fetch=window.editorFetch;document.querySelector('#cancel-editor').click();document.querySelector('#discard-changes').click();document.querySelectorAll('.property-tab')[1].click()");
    await waitFor("document.querySelector('#property-heading').textContent==='Sea View Villa'");
  }
  console.log('PASS: ten editors, native inertness, Tab wrap/focus restore, Escape/Cancel/backdrop, exact dirty comparison/revert/discard, inline failure/retry, duplicate/slow save and reduced-height scrolling.');

  console.log('Checking unchanged shared pages');
  await unchangedPage('/', 'marketing-unchanged-desktop',1440,1000);
  await unchangedPage('/', 'marketing-unchanged-mobile',390,844);
  await unchangedPage(guest+'/card','print-unchanged',390,844,true);
  await navigate(guest);
  assert.ok(await evaluate(`document.body.textContent.includes('Villa Guest')`));
  await screenshot('guest-mobile',390,844);
  assert.equal(await evaluate(`(async()=>{const r=await fetch(location.pathname+'/qr.svg');return r.status})()`),200);
  await command('Emulation.setScriptExecutionDisabled',{value:true});await navigate(guest);
  await screenshot('guest-no-js',390,844);await command('Emulation.setScriptExecutionDisabled',{value:false});
  await checkGuest({origin,db,artifacts,command,evaluate,navigate,screenshot,waitFor});
  await navigate('/app.html');
  await waitFor("document.querySelector('#property-heading').textContent==='Sea View Villa' && document.querySelector('#save-status').textContent==='All changes saved'");
  await evaluate(`localStorage.setItem('stayguide-demo-properties','{broken');window.location.reload()`);
  await waitFor(`!!document.querySelector('#state-recovery')&&!document.querySelector('#state-recovery').hidden`);
  assert.ok(await evaluate(`localStorage.getItem('stayguide-demo-properties')==='{broken'`));
  await screenshot('recovery-desktop',1440,1000);await screenshot('recovery-mobile',390,844);await screenshot('recovery-320',320,844);
  acceptDialog=true;await evaluate(`document.querySelector('#reset-state').click()`);
  await waitFor(`document.querySelector('#state-recovery').hidden`);
  assert.ok(await evaluate(`Object.keys(localStorage).some(k=>k.startsWith('stayguide-demo-recovery-')&&JSON.parse(localStorage.getItem(k)).properties==='{broken')`));
  assert.ok(await evaluate(`localStorage.getItem('stayguide-demo-properties')==='[]'&&!document.querySelector('#empty-state').hidden`));
  console.log('PASS: create, switching/stale responses, owner editing, clipboard, QR download, keyboard skip/focus, responsive navigation, reduced motion and recovery.');
  console.log('PASS: marketing desktop/mobile and print screenshots identical with current vs committed shared CSS; JS-disabled guest rendered.');
  console.log('Screenshots: '+artifacts);
}finally{
  try{await send('Browser.close');}catch{chrome.kill();}
  await new Promise(resolve=>server.close(resolve));
}
