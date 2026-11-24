"""Offline source-declaration SQL/JSON-adapter parity and independent SQLite contention.
Run: python3 tests/source-language.sqlite.py. Disposable fixtures only; no credentials/network.
"""
import json,pathlib,sqlite3,subprocess,tempfile,threading
trace=r"""
import {createLocalDb} from './node/db.mjs';import {TRANSLATION_SQL as SQL} from './src/translation-store.js';
const db=createLocalDb(),operations=[],expected=[];
async function step(sql,args,mode='rows'){
 operations.push({sql,args,mode});const s=db.prepare(sql).bind(...args);
 expected.push(mode==='first'?await s.first():mode==='run'?(await s.run()).meta.changes:(await s.all()).results);
}
const insert='INSERT INTO guides VALUES(?1,?2,?3,?4,?5)';
await step(insert,['g','SYNTHETIC_HASH',JSON.stringify({property_name:'Synthetic',welcome:'Original 112.',rules:'No smoking. 112.'}),'same','same'],'run');
await step(SQL.source,['g','welcome'],'first');
await step(SQL.declare,['g','welcome','el-GR',1]);await step(SQL.declare,['g','welcome','el-GR',2]);
await step(SQL.declare,['g','welcome','el-GR',1]);await step(SQL.declare,['g','welcome','de-DE',1]);
await step(SQL.declare,['g','rules','en-GB',1]);
for(const section of ['welcome','rules']){
 const source=await db.prepare(SQL.source).bind('g',section).first();
 await step(SQL.claim,[section,'g',section,source.source_language,'de-DE',source.source_version,'gpt-6-luna','hospitality-v1',100000,130000,660000,'mock']);
 const text=JSON.stringify({[section]:'Saved translation 112.'});await step(SQL.publish,[section,text,'generated',100001]);
 await step(SQL.manual,[section,JSON.stringify({[section]:'Manual correction 112.'}),source.source_version,'g',section,'de-DE','gpt-6-luna','hospitality-v1',source.source_language,text]);
}
await step(SQL.declare,['g','welcome','fr-FR',2]);await step(SQL.declare,['g','welcome','fr-FR',3]);
await step(SQL.cached,['g','welcome','de-DE','gpt-6-luna','hospitality-v1','mock'],'first');
await step(SQL.cached,['g','rules','de-DE','gpt-6-luna','hospitality-v1','mock'],'first');
await step(SQL.declare,['missing','welcome','el-GR',1]);
await step(SQL.language,['g','additional','ja-JP']);await step(SQL.source,['g','additional'],'first');
console.log(JSON.stringify({operations,expected,sql:SQL.declare}));
"""
r=subprocess.run(['node','--input-type=module','-'],input=trace,text=True,capture_output=True,check=True);x=json.loads(r.stdout)
schema=pathlib.Path('schema.sql').read_text()
def execute(db,sql,args):return db.execute(sql,{str(i+1):v for i,v in enumerate(args)})
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row;db.executescript(schema);actual=[]
for op in x['operations']:
 cursor=execute(db,op['sql'],op['args'])
 if op['mode']=='rows':actual.append([dict(row) for row in cursor.fetchall()])
 elif op['mode']=='first':
  row=cursor.fetchone();actual.append(dict(row) if row else None)
 else:actual.append(cursor.rowcount)
assert actual==x['expected']
assert db.execute("SELECT status,origin FROM translations WHERE section='welcome'").fetchone()[:]==('stale','manual')
assert db.execute("SELECT status,origin FROM translations WHERE section='rules'").fetchone()[:]==('ready','manual')
assert db.execute('SELECT COUNT(*),SUM(reservation_nano) FROM translation_attempts').fetchone()[:]==(2,1320000)
assert db.execute("SELECT source_text FROM translation_sources WHERE guide_id='g' AND section='welcome'").fetchone()[0]=='{"welcome":"Original 112."}'
# A content edit increments the same source version and fences an old language declaration.
db.execute("UPDATE guides SET content_json=? WHERE id='g'",[json.dumps({'property_name':'Synthetic','welcome':'Edited 112.','rules':'No smoking. 112.'})]);before=list(db.iterdump());assert execute(db,x['sql'],['g','welcome','it-IT',3]).fetchall()==[];assert list(db.iterdump())==before
print('PASS: actual shared RETURNING SQL/local adapter parity, no-op/stale/missing rows, legacy tags, section invalidation/manual preservation and retained reservations')
with tempfile.TemporaryDirectory(dir='.local/qa',prefix='sg-w4b-a-sqlite-') as directory:
 file=str(pathlib.Path(directory)/'disposable.sqlite');c=sqlite3.connect(file);c.executescript(schema);c.execute('INSERT INTO guides VALUES(?,?,?,?,?)',['g','HASH','{"welcome":"Original"}','same','same']);c.commit();c.close()
 gate=threading.Barrier(2);results=[];errors=[]
 def contender(language):
  connection=sqlite3.connect(file,timeout=5)
  try:gate.wait(timeout=5);rows=execute(connection,x['sql'],['g','welcome',language,1]).fetchall();connection.commit();results.append((language,rows))
  except Exception as error:errors.append(type(error).__name__)
  finally:connection.close()
 threads=[threading.Thread(target=contender,args=(language,)) for language in ['el-GR','de-DE']]
 for thread in threads:thread.start()
 for thread in threads:thread.join(timeout=10)
 assert not errors and len(results)==2 and sorted(len(rows) for _,rows in results)==[0,1]
 c=sqlite3.connect(file);language=next(language for language,rows in results if rows);assert c.execute("SELECT source_language,source_version FROM translation_sources WHERE guide_id='g' AND section='welcome'").fetchone()==(language,2)
 before=list(c.iterdump());assert execute(c,x['sql'],['g','welcome',language,1]).fetchall()==[];assert list(c.iterdump())==before;assert c.execute('SELECT COUNT(*) FROM translation_attempts').fetchone()[0]==0;c.close()
print('PASS: two independent SQLite connections race one source version; one winner, no attempts and stale same-language rejection')
