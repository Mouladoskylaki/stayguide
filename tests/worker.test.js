import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../src/worker.js';
import {qrMatrix,qrSvg} from '../src/qr.js';
import {createLocalDb} from '../node/db.mjs';
const env={DB:createLocalDb()};
const request=(path,method='GET',body,token)=>new Request('https://stayguide.example'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{'Authorization':'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
const call=(path,method='GET',body,token)=>handleRequest(request(path,method,body,token),env);
let id,token;
test('create a guide without signing up',async()=>{
  const r=await call('/api/guides','POST',{property_name:'Little Olive House',wifi_name:'Olive-WiFi'});
  assert.equal(r.status,201);({id,token}=await r.json());assert.match(id,/^[a-f0-9]{16}$/);assert.equal(token.length,64);
});
test('public page is server rendered, fast, noindex and contains no credentials',async()=>{
  const r=await call('/g/'+id);assert.equal(r.status,200);
  const page=await r.text();assert.match(page,/Little Olive House/);assert.match(page,/Olive-WiFi/);
  assert.match(page,/name="robots" content="noindex,nofollow"/);assert.equal(page.includes(token),false);
  assert.equal(page.includes('react'),false);
});
test('editing API requires correct secret',async()=>{
  assert.equal((await call('/api/guides/'+id)).status,401);
  assert.equal((await call('/api/guides/'+id,'PATCH',{wifi_name:'Bad'})).status,401);
  assert.equal((await call('/api/guides/'+id,'GET',undefined,'wrong')).status,401);
  const response=await call('/api/guides/'+id,'GET',undefined,token);
  assert.equal((await response.json()).guide.wifi_name,'Olive-WiFi');
});
test('updates reflect at stable public address',async()=>{
  const r=await call('/api/guides/'+id,'PATCH',{welcome:'Welcome!',wifi_password:'test_wifi_2026'},token);
  assert.equal(r.status,200);
  const page=await (await call('/g/'+id)).text();assert.match(page,/test_wifi_2026/);assert.match(page,/Welcome!/);
});
test('HTML injection escaped in guest page and app schema rejects malicious fields',async()=>{
  assert.equal((await call('/api/guides/'+id,'PATCH',{foo:'bar'},token)).status,400);
  await call('/api/guides/'+id,'PATCH',{rules:'<script>alert(1)</script>'},token);
  const page=await (await call('/g/'+id)).text();
  assert.equal(page.includes('<script>alert(1)</script>'),false);
  assert.match(page,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
test('QR is generated for public URL; print card works',async()=>{
  const r=await call('/g/'+id+'/qr.svg');assert.equal(r.status,200);
  const s=await r.text();assert.match(s,/<svg /);assert.match(s,/path fill/);
  const card=await call('/g/'+id+'/card');assert.equal(card.status,200);
  assert.match(await card.text(),/Print using your browser/);
});
test('QR output has correct module size and rejects impossible length',()=>{
  assert.equal(qrMatrix('https://st.gu/g/123').length,41);
  assert.equal(qrMatrix('https://example.com/g/12345678901234567890123456789012345678901234567890').length,41);
  assert.equal(qrMatrix('https://example.com/g/'+'a'.repeat(120)).length,57);
  assert.throws(()=>qrSvg('a'.repeat(214)),/too long/);
});
test('nonexistent guide and bad create data rejected',async()=>{
  assert.equal((await call('/g/0000000000000000')).status,404);
  assert.equal((await call('/api/guides','POST',{property_name:''})).status,400);
  assert.equal((await call('/api/guides','POST',{property_name:'X',unknown:'xx'})).status,400);
});
