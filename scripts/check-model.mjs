import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// Pass the locally available Khronos validator module as the first argument.
const validator=require(path.resolve(process.argv[2]));
const results=[];
for(const name of ['Lumina_Leaf_Hotel_Viewer','Lumina_Leaf_Gesamtszene']){
 const manifestPath='dist/assets/'+name+'.download.json',manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath)):null;
 const files=manifest?manifest.parts.map(p=>'dist/assets/'+p.file):['dist/assets/'+name+'.glb.gz'];
 const archive=Buffer.concat(files.map(f=>fs.readFileSync(f))),bytes=gunzipSync(archive);
 if(files.some(f=>fs.statSync(f).size>=26214400))throw new Error('Static file exceeds hosting size limit');
 const result=await validator.validateBytes(new Uint8Array(bytes),{uri:name+'.glb'});
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 if(result.issues.numErrors||result.issues.numWarnings)throw new Error(JSON.stringify({name,bytes:bytes.length,issues:{errors:result.issues.numErrors,warnings:result.issues.numWarnings}}));
 if(json.nodes.some(n=>Object.values(n.extensions?.EXT_mesh_gpu_instancing?.attributes||{}).some(v=>v===null)))throw new Error('Empty instance batch');
 if(json.nodes.some(n=>/Himmel/.test(n.name||'')))throw new Error('Sky geometry must not enclose the model');
 if(name.includes('Viewer')&&json.extensionsRequired?.includes('EXT_mesh_gpu_instancing'))throw new Error('Viewer must use ordinary meshes');
 if(name.includes('Gesamtszene')&&json.nodes.filter(n=>/^Gästezimmer \d+$/.test(n.name||'')).length!==40)throw new Error('Expected 40 modeled guest rooms');
 if(name.includes('Gesamtszene')&&json.nodes.filter(n=>n.extras?.facadeFixture).length!==155)throw new Error('Expected 155 aligned facade fixtures');
 if(name.includes('Gesamtszene')&&json.nodes.filter(n=>n.extras?.watercraft).length!==8)throw new Error('Expected 8 watercraft');
 const alpha=json.materials.find(m=>/Blätter und Blüten/.test(m.name));
 if(json.images[json.textures[alpha.pbrMetallicRoughness.baseColorTexture.index].source].mimeType!=='image/png')throw new Error('Missing foliage alpha');
 results.push({name,bytes:bytes.length,validation:result});
}
for(const file of fs.readdirSync('dist').filter(x=>x.endsWith('.js'))){
 const code=fs.readFileSync('dist/'+file,'utf8');
 for(const match of code.matchAll(/(?:from\s+|import\s*)['"](\.\/[^'"]+)['"]/g))if(!fs.existsSync(path.resolve('dist',match[1].split('?')[0])))throw new Error('Missing local module '+match[1]);
}
fs.writeFileSync('validation-report.json',JSON.stringify({version:92,guestRooms:40,results},null,2)+'\n');
console.log(results.map(x=>({name:x.name,bytes:x.bytes,errors:x.validation.issues.numErrors,warnings:x.validation.issues.numWarnings})));
