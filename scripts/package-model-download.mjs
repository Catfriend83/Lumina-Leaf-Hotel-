import fs from 'node:fs';
import crypto from 'node:crypto';
for(const name of ['Lumina_Leaf_Gesamtszene','Lumina_Leaf_Hotel_Viewer']){
 const asset='dist/assets/'+name,compressed=fs.readFileSync(asset+'.glb.gz'),size=8*1024*1024,parts=[];
 fs.writeFileSync('.sites-runtime/models/'+name+'.glb.gz',compressed);
 for(const file of fs.readdirSync('dist/assets'))if(file.startsWith(name+'.glb.gz.part'))fs.unlinkSync('dist/assets/'+file);
 for(let offset=0;offset<compressed.length;offset+=size){
  const bytes=compressed.subarray(offset,offset+size),file=name+'.glb.gz.part'+String(parts.length+1).padStart(2,'0');
  fs.writeFileSync('dist/assets/'+file,bytes);parts.push({file,bytes:bytes.length});
 }
 fs.writeFileSync(asset+'.download.json',JSON.stringify({format:'gzip-parts-v1',bytes:compressed.length,sha256:crypto.createHash('sha256').update(compressed).digest('hex'),parts},null,2)+'\n');
 fs.unlinkSync(asset+'.glb.gz');console.log(JSON.stringify({name,exactModelPreserved:true,parts}));
}
