"""SG-P31-W1 offline parity/concurrency checks. Disposable SQLite only; stdlib.
Run: python3 tests/guide-concurrency.sqlite.py
"""
import json
import pathlib
import sqlite3
import subprocess
import tempfile
import threading

# Exercise the actual local adapter and export the actual conditional production SQL.
TRACE = r"""
import {createLocalDb} from './node/db.mjs';
import {UPDATE_GUIDE_SQL as update,GUIDE_REVISION_FIELD as field,versionGuide} from './src/guide-store.js';
import {TRANSLATION_SQL as translations} from './src/translation-store.js';
const db=createLocalDb(),operations=[],expected=[];
const content=welcome=>versionGuide({property_name:'Synthetic House',welcome,rules:'No smoking.'}).contentJson;
async function step(sql,args,read=false){operations.push({sql,args,read});const s=db.prepare(sql).bind(...args);expected.push(read?await s.first():(await s.run()).meta.changes);}
const old=content('Original'),first=content('First');
await step('INSERT INTO guides (id,edit_token_hash,content_json,created_at,updated_at) VALUES (?1,?2,?3,?4,?5)',['g','HASH',old,'same','same']);
for(const section of ['welcome','rules']){
 await step(translations.language,['g',section,'en-GB']);
 await step(translations.claim,[section,'g',section,'en-GB','de-DE',2,'gpt-6-luna','hospitality-v1',100000,130000,660000,'mock']);
 const text=JSON.stringify({[section]:section==='rules'?'No smoking.':'Original'});
 await step(translations.publish,[section,text,'generated',100001]);
 await step(translations.manual,[section,text,2,'g',section,'de-DE','gpt-6-luna','hospitality-v1','en-GB',text]);
}
await step(update,[first,'same','g',old,'HASH']);
await step(translations.source,['g','welcome'],true);await step(translations.source,['g','rules'],true);
await step(translations.cached,['g','rules','de-DE','gpt-6-luna','hospitality-v1','mock'],true);
await step(update,[content('Stale different content'),'same','g',old,'HASH']);
await step(update,[content('Wrong owner'),'same','g',first,'WRONG']);
await step(update,[content('Missing row'),'same','absent',old,'HASH']);
await step(translations.source,['g','welcome'],true);await step(translations.source,['g','rules'],true);
// Restore original prose with a different revision; the original serialized row must stay stale.
const restored=JSON.stringify({...JSON.parse(old),[field]:'9'.repeat(64)});
await step(update,[restored,'same','g',first,'HASH']);
await step(update,[content('ABA must fail'),'same','g',old,'HASH']);
await step('SELECT id,edit_token_hash,content_json,created_at,updated_at FROM guides WHERE id=?1',['g'],true);
console.log(JSON.stringify({update,field,operations,expected,old,first}));
"""
x = json.loads(subprocess.run(['node', '--input-type=module', '-e', TRACE],
                             capture_output=True, text=True, check=True, timeout=15).stdout)
def bindings(values):
    return {str(i+1): value for i, value in enumerate(values)}

schema = pathlib.Path('schema.sql').read_text()
db = sqlite3.connect(':memory:')
db.row_factory = sqlite3.Row
db.execute('PRAGMA foreign_keys=ON')
db.executescript(schema)
actual = []
for op in x['operations']:
    cursor = db.execute(op['sql'], bindings(op['args']))
    if op['read']:
        row = cursor.fetchone()
        actual.append(dict(row) if row else None)
    else:
        actual.append(cursor.rowcount)
assert actual == x['expected'], (actual, x['expected'])
assert db.execute('SELECT SUM(reservation_nano) FROM translation_attempts').fetchone()[0] == 1320000
assert db.execute("SELECT origin,status FROM translations WHERE section='rules'").fetchone()[:] == ('manual', 'ready')
assert db.execute("SELECT status FROM translations WHERE section='welcome'").fetchone()[0] == 'stale'
print('PASS: actual SQL/local parity, exact-byte and owner CAS, identical timestamps, legacy/ABA guards, section-only invalidation and manual/reservation preservation')

pathlib.Path('.local/qa').mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(dir='.local/qa', prefix='sg-w1-sql-') as directory:
    file = str(pathlib.Path(directory)/'disposable.sqlite')
    db = sqlite3.connect(file)
    db.executescript(schema)
    db.execute('INSERT INTO guides VALUES(?,?,?,?,?)', ('g', 'HASH', x['old'], 'same', 'same'))
    db.commit()
    db.close()
    barrier = threading.Barrier(2)
    results, failures = [], []

    def editor(index):
        connection = sqlite3.connect(file, timeout=5)
        try:
            new = json.loads(x['first'])
            new['welcome'] = 'Editor '+str(index)
            new[x['field']] = str(index+2)*64
            serialized = json.dumps(new)
            barrier.wait(timeout=5)
            changed = connection.execute(x['update'], bindings([serialized, 'same', 'g', x['old'], 'HASH'])).rowcount
            connection.commit()
            results.append((changed, serialized))
        except Exception as error:
            failures.append(type(error).__name__)
        finally:
            connection.close()

    threads = [threading.Thread(target=editor, args=(i,)) for i in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)
    assert not failures and all(not thread.is_alive() for thread in threads), failures
    assert sorted(changed for changed, _ in results) == [0, 1], results
    winner = next(content for changed, content in results if changed == 1)
    db = sqlite3.connect(file)
    assert db.execute('SELECT content_json FROM guides WHERE id=?', ['g']).fetchone()[0] == winner
    before = list(db.iterdump())
    assert db.execute(x['update'], bindings([x['old'], 'same', 'g', x['old'], 'HASH'])).rowcount == 0
    assert list(db.iterdump()) == before
    db.close()
print('PASS: two independent SQLite editors admit one writer; rejected stale save changes no table or trigger state')
