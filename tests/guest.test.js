import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {handleRequest} from '../src/worker.js';
import {createLocalDb} from '../node/db.mjs';
import {qrSvg} from '../src/qr.js';

const sections=['wifi','welcome','arrival','rules','appliances','parking','local_tips','emergency','contact','additional'];
const full={property_name:'Sea View Villa',welcome:'Welcome by the sea.\n\nMake yourself at home.',wifi_name:'Villa Guest',wifi_password:'Example WiFi only',checkin:'From 15:00\nThe entrance faces the garden.',checkout:'Before 11:00',rules:'No smoking indoors.',appliances:'Coffee filters are in the cupboard.',parking:'Park beside the olive tree.',local_tips:'Try the village bakery.',emergency:'Emergency services: 112.',contact:'Message your host using your booking details.',additional:'Beach towels are in the basket.'};
async function fixture(model){
  const env={DB:createLocalDb()};
  const call=(path,method='GET',body)=>handleRequest(new Request('https://stayguide.example'+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),env);
  const created=await call('/api/guides','POST',model);assert.equal(created.status,201);
  const guide=await created.json(),response=await call(guide.guide_url);
  return {call,guide,response,page:await response.text()};
}
test('guest SSR contains all ten saved sections and matching ordinary anchors',async()=>{
  const {page}=await fixture(full);
  for(const id of sections){
    assert.ok(page.includes(`href="#${id}"`),id+' tile');
    assert.ok(page.includes(`class="guest-section" id="${id}"`),id+' section');
    assert.ok(page.includes(`aria-labelledby="${id}-title"`));
  }
  assert.equal((page.match(/<a class="guest-tile/g)||[]).length,10);
  assert.equal((page.match(/<h1>/g)||[]).length,1);
  assert.match(page,/<h3>Check-in<\/h3>/);assert.match(page,/<h3>Check-out<\/h3>/);
  assert.ok(page.indexOf('id="wifi"')<page.indexOf('id="welcome"'));
  assert.match(page,/href="\/guest.css"/);assert.ok(!page.includes('/styles.css'));
  assert.equal((page.match(/<script /g)||[]).length,1);
  assert.ok(!page.includes('<img'));
});
test('SSR preserves multiline text, blank paragraphs and exact guest-facing Wi-Fi values',async()=>{
  const {page}=await fixture(full);
  assert.match(page,/Welcome by the sea\.<br><br>Make yourself at home\./);
  assert.match(page,/From 15:00<br>The entrance faces the garden\./);
  assert.match(page,/<code id="wifi-password"[^>]*>Example WiFi only<\/code>/);
  assert.match(page,/data-copy="wifi-password"[^>]* hidden/);
  assert.match(page,/id="wifi-copy-status"[^>]*role="status"/);
});
test('empty and whitespace-only optional fields omit navigation and show a truthful empty guide',async()=>{
  for(const model of [{property_name:'Quiet Cottage'},{property_name:'Quiet Cottage',welcome:' \n',wifi_name:' ',wifi_password:'\n',checkin:' ',checkout:'\n',rules:' ',appliances:' ',parking:' ',local_tips:' ',emergency:' ',contact:' ',additional:' '}]){
    const {page}=await fixture(model);
    assert.match(page,/Your host is preparing this guide/);
    assert.ok(!page.includes('class="quick-nav"'));assert.ok(!page.includes('class="guest-section"'));
    assert.ok(!page.includes('data-copy='));
  }
});
test('a sparse guide shows only its saved section and does not invent Wi-Fi or arrival values',async()=>{
  const {page}=await fixture({property_name:'Quiet Cottage',checkout:'Before 11:00',wifi_password:'Example only'});
  assert.match(page,/href="#wifi"/);assert.match(page,/href="#arrival"/);
  assert.ok(!page.includes('<dt>Network</dt>'));assert.ok(!page.includes('<h3>Check-in</h3>'));
  for(const id of sections.filter(id=>!['wifi','arrival'].includes(id)))assert.ok(!page.includes(`href="#${id}"`));
});
test('network-only Wi-Fi has no copy button or invented password',async()=>{
  const {page}=await fixture({property_name:'Quiet Cottage',wifi_name:'Open guest network'});
  assert.match(page,/Open guest network/);assert.ok(!page.includes('wifi-password'));
  assert.ok(!page.includes('data-copy='));
});
test('long names and unbroken content survive SSR without truncation',async()=>{
  const model={property_name:'P'.repeat(80),wifi_name:'N'.repeat(100),wifi_password:'W'.repeat(150),rules:'R'.repeat(2000)};
  const {page}=await fixture(model);
  for(const value of Object.values(model))assert.ok(page.includes(value));
});
test('untrusted names, text and Wi-Fi values are escaped in every public context',async()=>{
  const injected='<img src=x onerror=alert(1)> & "quoted"';
  const {page}=await fixture({property_name:injected,welcome:'<script>bad()</script>',wifi_name:injected,wifi_password:injected,rules:injected,checkin:injected,contact:injected});
  assert.ok(!page.includes('<img'));assert.ok(!page.includes('<script>bad()'));
  assert.match(page,/&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;quoted&quot;/);
  assert.match(page,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);
});
test('guest noindex, security headers, CSP and owner-credential exclusion remain intact',async()=>{
  const {page,response,guide,call}=await fixture(full);
  assert.match(page,/name="robots" content="noindex,nofollow"/);
  assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  assert.equal(response.headers.get('Content-Security-Policy'),"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  assert.equal(page.includes(guide.token),false);assert.ok(!page.includes('edit_token'));
  assert.equal((await call('/api/guides/'+guide.id)).status,401);
});
test('stable guest URLs, exact QR destination and existing print card are preserved',async()=>{
  const {call,guide}=await fixture(full);
  assert.equal(guide.guide_url,'/g/'+guide.id);
  const qr=await call(guide.qr_url);assert.equal(qr.status,200);
  assert.equal(await qr.text(),qrSvg('https://stayguide.example'+guide.guide_url));
  const card=await call(guide.guide_url+'/card');assert.equal(card.status,200);
  const page=await card.text();assert.match(page,/href="\/styles.css"/);assert.match(page,/Print using your browser/);
  assert.ok(!page.includes('guest.css'));assert.equal(page.includes(guide.token),false);
});

// Run the actual enhancement script at the browser boundary; no DOM library/dependency.
function copyHarness(writeText){
  let click,selected=false;
  const password={textContent:'Synthetic WiFi value',focus(){this.focused=true;}};
  const button={hidden:true,dataset:{copy:'wifi-password'},disabled:false,textContent:'Copy password'};
  const status={textContent:''};
  const context={document:{querySelectorAll:()=>[button],addEventListener:(name,fn)=>{click=fn;},getElementById:id=>id==='wifi-password'?password:status,createRange:()=>({selectNodeContents(node){selected=node===password;}})},navigator:{clipboard:writeText?{writeText}:undefined},window:{getSelection:()=>({removeAllRanges(){},addRange(){}})}};
  vm.runInNewContext(fs.readFileSync(new URL('../public/guest.js',import.meta.url),'utf8'),context);
  return {button,password,status,selected:()=>selected,click:()=>click({target:{closest:()=>button}})};
}
test('Wi-Fi copy reveals its enhancement, copies the exact text and announces success',async()=>{
  let copied;const h=copyHarness(async value=>{copied=value;});
  assert.equal(h.button.hidden,false);await h.click();assert.equal(copied,h.password.textContent);
  assert.match(h.button.textContent,/Copied/);assert.match(h.status.textContent,/password copied/);
  assert.equal(h.button.disabled,false);
});
test('denied or unavailable Clipboard API selects the readable password and explains manual copy',async()=>{
  for(const writer of [undefined,async()=>{throw Error('private diagnostic');}]){
    const h=copyHarness(writer);await h.click();assert.equal(h.password.focused,true);assert.equal(h.selected(),true);
    assert.match(h.status.textContent,/copy it manually/);assert.ok(!h.status.textContent.includes('private'));
    assert.equal(h.button.disabled,false);
  }
});
test('pending Wi-Fi copy blocks duplicate requests and permits another attempt afterwards',async()=>{
  let finish,calls=0;const h=copyHarness(()=>{calls++;return new Promise(resolve=>finish=resolve);});
  const first=h.click();await h.click();assert.equal(calls,1);assert.equal(h.button.disabled,true);
  finish();await first;assert.equal(h.button.disabled,false);
});
