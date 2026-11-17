"""Offline SQLite migration/concurrency checks; Python standard library only.
Run from repository root: python3 tests/translation-storage.sqlite.py
No live database, credential, network access or external package is used.
"""
import json
import pathlib
import subprocess

TRACE_JS = r"""
import {createLocalDb} from './node/db.mjs';import {TRANSLATION_SQL as SQL} from './src/translation-store.js';import {TRANSLATION_CONFIG as CONFIG} from './src/translation-service.js';import fs from 'node:fs';
const id='0123456789abcdef',guide={property_name:'Synthetic property',welcome:'Welcome! Call 112.',rules:'Do not smoke.',checkin:'After 16:00.',checkout:'Before 10:00.',wifi_password:'EXCLUDED_WIFI_SENTINEL',wifi_name:'EXCLUDED_NETWORK'};const insert='INSERT INTO guides (id, edit_token_hash, content_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)',update='UPDATE guides SET content_json = ?1, updated_at = ?2 WHERE id = ?3';
 const db=createLocalDb(),operations=[],expected=[];
 async function step(sql,args=[],read=false){
  operations.push({sql,args,read});const statement=db.prepare(sql).bind(...args);
  const value=read?await statement.first():(await statement.run()).meta.changes;expected.push(value);return value;
 }
 await step(insert,[id,'HASH',JSON.stringify(guide),'now','now']);
 await step(SQL.source,[id,'welcome'],true);await step(SQL.language,[id,'welcome','en-GB']);
 const s=await step(SQL.source,[id,'welcome'],true);
 const a=['one',id,'welcome','en-GB','el-GR',s.source_version,CONFIG.model,CONFIG.promptVersion,100000,100010,CONFIG.reservationNano];
 await step(SQL.claim,a);await step(SQL.claim,['duplicate',...a.slice(1)]);
 await step(SQL.claim,['reclaimed',...a.slice(1,8),100011,100100,CONFIG.reservationNano]);
 await step(SQL.publish,['one',JSON.stringify({welcome:'Old 112.'}),'generated',100012]);
 await step(SQL.publish,['reclaimed',JSON.stringify({welcome:'Hello 112.'}),'generated',100012]);
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion],true);
 await step(SQL.manual,['reclaimed',JSON.stringify({welcome:'Corrected 112.'}),s.source_version,id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'en-GB',JSON.stringify({welcome:'Hello 112.'})]);
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion],true);
 const correction=['reclaimed',JSON.stringify({welcome:'Must not overwrite 112.'}),s.source_version,id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'en-GB',JSON.stringify({welcome:'Hello 112.'})];
 if(await step(SQL.manual,correction)!==0)throw Error('Concurrent correction was not rejected');
 const currentText=JSON.stringify({welcome:'Corrected 112.'});
 for(const [index,value] of [[0,'incorrect-identity'],[2,null],[2,s.source_version-1],[3,'wrong-property'],[4,'rules'],[5,'de-DE'],[6,'wrong-model'],[7,'wrong-prompt'],[8,'de-DE']]){
  const invalid=[...correction];invalid[9]=currentText;invalid[index]=value;
  if(await step(SQL.manual,invalid)!==0)throw Error('Invalid correction expectation accepted');
 }
 await step(update,[JSON.stringify({...guide,welcome:'Changed 112.'}),'later',id]);
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion],true);
 const changed=await step(SQL.source,[id,'welcome'],true);await step(SQL.source,[id,'rules'],true);
 const newer=['new-current',id,'welcome','en-GB','el-GR',changed.source_version,CONFIG.model,CONFIG.promptVersion,100020,100100,CONFIG.reservationNano];
 if(await step(SQL.claim,newer)!==1)throw Error('New source claim failed');
 await step(SQL.publish,['new-current',JSON.stringify({welcome:'New translation 112.'}),'generated',100021]);
 if(await step(SQL.manual,['reclaimed',JSON.stringify({welcome:'Stale 112.'}),s.source_version,id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'en-GB',currentText])!==0)throw Error('Stale identity accepted');
 if(await step(SQL.manual,['new-current',JSON.stringify({welcome:'Stale 112.'}),s.source_version,id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'en-GB',JSON.stringify({welcome:'New translation 112.'})])!==0)throw Error('Stale version accepted');
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion],true);
console.log(JSON.stringify({operations,expected,sql:SQL}));
"""

trace = subprocess.run(['node', '--input-type=module', '-e', TRACE_JS], capture_output=True, text=True, check=True, timeout=15)
x = json.loads(trace.stdout)
x.update(initial=pathlib.Path('migrations/0000_guides.sql').read_text(), migration=pathlib.Path('migrations/0001_translation_foundation.sql').read_text(), schema=pathlib.Path('schema.sql').read_text())

