import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {FIELDS} from '../public/guide-content.js';
import {bookSnapshot,bookDefinition,bookFilename,BookContentError} from '../public/welcome-book.js';
const url='https://example.com/g/0123456789abcdef';
test('projection reuses canonical sections, omits empty values and all metadata',()=>{
 const source={property_name:'Aliki House',welcome:'  Hello\n\nΚαλώς ήρθατε  ',wifi_name:'Guest',additional:'  ',token:'OWNER_SENTINEL',id:'INTERNAL',updated_at:'PRIVATE'};
 const result=bookSnapshot(source,url);assert.deepEqual(result.sections.map(s=>s.id),['welcome','wifi']);assert.equal(result.sections[0].fields[0].text,source.welcome);
 assert.ok(!JSON.stringify(result).includes('SENTINEL'));assert.ok(!JSON.stringify(result).includes('INTERNAL'));assert.ok(Object.isFrozen(result.sections[0].fields[0]));
 source.welcome='Changed';assert.equal(result.sections[0].fields[0].text,'  Hello\n\nΚαλώς ήρθατε  ');
});
test('all ten saved sections follow existing canonical order',()=>{
 const model=Object.fromEntries(FIELDS.flatMap(s=>s.fields.map(([key])=>[key,'Saved '+key])));
 assert.deepEqual(bookSnapshot(model,url).sections.map(s=>s.id),FIELDS.map(s=>s.id));
});
test('minimal content produces cover only with no invented property details',()=>{
 const snapshot=bookSnapshot({property_name:'New House'},url);assert.equal(snapshot.sections.length,0);
 const def=bookDefinition(snapshot,'A5','<svg/>');assert.ok(!JSON.stringify(def).includes('Check-in'));assert.ok(!def.content.some(n=>n.pageBreak));
});
for(const size of ['A4','A5'])test(size+' definition uses readable format-specific margins and flow',()=>{
 const d=bookDefinition(bookSnapshot({property_name:'Θ'.repeat(80),rules:'Line one\n\nLine two'},url),size,'<svg/>');
 assert.equal(d.pageSize,size);assert.ok(d.defaultStyle.fontSize>=10.5);assert.equal(d.content.find(n=>n.id==='book-property-title').text.length,80);assert.equal(d.content.filter(n=>n.id?.startsWith('book-value-rules-rules-')).map(n=>n.text===' '?'':n.text).join('\n'),'Line one\n\nLine two');assert.equal(d.content.find(n=>n.headlineLevel).pageBreak,'before');
 assert.ok(d.pageBreakBefore({headlineLevel:1,startPosition:{top:500}},{getFollowingNodesOnPage:()=>[{text:'Heading child',startPosition:{top:500}}]}));
});
test('verified Latin Greek accents polytonic Cyrillic and supported punctuation retained',()=>{
 const text='Café € — ά έ ή ί ό ύ ώ ΐ ΰ Ἀθήνα α\u0301 Привет\nSecond line';
 assert.equal(bookSnapshot({property_name:text},url).name,text);
});
for(const [label,text] of [['emoji','Hello 😀'],['CJK','你好'],['Arabic','مرحبا'],['Hebrew','שלום'],['control','secret\u0000']])test('unsupported '+label+' blocks export without reflecting content',()=>{
 assert.throws(()=>bookSnapshot({property_name:'Name',welcome:text},url),error=>error instanceof BookContentError&&error.message.includes('Welcome message')&&error.message.includes('U+')&&!error.message.includes(text));
});
for(const [caseIndex,text] of ['Door code: PRIVATE-SENTINEL','Keybox PIN is PRIVATE-SENTINEL','alarm password: PRIVATE-SENTINEL','edit_token: abc','Bearer abcdef','a'.repeat(64),'Κωδικός εισόδου: PRIVATE-SENTINEL'].entries())test('private content blocks export: case '+caseIndex,()=>{
 assert.throws(()=>bookSnapshot({property_name:'Name',rules:text},url),/private access or authentication/);
});
test('guest Wi-Fi password is intentional; it stays plain text',()=>{
 const result=bookSnapshot({property_name:'Name',wifi_name:'Demo',wifi_password:'DEMO-only-password',welcome:'<script>never execute</script>'},url);
 assert.equal(result.sections[1].fields[1].text,'DEMO-only-password');assert.equal(result.sections[0].fields[0].text,'<script>never execute</script>');
});
test('safe bounded filenames and only supported page sizes',()=>{
 assert.match(bookFilename('../../CON<>','A4'),/^property-con-welcome-book-a4\.pdf$/);
 assert.ok(!bookFilename('Α'.repeat(80),'A5').includes('/'));assert.throws(()=>bookFilename('A','Letter'));
});
test('canonical destination excludes tokens, querystrings and arbitrary routes',()=>{
 for(const value of ['https://user:pass@example.com/g/0123456789abcdef',url+'?token=secret',url+'#secret','https://example.com/api/guides/0123456789abcdef','javascript:alert(1)'])assert.throws(()=>bookSnapshot({property_name:'Name'},value));
});
test('vendored library and font payloads exactly match pinned audit hashes',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../public/vendor/pdf-assets.json',import.meta.url)));
 assert.equal(manifest.pdfmake,'0.3.14');for(const a of manifest.assets){const b=fs.readFileSync(new URL('../public/vendor/'+a.file,import.meta.url));assert.equal(b.length,a.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);}
});

