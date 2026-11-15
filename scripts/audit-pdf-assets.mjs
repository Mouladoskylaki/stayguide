// Maintenance only: inventory the publisher's source map against an isolated audit install.
// node scripts/audit-pdf-assets.mjs /path/pdfmake-0.3.14.tgz /path/audit/node_modules
// Never installs packages or changes application dependencies.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const [archive,modules]=process.argv.slice(2);
if(!archive||!modules)throw Error('Supply approved archive and isolated node_modules path');
const map=JSON.parse(execFileSync('tar',['-xOf',archive,'package/build/pdfmake.js.map'],{maxBuffer:30*1024*1024}));
const names=new Set(map.sources.filter(s=>s.includes('node_modules/')).map(s=>{const tail=s.split('node_modules/').at(-1).split('/');return tail[0].startsWith('@')?tail.slice(0,2).join('/'):tail[0];}));
const inventory=[],notices=['Bundled PDF engine module notices. auditVersion identifies the separately resolved audit tree; it is not a publisher bundle lockfile.\n'];
for(const name of [...names].sort()){
 const dir=path.join(modules,name),pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'))),licenses=fs.readdirSync(dir).filter(n=>/^(license|licence|notice|copying)/i.test(n)&&fs.statSync(path.join(dir,n)).isFile());
 let compared=0,exact=0;
 map.sources.forEach((source,index)=>{const marker='node_modules/'+name+'/';if(!source.includes(marker))return;const file=path.join(dir,source.split(marker).at(-1));if(fs.existsSync(file)&&fs.statSync(file).isFile()){compared++;if(fs.readFileSync(file,'utf8').trim()===map.sourcesContent[index].trim())exact++;}});
 inventory.push({name,auditVersion:pkg.version,license:pkg.license??null,notices:licenses,sourceFilesCompared:compared,sourceFilesExact:exact});
 for(const file of licenses)notices.push(`\n\n=== ${name} / ${file} ===\n`+fs.readFileSync(path.join(dir,file),'utf8'));
 if(!licenses.length)notices.push(`\n\n=== ${name} published license declaration ===\n`+JSON.stringify({name,version:pkg.version,author:pkg.author,license:pkg.license,repository:pkg.repository},null,2));
}
// Print for review only; preserve separately obtained upstream LICENSE and source notices
// when updating public/vendor/THIRD-PARTY-NOTICES.txt.
process.stdout.write(JSON.stringify({inventory,notices},null,2)+'\n');
