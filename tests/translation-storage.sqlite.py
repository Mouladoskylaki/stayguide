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
  const value=read?await statement.first():sql.includes(' RETURNING ')?(await statement.all()).results.length:(await statement.run()).meta.changes;expected.push(value);return value;
 }
 await step(insert,[id,'HASH',JSON.stringify(guide),'now','now']);
 await step(SQL.source,[id,'welcome'],true);await step(SQL.language,[id,'welcome','en-GB']);
 const s=await step(SQL.source,[id,'welcome'],true);
 const a=['one',id,'welcome','en-GB','el-GR',s.source_version,CONFIG.model,CONFIG.promptVersion,100000,100010,CONFIG.reservationNano,'mock'];
 await step(SQL.claim,a);await step(SQL.claim,['duplicate',...a.slice(1)]);
 if(await step(SQL.claim,['reclaimed',...a.slice(1,8),100011,100100,CONFIG.reservationNano,'mock'])!==0)throw Error('Expired attempt retried');
 await step(SQL.publish,['one',JSON.stringify({welcome:'Old 112.'}),'generated',100012]);
 await step(SQL.publish,['one',JSON.stringify({welcome:'Hello 112.'}),'generated',100005]);
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'mock'],true);
 await step(SQL.manual,['one',JSON.stringify({welcome:'Corrected 112.'}),s.source_version,id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'en-GB',JSON.stringify({welcome:'Hello 112.'})]);
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'mock'],true);
 const correction=['one',JSON.stringify({welcome:'Must not overwrite 112.'}),s.source_version,id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'en-GB',JSON.stringify({welcome:'Hello 112.'})];
 if(await step(SQL.manual,correction)!==0)throw Error('Concurrent correction was not rejected');
 const currentText=JSON.stringify({welcome:'Corrected 112.'});
 for(const [index,value] of [[0,'incorrect-identity'],[2,null],[2,s.source_version-1],[3,'wrong-property'],[4,'rules'],[5,'de-DE'],[6,'wrong-model'],[7,'wrong-prompt'],[8,'de-DE']]){
  const invalid=[...correction];invalid[9]=currentText;invalid[index]=value;
  if(await step(SQL.manual,invalid)!==0)throw Error('Invalid correction expectation accepted');
 }
 await step(update,[JSON.stringify({...guide,welcome:'Changed 112.'}),'later',id]);
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'mock'],true);
 const changed=await step(SQL.source,[id,'welcome'],true);await step(SQL.source,[id,'rules'],true);
 const newer=['new-current',id,'welcome','en-GB','el-GR',changed.source_version,CONFIG.model,CONFIG.promptVersion,100020,100100,CONFIG.reservationNano,'mock'];
 if(await step(SQL.claim,newer)!==1)throw Error('New source claim failed');
 await step(SQL.publish,['new-current',JSON.stringify({welcome:'New translation 112.'}),'generated',100021]);
 if(await step(SQL.manual,['one',JSON.stringify({welcome:'Stale 112.'}),s.source_version,id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'en-GB',currentText])!==0)throw Error('Stale identity accepted');
 if(await step(SQL.manual,['new-current',JSON.stringify({welcome:'Stale 112.'}),s.source_version,id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'en-GB',JSON.stringify({welcome:'New translation 112.'})])!==0)throw Error('Stale version accepted');
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'mock'],true);
 const real=['real-claim',id,'welcome','en-GB','el-GR',changed.source_version,CONFIG.model,CONFIG.promptVersion,100030,100100,CONFIG.reservationNano,'openai'];
 if(await step(SQL.claim,real)!==1)throw Error('Real provenance claim failed');
 const usage={inputTokens:100,outputTokens:40,reasoningTokens:0,conservativeNano:33000};
 if(await step(SQL.reconcile,['real-claim',JSON.stringify(usage),33000])!==1)throw Error('Reconciliation failed');
 if(await step(SQL.reconcile,['real-claim',JSON.stringify(usage),CONFIG.reservationNano+1])!==0)throw Error('Over-reservation usage accepted');
 await step(SQL.publish,['real-claim',JSON.stringify({welcome:'Real fixture 112.'}),'generated',100031]);
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'openai'],true);
 await step(SQL.cached,[id,'welcome','el-GR',CONFIG.model,CONFIG.promptVersion,'mock'],true);