import sqlite3,json,sys
c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON')
c.executescript(x['initial'])
c.execute('INSERT INTO guides VALUES(?,?,?,?,?)',('legacy','HASH','{"welcome":"Original Greek text"}','now','now'))
c.executescript(x['migration'])
assert c.execute("SELECT source_language FROM translation_sources WHERE guide_id='legacy' AND section='welcome'").fetchone()[0] is None
assert c.execute("SELECT content_json FROM guides WHERE id='legacy'").fetchone()[0]=='{"welcome":"Original Greek text"}'
out=[]
for op in x['operations']:
 cur=c.execute(op['sql'],{str(i+1): v for i,v in enumerate(op['args'])})
 if op['read']:
  row=cur.fetchone();out.append(dict(row) if row else None)
 else:out.append(c.execute('SELECT changes()').fetchone()[0])
# Fresh bootstrap must create the same schema and trigger behavior.
fresh=sqlite3.connect(':memory:');fresh.executescript(x['schema'])
assert fresh.execute('SELECT COUNT(*) FROM translation_sources').fetchone()[0]==0
assert out == x["expected"], (out,x["expected"])

print("PASS: legacy migration, fresh schema and local/SQLite statement parity")
x.update(language=x["sql"]["language"],claim=x["sql"]["claim"])
pathlib.Path(".local/qa").mkdir(parents=True, exist_ok=True)

import sqlite3,json,sys,tempfile,threading,os

# Temporary test database only; never a StayGuide live database.
with tempfile.TemporaryDirectory(dir='.local/qa',prefix='sg-p31-phase3a-sql-') as d:
 p=os.path.join(d,'test.sqlite');c=sqlite3.connect(p);c.executescript(x['schema'])
 c.execute('INSERT INTO guides VALUES(?,?,?,?,?)',('g','HASH','{"welcome":"Hello"}','now','now'))
 c.execute(x['language'],dict(zip(['1','2','3'],('g','welcome','en-GB'))));c.commit();c.close()
 barrier=threading.Barrier(2);results=[]
 def claim(i):
  db=sqlite3.connect(p,timeout=5);barrier.wait()
  db.execute(x['claim'],{str(j+1):v for j,v in enumerate(('claim'+str(i),'g','welcome','en-GB','el-GR',2,'gpt-6-luna','hospitality-v1',100000,130000,660000))})
  results.append(db.execute('SELECT changes()').fetchone()[0]);db.commit();db.close()
 ts=[threading.Thread(target=claim,args=(i,)) for i in range(2)]
 for t in ts:t.start()
 for t in ts:t.join()
 assert sorted(results)==[0,1],results
 c=sqlite3.connect(p);assert c.execute('SELECT COUNT(*) FROM translation_attempts').fetchone()[0]==1
 c.execute('UPDATE translation_policy SET budget_nano=660000')
 c.execute(x['claim'],{str(j+1):v for j,v in enumerate(('over','g','welcome','en-GB','de-DE',2,'gpt-6-luna','hospitality-v1',100000,130000,660000))})
 assert c.execute('SELECT changes()').fetchone()[0]==0
 c.close()


print("PASS: independent SQLite connections, unique claims and cumulative budget")

# Competing edits to the same translation use its old text as a compare-and-swap value.
with tempfile.TemporaryDirectory(dir='.local/qa',prefix='sg-p31-phase3a-correct-') as d:
 p=os.path.join(d,'test.sqlite');db=sqlite3.connect(p);db.executescript(x['schema'])
 db.execute('INSERT INTO guides VALUES(?,?,?,?,?)',('g','HASH','{"welcome":"Original"}','now','now'))
 db.execute(x['sql']['language'],{'1':'g','2':'welcome','3':'en-GB'})
 claim=['edit-claim','g','welcome','en-GB','el-GR',2,'gpt-6-luna','hospitality-v1',100000,130000,660000]
 db.execute(x['sql']['claim'],{str(i+1):v for i,v in enumerate(claim)})
 original=json.dumps({'welcome':'Original'})
 db.execute(x['sql']['publish'],{'1':'edit-claim','2':original,'3':'generated','4':100001});db.commit();db.close()
 barrier=threading.Barrier(2);results=[]
 def correct(i):
  conn=sqlite3.connect(p,timeout=5);barrier.wait()
  args=['edit-claim',json.dumps({'welcome':'Correction '+str(i)}),2,'g','welcome','el-GR','gpt-6-luna','hospitality-v1','en-GB',original]
  conn.execute(x['sql']['manual'],{str(j+1):v for j,v in enumerate(args)})
  results.append(conn.execute('SELECT changes()').fetchone()[0]);conn.commit();conn.close()
 ts=[threading.Thread(target=correct,args=(i,)) for i in range(2)]
 for t in ts:t.start()
 for t in ts:t.join()
 assert sorted(results)==[0,1],results
 db=sqlite3.connect(p);assert db.execute('SELECT origin FROM translations').fetchone()[0]=='manual';db.close()
print('PASS: SQLite concurrent corrections admit one writer per submitted snapshot')
