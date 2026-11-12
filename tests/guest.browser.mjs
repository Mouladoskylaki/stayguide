// Guest regressions run by host-state.browser.mjs using its isolated Chrome/Worker harness.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export async function checkGuest({origin,db,artifacts,command,evaluate,navigate,screenshot,waitFor}){
  const model={property_name:'Sea View Villa',welcome:'Welcome to your little place by the sea.\n\nWe hope you feel at home.',wifi_name:'Villa Guest',wifi_password:'Example WiFi only',checkin:'From 15:00.\nThe entrance faces the garden.',checkout:'Before 11:00.\nPlease leave the beach towels in the basket.',rules:'Please keep the house smoke-free.\nQuiet hours begin at 22:00.',appliances:'Coffee filters are in the cupboard.\nSwitch off the air conditioning when you go out.',parking:'Free parking beside the olive tree.',local_tips:'Start the day at the village bakery.\nThe coastal path is lovely at sunset.',emergency:'Emergency services: 112.',contact:'Message your host using your booking details.',additional:'Beach towels are in the basket.'};
  const seed=async content=>{
    const response=await fetch(origin+'/api/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(content)});
    assert.equal(response.status,201);return (await response.json()).guide_url;
  };
  const full=await seed(model),empty=await seed({property_name:'The Little Olive House'});
  const sparse=await seed({property_name:'Garden Studio',wifi_name:'Garden Guest',checkout:'Before 11:00.'});
  async function capture(name,fullPage=false){
    const params={format:'png',captureBeyondViewport:fullPage};
    if(fullPage){
      await evaluate("scrollTo({top:0,left:0,behavior:'instant'})");
      const {cssContentSize:size}=(await command('Page.getLayoutMetrics')).result;
      params.clip={x:0,y:0,width:size.width,height:size.height,scale:1};
    }
    const image=await command('Page.captureScreenshot',params);
    await fs.writeFile(path.join(artifacts,name+'.png'),Buffer.from(image.result.data,'base64'));
  }
  for(const width of [1440,390,320]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:false});
    await navigate(full);
    await screenshot('guest-guide-'+width,width,width===1440?1000:844);
    await capture('guest-full-'+width,true);
    assert.ok(await evaluate(`(()=>{
      const tiles=[...document.querySelectorAll('.guest-tile')];
      return tiles.length===10 && tiles.every(tile=>{
        const r=tile.getBoundingClientRect();return r.width>=44 && r.height>=44 && document.querySelector(tile.getAttribute('href'));
      }) && getComputedStyle(document.querySelector('.guest-tiles')).gridTemplateColumns.split(' ').length===2 &&
        document.querySelectorAll('.guest-section').length===10 && getComputedStyle(document.querySelector('#wifi-password')).fontSize==='16px';
    })()`));
    await evaluate(`document.querySelector('.guest-tile[href="#wifi"]').focus()`);
    assert.ok(await evaluate('getComputedStyle(document.activeElement).outlineStyle===\'solid\''));
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await waitFor("location.hash==='#wifi'");
    for(const id of ['wifi','arrival','welcome','rules','appliances','parking','local_tips','emergency','contact','additional']){
      await evaluate(`document.querySelector('.guest-tile[href="#${id}"]').click()`);
      await waitFor(`location.hash==='#${id}'`);
      assert.ok(await evaluate(`document.querySelector('#${id}').getBoundingClientRect().height>44`));
    }
  }
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await navigate(full+'#wifi');await command('Page.bringToFront');
  await evaluate("document.querySelector('[data-copy]').click()");
  await waitFor("document.querySelector('#wifi-copy-status').textContent==='Wi-Fi password copied.'");
  assert.ok(await evaluate("(async()=>await navigator.clipboard.readText()===document.querySelector('#wifi-password').textContent)()"));
  await evaluate("document.querySelector('#wifi').scrollIntoView({block:'start',behavior:'instant'})");
  await capture('guest-wifi-copied-390');
  await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied');}}});document.querySelector('[data-copy]').click()");
  await waitFor("document.querySelector('#wifi-copy-status').textContent.includes('manually')");
  assert.ok(await evaluate("window.getSelection().toString()===document.querySelector('#wifi-password').textContent && document.activeElement.id==='wifi-password'"));
  await capture('guest-wifi-fallback-390');
  await navigate(full);
  await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});document.querySelector('[data-copy]').click()");
  await waitFor("document.querySelector('#wifi-copy-status').textContent.includes('manually')");
  assert.ok(await evaluate("window.getSelection().toString()===document.querySelector('#wifi-password').textContent"));
  await command('Emulation.setScriptExecutionDisabled',{value:true});await navigate(full);
  assert.ok(await evaluate("document.querySelectorAll('.guest-section').length===10 && document.querySelectorAll('.guest-tile').length===10 && document.querySelector('[data-copy]').hidden && document.querySelector('#wifi-password').textContent==='Example WiFi only' && document.querySelector('#welcome').textContent.includes('We hope you feel at home.')"));
  assert.ok(await evaluate(`(${JSON.stringify(Object.values(model))}).every(value=>document.body.innerText.replace(/\\s+/g,' ').includes(value.replace(/\\s+/g,' ')))`));
  await evaluate(`document.querySelector('.guest-tile[href="#arrival"]').click()`);await waitFor("location.hash==='#arrival'");
  await screenshot('guest-no-js-390',390,844);
  await command('Emulation.setScriptExecutionDisabled',{value:false});
  for(const width of [390,320]){
    await navigate(empty);await screenshot('guest-empty-'+width,width,844);
    assert.ok(await evaluate("!!document.querySelector('.empty-guide') && !document.querySelector('.quick-nav') && !document.querySelector('.guest-section')"));
  }
  await navigate(sparse);await screenshot('guest-sparse-390',390,844);
  assert.ok(await evaluate("document.querySelectorAll('.guest-tile').length===2 && !document.querySelector('[data-copy]') && !document.querySelector('#welcome')"));
  const long=await seed({property_name:'P'.repeat(80),wifi_name:'N'.repeat(100),wifi_password:'W'.repeat(150),welcome:'Line one\n\nLine three',rules:'R'.repeat(2000),checkin:'I'.repeat(800),checkout:'O'.repeat(800)});
  for(const width of [1440,390,320]){
    await navigate(long);await screenshot('guest-long-'+width,width,width===1440?1000:844);
    assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.guest-section')].every(s=>s.scrollWidth<=s.clientWidth) && document.querySelector('#wifi-password').textContent.length===150"));
  }
  const escaped=await seed({property_name:'<img src=x onerror=alert(1)>',wifi_name:'Safe example',wifi_password:'<img src=x onerror=alert(1)>',rules:'<script>window.injected=true</script>'});
  await navigate(escaped);
  assert.ok(await evaluate("!document.querySelector('img') && !window.injected && document.querySelector('#rules').textContent.includes('<script>')"));
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.ok(await evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto' && getComputedStyle(document.querySelector('.guest-tile')).transitionDuration==='0s'"));
  await command('Emulation.setEmulatedMedia',{features:[]});
  const cwd=fileURLToPath(new URL('..',import.meta.url));
  const committed=file=>execFileSync('git',['show','HEAD:'+file],{cwd});
  const source=committed('src/worker.js').toString().replace("'./qr.js'",JSON.stringify(new URL('../src/qr.js',import.meta.url).href)).replace("'../public/qr-tools.js'",JSON.stringify(new URL('../public/qr-tools.js',import.meta.url).href));
  const baseline=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const before=await baseline.handleRequest(new Request(origin+full),{DB:db}),after=await fetch(origin+full);
  const beforeHtml=await before.text(),stylesheet=beforeHtml.match(/rel="stylesheet" href="\/([^"]+)"/)[1];
  const bytes={before:{html:Buffer.byteLength(beforeHtml),css:committed('public/'+stylesheet).length,js:committed('public/guest.js').length},after:{html:Buffer.byteLength(await after.text()),css:(await fs.readFile(new URL('../public/guest.css',import.meta.url))).length,js:(await fs.readFile(new URL('../public/guest.js',import.meta.url))).length}};
  await fs.writeFile(path.join(artifacts,'guest-body-bytes.json'),JSON.stringify(bytes,null,2));
  console.log('Guest uncompressed response/asset bytes, same full guide: '+JSON.stringify(bytes));
  console.log('PASS: SG-P20 all sections/anchors, 1440/390/320 layouts, no-JS reading/navigation, clipboard success/denial/absence, empty/sparse/long/injection cases and reduced motion.');
}
