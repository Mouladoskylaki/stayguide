// Full real-pdfmake checks inside the existing Chrome/Worker host regression harness.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {bookFilename} from '../public/welcome-book.js';

const typical={property_name:'Aliki Garden House',welcome:'Welcome to Aliki Garden House. Open the courtyard shutters and settle in with a cup of mountain tea.\n\nThis fictional coastal home is made for slow breakfasts and long walks. The blue folder on the shelf has our favourite walking routes.',wifi_name:'Aliki-Guest-DEMO',wifi_password:'LemonGarden-DEMO!',checkin:'From 15:00. Please arrange your arrival time with your host before travelling. Private arrival instructions are shared separately.',checkout:'By 11:00. Wash the dishes, close the windows and switch off the air conditioning. Leave used towels in the bathroom basket.',rules:'Keep voices low in the courtyard after 22:00. Please smoke only outside and use the covered ashtray.\n\nBeach towels are striped; bathroom towels stay indoors. Tell us about any breakages so we can replace them.',appliances:'Coffee: fill the water tank, insert a paper filter and press the round button.\nHot water: allow a short warm-up before showering. Please leave the router connected.',parking:'Use the marked space beside the olive tree. The fictional village shuttle stops at the square; check its current timetable locally.',local_tips:'Start with the fictional Harbour Bakery for breakfast. For a quiet afternoon, follow the coastal path towards the old windmill.\nMarket mornings are a lovely time to explore the square.',emergency:'Fictional review example: confirm local emergency numbers and the nearest medical centre before sharing this guide. The first-aid kit is on the kitchen shelf.',contact:'Your fictional hosts: Anna and Nikos\nhello@example.com\nMessage us using the contact details in your reservation.',additional:'Recycling containers are beside the village square. Please separate glass and paper. Spare blankets are in the bedroom wardrobe.'};
const greek={property_name:'Το Σπίτι της Αλυκής',welcome:'Καλώς ήρθατε στο σπίτι μας. Ανοίξτε τα παντζούρια και απολαύστε την ησυχία της αυλής.\n\nΣτην κουζίνα θα βρείτε τσάι του βουνού και μέλι. Οι πληροφορίες είναι φανταστικές για έλεγχο του οδηγού.',wifi_name:'Αλυκή-DEMO',wifi_password:'LemonGarden-DEMO!',checkin:'Άφιξη από τις 15:00. Ενημερώστε μας για την ώρα άφιξής σας πριν ταξιδέψετε.',checkout:'Αναχώρηση έως τις 11:00. Κλείστε τα παράθυρα και σβήστε τα φώτα.',rules:'Παρακαλούμε σεβαστείτε την ησυχία μετά τις 22:00. Το κάπνισμα επιτρέπεται μόνο στην αυλή.',appliances:'Για τον καφέ, γεμίστε το δοχείο με νερό και πατήστε το στρογγυλό κουμπί.',parking:'Σταθμεύστε στη θέση δίπλα στην ελιά. Η πλατεία απέχει πέντε λεπτά με τα πόδια.',local_tips:'Δοκιμάστε τον φανταστικό φούρνο της πλατείας. Το απόγευμα περπατήστε προς τον παλιό ανεμόμυλο.',emergency:'Φανταστικό παράδειγμα: επιβεβαιώστε τα στοιχεία των υπηρεσιών έκτακτης ανάγκης πριν κοινοποιήσετε τον οδηγό.',contact:'Φανταστικοί οικοδεσπότες: Άννα και Νίκος\nhello@example.com',additional:'Οι κάδοι ανακύκλωσης βρίσκονται στην πλατεία. Ευχαριστούμε που φροντίζετε το σπίτι. Café € — Ἀθήνα α\u0301 Привет'};

