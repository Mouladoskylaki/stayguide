// Offline browser checks, called by the existing Chrome suite with synthetic data only.
import assert from 'node:assert/strict';
export async function checkHostLocalization({evaluate,command,navigate,waitFor,screenshot}){
 const locales=['el-GR','en-GB','de-DE','fr-FR','it-IT','es-ES'];
 const heading=['Τα καταλύματά μου','My properties','Meine Unterkünfte','Mes hébergements','I miei alloggi','Mis alojamientos'];
 const select=async(id,locale)=>evaluate(`(()=>{const s=document.querySelector('#${id}');s.value=${JSON.stringify(locale)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await navigate('/app.html');await waitFor('document.querySelector("#host-language").options.length===6');
 await evaluate(`localStorage.removeItem('stayguide-host-locale');Object.defineProperty(navigator,'languages',{configurable:true,value:['de-AT','fr-FR']});`);
 // Initial browser negotiation itself is tested below through a pre-document CDP override.
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'languages',{configurable:true,value:['de-AT','fr-FR']});`}).then(async result=>{
  const id=result.result?.identifier??result.identifier;
  await navigate('/app.html');await waitFor('document.documentElement.lang==="de-DE"');
  assert.equal(await evaluate('document.querySelector("#host-language").value'),'de-DE');
  if(id)await command('Page.removeScriptToEvaluateOnNewDocument',{identifier:id});
 });
 await select('host-language','fr-FR');await navigate('/app.html');await waitFor('document.documentElement.lang==="fr-FR"');
 await evaluate(`localStorage.setItem('stayguide-host-locale','{broken')`);await navigate('/app.html');await waitFor('document.querySelector("#host-language").options.length===6');
 assert.equal(await evaluate('document.documentElement.lang'),'en-GB');
 await evaluate(`document.querySelector('#first-name').value='Synthetic locale house';document.querySelector('#create-form').requestSubmit()`);
 await waitFor('document.querySelector("#property-heading").textContent==="Synthetic locale house"');
 // Verify actual API row/source/cache/reservation state in Node below; here retain browser identity and all local keys.
 await evaluate(`window.localeRequests=[];window.localeFetch=fetch;window.fetch=(url,init)=>{localeRequests.push({url:String(url),method:init?.method||'GET'});return localeFetch(url,init);};window.localeBefore=JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='stayguide-host-locale')));`);
 for(let i=0;i<locales.length;i++){
  await select('host-language',locales[i]);
  assert.equal(await evaluate('document.documentElement.lang'),locales[i]);assert.equal(await evaluate('document.querySelector(".workspace-label").textContent'),heading[i]);
  assert.equal(await evaluate('document.querySelectorAll(".editor-card").length'),10);
  assert.equal(await evaluate('document.querySelector("#property-heading").textContent'),'Synthetic locale house');
  assert.equal(await evaluate('JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=="stayguide-host-locale")))===localeBefore'),true);
  for(const width of [1440,1280,768,390,320]){
   await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
   assert(await evaluate("[...document.querySelectorAll('.editor-card')].every(c=>c.scrollWidth<=c.clientWidth+1)"),locales[i]+' card width');
   assert(await evaluate(`(()=>{const b=document.querySelector('#new-property').getBoundingClientRect(),s=document.querySelector('#host-language').getBoundingClientRect();return b.right<=innerWidth+1&&s.right<=innerWidth+1&&s.height>=44})()`));
  }
 }
 assert.equal(await evaluate('localeRequests.length'),0);
 await evaluate(`document.querySelector('[data-section="welcome"]').click();document.querySelector('#edit-welcome').value='Unsaved original words <script>not markup</script>';document.querySelector('#edit-welcome').setSelectionRange(4,15);window.localeInput=document.querySelector('#edit-welcome');`);
 for(const locale of locales){
  await select('editor-language',locale);
  assert(await evaluate(`document.querySelector('#editor-drawer').scrollWidth<=document.querySelector('#editor-drawer').clientWidth && [...document.querySelectorAll('.drawer-bottom button')].every(b=>b.getBoundingClientRect().left>=0&&b.getBoundingClientRect().right<=innerWidth)`),locale+' editor width');
  assert(await evaluate(`document.querySelector('#editor-drawer').open && document.querySelector('#edit-welcome')===localeInput && localeInput.value==='Unsaved original words <script>not markup</script>' && localeInput.selectionStart===4 && localeInput.selectionEnd===15`));
  assert.equal(await evaluate('document.querySelector("#host-language").value'),locale);
  assert(await evaluate('document.querySelector("#drawer-fields").textContent.includes(document.querySelector("#edit-welcome").previousElementSibling.textContent)'));
  assert.equal(await evaluate('localeRequests.length'),0);
 }
 await select('editor-language','el-GR');await screenshot('locale-editor-el-390',390,844);await screenshot('locale-editor-el-320',320,844);
 // Native focus containment includes the new select, without preventing arrow-key language selection.
 await evaluate('document.querySelector("#save-editor").focus()');
 for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 assert.equal(await evaluate('document.activeElement.id'),'editor-language');
 for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
 assert.equal(await evaluate('document.documentElement.lang'),'en-GB');assert.equal(await evaluate('localeInput.value'),'Unsaved original words <script>not markup</script>');
 await select('editor-language','el-GR');
 await evaluate('document.querySelector("#cancel-editor").click()');assert(await evaluate('document.querySelector("#discard-dialog").open'));assert((await evaluate('document.querySelector("#discard-title").textContent')).includes('Απόρριψη'));
 await evaluate('document.querySelector("#keep-editing").click()');assert.equal(await evaluate('localeInput.value'),'Unsaved original words <script>not markup</script>');
 await evaluate('document.querySelector("#cancel-editor").click();document.querySelector("#discard-changes").click()');
 assert.equal(await evaluate('localeRequests.length'),0);
 await evaluate('document.querySelector("#open-qr").click();window.qrDestination=document.querySelector("#qr-destination").href;window.qrNode=document.querySelector("#qr-preview");');
 // Explicit opening may load QR images; locale changes themselves must not fetch anything.
 await evaluate('localeRequests=[]');
 for(const locale of locales){await select('qr-language',locale);assert(await evaluate('document.querySelector("#qr-workspace").open && document.querySelector("#qr-preview")===qrNode && document.querySelector("#qr-destination").href===qrDestination && document.querySelector("#qr-destination").textContent===qrDestination && document.querySelector("#qr-property-name").textContent==="Synthetic locale house" && document.querySelector("#card-preview-name").textContent==="Synthetic locale house"'));assert.equal(await evaluate('localeRequests.length'),0);}
 await evaluate(`(async()=>{window.localeBookTools=await import('/welcome-book.js');window.localeBookSnapshot=localeBookTools.bookSnapshot({property_name:'Synthetic locale house',welcome:'Original saved content'},qrDestination);window.localeBookDefinition=JSON.stringify(localeBookTools.bookDefinition(localeBookSnapshot,'A5','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0Z"/></svg>'));})()`);
 for(const locale of locales){await select('qr-language',locale);assert(await evaluate(`JSON.stringify(localeBookTools.bookDefinition(localeBookSnapshot,'A5','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0Z"/></svg>'))===localeBookDefinition`));}
 await select('qr-language','de-DE');await screenshot('locale-qr-de-320',320,844);
 // PDF output remains English and saved-content based; only workspace labels change.
 assert.equal(await evaluate('document.querySelector(".card-preview-welcome").textContent'),'Welcome.');
 await evaluate('document.querySelector("#close-qr").click()');await screenshot('locale-dashboard-de-1440',1440,1000);await screenshot('locale-dashboard-de-320',320,844);
 await select('host-language','en-GB');await evaluate('window.fetch=window.localeFetch');
 // A real localized editor save keeps content untouched by translation and follows the existing revision contract.
 await evaluate('document.querySelector("[data-section=welcome]").click();document.querySelector("#edit-welcome").value="Original host prose";');
 await select('editor-language','it-IT');await evaluate('document.querySelector("#section-form").requestSubmit()');await waitFor('document.querySelector("#editor-drawer").hidden');
 assert.equal(await evaluate(`(async()=>{const e=JSON.parse(localStorage.getItem('stayguide-demo-properties')).find(x=>x.label==='Synthetic locale house');const r=await fetch('/api/guides/'+e.id,{headers:{Authorization:'Bearer '+e.token}});return (await r.json()).guide.welcome})()`),'Original host prose');
 await select('host-language','en-GB');
 console.log('PASS: six host locales, browser/preference/corrupt fallback, reload, 1440/390/320 expansion, draft/node/selection preservation, native modal Tab, localized discard, QR identity/no generation and original-content save.');
}
