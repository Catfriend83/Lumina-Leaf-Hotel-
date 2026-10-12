import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {T} from '../dist/core.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb'),old=read('.sites-runtime/models/baseline-v91.glb');
function array(m,i){const a=m.g.accessors[i],v=m.g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],stride=v.byteStride||n*size,offset=(v.byteOffset||0)+(a.byteOffset||0),out=Buffer.alloc(a.count*n*size);for(let j=0;j<a.count;j++)m.bin.copy(out,j*n*size,offset+j*stride,offset+j*stride+n*size);return out;}
function imageHash(m,texture){if(!texture)return null;const i=m.g.images[m.g.textures[texture.index].source],v=m.g.bufferViews[i.bufferView];return crypto.createHash('sha256').update(m.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).digest('hex');}
function canonical(m,v){if(!v||typeof v!=='object')return v;if(Array.isArray(v))return v.map(x=>canonical(m,x));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='index'?imageHash(m,v):canonical(m,x)]));}



const vegetationNames=new Set(['Fotorealistische Tannensilhouette im entfernten Wald','Fototextur Tannennadeln und Schnee','trunk','pine','pine2','leaf','leaf2','grassBlade','Fototextur Blätter und Blüten','flowerRed','flowerWhite']);
function rows(m){
 const parents=new Map();m.g.nodes.forEach((n,i)=>n.children?.forEach(j=>parents.set(j,i)));const worlds=new Map();function world(i){if(worlds.has(i))return worlds.get(i);const n=m.g.nodes[i],local=n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));const result=parents.has(i)?world(parents.get(i)).clone().multiply(local):local;worlds.set(i,result);return result;}
 const out=[];for(const [nodeIndex,n] of m.g.nodes.entries()){if(n.mesh===undefined)continue;const mesh=m.g.meshes[n.mesh],attrs=n.extensions?.EXT_mesh_gpu_instancing?.attributes,count=attrs?m.g.accessors[Object.values(attrs)[0]].count:1,transforms=attrs?Object.fromEntries(Object.entries(attrs).map(([key,i])=>[key,array(m,i)])):null;
 const gh=crypto.createHash('sha256');for(const p of mesh.primitives){for(const [key,i] of Object.entries(p.attributes).sort())gh.update(key).update(array(m,i));if(p.indices!==undefined)gh.update(array(m,p.indices));gh.update(JSON.stringify(canonical(m,m.g.materials[p.material])));}const geometry=gh.digest('hex'),material=m.g.materials[mesh.primitives[0].material].name;
 for(let j=0;j<count;j++){
  const vec=(key,width,fallback)=>transforms?.[key]?Array.from({length:width},(_,i)=>transforms[key].readFloatLE((j*width+i)*4)):fallback;
  const t=vec('TRANSLATION',3,n.translation||[0,0,0]),q=vec('ROTATION',4,n.rotation||[0,0,0,1]),scale=vec('SCALE',3,n.scale||[1,1,1]);
  const matrix=attrs?world(nodeIndex).clone().multiply(new T.Matrix4().compose(new T.Vector3(...t),new T.Quaternion(...q),new T.Vector3(...scale))):world(nodeIndex),a=m.g.accessors[mesh.primitives[0].attributes.POSITION],box=new T.Box3(new T.Vector3(...a.min),new T.Vector3(...a.max)).applyMatrix4(matrix);
  const h=crypto.createHash('sha256').update(geometry);if(attrs)for(const [key,b] of Object.entries(transforms).sort(([a],[b])=>a.localeCompare(b))){const size=b.length/count;h.update(key).update(b.subarray(j*size,(j+1)*size));}else h.update(JSON.stringify({name:n.name,translation:n.translation,rotation:n.rotation,scale:n.scale,matrix:n.matrix,extras:n.extras}));
  out.push({hash:h.digest('hex'),name:n.name,material,t:new T.Vector3().setFromMatrixPosition(matrix).toArray(),scale,box,matrix,extras:n.extras,nodeIndex,gardenMember:(()=>{let i=nodeIndex;while(parents.has(i)){i=parents.get(i);if(m.g.nodes[i].name==='Blumengarten und ansteigender Weg')return true;}return false;})(),poolMember:(()=>{let i=nodeIndex;while(parents.has(i)){i=parents.get(i);if(m.g.nodes[i].name==='Poolterrasse mit linker Doppelgarage')return true;}return false;})(),instanced:!!attrs,geometry});
 }
 }return out;
}


