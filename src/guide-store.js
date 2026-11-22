// Content revision metadata stays inside the existing JSON column; no schema migration.
export const GUIDE_REVISION_FIELD='__stayguide_revision';
export const UPDATE_GUIDE_SQL='UPDATE guides SET content_json = ?1, updated_at = ?2 WHERE id = ?3 AND content_json = ?4 AND edit_token_hash = ?5 RETURNING 1 AS applied';
export const validGuideRevision=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function guideContent(row){
 const {[GUIDE_REVISION_FIELD]:revision,...content}=JSON.parse(row.content_json);
 return content;
}
export async function guideRevision(row){
 const content=JSON.parse(row.content_json);
 if(Object.hasOwn(content,GUIDE_REVISION_FIELD)){
  if(!validGuideRevision(content[GUIDE_REVISION_FIELD]))throw Error('Invalid stored guide revision');
  return content[GUIDE_REVISION_FIELD];
 }
 // Read legacy rows without modifying them. The first successful CAS save installs a nonce.
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(row.content_json));
 return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export function versionGuide(content){
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 const revision=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
 return {revision,contentJson:JSON.stringify({...content,[GUIDE_REVISION_FIELD]:revision})};
}
