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
 const out=[];for(const [nodeIndex,n] of m.g.nodes.entries()){if(n.mesh===undefined)continue;const mesh=m.g.meshes[n.mesh],attrs=n.extensions?.EXT_mesh_gpu_instancing?.attributes,count=attrs&&Object.values(attrs)[0]!==null?m.g.accessors[Object.values(attrs)[0]].count:attrs?0:1,transforms=attrs&&count?Object.fromEntries(Object.entries(attrs).map(([key,i])=>[key,array(m,i)])):null;
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
const houses=nodes.filter(n=>n.extras?.referenceAlpineHouse),oldHouses=old.g.nodes.filter(n=>n.extras?.villageBuilding&&['house','pension'].includes(n.extras.kind));assert.equal(houses.length,10);assert.equal(new Set(houses.map(n=>n.extras.architecture)).size,10);
for(const n of houses){const p=oldHouses.find(p=>p.extras.buildingId===n.extras.buildingId);assert(p);for(const f of ['translation','rotation','scale'])assert.deepEqual(n[f],p[f]);assert.deepEqual(n.extras.footprint,p.extras.footprint);assert.equal(n.extras.floorY,p.extras.floorY);assert.equal(n.extras.roofType,'gable');}
assert.equal(houses.filter(n=>n.extras.upperTimber).length,4);assert.equal(houses.filter(n=>n.extras.halfTimber).length,2);assert.equal(houses.filter(n=>n.extras.balcony==='wrap').length,2);assert.equal(houses.filter(n=>n.extras.atticBalcony).length,1);assert.equal(houses.filter(n=>n.extras.balcony).length,8);
const nearHouse=r=>oldHouses.some(n=>{const p=new T.Vector3(...r.t).applyMatrix4(transform(n).invert());return Math.abs(p.x)<n.extras.footprint.width/2+1.15&&Math.abs(p.z)<n.extras.footprint.depth/2+1.65&&p.y>-.4&&p.y<n.extras.roofHeight+1.7;});
const idMaterial=r=>oldHouses.some(n=>r.material.endsWith(' '+n.extras.buildingId));
const allowed=r=>idMaterial(r)||nearHouse(r)&&['stoneDark','villageWindow','gold','frame','Dorf leaf2','flowerPurple','flowerWhite','soil'].includes(r.material)||r.name.startsWith('Fassadenschild haus-');
const missing=before.filter(r=>!has(r)),unexpected=missing.filter(r=>!allowed(r));fs.writeFileSync('.sites-runtime/alpine-changed-components.json',JSON.stringify(missing.map(r=>({name:r.name,material:r.material,t:r.t,allowed:allowed(r)})),null,2));assert.equal(unexpected.length,0,JSON.stringify(unexpected.slice(0,8).map(r=>({name:r.name,material:r.material,t:r.t}))));
const same=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<1e-10:Array.isArray(a)&&Array.isArray(b)?a.length===b.length&&a.every((v,i)=>same(v,b[i])):a&&b&&typeof a==='object'&&typeof b==='object'?Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([k,v])=>same(v,b[k])):a===b;
for(const n of old.g.nodes.filter(n=>n.extras?.villageFountain||n.extras?.plazaTree||n.extras?.plazaBench||n.extras?.lakePathLamp||n.extras?.lakeBenchBin||n.extras?.gymEquipment||n.extras?.gymAisleCarpet||n.extras?.junctionPlanter||n.extras?.villageBuilding&&!['house','pension'].includes(n.extras.kind)||n.extras?.villageShop)){const match=nodes.find(x=>x.name===n.name&&same(x.translation,n.translation));assert(match,'Protected object moved '+n.name);for(const f of ['translation','rotation','scale','extras'])assert(same(match[f],n[f]),'Protected object changed '+n.name);}
const point=new T.Vector3();let doors=0;for(const n of houses){const oldDoor=old.g.nodes.find(p=>p.name==='Eingangsstufe '+n.extras.buildingId),door=nodes.find(p=>p.name===oldDoor.name);for(const f of ['translation','rotation','extras'])assert.deepEqual(door[f],oldDoor[f]);doors++;}
let foundations=0;for(const n of oldHouses){const inv=transform(n).invert(),base=before.find(r=>r.material==='stoneDark'&&new T.Vector3(...r.t).applyMatrix4(inv).distanceTo(new T.Vector3(0,-.12,0))<.0001);assert(base&&has(base),'Foundation changed '+n.extras.buildingId);foundations++;}
const report={version:50,preservedFoundations:foundations,houses:10,individualArchitectures:10,unchangedFootprintsAndRoadAccess:true,upperTimberHouses:4,timberFramingHouses:2,balconies:8,wraparoundBalconies:2,atticBalconies:1,preservedEntrances:doors,protectedPublicBuildingsAndPlazaUnchanged:true,preservedPhysicalComponents:before.filter(has).length};fs.writeFileSync('alpine-houses-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
