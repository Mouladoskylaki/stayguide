// File-backed D1-compatible adapter used ONLY for local development and tests.
import fs from 'node:fs';
import path from 'node:path';

export function createLocalDb(file=null){
  let rows = new Map();
  if(file && fs.existsSync(file)){
    try{rows = new Map(Object.entries(JSON.parse(fs.readFileSync(file,'utf8'))));}catch{throw new Error('Local DB file could not be read');}
  }
  function persist(){
    if(!file)return;
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file+'.tmp',JSON.stringify(Object.fromEntries(rows)));
    fs.renameSync(file+'.tmp',file);
  }
  return {prepare(sql){let params=[];return {
    bind(...values){params=values;return this;},
    async first(){
      if(!sql.startsWith('SELECT '))throw new Error('Unsupported query '+sql);
      return rows.get(params[0]) ?? null;
    },
    async run(){
      if(sql.startsWith('INSERT ')){
        const [id, edit_token_hash, content_json, created_at,updated_at]=params;
        if(rows.has(id))throw new Error('Duplicate property');
        rows.set(id,{id,edit_token_hash,content_json,created_at,updated_at});persist();
      }else if(sql.startsWith('UPDATE ')){
        const [content_json, updated_at,id]=params;
        const row=rows.get(id);if(!row)throw new Error('Unknown property');
        rows.set(id,{...row,content_json,updated_at});persist();
      }else throw new Error('Unsupported query '+sql);
      return {success:true};
    }
  };}};
}
