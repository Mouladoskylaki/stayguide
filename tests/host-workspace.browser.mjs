// SG-UX-01 layout acceptance in the real host/Worker browser harness.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkHostWorkspace({artifacts,command,evaluate,navigate,screenshot,waitFor}){
  const metrics=[];
  // Fixture-specific bounds tolerate modest typography changes and survive commits.
  const assertCompact=(actual,maxY,minCards)=>{
    assert.ok(actual.firstCardY<=maxY,`First cards must start by ${maxY}px (got ${actual.firstCardY})`);
    assert.ok(actual.visibleCards>=minCards,`At least ${minCards} complete cards must be visible (got ${actual.visibleCards})`);
  };
  for(const [width,height,maxY,minCards] of [[1440,900,430,8],[1280,800,430,6],[768,1024,560,6],[390,844,550,4],[320,844,550,3]]){
    const measure=()=>evaluate(`(()=>{
      const grid=document.querySelector('#editor-grid').getBoundingClientRect(),cards=[...document.querySelectorAll('.editor-card')];
      return {hasIntro:!!document.querySelector('.dashboard-intro'),firstCardY:Math.round(grid.top),visibleCards:cards.filter(c=>{const b=c.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight}).length,pageHeight:document.documentElement.scrollHeight};
    })()`);
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await navigate('/app.html');
    await waitFor("document.querySelector('#property-heading').textContent==='Sea View Villa' && document.querySelector('#save-status').textContent==='All changes saved'");
    await screenshot('sg-ux-dashboard-'+width,width,height);
    const after=await measure();metrics.push({width,height,limits:{maxFirstCardY:maxY,minVisibleCards:minCards},actual:after});
    assertCompact(after,maxY,minCards);
    if(width===1280){
      await evaluate("document.querySelector('.property-editing').style.paddingTop='500px'");
      const displaced=await measure();
      assert.throws(()=>assertCompact(displaced,maxY,minCards),'Stable checks must reject large blank space without a Git baseline');
      await evaluate("document.querySelector('.property-editing').style.paddingTop=''");
    }
    assert.ok(await evaluate(`(()=>{
      const grid=document.querySelector('#editor-grid'),progress=document.querySelector('#guide-progress'),editing=document.querySelector('.property-editing');
      const rows=[...document.querySelectorAll('#progress-checklist li')],cards=[...grid.children];
      return cards.length===10&&rows.length===10&&document.querySelector('#progress-checklist-details').open===(innerWidth>=1200)&&rows.every((r,i)=>r.dataset.section===cards[i].dataset.section&&r.dataset.state===cards[i].dataset.state)&&
        !document.querySelector('.dashboard-intro')&&!document.querySelector('#add-tab')&&!document.querySelector('.sidebar-note')&&document.querySelectorAll('h1').length===1&&
        editing.contains(document.querySelector('.guide-actions'))&&editing.contains(grid)&&
        document.querySelector('#new-property').getBoundingClientRect().top>=0&&document.querySelector('#new-property').getBoundingClientRect().bottom<innerHeight&&
        cards.every(c=>c.scrollWidth<=c.clientWidth)&&
        [...document.querySelectorAll('.guide-actions .button')].every(c=>c.getBoundingClientRect().bottom<innerHeight)&&
        (innerWidth>=1200?(progress.getBoundingClientRect().width>=260&&progress.getBoundingClientRect().width<=320&&Math.abs(progress.getBoundingClientRect().top-editing.getBoundingClientRect().top)<1):progress.getBoundingClientRect().top>=grid.getBoundingClientRect().bottom);
    })()`),'Workspace/checklist alignment and readable controls at '+width);
    const statusStyles=await evaluate(`(()=>{
      return Object.fromEntries(['empty','started','complete'].map(state=>{
        const card=document.querySelector('.editor-card[data-state="'+state+'"] .section-state-mark'),row=document.querySelector('#progress-checklist [data-state="'+state+'"] .section-state-mark');
        const describe=el=>{const style=getComputedStyle(el,'::before');return {text:el.textContent,content:style.content,width:style.width,height:style.height,borderRadius:style.borderRadius,borderStyle:style.borderStyle,background:style.backgroundColor,color:getComputedStyle(el).color};};
        return [state,{card:describe(card),row:describe(row)}];
      }));
    })()`);
    for(const [state,styles] of Object.entries(statusStyles)){
      assert.deepEqual(styles.card,styles.row,'Same card/checklist mark for '+state);
      if(state==='complete'){assert.equal(styles.card.text,'✓');assert.equal(styles.card.content,'none');}
      else{
        assert.equal(styles.card.text,'');assert.equal(styles.card.width,styles.card.height);assert.equal(styles.card.borderRadius,'50%');assert.equal(styles.card.borderStyle,'solid');
        assert.equal(styles.card.background==='rgba(0, 0, 0, 0)',state==='empty');
      }
    }
    metrics.at(-1).statusStyles=statusStyles;
    if(width===390){
      await evaluate("document.querySelector('#progress-checklist-details > summary').scrollIntoView({block:'center',behavior:'instant'});document.querySelector('#progress-checklist-details > summary').focus()");
      for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,...(type==='keyDown'?{text:'\r'}:{})});
      await waitFor("document.querySelector('#progress-checklist-details').open");
      const image=await command('Page.captureScreenshot',{format:'png'});
      await fs.writeFile(path.join(artifacts,'sg-ux-progress-390.png'),Buffer.from(image.result.data,'base64'));
      await evaluate("document.querySelector('#progress-checklist-details > summary').click()");
      assert.ok(await evaluate("!document.querySelector('#progress-checklist-details').open"));
    }
    await evaluate("document.querySelector('#open-qr').click()");
    await waitFor("document.querySelector('#card-preview-qr').complete && document.querySelector('#card-preview-qr').naturalWidth>0");
    assert.ok(await evaluate("document.querySelector('#card-preview-name').textContent===document.querySelector('#property-heading').textContent && document.querySelector('#card-preview-qr').getAttribute('src')===document.querySelector('#qr-preview').getAttribute('src')"));
    if(width===1280||width===768)await screenshot('sg-ux-print-'+width,width,height);
    await evaluate("document.querySelector('#close-qr').click()");
  }
  await fs.writeFile(path.join(artifacts,'sg-ux-layout-metrics.json'),JSON.stringify(metrics,null,2));
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('/app.html');await waitFor("document.querySelector('#property-heading').textContent==='Sea View Villa'");
  console.log('PASS: SG-UX-01-R1 stable compactness/negative control and matching status marks at 1440/1280/768/390/320; ten truthful checklist rows, desktop progress alignment, mobile progress below editing, selected-property card/QR preview.');
}