export async function checkWelcomeBook({origin,artifacts,command,evaluate,navigate,screenshot,waitFor}){
 const directory=path.join(artifacts,'book');await fs.mkdir(directory,{recursive:true});
 await navigate('/app.html');await waitFor("document.querySelector('#property-heading').textContent==='Sea View Villa'");
 assert.ok(await evaluate("!performance.getEntriesByType('resource').some(r=>/pdfmake|noto-sans|welcome-book|pdf-font-coverage/.test(r.name))"),'PDF assets absent on normal dashboard startup');
 await evaluate("document.querySelector('#open-qr').click()");
 assert.ok(await evaluate("!performance.getEntriesByType('resource').some(r=>/pdfmake|noto-sans/.test(r.name))"),'Opening workspace does not load library/fonts');
 const coldBefore=await evaluate('performance.memory?.usedJSHeapSize??null');
 const coldStarted=Date.now();await evaluate("document.querySelector('#download-book').click()");
 await waitFor("document.querySelector('#book-status').textContent.includes('ready')");
 const cold={uiElapsedMs:Date.now()-coldStarted,heapBefore:coldBefore,heapAfter:await evaluate('performance.memory?.usedJSHeapSize??null'),resources:await evaluate("performance.getEntriesByType('resource').filter(r=>/vendor|welcome-book|pdf-font-coverage/.test(r.name)).map(r=>({path:new URL(r.name).pathname,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,duration:r.duration}))")};
 await navigate('/app.html');await waitFor("document.querySelector('#property-heading').textContent==='Sea View Villa'");await evaluate("document.querySelector('#open-qr').click()");
 // Block the actual lazy font asset once, then verify failure and retry in the real UI.
 await command('Network.setBlockedURLs',{urls:['*/vendor/noto-sans-2.015.js']});
 await evaluate("document.querySelector('#download-book').click();document.querySelector('#download-book').click()");
 await waitFor("!document.querySelector('#book-error').hidden && !document.querySelector('#book-controls').disabled");
 assert.ok(await evaluate("document.querySelector('#book-error').textContent.includes('retry')"));
 await command('Network.setBlockedURLs',{urls:[]});
 await evaluate("document.querySelector('#download-book').click()");
 await waitFor("document.querySelector('#book-status').textContent.includes('ready')");
 const download=path.join(artifacts,'downloads',bookFilename('Sea View Villa','A4'));
 for(let i=0;i<100;i++){try{await fs.access(download);break;}catch{await new Promise(r=>setTimeout(r,30));}}
 assert.equal((await fs.readFile(download)).subarray(0,5).toString(),'%PDF-');
 await fs.copyFile(download,path.join(directory,'ui-download-a4.pdf'));
 // Radio controls are reachable with native keyboard; selecting A5 changes actual output.
 await evaluate("document.querySelector('input[value=A5]').focus()");
 for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:' ',code:'Space',windowsVirtualKeyCode:32,...(type==='keyDown'?{text:' '}:{})});
 assert.ok(await evaluate("document.querySelector('input[value=A5]').checked"));
 await evaluate("document.querySelector('#download-book').click()");await waitFor("document.querySelector('#book-status').textContent.includes('A5 PDF')");
 const a5=path.join(artifacts,'downloads',bookFilename('Sea View Villa','A5'));
 for(let i=0;i<100;i++){try{await fs.access(a5);break;}catch{await new Promise(r=>setTimeout(r,30));}}
 await fs.copyFile(a5,path.join(directory,'ui-download-a5.pdf'));
 for(const width of [1440,390,320]){
   await command('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:false});
   await evaluate("document.querySelector('.book-panel').scrollIntoView({block:'center',behavior:'instant'})");
   assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth && document.querySelector('#qr-workspace').scrollWidth<=document.querySelector('#qr-workspace').clientWidth && document.querySelector('#download-book').getBoundingClientRect().width>=44"));
   await screenshot('book-workspace-'+width,width,width===1440?1000:844);
 }
 // Hold canonical QR response; close and switch while generation is in flight.
 await evaluate("window.bookOriginalFetch=fetch;window.bookRelease=null;window.fetch=async(u,o)=>{if(String(u).endsWith('/qr.svg'))await new Promise(r=>window.bookRelease=r);return bookOriginalFetch(u,o)};document.querySelector('#download-book').click()");
 await waitFor('!!window.bookRelease');
 await evaluate("document.querySelector('#close-qr').click();document.querySelectorAll('.property-tab')[0].click()");
 await waitFor("document.querySelector('#save-status').textContent==='All changes saved' && document.querySelector('#property-heading').textContent!=='Sea View Villa'");
 await evaluate("window.bookRelease();window.fetch=window.bookOriginalFetch");
 await new Promise(r=>setTimeout(r,250));
 assert.ok(await evaluate("document.querySelector('#book-status').textContent==='' && !document.querySelector('#book-controls').disabled"),'No stale success in different property');
 await evaluate("document.querySelectorAll('.property-tab')[1].click()");await waitFor("document.querySelector('#property-heading').textContent==='Sea View Villa'");
 // Actual module + canonical route on synthetic saved fixtures, without modifying host localStorage.
 const fixtures=[{id:'welcome-a4',size:'A4',model:typical},{id:'welcome-a5',size:'A5',model:typical},{id:'greek-content',size:'A5',model:greek},{id:'minimal-a4',size:'A4',model:{property_name:'The Quiet Room'}},{id:'minimal-a5',size:'A5',model:{property_name:'The Quiet Room'}},{id:'maximum-name-a4',size:'A4',model:{...typical,property_name:'Θ'.repeat(80)}},{id:'maximum-name-a5',size:'A5',model:{...typical,property_name:'Θ'.repeat(80)}},{id:'long-a4',size:'A4',model:{...typical,additional:Array.from({length:60},(_,i)=>`Route${String(i+1).padStart(3,'0')} Walk beside the olive grove. Ακολουθήστε το μονοπάτι προς την πλατεία.`).join(' ')}},{id:'long-a5',size:'A5',model:{...typical,additional:Array.from({length:60},(_,i)=>`Route${String(i+1).padStart(3,'0')} Walk beside the olive grove. Ακολουθήστε το μονοπάτι προς την πλατεία.`).join('\n')}}];
 // Keep API field limits: long paragraphs span pages within the 2,000-character saved-field bound.
 for(const f of fixtures)if(f.id.startsWith('long-'))f.model.additional=f.model.additional.slice(0,1950)+'\nEND-MARKER';
 const limits={welcome:1500,wifi_name:100,wifi_password:150,checkin:800,checkout:800,rules:2000,appliances:2000,parking:1000,local_tips:2000,emergency:1000,contact:1000,additional:2000};
 const extreme={property_name:'Θ'.repeat(80),...Object.fromEntries(Object.entries(limits).map(([key,max])=>[key,('Saved '+key+' details. Καλώς ήρθατε.\n').repeat(max).slice(0,max-11)+' END-'+key]))};
 // Keep exact schema maxima even for varying sentinel lengths.
 for(const [key,max] of Object.entries(limits))extreme[key]=extreme[key].slice(0,max);
 fixtures.push({id:'extreme-a4',size:'A4',model:extreme},{id:'extreme-a5',size:'A5',model:extreme});
 fixtures.push({id:'wide-name-a4',size:'A4',model:{...typical,property_name:'W'.repeat(80)}},{id:'wide-name-a5',size:'A5',model:{...typical,property_name:'W'.repeat(80)}});
 const results=[];
 for(const f of fixtures){
  const result=await evaluate(`(async()=>{
    const model=${JSON.stringify(f.model)},r=await fetch('/api/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(model)});if(!r.ok)throw Error('fixture create failed');const created=await r.json();
    const tools=await import('/welcome-book.js'),snapshot=tools.bookSnapshot(model,location.origin+'/g/'+created.id);
    const before=performance.memory?.usedJSHeapSize??null,start=performance.now(),output=await tools.generateBook(snapshot,${JSON.stringify(f.size)});
    const bytes=new Uint8Array(await output.blob.arrayBuffer());let s='';for(const v of bytes)s+=String.fromCharCode(v);
    return {base64:btoa(s),destination:snapshot.destination,elapsedMs:performance.now()-start,generationMs:output.elapsedMs,bytes:bytes.length,heapBefore:before,heapAfter:performance.memory?.usedJSHeapSize??null};
  })()`);
  await fs.writeFile(path.join(directory,f.id+'.pdf'),Buffer.from(result.base64,'base64'));delete result.base64;
  results.push({...f,...result});
 }
 // Repeated warm export measurements on identical saved text.
 const warm=[];
 for(let i=0;i<3;i++)warm.push(await evaluate(`(async()=>{const t=await import('/welcome-book.js');const snapshot=t.bookSnapshot(${JSON.stringify(typical)},${JSON.stringify(results[0].destination)});const r=await t.generateBook(snapshot,'A4');return {ms:r.elapsedMs,bytes:r.blob.size};})()`));
 const resources=await evaluate("performance.getEntriesByType('resource').filter(r=>/vendor|welcome-book|pdf-font-coverage/.test(r.name)).map(r=>({path:new URL(r.name).pathname,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,duration:r.duration}))");
 await fs.writeFile(path.join(directory,'fixtures.json'),JSON.stringify(results,null,2));
 await fs.writeFile(path.join(directory,'performance.json'),JSON.stringify({userAgent:await evaluate('navigator.userAgent'),cold,resources,warm,measurements:results.map(({id,bytes,elapsedMs,generationMs,heapBefore,heapAfter})=>({id,bytes,elapsedMs,generationMs,heapBefore,heapAfter}))},null,2));
 // Rejection feedback does not expose content or generate a document.
 await evaluate("document.querySelector('#open-qr').click()");
 await evaluate("window.bookFetch=fetch;window.fetch=async(u,o)=>String(u).endsWith('/qr.svg')?new Response('failure',{status:503}):bookFetch(u,o);document.querySelector('#download-book').click()");
 await waitFor("!document.querySelector('#book-error').hidden");await evaluate("window.fetch=window.bookFetch;document.querySelector('#download-book').click()");await waitFor("document.querySelector('#book-status').textContent.includes('ready')");
 await evaluate("document.querySelector('#close-qr').click()");
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 console.log('PASS: SG-P22 actual A4/A5 UI downloads, lazy assets, font/QR failure retry, duplicate guard, stale close/property switch, keyboard and 1440/390/320 workspace; thirteen real fixture PDFs and three warm repeats generated.');
}
