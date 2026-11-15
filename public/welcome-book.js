import {FIELDS} from './guide-content.js';
import {FONT_RANGES} from './pdf-font-coverage.js';
import {previewWarning,qrFilename} from './qr-tools.js';

export class BookContentError extends Error {}
const hasText=value=>typeof value==='string'&&value.trim().length>0;
// Explicit projection: never spread an API response, row, token or editor draft.
export function bookSnapshot(model,destination){
  const url=new URL(destination);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!/^\/g\/[a-f0-9]{16}$/.test(url.pathname))throw new BookContentError('The guest guide destination could not be verified. Reopen QR & print.');
  const sections=FIELDS.map(section=>Object.freeze({id:section.id,title:section.id==='welcome'?'Welcome':section.title,fields:Object.freeze(section.fields.filter(([key])=>key!=='property_name'&&hasText(model[key])).map(([key,label])=>Object.freeze({key,label,text:model[key]})))})).filter(section=>section.fields.length);
  if(!hasText(model.property_name))throw new BookContentError('Save a property name before exporting.');
  const snapshot=Object.freeze({name:model.property_name,destination:url.href,sections:Object.freeze(sections)});
  for(const {label,text,key} of bookTexts(snapshot)){
    // No printed credential values in errors; identify field and Unicode codepoints only.
    const unsupported=[...new Set(Array.from(text).filter(c=>!['\n','\r','\t'].includes(c)&&(/[\p{Cc}\p{Cf}]/u.test(c)||!FONT_RANGES.some(([a,b])=>c.codePointAt(0)>=a&&c.codePointAt(0)<=b))))];
    if(unsupported.length)throw new BookContentError(`${label} contains characters unsupported by the book font (${unsupported.slice(0,6).map(c=>'U+'+c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')).join(', ')}). Edit that saved field and use supported text. Nothing was removed or replaced.`);
    // Fail closed for recognizable private content, not a claim of semantic classification.
    if(key!=='wifi_password'&&key!=='wifi_name'&&/(?:\b(?:key\s*box|lock\s*box|alarm|door|entry|access|gate|safe)[\s\S]{0,24}\b(?:code|pin|password)\s*(?:is|[:=])?\s*\S+|\b(?:edit[_ -]?token|bearer\s+[a-z\d]+|session[_ -]?(?:token|secret)|api[_ -]?key)\b|\b[a-f\d]{64}\b|(?:κωδικ|κωδικός)[\s\S]{0,25}(?:εισόδου|συναγερμού|πόρτας))/iu.test(text))throw new BookContentError(`${label} may contain private access or authentication information. Remove it from the saved guest content before exporting; share private arrival instructions separately.`);
  }
  return snapshot;
}
export function bookTexts(snapshot){return [{key:'property_name',label:'Property name',text:snapshot.name},...snapshot.sections.flatMap(s=>s.fields)];}
export function bookFilename(name,size){
  if(!['A4','A5'].includes(size))throw new Error('Invalid paper size');
  return qrFilename(name,'svg').replace(/-qr\.svg$/,`-welcome-book-${size.toLowerCase()}.pdf`);
}
const ink='#292530',accent='#59476b',muted='#625d66',rule='#dcd6df';
// One local line-icon language; no glyph-font dependencies or external artwork.
const icons={
  welcome:'M12 3 L14.5 9.5 L21 12 L14.5 14.5 L12 21 L9.5 14.5 L3 12 L9.5 9.5 Z',
  wifi:'M3 8 Q12 0 21 8 M6 12 Q12 6 18 12 M9 16 Q12 13 15 16 M12 20 L12 20.2',
  arrival:'M4 5 H20 V21 H4 Z M4 10 H20 M8 2 V7 M16 2 V7',
  rules:'M3 11 L12 3 L21 11 M6 9 V21 H18 V9 M10 21 V15 H14 V21',
  appliances:'M5 3 H19 V21 H5 Z M5 8 H19 M8 5.5 H8.1 M11 5.5 H11.1 M16 14 A4 4 0 1 1 8 14 A4 4 0 1 1 16 14',
  parking:'M8 21 V3 H13 A5 5 0 0 1 13 13 H8',
  local_tips:'M19 10 C19 15 12 21 12 21 C12 21 5 15 5 10 A7 7 0 1 1 19 10 Z M14.5 10 A2.5 2.5 0 1 1 9.5 10 A2.5 2.5 0 1 1 14.5 10',
  emergency:'M9 3 H15 V9 H21 V15 H15 V21 H9 V15 H3 V9 H9 Z',
  contact:'M4 5 H20 V19 H4 Z M4 5 L12 12 L20 5',
  additional:'M21 12 A9 9 0 1 1 3 12 A9 9 0 1 1 21 12 M12 11 V17 M12 7 H12.1'
};
function sectionHeading(section,small,width,first){
  return {
    id:`book-heading-${section.id}`,stack:[
      ...(!first?[{canvas:[{type:'line',x1:0,y1:0,x2:width,y2:0,lineWidth:.45,lineColor:rule}],margin:[0,0,0,small?4:6]}]:[]),
      {columns:[
        {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="${icons[section.id]}" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,width:16},
        {id:`book-heading-${section.id}-label`,text:section.title,width:'*',bold:true,color:accent,fontSize:small?13:15}
      ],columnGap:8}
    ],headlineLevel:1,margin:[0,first?0:(small?4:6),0,4]
  };
}
export function bookDefinition(snapshot,size,qr){
  if(!['A4','A5'].includes(size))throw new Error('Invalid paper size');
  // Text remains flowing PDF text. Only trusted page furniture/QR uses positioned graphics.
  const small=size==='A5',width=small?419.53:595.28,height=small?595.28:841.89;
  const side=small?32:48,bodyTop=small?46:56,bottom=small?38:44,measure=width-side*2;
  const warning=previewWarning(snapshot.destination),content=[],longTitle=snapshot.name.length>55;
  content.push(
    {text:'StayGuide.',bold:true,fontSize:11,color:accent,margin:[0,small?0:4,0,small?(longTitle?28:52):(longTitle?84:140)]},
    {text:'WELCOME BOOK',bold:true,fontSize:8,color:accent,characterSpacing:2,margin:[0,0,0,14]},
    {id:'book-property-title',text:snapshot.name,bold:true,fontSize:small?25:38,lineHeight:1.02,color:ink,margin:[0,0,0,18]},
    {canvas:[{type:'line',x1:0,y1:0,x2:36,y2:0,lineWidth:1.4,lineColor:accent}],margin:[0,0,0,16]},
    {text:'Make yourself at home.',fontSize:small?11:13,color:muted}
  );
  // The maximum saved name is 80 characters. A reserved lower band keeps its flow
  // separate from the QR panel; no text is cropped, ellipsized or shrink-fitted.
  content.push({absolutePosition:{x:side,y:height-(small?216:246)},stack:[
    {canvas:[{type:'line',x1:0,y1:0,x2:measure,y2:0,lineWidth:.6,lineColor:rule}],margin:[0,0,0,16]},
    {columns:[
      {svg:qr,width:small?100:120},
      {width:'*',stack:[
        {text:'YOUR DIGITAL GUIDE',fontSize:7.5,bold:true,color:accent,characterSpacing:1.1,margin:[0,4,0,10]},
        {text:'A little guidance,\nwherever you settle in.',fontSize:small?12:15,bold:true,lineHeight:1.1,margin:[0,0,0,10]},
        {text:snapshot.destination,fontSize:small?8:9,color:muted,link:snapshot.destination}
      ]}
    ],columnGap:small?18:24},
    ...(warning?[{text:warning,fontSize:7.5,color:muted,lineHeight:1.1,margin:[0,14,0,0]}]:[])
  ]});
  for(const [index,section] of snapshot.sections.entries()){
    content.push({...sectionHeading(section,small,measure,index===0),...(index===0?{pageBreak:'before'}:{})});
    if(section.id==='wifi'){
      // Pair only short, single-line credentials with conservative width allowance.
      // Long/multiline values use the full measure, keeping extraction/read order intact.
      const valueSize=small?11.5:12,fieldWidth=(measure-18)/2;
      const pair=section.fields.length===2&&section.fields.every(field=>/^[\x20-\x7e]+$/.test(field.text)&&Array.from(field.text).reduce((w,c)=>w+(/[MWmw@%]/.test(c)?1.1:/[A-Z]/.test(c)?.85:/[a-z0-9]/.test(c)?.7:.6),0)*valueSize<=fieldWidth);
      const values=section.fields.map(field=>({width:'*',stack:[
        {id:`book-label-${section.id}-${field.key}`,text:field.label,headlineLevel:2,fontSize:8,bold:true,color:muted,characterSpacing:.25,margin:[0,3,0,4]},
        {id:`book-value-${section.id}-${field.key}`,text:field.text,unbreakable:!/[\r\n]/.test(field.text),bold:true,fontSize:valueSize,background:'#f3eee7',margin:[0,0,0,7]}
      ]}));
      if(pair)content.push({columns:values,columnGap:18});
      else content.push(...values.map(value=>({stack:value.stack})));
    }else for(const field of section.fields){
      if(section.fields.length>1||section.id==='arrival')content.push({id:`book-label-${section.id}-${field.key}`,text:field.label,headlineLevel:2,bold:true,color:ink,fontSize:9,margin:[0,3,0,3]});
      const paragraphs=field.text.replace(/\r\n?/g,'\n').split('\n');
      for(const [part,text] of paragraphs.entries())content.push({
        id:`book-value-${section.id}-${field.key}-${part}`,text:text||' ',
        // Short paragraphs travel together; long paragraphs remain free to span pages.
        // A blank saved line still occupies one line, without extra paragraph padding.
        unbreakable:text.length<=240,margin:[0,0,0,part===paragraphs.length-1?5:0]
      });
    }
  }
  return {
    info:{title:'Welcome Book',author:'StayGuide',subject:'Saved guest guide'},pageSize:size,
    pageMargins:[side,bodyTop,side,bottom],defaultStyle:{font:'Noto',fontSize:small?10.5:11,lineHeight:small?1.1:1.12,color:ink},
    background:page=>page===1?{canvas:[
      {type:'rect',x:0,y:0,w:width,h:height,color:'#fcfaf7'},
      {type:'line',x1:side,y1:small?30:36,x2:width-side,y2:small?30:36,lineWidth:.5,lineColor:rule},
      {type:'line',x1:side,y1:small?30:36,x2:side+28,y2:small?30:36,lineWidth:2,lineColor:accent},
      {type:'line',x1:side,y1:height-(small?26:32),x2:width-side,y2:height-(small?26:32),lineWidth:.5,lineColor:rule}
    ]}:null,
    header:page=>page===1?null:{margin:[side,small?22:25,side,0],columns:[
      {text:'STAYGUIDE',fontSize:7,bold:true,color:accent,characterSpacing:1.2},
      {text:'WELCOME BOOK',fontSize:7,color:muted,alignment:'right',characterSpacing:1.1}
    ]},
    footer:(page,total)=>page===1?null:{margin:[side,12,side,0],columns:[
      {text:'YOUR STAY, AT A GLANCE',fontSize:7,color:muted,characterSpacing:.6},
      {text:`${page} / ${total}`,fontSize:8,color:muted,alignment:'right'}
    ]},
    // Ignore a heading's own nested icon/text/divider when looking for following
    // content. Headings and field labels must have following saved text on the page.
    pageBreakBefore:(node,container)=>{
      if(!node.headlineLevel)return false;
      const valueId=node.id?.replace(node.headlineLevel===1?'book-heading-':'book-label-','book-value-');
      const hasFollowingValue=container.getFollowingNodesOnPage().some(next=>typeof next.text==='string'&&typeof next.id==='string'&&(node.headlineLevel===1?next.id.startsWith(valueId+'-'):next.id===valueId||next.id.startsWith(valueId+'-')));
      if(!hasFollowingValue)return true;
      // Balance a compact two-page A4 interior only when its final page is short.
      // A late section can use that existing page; long books retain natural flow.
      if(!small&&node.headlineLevel===1&&node.pages===3&&node.startPosition?.pageNumber===2&&snapshot.sections.length>=6&&bookTexts(snapshot).reduce((n,f)=>n+f.text.length,0)<=3500&&node.startPosition.top>=bodyTop+(height-bodyTop-bottom)*.55){
        const nextValues=container.getNodesOnNextPage().filter(next=>next.id?.startsWith('book-value-'));
        if(nextValues.length&&nextValues.every(next=>typeof next.text==='string'&&next.text.length<=240&&next.pageNumbers.length===1)&&Math.max(...nextValues.map(next=>next.startPosition.top))<bodyTop+(height-bodyTop-bottom)*.35)return true;
      }
      return false;
    },
    content
  };
}
let assets;
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(new Error('PDF asset timeout'));},20000);
    script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('PDF asset unavailable'));};
    document.head.append(script);
  });
}
export function loadBookAssets(){
  if(!assets)assets=(async()=>{await loadScript('/vendor/pdfmake-0.3.14.min.js');await loadScript('/vendor/noto-sans-2.015.js');return globalThis.pdfMake;})().catch(error=>{assets=null;throw error;});
  return assets;
}
export async function generateBook(snapshot,size,isCurrent=()=>true){
  const started=performance.now();
  const pdf=await loadBookAssets();if(!isCurrent())return null;
  const response=await fetch(new URL(snapshot.destination).pathname+'/qr.svg',{credentials:'same-origin',cache:'no-store'});
  if(!isCurrent())return null;
  if(!response.ok||!response.headers.get('Content-Type')?.includes('image/svg+xml'))throw new Error('QR unavailable');
  const qr=await response.text();
  if(qr.length>250000||!qr.startsWith('<svg')||!qr.includes('viewBox="0 0 ')||/<(?:script|image|foreignObject)|(?:href|onload)=/i.test(qr))throw new Error('Invalid canonical QR');
  if(!isCurrent())return null;
  const blob=await pdf.createPdf(bookDefinition(snapshot,size,qr)).getBlob();
  if(!isCurrent())return null;
  return {blob,elapsedMs:performance.now()-started};
}