console.log(JSON.stringify({operations,expected,sql:SQL}));
"""

trace = subprocess.run(['node', '--input-type=module', '-e', TRACE_JS], capture_output=True, text=True, check=True, timeout=15)
x = json.loads(trace.stdout)
x.update(initial=pathlib.Path('migrations/0000_guides.sql').read_text(), migration=pathlib.Path('migrations/0001_translation_foundation.sql').read_text(), schema=pathlib.Path('schema.sql').read_text(),openai_migration=pathlib.Path('migrations/0002_openai_translation.sql').read_text())

import sqlite3,json,sys
def write_count(connection,sql,args):
 cursor=connection.execute(sql,args)
 if ' RETURNING ' in sql:
  rows=cursor.fetchall();assert all(row[0]==1 for row in rows);return len(rows)
 return cursor.rowcount
c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON')
c.executescript(x['initial'])
c.execute('INSERT INTO guides VALUES(?,?,?,?,?)',('legacy','HASH','{"welcome":"Original Greek text"}','now','now'))
c.executescript(x['migration']);c.executescript(x['openai_migration'])
assert c.execute("SELECT source_language FROM translation_sources WHERE guide_id='legacy' AND section='welcome'").fetchone()[0] is None
assert c.execute("SELECT content_json FROM guides WHERE id='legacy'").fetchone()[0]=='{"welcome":"Original Greek text"}'
out=[]
for op in x['operations']:
 args={str(i+1): v for i,v in enumerate(op['args'])}
 if op['read']:
  row=c.execute(op['sql'],args).fetchone();out.append(dict(row) if row else None)
 else:out.append(write_count(c,op['sql'],args))
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
 write_count(c,x['language'],dict(zip(['1','2','3'],('g','welcome','en-GB'))));c.commit();c.close()
 barrier=threading.Barrier(2);results=[]
 def claim(i):
  db=sqlite3.connect(p,timeout=5);barrier.wait()
  changed=write_count(db,x['claim'],{str(j+1):v for j,v in enumerate(('claim'+str(i),'g','welcome','en-GB','el-GR',2,'gpt-6-luna','hospitality-v1',100000,130000,660000,'mock'))})
  results.append(changed);db.commit();db.close()
 ts=[threading.Thread(target=claim,args=(i,)) for i in range(2)]
 for t in ts:t.start()
 for t in ts:t.join()
 assert sorted(results)==[0,1],results
 c=sqlite3.connect(p);assert c.execute('SELECT COUNT(*) FROM translation_attempts').fetchone()[0]==1
 c.execute('UPDATE translation_policy SET budget_nano=660000')
 assert write_count(c,x['claim'],{str(j+1):v for j,v in enumerate(('over','g','welcome','en-GB','de-DE',2,'gpt-6-luna','hospitality-v1',100000,130000,660000,'mock'))})==0
 c.close()


print("PASS: independent SQLite connections, unique claims and cumulative budget")

# The durable ledger, not a translation row or its lease, is the retry boundary.
for status in ['reserved','failed','completed']:
 db=sqlite3.connect(':memory:');db.executescript(x['schema'])
 db.execute('INSERT INTO guides VALUES(?,?,?,?,?)',('g','HASH','{"welcome":"Hello"}','now','now'))
 write_count(db,x['language'],{'1':'g','2':'welcome','3':'en-GB'})
 args=['first','g','welcome','en-GB','de-DE',2,'gpt-6-luna','hospitality-v1',1,2,660000,'mock']
 assert write_count(db,x['claim'],{str(i+1):v for i,v in enumerate(args)})==1
 db.execute('UPDATE translation_attempts SET status=?',(status,))
 db.execute('DELETE FROM translations')  # Disposable fixture only; keep the attempt.
 args[0]='forbidden-replacement';args[8]=3;args[9]=4
 assert write_count(db,x['claim'],{str(i+1):v for i,v in enumerate(args)})==0
 assert db.execute('SELECT COUNT(*),SUM(reservation_nano) FROM translation_attempts').fetchone()==(1,660000)
 db.close()
print("PASS: durable attempt fence rejects reserved/failed/completed identities without translation rows after expiry")

# Competing edits to the same translation use its old text as a compare-and-swap value.
with tempfile.TemporaryDirectory(dir='.local/qa',prefix='sg-p31-phase3a-correct-') as d:
 p=os.path.join(d,'test.sqlite');db=sqlite3.connect(p);db.executescript(x['schema'])
 db.execute('INSERT INTO guides VALUES(?,?,?,?,?)',('g','HASH','{"welcome":"Original"}','now','now'))
 write_count(db,x['sql']['language'],{'1':'g','2':'welcome','3':'en-GB'})
 claim=['edit-claim','g','welcome','en-GB','el-GR',2,'gpt-6-luna','hospitality-v1',100000,130000,660000,'mock']
 write_count(db,x['sql']['claim'],{str(i+1):v for i,v in enumerate(claim)})
 original=json.dumps({'welcome':'Original'})
 write_count(db,x['sql']['publish'],{'1':'edit-claim','2':original,'3':'generated','4':100001});db.commit();db.close()
 barrier=threading.Barrier(2);results=[]
 def correct(i):
  conn=sqlite3.connect(p,timeout=5);barrier.wait()
  args=['edit-claim',json.dumps({'welcome':'Correction '+str(i)}),2,'g','welcome','el-GR','gpt-6-luna','hospitality-v1','en-GB',original]
  changed=write_count(conn,x['sql']['manual'],{str(j+1):v for j,v in enumerate(args)})
  results.append(changed);conn.commit();conn.close()
 ts=[threading.Thread(target=correct,args=(i,)) for i in range(2)]
 for t in ts:t.start()
 for t in ts:t.join()
 assert sorted(results)==[0,1],results
 db=sqlite3.connect(p);assert db.execute('SELECT origin FROM translations').fetchone()[0]=='manual';db.close()
print('PASS: SQLite concurrent corrections admit one writer per submitted snapshot')

# Migration 0002 must preserve existing manual mock rows, claims and consumed reservations.
legacy=sqlite3.connect(':memory:');legacy.row_factory=sqlite3.Row;legacy.execute('PRAGMA foreign_keys=ON')
legacy.executescript(x['initial']);legacy.executescript(x['migration'])
legacy.execute('INSERT INTO guides VALUES(?,?,?,?,?)',('preserved','HASH','{"welcome":"Original"}','now','now'))
write_count(legacy,x['sql']['language'],{'1':'preserved','2':'welcome','3':'en-GB'})
legacy.execute("INSERT INTO translation_attempts(claim_id,guide_id,section,source_language,target_language,source_version,model,prompt_version,created_ms,lease_until,reservation_nano) VALUES(?,?,?,?,?,?,?,?,?,?,?)",('old-manual','preserved','welcome','en-GB','el-GR',2,'gpt-6-luna','hospitality-v1',100000,130000,660000))
legacy.execute("UPDATE translations SET translated_text=?,status='ready',origin='manual'",('{"welcome":"Preserved manual"}',))
before=[dict(r) for r in legacy.execute('SELECT * FROM translations')]
legacy.executescript(x['openai_migration'])
assert [dict(r) for r in legacy.execute('SELECT * FROM translations')]==before
assert legacy.execute('SELECT SUM(reservation_nano) FROM translation_attempts').fetchone()[0]==660000
assert legacy.execute('SELECT provider_mode FROM translation_attempts').fetchone()[0]=='mock'
assert legacy.execute('SELECT cost_nano FROM translation_attempts').fetchone()[0] is None
print('PASS: OpenAI migration preserves manual mock rows and reservations; provenance and reconciliation parity')
