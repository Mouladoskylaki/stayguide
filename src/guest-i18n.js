// Server-rendered guest labels only; no host preference or content inference.
import el from './guest-locales/el-GR.js';
import en from './guest-locales/en-GB.js';
import de from './guest-locales/de-DE.js';
import fr from './guest-locales/fr-FR.js';
import it from './guest-locales/it-IT.js';
import es from './guest-locales/es-ES.js';
export const GUEST_CATALOGS=Object.freeze({'el-GR':el,'en-GB':en,'de-DE':de,'fr-FR':fr,'it-IT':it,'es-ES':es});
export const GUEST_LANGUAGES=Object.freeze({'el-GR':'Ελληνικά','en-GB':'English','de-DE':'Deutsch','fr-FR':'Français','it-IT':'Italiano','es-ES':'Español'});
export function guestSelection(url){
 const values=url.searchParams.getAll('lang');
 if(!values.length)return {target:null,locale:'en-GB',redirect:false};
 if(values.length!==1||!Object.hasOwn(GUEST_CATALOGS,values[0]))return {target:null,locale:'en-GB',redirect:true};
 return {target:values[0],locale:values[0],redirect:false};
}
