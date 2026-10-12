import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root='dist/assets';
// The browser reconstructs a single, exact GLB from the verified gzip parts.
// Raw export intermediates must never enter the static deployment package.
for(const name of ['Lumina_Leaf_Gesamtszene','Lumina_Leaf_Hotel_Viewer']){
 const manifest=JSON.parse(fs.readFileSync(`${root}/${name}.download.json`));
 const bytes=Buffer.concat(manifest.parts.map(p=>{const b=fs.readFileSync(`${root}/${p.file}`);if(b.length!==p.bytes||b.length>=26214400)throw new Error('Invalid model download part: '+p.file);return b;}));
 if(bytes.length!==manifest.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==manifest.sha256)throw new Error('Model download checksum differs: '+name);
 const model=gunzipSync(bytes);if(model.readUInt32LE(0)!==0x46546c67||model.readUInt32LE(8)!==model.length)throw new Error('Invalid complete GLB: '+name);
}
for(const name of ['Lumina_Leaf_Gesamtszene','Lumina_Leaf_Hotel','Lumina_Leaf_Hotel_Viewer'])for(const suffix of ['.glb','.glb.gz'])fs.rmSync(`${root}/${name}${suffix}`,{force:true});
for(const file of fs.readdirSync(root))if(fs.statSync(`${root}/${file}`).size>=26214400)throw new Error('Static hosting file exceeds size limit: '+file);
console.log('Verified complete model downloads; static assets are within hosting limits.');
