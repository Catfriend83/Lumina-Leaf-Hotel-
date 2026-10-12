import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
function walk(d) { return readdirSync(d).flatMap(n => {const p=resolve(d,n);return statSync(p).isDirectory()?walk(p):[p]}); }
const files=walk('dist'); let modules=0;
for(const f of files) {
 if(statSync(f).size>25*1024*1024) throw Error(`File too large: ${f}`);
 if(f.endsWith('.js')) {execFileSync(process.execPath,['--check',f]); modules++;for(const m of readFileSync(f,'utf8').matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) if(m[1].startsWith('.')&&!existsSync(resolve(dirname(f),m[1].split(/[?#]/)[0])))throw Error(`Missing import ${m[1]}`);}
 if(f.endsWith('.download.json')) for(const p of JSON.parse(readFileSync(f,'utf8')).parts) if(!existsSync(resolve(dirname(f),p.file)))throw Error(`Missing download ${p.file}`);
}
if(!existsSync('dist/index.html')) throw Error('Missing index.html');
console.log(`Validated ${files.length} files and ${modules} JavaScript modules.`);
