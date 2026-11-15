// Optional Firefox real-download smoke. No WebDriver or added test dependencies.
// Uses a dedicated ignored profile and ephemeral in-memory Worker; never the owner's profile/data.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {handleRequest} from '../src/worker.js';
import {createLocalDb} from '../node/db.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname),pub=path.join(root,'public');
await fs.mkdir(path.join(root,'.local'),{recursive:true});
const profile=await fs.mkdtemp(path.join(root,'.local','sg-p22-firefox-')),downloads=path.join(profile,'downloads');await fs.mkdir(downloads);
await fs.writeFile(path.join(profile,'user.js'),[
 ['browser.download.folderList',2],['browser.download.dir',downloads],['browser.download.useDownloadDir',true],['browser.helperApps.neverAsk.saveToDisk','application/pdf'],['pdfjs.disabled',true],['dom.allow_scripts_to_close_windows',true],['browser.shell.checkDefaultBrowser',false],['browser.startup.homepage_override.mstone','ignore'],['datareporting.policy.dataSubmissionEnabled',false],['toolkit.telemetry.enabled',false]
].map(([key,value])=>`user_pref(${JSON.stringify(key)},${JSON.stringify(value)});`).join('\n'));
const db=createLocalDb();let origin,report;
const driver=`const wait=async(fn)=>{for(let i=0;i<600;i++){if(fn())return;await new Promise(r=>setTimeout(r,50))}throw Error('Timed out')};
try{
 if(!localStorage.getItem('ff-pdf-fixture')){const r=await fetch('/api/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({property_name:'Firefox Review House',welcome:'Καλώς ήρθατε. A quiet place to enjoy your stay.',wifi_name:'Review-DEMO',wifi_password:'Guest-DEMO-only',rules:'Please keep voices low after 22:00.'})});const d=await r.json();localStorage.setItem('stayguide-demo-properties',JSON.stringify([{id:d.id,token:d.token}]));localStorage.setItem('stayguide-demo-active',d.id);localStorage.setItem('ff-pdf-fixture','yes');location.reload();}
 else{await wait(()=>document.querySelector('#property-heading').textContent==='Firefox Review House'&&document.querySelector('#save-status').textContent==='All changes saved');
 const eager=performance.getEntriesByType('resource').some(r=>/pdfmake|noto-sans/.test(r.name));if(eager)throw Error('Eager PDF payload');
 document.querySelector('#open-qr').click();
 for(const size of ['A4','A5']){document.querySelector('input[value='+size+']').checked=true;document.querySelector('#download-book').click();await wait(()=>document.querySelector('#book-status').textContent.includes(size+' PDF')||!document.querySelector('#book-error').hidden);if(!document.querySelector('#book-error').hidden)throw Error('Generation failed');}
 await fetch('/firefox-result',{method:'POST',body:JSON.stringify({pass:true,userAgent:navigator.userAgent,eager,formats:['A4','A5']})});setTimeout(()=>window.close(),500);}
}catch{await fetch('/firefox-result',{method:'POST',body:JSON.stringify({pass:false,error:'Firefox generation or UI failed'})})}`;
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/firefox-result'){let body='';for await(const chunk of req)body+=chunk;report=JSON.parse(body);res.end('ok');return;}
  const response=await handleRequest(new Request(origin+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:await (async()=>{const chunks=[];for await(const c of req)chunks.push(c);return Buffer.concat(chunks)})()}),{DB:db,ASSETS:{async fetch(request){
   const pathname=new URL(request.url).pathname;
   if(pathname==='/firefox-driver.js')return new Response(driver,{headers:{'Content-Type':'text/javascript'}});
   const target=path.resolve(pub,'.'+pathname);if(!target.startsWith(pub+path.sep))return new Response('not found',{status:404});
   let data=await fs.readFile(target);if(pathname==='/app.html')data=Buffer.from(data.toString().replace('</body>','<script type="module" src="/firefox-driver.js"></script></body>'));
   return new Response(data,{headers:{'Content-Type':pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.css')?'text/css':'text/html'}});
  }}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Smoke failure');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
const browser=spawn('firefox',['--headless','--no-remote','--profile',profile,origin+'/app.html'],{detached:true,stdio:['ignore','ignore','ignore']});
try{
 for(let i=0;i<900&&!report;i++)await new Promise(r=>setTimeout(r,100));
 if(!report?.pass)throw Error(report?.error||'Firefox unavailable or result timeout');
 for(let i=0;i<100;i++){const names=await fs.readdir(downloads);if(names.filter(n=>n.endsWith('.pdf')).length===2&&!names.some(n=>n.endsWith('.part')))break;await new Promise(r=>setTimeout(r,100));}
 const names=(await fs.readdir(downloads)).filter(n=>n.endsWith('.pdf'));if(names.length!==2)throw Error('Firefox did not complete both downloads');
 const outputs=[];
 for(const name of names){const file=path.join(downloads,name),info=execFileSync('pdfinfo',[file],{encoding:'utf8'}),text=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});if(!text.includes('Firefox Review House')||!text.includes('Καλώς ήρθατε'))throw Error('Firefox PDF content missing');outputs.push({file:name,bytes:(await fs.stat(file)).size,info});}
 const result={...report,outputs};await fs.writeFile(path.join(profile,'result.json'),JSON.stringify(result,null,2));console.log('PASS: Firefox A4/A5 actual UI downloads and independent PDF/content checks. Evidence: '+profile);
}finally{
 // The dedicated test page closes its own window; do not signal Snap's privileged launcher.
 browser.unref();
 server.closeAllConnections();await new Promise(r=>server.close(r));
}