test('editorial headings keep their own saved content rather than nested labels or another section',()=>{
 const d=bookDefinition(bookSnapshot({property_name:'Name',welcome:'Hello',rules:'Quiet evenings'},url),'A5','<svg/>');
 const heading={id:'book-heading-rules',headlineLevel:1};
 assert.equal(d.pageBreakBefore(heading,{getFollowingNodesOnPage:()=>[{id:'book-heading-rules-label',text:'House rules'},{id:'book-value-contact-contact',text:'Other section'}]}),true);
 assert.equal(d.pageBreakBefore(heading,{getFollowingNodesOnPage:()=>[{id:'book-value-rules-rules',text:'Quiet evenings'}]}),false);
 const label={id:'book-label-arrival-checkout',headlineLevel:2};
 assert.equal(d.pageBreakBefore(label,{getFollowingNodesOnPage:()=>[{id:'book-value-arrival-checkin',text:'Arrival'}]}),true);
 assert.equal(d.pageBreakBefore(label,{getFollowingNodesOnPage:()=>[{id:'book-value-arrival-checkout',text:'Departure'}]}),false);
});
test('editorial cover, page furniture and paired Wi-Fi preserve the exact saved strings',()=>{
 const s=bookSnapshot({property_name:'A quiet house',wifi_name:'Guest network',wifi_password:'Guest-DEMO-only'},url),d=bookDefinition(s,'A5','<svg id="canonical"/>');
 assert.equal(d.background(1).canvas[0].color,'#fcfaf7');assert.equal(d.background(2),null);assert.equal(d.header(1),null);assert.equal(d.footer(1,2),null);
 assert.equal(d.content.find(n=>n.id==='book-property-title').text,s.name);
 const pair=d.content.find(n=>n.columns?.[0]?.stack?.some(x=>x.id==='book-value-wifi-wifi_name'));
 assert.equal(pair.columns.length,2);assert.equal(pair.columns[0].stack[1].text,'Guest network');assert.equal(pair.columns[1].stack[1].text,'Guest-DEMO-only');
 assert.ok(JSON.stringify(d.content).includes('<svg id="canonical"/>'.replaceAll('"','\\"')));
 assert.ok(d.pageMargins.every(m=>m>=32));
});

test('long and multiline Wi-Fi values flow at full width instead of interleaving in paired columns',()=>{
 const name='Network\nSecond line',password='W'.repeat(150),d=bookDefinition(bookSnapshot({property_name:'House',wifi_name:name,wifi_password:password},url),'A5','<svg/>');
 assert.ok(!d.content.some(n=>n.columns?.some(c=>c.stack?.some(s=>s.id==='book-value-wifi-wifi_name'))));
 assert.equal(d.content.find(n=>n.stack?.some(s=>s.id==='book-value-wifi-wifi_name')).stack[1].text,name);
 assert.equal(d.content.find(n=>n.stack?.some(s=>s.id==='book-value-wifi-wifi_name')).stack[1].unbreakable,false);
 assert.equal(d.content.find(n=>n.stack?.some(s=>s.id==='book-value-wifi-wifi_password')).stack[1].text,password);
});

test('short saved paragraphs stay together while long content can flow and blank lines remain',()=>{
 const paragraph='A calm stay. '.repeat(30),d=bookDefinition(bookSnapshot({property_name:'House',welcome:'First paragraph.\n\n'+paragraph},url),'A5','<svg/>');
 const parts=d.content.filter(n=>n.id?.startsWith('book-value-welcome-welcome-'));
 assert.equal(parts.length,3);assert.equal(parts[0].unbreakable,true);assert.equal(parts[1].text,' ');assert.equal(parts[2].text,paragraph);assert.equal(parts[2].unbreakable,false);
});

test('only a sparse compact A4 final page triggers a late-section balancing break',()=>{
 const model=Object.fromEntries(FIELDS.flatMap(s=>s.fields.map(([key])=>[key,'Saved '+key]))),s=bookSnapshot(model,url);
 const heading={id:'book-heading-parking',headlineLevel:1,pages:3,startPosition:{pageNumber:2,top:550}};
 const following=()=>[{id:'book-value-parking-parking-0',text:'Saved parking'}];
 const sparse=()=>[{id:'book-value-contact-contact-0',text:'Saved contact',pageNumbers:[3],startPosition:{top:120}}];
 assert.equal(bookDefinition(s,'A4','<svg/>').pageBreakBefore(heading,{getFollowingNodesOnPage:following,getNodesOnNextPage:sparse}),true);
 assert.equal(bookDefinition(s,'A5','<svg/>').pageBreakBefore(heading,{getFollowingNodesOnPage:following,getNodesOnNextPage:sparse}),false);
 assert.equal(bookDefinition(s,'A4','<svg/>').pageBreakBefore(heading,{getFollowingNodesOnPage:following,getNodesOnNextPage:()=>[{...sparse()[0],text:'Long '.repeat(100)}]}),false);
});
