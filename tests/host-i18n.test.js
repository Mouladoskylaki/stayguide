import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HOST_CATALOGS,HOST_LANGUAGES,HOST_LOCALE_KEY,initialHostLocale,createHostI18n} from '../public/host-i18n.js';
import {FIELDS} from '../public/guide-content.js';
import {previewWarning} from '../public/qr-tools.js';
const keys=Object.keys(HOST_CATALOGS['en-GB']).sort();
const placeholders=s=>(s.match(/\{\w+\}/g)||[]).sort();
test('six dedicated catalogs have exact key/placeholder parity and plain nonempty text',()=>{
 assert.deepEqual(Object.keys(HOST_LANGUAGES).sort(),['de-DE','el-GR','en-GB','es-ES','fr-FR','it-IT']);
 for(const [locale,catalog] of Object.entries(HOST_CATALOGS)){
  assert.deepEqual(Object.keys(catalog).sort(),keys,locale);assert(Object.isFrozen(catalog));
  for(const [key,value] of Object.entries(catalog)){assert.equal(typeof value,'string');assert(value.trim());assert(!/<\/?[a-z]/i.test(value));assert.deepEqual(placeholders(value),placeholders(key),locale+': '+key);}
 }
});
test('all host HTML text/attribute bindings, field metadata and preview warnings are cataloged',()=>{
 const html=fs.readFileSync(new URL('../public/app.html',import.meta.url),'utf8');
 const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
 for(const match of html.matchAll(/data-i18n(?:-aria-label|-placeholder|-alt|-title)?="([^"]+)"/g))assert(Object.hasOwn(HOST_CATALOGS['en-GB'],decode(match[1])),match[1]);
 for(const section of FIELDS){for(const key of [section.title,section.hint,...section.fields.flatMap(([,label,,hint])=>[label,hint])])assert(keys.includes(key),key);}
 for(const url of ['broken','http://localhost/g/123','https://demo.trycloudflare.com/g/123','http://example.com/g/123'])assert(keys.includes(previewWarning(url)));
});
test('valid exact saved locale precedes browser languages; invalid preferences safely fall back',()=>{
 assert.equal(initialHostLocale('fr-FR',['el-GR']),'fr-FR');
 for(const bad of [null,undefined,'','{broken','"de-DE"','de','ar','__proto__',{},12])assert.equal(initialHostLocale(bad,['zz','de-AT','fr-FR']),'de-DE');
 for(const [language,expected] of [['EL-gr','el-GR'],['en-US','en-GB'],['de-CH','de-DE'],['fr-CA','fr-FR'],['it','it-IT'],['es-MX','es-ES']])assert.equal(initialHostLocale(null,[language]),expected);
 assert.equal(initialHostLocale(null,['ar','ja-JP']),'en-GB');assert.equal(initialHostLocale(null,'de'),'en-GB');
});
test('initial reads write nothing; explicit selection persists only the separate host preference',()=>{
 const data=new Map(),writes=[],storage={getItem:k=>data.get(k),setItem:(k,v)=>{writes.push(k);data.set(k,v);}};
 const i=createHostI18n({storage,languages:['es-ES']});assert.equal(i.locale,'es-ES');assert.deepEqual(writes,[]);
 assert.deepEqual(i.setLocale('it-IT'),{changed:true,persisted:true});assert.deepEqual(writes,[HOST_LOCALE_KEY]);
 assert.equal(createHostI18n({storage,languages:['en-GB']}).locale,'it-IT');assert.equal(i.setLocale('__proto__').changed,false);assert.equal(i.locale,'it-IT');assert.equal(writes.length,1);
});
test('blocked preference storage cannot break initialization or disclose storage errors',()=>{
 const storage={getItem(){throw Error('SENSITIVE STORAGE DETAIL');},setItem(){throw Error('SENSITIVE STORAGE DETAIL');}};
 const i=createHostI18n({storage,languages:['el-GR']});assert.equal(i.locale,'el-GR');assert.deepEqual(i.setLocale('de-DE'),{changed:true,persisted:false});assert.equal(i.locale,'de-DE');
});
class Node{
 constructor(){this.attributes={};this.value='unsaved <script>draft</script>';this.selectionStart=4;this.disabled=true;this.textContent='';}
 getAttribute(k){return this.attributes[k]??null;}setAttribute(k,v){this.attributes[k]=String(v);}
}
test('in-place text/attribute repaint preserves values, selection, disabled state and node identity',()=>{
 const i=createHostI18n(),label=new Node(),input=new Node(),error=new Node(),doc={documentElement:{},querySelectorAll:()=>[label,input,error]};
 i.text(label,'Save changes');i.text(input,'Your network password',{},'placeholder');
 i.text(error,'{field} contains characters unsupported by the book font ({codes}). Edit that saved field and use supported text. Nothing was removed or replaced.',{field:{key:'Property name'},codes:'U+1234'});
 for(const locale of Object.keys(HOST_LANGUAGES)){
  i.setLocale(locale);i.apply(doc);assert.equal(label.textContent,HOST_CATALOGS[locale]['Save changes']);assert.equal(doc.documentElement.lang,locale);
  assert.equal(input.value,'unsaved <script>draft</script>');assert.equal(input.selectionStart,4);assert.equal(input.disabled,true);assert.equal(input.getAttribute('placeholder'),HOST_CATALOGS[locale]['Your network password']);
  assert(error.textContent.includes(HOST_CATALOGS[locale]['Property name']));assert(error.textContent.includes('U+1234'));
 }
 i.text(label,'');i.setLocale('el-GR');i.apply(doc);assert.equal(label.textContent,'');
});
test('interpolation treats property strings as plain text, does not reparse placeholders and safely falls back',()=>{
 const i=createHostI18n();assert.equal(i.t('For {name}',{name:'<img onerror=alert(1)> {size}'}),'For <img onerror=alert(1)> {size}');
 assert.equal(i.t('unknown-key'),'unknown-key');assert.equal(i.t('For {name}'),'For {name}');
 const node=new Node();i.text(node,'For {name}',{name:'<img src=x>'});assert.equal(node.textContent,'For <img src=x>');assert.equal(node.innerHTML,undefined);
});
