import {TRAFFIC,insideRegion,roadSurfaceHeight,curbLift,pavingHeight} from '../dist/village-traffic.js';
import {landHeight} from '../dist/landscape.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {T} from '../dist/core.js';
import {VILLAGE,ROUNDABOUT,ROADS,WALKS,MAIN_ROAD,PROMENADE,SQUARE_LINK,CROSSING,JUNCTION,LAKE_RESTS,BUILDINGS,buildingPoint,nearestRoadAccess,lakeContains,constructionInfluence,closestRoute} from '../dist/village-layout.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb'),old=read(process.argv[2]);
function array(m,i){const a=m.g.accessors[i],v=m.g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],stride=v.byteStride||n*size,offset=(v.byteOffset||0)+(a.byteOffset||0),out=Buffer.alloc(a.count*n*size);for(let j=0;j<a.count;j++)m.bin.copy(out,j*n*size,offset+j*stride,offset+j*stride+n*size);return out;}
function imageHash(m,texture){if(!texture)return null;const i=m.g.images[m.g.textures[texture.index].source],v=m.g.bufferViews[i.bufferView];return crypto.createHash('sha256').update(m.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).digest('hex');}
function canonical(m,v){if(!v||typeof v!=='object')return v;if(Array.isArray(v))return v.map(x=>canonical(m,x));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='index'?imageHash(m,v):canonical(m,x)]));}


import {HOUSE_STYLES} from '../dist/bavarian-houses.js';
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

const before=rows(old),after=rows(now),nodes=now.g.nodes,key=r=>r.geometry+'|'+(r.instanced?'instance':r.name)+'|'+r.matrix.elements.map(v=>Math.round(v*10000)).join(','),keys=new Set(after.map(key)),has=r=>keys.has(key(r));

