"""Offline parity of W6's actual joined SELECT against SQLite and the local adapter."""
import json,pathlib,sqlite3,subprocess
trace=r"""
import {createLocalDb} from './node/db.mjs';import {createTranslationStore,TRANSLATION_SQL as SQL} from './src/translation-store.js';
const db=createLocalDb(),store=createTranslationStore(db),operations=[],id='0123456789abcdef',model='gpt-6-luna',prompt='hospitality-v1';
async function write(sql,args){operations.push({sql,args});await db.prepare(sql).bind(...args).run();}
async function read(target){const args=[id,target,model,prompt],r=await db.prepare(SQL.snapshot).bind(...args).all();operations.push({sql:SQL.snapshot,args,rows:r.results});}
await write('INSERT INTO guides (id, edit_token_hash, content_json, created_at, updated_at) VALUES (?1,?2,?3,?4,?5)',[id,'SYNTHETIC',JSON.stringify({property_name:'Snapshot fixture',welcome:'Welcome. 112.',checkin:'Arrive 15:00.',checkout:'Leave 11:00.'}),'now','now']);
await read(null);await write(SQL.language,[id,'welcome','en-GB']);await write(SQL.claim,['fixture',id,'welcome','en-GB','de-DE',2,model,prompt,1,9999999999999,660000,'openai']);await read('de-DE');await write(SQL.publish,['fixture',JSON.stringify({welcome:'Willkommen. 112.'}),'generated',2]);await read('de-DE');await read('fr-FR');await write(SQL.manual,['fixture',JSON.stringify({welcome:'Manual fixture. 112.'}),2,id,'welcome','de-DE',model,prompt,'en-GB',JSON.stringify({welcome:'Willkommen. 112.'})]);await read('de-DE');await write(SQL.language,[id,'welcome','el-GR']);await read('de-DE');
console.log(JSON.stringify(operations));
"""
ops=json.loads(subprocess.run(['node','--input-type=module','-e',trace],capture_output=True,text=True,check=True,timeout=15).stdout)
for mode in ['migrations','fresh schema']:
 c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row
 if mode=='migrations':
  for p in ['migrations/0000_guides.sql','migrations/0001_translation_foundation.sql','migrations/0002_openai_translation.sql']:c.executescript(pathlib.Path(p).read_text())
 else:c.executescript(pathlib.Path('schema.sql').read_text())
 reads=0
 for op in ops:
  cursor=c.execute(op['sql'],{str(i+1):v for i,v in enumerate(op['args'])})
  if 'rows' in op:
   assert [dict(r) for r in cursor.fetchall()]==op['rows'],(mode,op);reads+=1
  else:cursor.fetchall()
 print('PASS:',mode,'actual W6 joined snapshot/local-adapter parity;',reads,'original/missing/pending/ready/manual/invalidated reads')
 c.close()
