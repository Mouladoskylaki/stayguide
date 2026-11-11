// Dependency-free Chrome smoke check. Uses the real Worker with an in-memory DB.
// Run: node tests/host-state.browser.mjs (requires google-chrome on PATH).
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {handleRequest} from '../src/worker.js';
import {createLocalDb} from '../node/db.mjs';

const root=new URL('../public/',import.meta.url);
const artifacts=await fs.mkdtemp(path.join(os.tmpdir(),'sg-p01-browser-'));
const db=createLocalDb();
const server=http.createServer(async(req,res)=>{
  try{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const request=new Request(origin+req.url,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined});
    const response=await handleRequest(request,{DB:db,ASSETS:{async fetch(request){
      let pathname=new URL(request.url).pathname;if(pathname==='/')pathname='/index.html';
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
const pending=new Map();
chrome.on('error',()=>{for(const item of pending.values())item.reject(Error('Chrome could not start'));});
chrome.stdio[4].on('error',()=>{});
chrome.stdio[4].on('data',data=>{
  buffer+=data;let index;
  while((index=buffer.indexOf('\0'))>=0){
    const message=JSON.parse(buffer.slice(0,index));buffer=buffer.slice(index+1);
    if(message.id){const item=pending.get(message.id);if(item){clearTimeout(item.timer);pending.delete(message.id);item.resolve(message);}}
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
  const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  // Never print page expressions, localStorage or exception payloads: they may hold edit credentials.
  if(result.error||result.result?.exceptionDetails)throw Error('Browser evaluation failed');
  return result.result.result.value;
}
async function waitFor(expression){
  for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,30));}
  throw Error('Browser state did not settle');
}
async function navigate(route){
  await command('Page.navigate',{url:origin+route});
  await waitFor('document.readyState === "complete"');
}
async function screenshot(name,width,height){
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await evaluate("document.documentElement.style.scrollBehavior='auto';scrollTo(0,0)");
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),'Page must not overflow');
  const image=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await fs.writeFile(path.join(artifacts,name+'.png'),Buffer.from(image.result.data,'base64'));
}
try{
  const target=await send('Target.createTarget',{url:'about:blank'});
  session=(await send('Target.attachToTarget',{targetId:target.result.targetId,flatten:true})).result.sessionId;
  await command('Page.enable');await command('Runtime.enable');
  await navigate('/app.html');await waitFor('typeof restoreState === "undefined" && !!document.querySelector("#create-form")');
  await evaluate(`document.querySelector('#first-name').value='Alpha';document.querySelector('#create-form').requestSubmit()`);
  await waitFor(`document.querySelector('#property-heading').textContent==='Alpha'`);
  await evaluate(`document.querySelector('#new-property').click();document.querySelector('#first-name').value='Beta';document.querySelector('#create-form').requestSubmit()`);
  await waitFor(`document.querySelector('#property-heading').textContent==='Beta'`);
  await evaluate(`window.actualFetch=fetch;window.loads=[];window.fetch=(url,options={})=>{
    if(String(url).startsWith('/api/guides/')&&!options.method){
      return new Promise((resolve,reject)=>loads.push({release:()=>actualFetch(url,options).then(resolve,reject),fail:()=>reject(Error('Old load failed'))}));
    }
    return actualFetch(url,options);
  };
  document.querySelectorAll('.property-tab')[0].click();document.querySelectorAll('.property-tab')[1].click()`);
  assert.ok(await evaluate(`document.querySelector('#copy-link').disabled && !document.querySelector('#view-link').hasAttribute('href')`));
  await evaluate('loads[1].release()');await waitFor(`document.querySelector('#save-status').textContent==='All changes saved'`);
  await evaluate('loads[0].release()');await new Promise(r=>setTimeout(r,100));
  assert.equal(await evaluate(`document.querySelector('#property-heading').textContent`),'Beta');
  await evaluate(`document.querySelectorAll('.property-tab')[0].click();document.querySelectorAll('.property-tab')[1].click();loads[3].release()`);
  await waitFor(`document.querySelector('#save-status').textContent==='All changes saved'`);
  await evaluate('loads[2].fail()');await new Promise(r=>setTimeout(r,50));
  assert.ok(await evaluate(`!document.querySelector('#editor-shell').hidden && document.querySelector('#property-heading').textContent==='Beta'`));
  await evaluate(`fetch=actualFetch;document.querySelectorAll('.editor-card')[1].click();document.querySelector('#edit-wifi_name').value='Beta network';document.querySelector('#section-form').requestSubmit()`);
  await waitFor(`document.querySelector('#editor-drawer').hidden`);
  const guest=await evaluate(`new URL(document.querySelector('#view-link').href).pathname`);
  assert.ok(await evaluate(`(async()=>{const entries=JSON.parse(localStorage.getItem('stayguide-demo-properties'));const selected=entries.find(e=>document.querySelector('#view-link').href.endsWith(e.id));const r=await fetch('/api/guides/'+selected.id,{headers:{Authorization:'Bearer '+selected.token}});return (await r.json()).guide.wifi_name==='Beta network'})()`));
  await screenshot('host-desktop',1440,1000);await screenshot('host-mobile',390,844);
  await navigate(guest);
  assert.ok(await evaluate(`document.body.textContent.includes('Beta network')`));
  await screenshot('guest-mobile',390,844);
  assert.equal(await evaluate(`(async()=>{const r=await fetch(location.pathname+'/qr.svg');return r.status})()`),200);
  await command('Emulation.setScriptExecutionDisabled',{value:true});await navigate(guest);
  await screenshot('guest-no-js',390,844);await command('Emulation.setScriptExecutionDisabled',{value:false});
  await navigate('/app.html');
  await evaluate(`localStorage.setItem('stayguide-demo-properties','{broken');window.location.reload()`);
  await waitFor(`!!document.querySelector('#state-recovery')&&!document.querySelector('#state-recovery').hidden`);
  assert.ok(await evaluate(`localStorage.getItem('stayguide-demo-properties')==='{broken'`));
  await screenshot('recovery-desktop',1440,1000);await screenshot('recovery-mobile',390,844);await screenshot('recovery-320',320,844);
  acceptDialog=true;await evaluate(`document.querySelector('#reset-state').click()`);
  await waitFor(`document.querySelector('#state-recovery').hidden`);
  assert.ok(await evaluate(`Object.keys(localStorage).some(k=>k.startsWith('stayguide-demo-recovery-')&&JSON.parse(localStorage.getItem(k)).properties==='{broken')`));
  assert.ok(await evaluate(`localStorage.getItem('stayguide-demo-properties')==='[]'&&!document.querySelector('#empty-state').hidden`));
  console.log('PASS: create, switching/stale success and failure, owner edit association, guest/QR, JS-disabled render and recovery backup.');
  console.log('Screenshots: '+artifacts);
}finally{
  try{await send('Browser.close');}catch{chrome.kill();}
  await new Promise(resolve=>server.close(resolve));
}
