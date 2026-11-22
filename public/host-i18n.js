// Static host-interface catalogs only. No property storage, transport or PDF imports.
import en from './locales/en-GB.js';
import el from './locales/el-GR.js';
import de from './locales/de-DE.js';
import fr from './locales/fr-FR.js';
import it from './locales/it-IT.js';
import es from './locales/es-ES.js';
export const HOST_CATALOGS=Object.freeze({'en-GB':en,'el-GR':el,'de-DE':de,'fr-FR':fr,'it-IT':it,'es-ES':es});
export const HOST_LANGUAGES=Object.freeze({'el-GR':'Ελληνικά','en-GB':'English','de-DE':'Deutsch','fr-FR':'Français','it-IT':'Italiano','es-ES':'Español'});
export const HOST_LOCALE_KEY='stayguide-host-locale';
const supported=value=>typeof value==='string'&&Object.hasOwn(HOST_CATALOGS,value);
export function initialHostLocale(saved,languages=[]){
 if(supported(saved))return saved;
 for(const language of Array.isArray(languages)?languages:[]){
  if(typeof language!=='string'||!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language))continue;
  const locale=Object.keys(HOST_CATALOGS).find(key=>key.toLowerCase()===language.toLowerCase())||Object.keys(HOST_CATALOGS).find(key=>key.split('-')[0]===language.toLowerCase().split('-')[0]);
  if(locale)return locale;
 }
 return 'en-GB';
}
const attributes=['aria-label','placeholder','alt','title'];
export function createHostI18n({storage,languages=[]}={}){
 let saved;try{saved=storage?.getItem(HOST_LOCALE_KEY);}catch{/* A blocked preference never blocks the dashboard. */}
 let locale=initialHostLocale(saved,languages);
 function t(key,values={}){
  const catalog=HOST_CATALOGS[locale];
  const message=Object.hasOwn(catalog,key)?catalog[key]:Object.hasOwn(en,key)?en[key]:key;
  return message.replace(/\{(\w+)\}/g,(match,name)=>{
   if(!Object.hasOwn(values,name))return match;
   const value=values[name];return value&&typeof value==='object'&&typeof value.key==='string'?t(value.key):String(value);
  });
 }
 function paint(node){
  let values={};try{values=JSON.parse(node.getAttribute('data-i18n-values')||'{}');}catch{/* Static trusted catalogs; fail to plain text. */}
  if(!values||typeof values!=='object'||Array.isArray(values))values={};
  const key=node.getAttribute('data-i18n');if(key!==null)node.textContent=t(key,values);
  for(const attribute of attributes){const key=node.getAttribute('data-i18n-'+attribute);if(key!==null)node.setAttribute(attribute,t(key,values));}
 }
 return Object.freeze({
  get locale(){return locale;},t,
  setLocale(next){
   if(!supported(next))return {changed:false,persisted:false};
   locale=next;let persisted=false;try{if(storage){storage.setItem(HOST_LOCALE_KEY,next);persisted=true;}}catch{/* Keep this visit usable without exposing storage errors. */}
   return {changed:true,persisted};
  },
  text(node,key,values={},attribute=''){
   if(!node)return;
   if(attribute&&!attributes.includes(attribute))throw Error('Unsupported UI attribute');
   node.setAttribute(attribute?'data-i18n-'+attribute:'data-i18n',key);
   node.setAttribute('data-i18n-values',JSON.stringify(values));paint(node);
  },
  apply(document){
   for(const node of document.querySelectorAll?.('[data-i18n],'+attributes.map(a=>'[data-i18n-'+a+']').join(','))||[])paint(node);
   if(document.documentElement)document.documentElement.lang=locale;
  }
 });
}
