// Invoked by the existing isolated Chrome/Worker browser harness.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {qrSvg} from '../src/qr.js';
import {qrFilename} from '../public/qr-tools.js';

export async function checkQrPrint({origin,artifacts,command,evaluate,navigate,screenshot,waitFor}){
  const directory=path.join(artifacts,'downloads');
  const name=await evaluate("document.querySelector('#property-heading').textContent");
  const guest=await evaluate("new URL(document.querySelector('#view-link').href).pathname");
  for(const width of [1440,390,320]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:false});
    await evaluate("document.querySelector('#open-qr').click()");
    await waitFor("document.querySelector('#qr-preview').complete && document.querySelector('#qr-preview').naturalWidth>0");
    assert.ok(await evaluate("document.activeElement.id==='close-qr' && document.querySelector('#qr-workspace').open"));
    await evaluate("document.querySelector('#new-property').focus()");
    assert.ok(await evaluate("document.querySelector('#qr-workspace').contains(document.activeElement)"));
    assert.equal(await evaluate("document.querySelector('#qr-destination').textContent"),origin+guest);
    assert.ok(await evaluate("!document.querySelector('#qr-url-warning').hidden && document.querySelector('#qr-url-warning').textContent.includes('unsuitable for permanent')"));
    await screenshot('qr-workspace-'+width,width,width===1440?1000:844);
    await evaluate("document.querySelector('#print-card').focus()");
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await evaluate('document.activeElement.id'),'close-qr');
    assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth && document.querySelector('#qr-workspace').scrollWidth<=document.querySelector('#qr-workspace').clientWidth"));
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    assert.ok(await evaluate("document.querySelector('#qr-workspace').hidden && document.activeElement.id==='open-qr'"));
  }
  await evaluate("document.querySelector('#open-qr').click();document.querySelector('#download-png').click()");
  const pngName=qrFilename(name,'png');
  for(let i=0;i<150;i++){if((await fs.readdir(directory)).includes(pngName))break;await new Promise(r=>setTimeout(r,30));}
  const png=await fs.readFile(path.join(directory,pngName));
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.readUInt32BE(16)>=1024);assert.equal(png.readUInt32BE(16),png.readUInt32BE(20));
  await waitFor("!document.querySelector('#download-png').disabled");
  await evaluate("document.querySelector('#qr-workspace .qr-workspace-body').scrollTop=0");
  // Simulate a conversion failure, then ensure the same live workspace remains retryable.
  await evaluate("window.qrFetch=fetch;window.fetch=async(url,options)=>String(url).endsWith('/qr.svg')?new Response('unavailable',{status:503}):qrFetch(url,options);document.querySelector('#download-png').click()");
  await waitFor("!document.querySelector('#qr-download-error').hidden");
  assert.ok(await evaluate("!document.querySelector('#download-png').disabled && document.querySelector('#qr-workspace').open && document.activeElement.id==='qr-download-error'"));
  await evaluate("window.fetch=qrFetch;document.querySelector('#close-qr').click();document.querySelector('#open-qr').click()");
  // Late public-SVG responses cannot repaint or download for another selected property.
  await evaluate("window.fetch=(url,options)=>String(url).endsWith('/qr.svg')?new Promise(resolve=>window.releaseOldQr=()=>qrFetch(url,options).then(resolve)):qrFetch(url,options);document.querySelector('#download-png').click();document.querySelectorAll('.property-tab')[0].click()");
  await waitFor("document.querySelector('#property-heading').textContent==='Olive Apartment'");
  await evaluate("document.querySelector('#open-qr').click();window.releaseOldQr()");
  await new Promise(r=>setTimeout(r,80));
  assert.ok(await evaluate("document.querySelector('#qr-property-name').textContent==='Olive Apartment' && document.querySelector('#qr-destination').href===document.querySelector('#view-link').href && !document.querySelector('#download-png').disabled && document.querySelector('#qr-download-error').hidden && document.querySelector('#qr-download-status').textContent===''") );
  await evaluate("window.fetch=qrFetch;document.querySelector('#close-qr').click();document.querySelectorAll('.property-tab')[1].click()");
  await waitFor("document.querySelector('#property-heading').textContent==='Sea View Villa'");
  // SVG/PNG pixel equivalence and independent decoding if Chrome provides a decoder.
  const urls=['https://stayguide.example/g/0123456789abcdef','https://coastal-stays.example/g/fedcba9876543210','https://'+'p'.repeat(55)+'.'+'s'.repeat(28)+'.example/g/0123456789abcdef'];
  const decoded=[];
  const detector=await evaluate("(async()=>typeof BarcodeDetector!=='undefined' && (await BarcodeDetector.getSupportedFormats()).includes('qr_code'))()");
  for(let i=0;i<urls.length;i++){
    const svg=qrSvg(urls[i]);await fs.writeFile(path.join(artifacts,'qr-sample-'+i+'.svg'),svg);
    const result=await evaluate(`(async()=>{
      const {qrPngBlob,qrRasterSize}=await import('/qr-tools.js');
      const svg=${JSON.stringify(svg)},size=qrRasterSize(svg),blob=await qrPngBlob(svg);
      const image=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
      const c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,size,size).data;
      let crisp=true;for(let p=0;p<pixels.length;p+=4){if(pixels[p+3]!==255||!((pixels[p]===255&&pixels[p+1]===255&&pixels[p+2]===255)||(pixels[p]===20&&pixels[p+1]===44&&pixels[p+2]===42))){crisp=false;break;}}
      const modules=size/32;let quiet=true;for(let y=0;y<size;y++)for(const x of [0,127,size-128,size-1]){const p=(y*size+x)*4;if(pixels[p]!==255)quiet=false;}
      const roundtrip=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),vector=new Image();vector.src=roundtrip;await vector.decode();c.imageSmoothingEnabled=false;c.drawImage(vector,0,0,size,size);URL.revokeObjectURL(roundtrip);
      const fromSvg=c.getImageData(0,0,size,size).data;let same=true;for(let p=0;p<pixels.length;p++){if(pixels[p]!==fromSvg[p]){same=false;break;}}
      const decoded=[];if(${JSON.stringify(detector)}){const scanner=new BarcodeDetector({formats:['qr_code']});decoded.push((await scanner.detect(image))[0]?.rawValue);decoded.push((await scanner.detect(vector))[0]?.rawValue);}
      const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
      return {size,crisp,quiet,same,decoded,data};
    })()`);
    assert.ok(result.size>=1024&&result.crisp&&result.quiet&&result.same,'Canonical SVG and PNG have identical crisp, opaque pixels and a white quiet zone');
    await fs.writeFile(path.join(artifacts,'qr-sample-'+i+'.png'),Buffer.from(result.data,'base64'));
    if(detector){assert.deepEqual(result.decoded,[urls[i],urls[i]]);decoded.push({url:urls[i],svg:true,png:true});}
  }
  await fs.writeFile(path.join(artifacts,'qr-decoding-evidence.json'),JSON.stringify({available:detector,results:decoded},null,2));
  console.log(detector?'PASS: Chrome BarcodeDetector independently decoded all SVG and PNG samples.':'LIMIT: Chrome has no QR BarcodeDetector; no independent QR decoding or physical scan is claimed.');
  await navigate(guest+'/card');await screenshot('welcome-card-screen',390,1000);
  const screenSize=(await command('Page.getLayoutMetrics')).result.cssContentSize;
  const screenImage=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:screenSize.width,height:screenSize.height,scale:1}});
  await fs.writeFile(path.join(artifacts,'welcome-card-screen-full.png'),Buffer.from(screenImage.result.data,'base64'));
  await evaluate("window.printCalls=0;window.print=()=>window.printCalls++;document.querySelector('#print-welcome').click()");
  assert.equal(await evaluate('window.printCalls'),1);
  assert.ok(await evaluate("document.querySelector('#print-welcome') && !document.querySelector('#print-welcome').hidden && document.querySelector('.print-card img').naturalWidth>0 && !!document.querySelector('.print-notice')"));
  await command('Emulation.setEmulatedMedia',{media:'print'});
  assert.ok(await evaluate("getComputedStyle(document.querySelector('.print-toolbar')).display==='none' && getComputedStyle(document.querySelector('.print-notice')).display==='none'"));
  await screenshot('welcome-card-print-media',1440,1000);
  const pdf=await command('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
  const pdfPath=path.join(artifacts,'welcome-card.pdf');await fs.writeFile(pdfPath,Buffer.from(pdf.result.data,'base64'));
  const info=execFileSync('pdfinfo',[pdfPath]).toString();assert.match(info,/Pages:\s+1\b/);const dimensions=info.match(/Page size:\s+([\d.]+) x ([\d.]+) pts/);assert.ok(dimensions && Math.abs(Number(dimensions[1])-420)<2 && Math.abs(Number(dimensions[2])-595)<2);await fs.writeFile(path.join(artifacts,'welcome-card-pdfinfo.txt'),info);
  const text=execFileSync('pdftotext',[pdfPath,'-']).toString();assert.match(text,/StayGuide/);assert.ok(!text.includes('Print using your browser'));
  execFileSync('pdftoppm',['-png','-r','120','-singlefile',pdfPath,path.join(artifacts,'welcome-card-print-preview')]);
  execFileSync('pdftoppm',['-gray','-png','-r','120','-singlefile',pdfPath,path.join(artifacts,'welcome-card-grayscale')]);
  await command('Emulation.setEmulatedMedia',{media:'screen'});
  // An 80-character property name still fits on one printed page.
  const longName='W'.repeat(80);
  const response=await fetch(origin+'/api/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({property_name:longName})});
  const fixture=await response.json();await navigate(fixture.guide_url+'/card');
  assert.equal(await evaluate("document.querySelector('.print-card h1').textContent"),longName);
  await command('Emulation.setEmulatedMedia',{media:'print'});
  const longPdf=await command('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
  const longPath=path.join(artifacts,'welcome-card-long.pdf');await fs.writeFile(longPath,Buffer.from(longPdf.result.data,'base64'));
  assert.match(execFileSync('pdfinfo',[longPath]).toString(),/Pages:\s+1\b/);
  const longText=execFileSync('pdftotext',[longPath,'-']).toString();assert.match(longText,/StayGuide/);assert.ok(longText.replace(/\s/g,'').includes(longName));
  execFileSync('pdftoppm',['-png','-r','120','-singlefile',longPath,path.join(artifacts,'welcome-card-long-print-preview')]);
  await command('Emulation.setEmulatedMedia',{media:'screen'});
  await navigate('/app.html');await waitFor("document.querySelector('#property-heading').textContent==='Sea View Villa'");
  console.log('PASS: QR workspace 1440/390/320, keyboard/focus, actual PNG download, safe failure/stale handling, SVG/PNG pixel equivalence, local warning and one-page normal/long-name A5 PDF rendering.');
}