const before=rows(old),after=rows(now),nodes=now.g.nodes;
const transform=n=>n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));
const tower=transform(nodes.find(n=>n.name==='Lumina Leaf Hotel und Außenanlage')),inv=tower.clone().invert();
const key=r=>r.geometry+'|'+(r.instanced?'instance':r.name)+'|'+r.matrix.elements.map(v=>Math.round(v*10000)).join(',');
function matcher(list){const keys=new Set(list.map(key)),near=new Map();for(const r of list){const k=r.geometry+'|'+r.name+'|'+r.t.map(v=>Math.round(v*100)).join(',');if(!near.has(k))near.set(k,[]);near.get(k).push(r);}return r=>keys.has(key(r))||(near.get(r.geometry+'|'+r.name+'|'+r.t.map(v=>Math.round(v*100)).join(','))||[]).some(a=>a.matrix.elements.every((v,i)=>Math.abs(v-r.matrix.elements[i])<1e-6));}
const retained=matcher(after),previous=matcher(before),missing=before.filter(r=>!retained(r)),added=after.filter(r=>!previous(r));


const inScope=r=>{
 const p=r.box.getCenter(new T.Vector3()).applyMatrix4(inv);
 const rear=(p.x>-2.3&&p.x<2.4||p.x>13.6&&p.x<18.3)&&p.z>-4.6&&p.z<2.3&&p.y<2.2&&p.y>.33;
 const priorLamps=p.y>.72&&p.y<1.65&&((Math.abs(p.x+1.65)<.16||Math.abs(p.x-17.65)<.16)&&[-13.1,-9.65,-6.2,-2.75,.7].some(z=>Math.abs(p.z-z)<.18));
 const frontLamp=p.y>1.05&&p.y<1.6&&Math.abs(p.z-5.85)<.16&&[-2.82,1.42,14.58,18.82].some(x=>Math.abs(p.x-x)<.16);
 const oldRugMark=p.x>7.8&&p.x<8.2&&p.z>.2&&p.z<.9&&p.y>.34&&p.y<.39;
 return rear||priorLamps||frontLamp||oldRugMark;
};
const unexpected=missing.filter(r=>!inScope(r));
fs.writeFileSync('.sites-runtime/unexpected-v92.json',JSON.stringify(unexpected.map(r=>({name:r.name,material:r.material,t:new T.Vector3(...r.t).applyMatrix4(inv).toArray()})),null,2));
assert.equal(unexpected.length,0,'Unexpected edits outside the requested furniture/lamps/rug: '+JSON.stringify(unexpected.slice(0,3).map(r=>r.name)));
const items=nodes.filter(n=>n.extras?.loungeItem),count=kind=>items.filter(n=>n.extras.kind===kind).length;
assert.equal(count('Damastsofa'),2);assert.equal(count('Damastsessel'),4);assert.equal(count('Nussbaum-Couchtisch'),2);assert.equal(count('Runder Lampen-Beistelltisch'),4);assert.equal(count('Floraler Lounge-Teppich'),2);
assert(items.every(n=>n.translation[2]>5),'An unwanted reception-side seating item remains');
const lamps=nodes.filter(n=>n.extras?.referenceTableLamp);assert.equal(lamps.length,13);assert(lamps.every(n=>n.extras.revision===92&&n.extras.height===.315));
const print=nodes.filter(n=>n.extras?.receptionRugBranding);assert.equal(print.length,1);assert.equal(print[0].extras.text,'Lumina Leaf Hotel');assert.equal(print[0].extras.stars,5);assert.deepEqual(print[0].translation,[8,.35450000000000004,.7]);
assert.equal(nodes.filter(n=>n.extras?.crystalChandelier).length,3);assert.equal(nodes.filter(n=>n.extras?.receptionist).length,2);
// Require every existing reception, ceiling and exterior surface to survive unchanged.
const report={version:92,baseVersion:91,removedSeatingGroups:2,remainingSeatingGroups:2,replacementTableLamps:lamps.length,lampHeightMeters:.315,rugText:print[0].extras.text,rugStars:5,unrelatedChangedObjects:unexpected.length,retainedObjects:before.length-missing.length,removedOrReplacedObjects:missing.length};
fs.writeFileSync('hotel-lobby-refinement-report.json',JSON.stringify(report,null,2)+'\n');console.log(report);
