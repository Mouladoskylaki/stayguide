import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewWarning,qrFilename,qrRasterSize} from '../public/qr-tools.js';
import {handleRequest} from '../src/worker.js';
import {createLocalDb} from '../node/db.mjs';
import {qrSvg} from '../src/qr.js';
for(const host of ['localhost','villa.localhost','127.0.0.1','127.44.1.2','10.0.0.8','172.16.0.1','172.31.255.254','192.168.1.20','169.254.1.1','100.64.0.1','[::1]','[fc00::1]','[fd12::2]','[fe80::1]','[::ffff:127.0.0.1]','stayguide.local','villa.lan']){
  test('local/private QR warning: '+host,()=>assert.match(previewWarning('http://'+host+'/g/0123456789abcdef'),/unsuitable for permanent/));
}
for(const host of ['sample.trycloudflare.com','sample.ngrok-free.app','sample.ngrok.io','sample.lhr.life','sample.localhost.run','sample.loca.lt','sample.pinggy.link']){
  test('temporary QR warning: '+host,()=>assert.match(previewWarning('https://'+host+'/g/0123456789abcdef'),/Do not use this QR for permanent/));
}
test('public HTTPS does not imply production approval; HTTP and invalid destinations warn',()=>{
  assert.equal(previewWarning('https://stayguide.example/g/0123456789abcdef'),'');
  assert.match(previewWarning('http://stayguide.example/g/0123456789abcdef'),/does not use HTTPS/);
  assert.match(previewWarning('invalid destination'),/could not be verified/);
  assert.equal(previewWarning('https://172.32.0.1/g/0123456789abcdef'),'');
});
test('QR filenames remove path/control/HTML characters, handle Unicode and bound long names',()=>{
  assert.equal(qrFilename('Sea View Villa','png'),'sea-view-villa-qr.png');
  assert.equal(qrFilename('../../Olive & "Sea" <House>\n','svg'),'olive-sea-house-qr.svg');
  assert.equal(qrFilename('Café Σπίτι','png'),'cafe-σπιτι-qr.png');
  assert.equal(qrFilename('CON','png'),'property-con-qr.png');
  assert.equal(qrFilename('🙂','svg'),'property-qr.svg');
  assert.ok(qrFilename('W'.repeat(80),'png').length<=67);
  assert.throws(()=>qrFilename('Place','../bad'));
});
test('canonical SVG supplies a square high-resolution integer-module PNG raster size',()=>{
  for(const url of ['https://stayguide.example/g/0123456789abcdef','https://'+'p'.repeat(55)+'.'+'s'.repeat(28)+'.example/g/0123456789abcdef']){
    const svg=qrSvg(url),size=qrRasterSize(svg);
    assert.ok(size>=1024);assert.equal(size%32,0);
    assert.match(svg,/<path fill="#ffffff"/);
    assert.ok([1568,2080].includes(size));
  }
  assert.throws(()=>qrRasterSize('<svg viewBox="0 0 49 65">'));
  assert.throws(()=>qrRasterSize('<svg viewBox="0 0 9999 9999">'));
});
test('welcome card keeps the exact public QR route, escaped name, security and local warning',async()=>{
  const env={DB:createLocalDb()};
  const model={property_name:'<Garden & "Sea">'};
  const create=await handleRequest(new Request('http://127.0.0.1:8787/api/guides',{method:'POST',body:JSON.stringify(model)}),env);
  const {id,token}=await create.json();
  for(const origin of ['http://127.0.0.1:8787','https://sample.lhr.life','https://stayguide.example']){
    const response=await handleRequest(new Request(origin+'/g/'+id+'/card'),env),html=await response.text();
    assert.equal(response.status,200);assert.ok(html.includes(origin+'/g/'+id));
    assert.ok(html.includes('src="/g/'+id+'/qr.svg"'));assert.ok(!html.includes(token));
    assert.match(html,/&lt;Garden &amp; &quot;Sea&quot;&gt;/);assert.ok(!html.includes('<Garden'));
    assert.match(html,/href="\/print.css"/);assert.match(html,/src="\/print.js"/);
    assert.equal(html.includes('class="print-notice"'),origin!=='https://stayguide.example');
    assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');
    assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
  }
});