import {PLAZA_ORDER} from '../dist/plaza-order-data.js';
const groupRows=(model,all,node)=>{
 const descendants=new Set(),visit=i=>{descendants.add(i);model.g.nodes[i].children?.forEach(visit);};
 visit(model.g.nodes.indexOf(node));const inv=transform(node).invert();
 return all.filter(r=>{
  if(descendants.has(r.nodeIndex))return true;
  // Exporter flattens GPU instances while retaining logical group markers.
  if(!r.instanced)return false;const p=new T.Vector3(...r.t).applyMatrix4(inv);
  if(node.extras.plazaBench)return ['wood','frame'].includes(r.material)&&Math.abs(p.x)<1&&Math.abs(p.z)<.35&&p.y>0&&p.y<1.2;
  return node.extras.villageFountain&&r.material==='Feiner warmer Kalkstein des neuen Dorfbrunnens'&&Math.hypot(p.x,p.z)<.001&&p.y>.6&&p.y<1.5;
 });
};
const transform=n=>new T.Matrix4().compose(new T.Vector3(...n.translation),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));
const localKeys=(model,all,n,predicate=()=>true)=>{
 const inv=transform(n).invert();return groupRows(model,all,n).filter(predicate).map(r=>r.geometry+'|'+inv.clone().multiply(r.matrix).elements.map(v=>Math.round(v*10000)).join(',')).sort();
};
const banks=nodes.filter(n=>n.extras?.plazaBench),oldBanks=old.g.nodes.filter(n=>n.extras?.plazaBench),fountain=nodes.find(n=>n.extras?.villageFountain),oldFountain=old.g.nodes.find(n=>n.extras?.villageFountain);
assert.equal(banks.length,4);assert.deepEqual(fountain,oldFountain,'Fountain changed');assert.deepEqual(localKeys(now,after,fountain),localKeys(old,before,oldFountain));
const shop=nodes.find(n=>n.extras?.villageShop),q=new T.Quaternion(...shop.rotation),inv=transform(shop).invert(),trees=nodes.filter(n=>n.extras?.plazaTree).sort((a,b)=>a.extras.index-b.extras.index),left=new T.Vector3(...trees[1].translation).applyMatrix4(inv),right=new T.Vector3(...trees[2].translation).applyMatrix4(inv);
assert(Math.abs(left.x+right.x)<1e-10);assert(Math.abs(left.z-right.z)<1e-10);assert(right.x>left.x);assert.equal(trees.length,4);
for(const i of [0,1,3])assert.deepEqual(trees[i],old.g.nodes.find(n=>n.extras?.plazaTree&&n.extras.index===i),'Unrequested tree changed');
const surfaceMeshes=[];for(const n of nodes.filter(n=>n.extras?.villagePlazaFinish||n.extras?.villageGround||n.extras?.villageTrafficSurface==='walk')){const p=now.g.meshes[n.mesh].primitives[0],b=array(now,p.attributes.POSITION),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(b.buffer,b.byteOffset,b.length/4),3));const a=now.g.accessors[p.indices],ix=array(now,p.indices);g.setIndex(Array.from(new ({5123:Uint16Array,5125:Uint32Array}[a.componentType])(ix.buffer,ix.byteOffset,a.count)));const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.updateMatrixWorld();surfaceMeshes.push(m);}
const ray=new T.Raycaster();let probes=0,maxGap=0;const contact=v=>{ray.set(new T.Vector3(v[0],20,v[2]),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(surfaceMeshes,false)[0];assert(hit);const gap=Math.abs(v[1]-hit.point.y);assert(gap<.0001);maxGap=Math.max(maxGap,gap);probes++;};
const [cx,cz]=PLAZA_ORDER.center,gaps=[],oldWood=localKeys(old,before,oldBanks[0],r=>r.material==='wood');
for(const n of banks){const [x,z]=PLAZA_ORDER.benches[n.extras.index];assert.equal(n.translation[0],x);assert.equal(n.translation[2],z);assert(Math.abs(x-cx)<1e-10||Math.abs(z-cz)<1e-10);const f=new T.Vector3(0,0,1).applyQuaternion(new T.Quaternion(...(n.rotation||[0,0,0,1]))),toward=new T.Vector3(cx-x,0,cz-z).normalize();assert(f.dot(toward)>.999999999);const gap=Math.hypot(x-cx,z-cz)-.24-2.2;assert(Math.abs(gap-1)<1e-10);gaps.push(gap);assert.deepEqual(localKeys(now,after,n,r=>r.material==='wood'),oldWood);n.extras.footings.forEach(v=>contact(new T.Vector3(...v).applyMatrix4(transform(n)).toArray()));}
const bed=nodes.find(n=>n.name==='Eingefasstes symmetrisches Baumbeet 2'),bp=now.g.meshes[bed.mesh].primitives[0],bb=array(now,bp.attributes.POSITION),bv=new Float32Array(bb.buffer,bb.byteOffset,bb.length/4);for(let i=0;i<64;i+=4)contact(new T.Vector3(bv[i*3],bv[i*3+1],bv[i*3+2]).applyMatrix4(transform(bed)).toArray());
for(const n of old.g.nodes.filter(n=>n.extras?.villageBuilding||n.extras?.villageShop||n.extras?.townhallSign||n.extras?.lakePathLamp||n.extras?.lakeBenchBin||n.extras?.gymEquipment||n.extras?.gymAisleCarpet||n.extras?.junctionPlanter)){const match=nodes.find(x=>x.name===n.name&&x.extras?.buildingId===n.extras?.buildingId&&JSON.stringify(x.translation)===JSON.stringify(n.translation));assert(match);for(const f of ['translation','rotation','scale'])assert.deepEqual(match[f],n[f],'Protected object moved '+n.name);}
const bankHashes=new Set(oldBanks.flatMap(n=>groupRows(old,before,n).map(r=>r.hash))),oldTree=old.g.nodes.find(n=>n.extras?.plazaTree&&n.extras.index===2),treePart=r=>Math.hypot(r.t[0]-oldTree.translation[0],r.t[2]-oldTree.translation[2])<2.3&&r.t[1]>=oldTree.translation[1]-.1&&r.t[1]<oldTree.translation[1]+5&&['trunk','leaf','leaf2','Dorf trunk','Dorf leaf','Dorf leaf2'].includes(r.material);
const allowed=r=>bankHashes.has(r.hash)||treePart(r)||r.name==='Eingefasstes symmetrisches Baumbeet 2'||r.name==='Geplante Baumscheibe 2'||r.extras?.villageGround||r.extras?.villageTrafficSurface==='walk'||r.extras?.villagePlazaFinish||r.extras?.villagePavingEdge||['grassBlade','Dorf grassBlade'].includes(r.material)&&Math.hypot(r.t[0]-oldTree.translation[0],r.t[2]-oldTree.translation[2])<1.2;
const missing=before.filter(r=>!has(r)),unexpected=missing.filter(r=>!allowed(r));fs.writeFileSync('.sites-runtime/adjustment-changes.json',JSON.stringify(missing.map(r=>({name:r.name,material:r.material,t:r.t,allowed:allowed(r)})),null,2));assert.equal(unexpected.length,0,JSON.stringify(unexpected.slice(0,8).map(r=>({name:r.name,material:r.material,t:r.t}))));
const report={version:49,rightTreeMirrored:true,leftTreeLocal:[left.x,left.z],rightTreeLocal:[right.x,right.z],otherTreesUnchanged:true,fountainUnchanged:true,benches:4,frontClearanceMeters:gaps,identicalBenchDesign:true,contactProbes:probes,maxContactGap:maxGap,preservedPhysicalComponents:before.filter(has).length};fs.writeFileSync('plaza-adjustment-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
