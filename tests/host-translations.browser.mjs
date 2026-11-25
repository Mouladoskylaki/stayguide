// C1: actual host/owner APIs in the existing isolated localhost Chrome harness.
// Saved OpenAI-mode rows below are synthetic fixtures, not real API results.
import assert from 'node:assert/strict';
import {createTranslationStore} from '../src/translation-store.js';
import {HOST_CATALOGS} from '../public/host-i18n.js';
export async function checkHostTranslations({db,evaluate,command,navigate,waitFor,screenshot,setDialogAcceptance,generationCount}){
 const select=async(id,value)=>evaluate(`(()=>{const s=document.querySelector('#${id}');s.value=${JSON.stringify(value)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const open=async()=>{await evaluate(`document.querySelector('[data-section=welcome]').click();document.querySelector('#section-translations').open=true;`);await waitFor(`!document.querySelector('#translation-source').disabled`);};
 await navigate('/app.html');await waitFor(`document.querySelector('#host-language').options.length===6`);await select('host-language','en-GB');
 await evaluate(`document.querySelector('#new-property').click();document.querySelector('#first-name').value='Synthetic translation house';document.querySelector('#create-form').requestSubmit();`);
 await waitFor(`document.querySelector('#property-heading').textContent==='Synthetic translation house'`);
 await evaluate(`document.querySelector('[data-section=welcome]').click();document.querySelector('#edit-welcome').value='Original welcome. Call 112.';document.querySelector('#edit-welcome').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#section-form').requestSubmit();`);await waitFor(`document.querySelector('#editor-drawer').hidden`);
 const id=await evaluate(`new URL(document.querySelector('#view-link').href).pathname.split('/').pop()`),store=createTranslationStore(db);
 const before=await db.prepare('SELECT * FROM guides WHERE id=?1').bind(id).first(),declaredVersion=(await store.source(id,'welcome')).source_version+1;
 await evaluate(`window.c1ActualFetch=fetch;window.c1Requests=[];window.fetch=(url,init={})=>{c1Requests.push({url:String(url),method:init.method||'GET'});return c1ActualFetch(url,init);};document.querySelector('[data-section=wifi]').click();`);
 assert(await evaluate(`document.querySelector('#section-translations').hidden`));assert.equal(await evaluate('c1Requests.length'),0);
 await evaluate(`document.querySelector('#close-drawer').click();document.querySelector('[data-section=welcome]').click();`);assert.equal(await evaluate('c1Requests.length'),0);
 await evaluate(`document.querySelector('#section-translations summary').focus()`);
 await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await waitFor(`document.querySelector('#translation-status').textContent==='Source language not declared.'`);
 assert.equal(await evaluate(`document.querySelector('#translation-source').value`),'');
 await select('translation-source','en-GB');await evaluate(`document.querySelector('#save-source-language').focus();document.querySelector('#save-source-language').click()`);
 await waitFor(`document.querySelector('#translation-status').textContent==='Source language saved.'`);
 assert.equal((await store.source(id,'welcome')).source_version,declaredVersion);assert.deepEqual(await db.prepare('SELECT * FROM guides WHERE id=?1').bind(id).first(),before);
 const sourcePatchCount=await evaluate(`c1Requests.filter(r=>r.method==='PATCH').length`);await select('translation-source','en-GB');assert(await evaluate(`document.querySelector('#save-source-language').disabled`));assert.equal(await evaluate(`c1Requests.filter(r=>r.method==='PATCH').length`),sourcePatchCount);
 await select('translation-target','de-DE');await waitFor(`document.querySelector('#translation-status').textContent==='No current saved translation available.'`);
 // Seed a deterministic saved fixture through storage only; never execute a provider.
 const source=await store.source(id,'welcome'),claim='C1-synthetic-saved-translation',text=JSON.stringify({welcome:'Willkommen. 112. <img src=x onerror=alert(1)>'});
 assert(await store.claim({...source,claim_id:claim,target_language:'de-DE',model:'gpt-6-luna',prompt_version:'hospitality-v1',provider_mode:'openai',created_ms:Date.now(),lease_until:Date.now()+30000,reservation_nano:660000}));
 assert(await store.publish(claim,text,Date.now()));await select('translation-target','de-DE');await waitFor(`document.querySelector('#translation-status').textContent==='Current saved translation available.'`);
 assert(await evaluate(`document.querySelector('#translation-preview').textContent.includes('<img src=x onerror=alert(1)>')&&!document.querySelector('#translation-preview img')`));
 assert(await store.correct({translationId:claim,translatedText:JSON.stringify({welcome:'Manuell korrigierter Testtext. 112.'}),sourceVersion:declaredVersion,guideId:id,section:'welcome',targetLanguage:'de-DE',model:'gpt-6-luna',promptVersion:'hospitality-v1',sourceLanguage:'en-GB',previousText:text}));
 await select('translation-target','de-DE');await waitFor(`document.querySelector('#translation-status').textContent==='Manually corrected translation available.'`);
 await evaluate(`window.c1Field=document.querySelector('#edit-welcome');window.c1Original=c1Field.value;window.c1Preview=document.querySelector('#translation-preview dd').textContent;window.c1LanguageRequests=c1Requests.length;`);
 for(const locale of Object.keys(HOST_CATALOGS)){
  await select('editor-language',locale);
  assert.equal(await evaluate(`document.querySelector('#translation-status').textContent`),HOST_CATALOGS[locale]['Manually corrected translation available.']);
  assert(await evaluate(`document.querySelector('#translation-preview dd').lang==='de-DE'&&document.querySelector('#translation-preview dt').closest('[lang]')===document.documentElement`));
  assert(await evaluate(`document.querySelector('#edit-welcome')===c1Field&&c1Field.value===c1Original&&document.querySelector('#translation-source').value==='en-GB'&&document.querySelector('#translation-target').value==='de-DE'&&document.querySelector('#translation-preview dd').textContent===c1Preview&&c1Requests.length===c1LanguageRequests`));
  for(const width of [1440,390,320]){
   await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   await evaluate(`document.querySelector('#section-translations summary').scrollIntoView({block:'start'})`);
   assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.drawer-scroll').scrollWidth<=document.querySelector('.drawer-scroll').clientWidth`));
   await screenshot('c1-translations-'+locale+'-'+width,width,900);
  }
 }
 await select('editor-language','en-GB');await evaluate(`document.querySelector('#section-translations summary').focus()`);
 await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await evaluate('document.activeElement.id'),'translation-source');
 assert.equal(await evaluate(`document.querySelector('#translation-status').getAttribute('role')`),'status');
 setDialogAcceptance(false);await select('translation-source','fr-FR');await evaluate(`document.querySelector('#save-source-language').click()`);assert.equal((await store.source(id,'welcome')).source_language,'en-GB');
 setDialogAcceptance(true);await evaluate(`document.querySelector('#save-source-language').click()`);await waitFor(`document.querySelector('#translation-status').textContent==='Source language saved.'`);assert.equal((await store.source(id,'welcome')).source_language,'fr-FR');assert.deepEqual(await db.prepare('SELECT * FROM guides WHERE id=?1').bind(id).first(),before);
 // A different owner tab changes declaration after the UI's read. The UI must not retry.
 assert(await store.declareLanguage(id,'welcome','de-DE',declaredVersion+1));await select('translation-source','es-ES');await evaluate(`document.querySelector('#save-source-language').click()`);
 await waitFor(`document.querySelector('#translation-status').textContent.includes('changed elsewhere')`);assert(await evaluate(`document.querySelector('#translation-source').disabled`));assert.equal((await store.source(id,'welcome')).source_language,'de-DE');
 await screenshot('c1-source-conflict-390',390,900);await evaluate(`document.querySelector('#refresh-translations').click()`);await waitFor(`document.querySelector('#translation-source').value==='de-DE'&&!document.querySelector('#translation-source').disabled`);assert.equal((await store.source(id,'welcome')).source_version,declaredVersion+2);
 await evaluate(`window.c1DraftRequests=c1Requests.length;c1Field.value='Unsaved C1 draft';c1Field.dispatchEvent(new Event('input',{bubbles:true}));`);assert(await evaluate(`document.querySelector('#translation-source').disabled&&document.querySelector('#save-source-language').disabled`));await select('editor-language','el-GR');assert(await evaluate(`c1Field.value==='Unsaved C1 draft'&&c1Requests.length===c1DraftRequests`));await screenshot('c1-unsaved-draft-320',320,900);
 await select('editor-language','en-GB');await evaluate(`c1Field.value=c1Original;c1Field.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#close-drawer').click()`);await waitFor(`document.querySelector('#editor-drawer').hidden`);
 // Hold a real metadata GET across close/property creation, then release its late response.
 await evaluate(`window.c1HoldNext=true;window.c1RecordedFetch=fetch;window.fetch=(url,init={})=>{if(c1HoldNext&&String(url).includes('/translation-sources/')&&(!init.method||init.method==='GET')){c1HoldNext=false;return new Promise((resolve,reject)=>{window.c1Release=()=>c1RecordedFetch(url,init).then(resolve,reject);});}return c1RecordedFetch(url,init);};document.querySelector('[data-section=welcome]').click();document.querySelector('#section-translations').open=true;`);
 await waitFor('typeof c1Release==="function"');await evaluate(`document.querySelector('#close-drawer').click();document.querySelector('#new-property').click();document.querySelector('#first-name').value='Synthetic translation switch';document.querySelector('#create-form').requestSubmit()`);await waitFor(`document.querySelector('#property-heading').textContent==='Synthetic translation switch'`);
 await evaluate('c1Release()');assert.equal(await evaluate(`document.querySelector('#translation-source-state').textContent`),'');
 assert.equal(await evaluate(`c1Requests.filter(r=>r.method==='POST'&&new URL(r.url,location.origin).pathname.endsWith('/translations')).length`),0);assert.equal(generationCount(),0);
 setDialogAcceptance(false);await evaluate('window.fetch=window.c1ActualFetch');
 console.log('PASS: C1 disclosure/owner source CAS, native confirmation/cancel/409, saved/manual fixture text escaping, six locales at 1440/390/320, keyboard/status, draft and stale-property guards; zero generation requests. Saved fixtures are synthetic, not live AI evidence.');
}
