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
const same=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<1e-10:Array.isArray(a)&&Array.isArray(b)?a.length===b.length&&a.every((v,i)=>same(v,b[i])):a&&b&&typeof a==='object'&&typeof b==='object'?Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([k,v])=>same(v,b[k])):a===b;
const transform=n=>new T.Matrix4().compose(new T.Vector3(...n.translation),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));
const house=nodes.find(n=>n.extras?.buildingId==='haus-6'&&n.extras.villageBuilding),oldHouse=old.g.nodes.find(n=>n.extras?.buildingId==='haus-6'&&n.extras.villageBuilding),shops=nodes.filter(n=>n.extras?.villageShop);
assert.equal(shops.length,1);assert.equal(nodes.filter(n=>n.extras?.villageBuilding).length,14);assert.equal(house.translation[0],-123);assert.equal(house.translation[2],-190);
for(const field of ['architecture','roofType','shutters','balcony','flowers','stoneBase','footprint','roofHeight'])assert.deepEqual(house.extras[field],oldHouse.extras[field]);
const houseParts=(all,n)=>{const inv=transform(n).invert();return all.filter(r=>r.material.endsWith('haus-6')).map(r=>({geometry:r.geometry,matrix:inv.clone().multiply(r.matrix).elements}));};
const hp=houseParts(before,oldHouse),newHp=houseParts(after,house);assert(hp.length>150);assert.equal(hp.length,newHp.length);
for(const p of hp)assert(newHp.some(q=>p.geometry===q.geometry&&p.matrix.every((v,i)=>Math.abs(v-q.matrix[i])<.00004)),'Relocated house architecture changed');
const shop=shops[0];assert.equal(shop.translation[0],oldHouse.translation[0]);assert.equal(shop.translation[2],oldHouse.translation[2]);
const front=new T.Vector3(0,0,1).applyQuaternion(new T.Quaternion(...shop.rotation)),target=new T.Vector3(PLAZA_ORDER.plazaCenter[0]-shop.translation[0],0,PLAZA_ORDER.plazaCenter[1]-shop.translation[2]).normalize();assert(front.dot(target)>.999999);
assert.equal(nodes.filter(n=>n.extras?.shopEntrance).length,1);assert.deepEqual(shop.extras.interior,{produce:true,foodShelves:3,checkout:true,centralAisleFree:true});
for(const b of old.g.nodes.filter(n=>n.extras?.villageBuilding&&n.extras.buildingId!=='haus-6')){
 const match=nodes.find(n=>n.extras?.villageBuilding&&n.extras.buildingId===b.extras.buildingId);assert.deepEqual(match,b,'Existing building moved');
}
const sign=nodes.find(n=>n.extras?.townhallSign),oldSign=old.g.nodes.find(n=>n.extras?.townhallSign);for(const field of ['translation','rotation','scale','extras'])assert.deepEqual(sign[field],oldSign[field]);
const signPrimitive=now.g.meshes[sign.mesh].primitives[0],signMaterial=now.g.materials[signPrimitive.material],texture=now.g.textures[signMaterial.pbrMetallicRoughness.baseColorTexture.index],img=now.g.images[texture.source],imageView=now.g.bufferViews[img.bufferView];fs.writeFileSync('.sites-runtime/rathaus-sign.png',now.bin.subarray(imageView.byteOffset,imageView.byteOffset+imageView.byteLength));
const fountains=nodes.filter(n=>n.extras?.villageFountain),oldFountain=old.g.nodes.find(n=>n.extras?.villageFountain);assert.equal(fountains.length,1);for(const field of ['translation','rotation','extras'])assert.deepEqual(fountains[0][field],oldFountain[field],'Fountain changed');
const banks=nodes.filter(n=>n.extras?.plazaBench);assert.equal(banks.length,4);const gaps=[];
for(const n of banks){const [x,z]=PLAZA_ORDER.benches[n.extras.index];assert.equal(n.translation[0],x);assert.equal(n.translation[2],z);const toward=new T.Vector3(fountains[0].translation[0]-x,0,fountains[0].translation[2]-z).normalize(),front=new T.Vector3(0,0,1).applyQuaternion(new T.Quaternion(...(n.rotation||[0,0,0,1])));assert(front.dot(toward)>.999999);const gap=Math.hypot(x-fountains[0].translation[0],z-fountains[0].translation[2])-.24-2.2;assert(Math.abs(gap-2.15)<1e-10);gaps.push(gap);}
for(const n of old.g.nodes.filter(n=>n.extras?.plazaTree||n.extras?.lakePathLamp||n.extras?.lakeBenchBin||n.extras?.gymEquipment||n.extras?.gymAisleCarpet||n.extras?.villageBench&&n.extras.lakeside||n.extras?.junctionPlanter)){
 const match=nodes.find(x=>x.name===n.name&&same(x.translation,n.translation));assert(match,'Protected object moved '+n.name);for(const field of ['rotation','scale','extras'])assert(same(match[field],n[field]),'Protected object changed '+n.name+' '+field);
}
function meshPrimitive(model,test){const n=model.g.nodes.find(test);return model.g.meshes[n.mesh].primitives[0];}
for(const kind of ['road','loop','rest']){const a=meshPrimitive(now,n=>n.extras?.villageTrafficSurface===kind),b=meshPrimitive(old,n=>n.extras?.villageTrafficSurface===kind);for(const key of ['POSITION','NORMAL','TEXCOORD_0'])assert.deepEqual(array(now,a.attributes[key]),array(old,b.attributes[key]));assert.deepEqual(array(now,a.indices),array(old,b.indices));assert.deepEqual(canonical(now,now.g.materials[a.material]),canonical(old,old.g.materials[b.material]));}
const ray=new T.Raycaster(),surfaces=[];
for(const n of nodes.filter(n=>n.extras?.villageGround||n.extras?.villagePlazaFinish||n.extras?.villageTrafficSurface==='walk')){
 const p=now.g.meshes[n.mesh].primitives[0],g=new T.BufferGeometry(),bytes=array(now,p.attributes.POSITION);g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4),3));const a=now.g.accessors[p.indices],ix=array(now,p.indices);g.setIndex(Array.from(new ({5123:Uint16Array,5125:Uint32Array}[a.componentType])(ix.buffer,ix.byteOffset,a.count)));const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.updateMatrixWorld();surfaces.push(m);
}
let footProbes=0;for(const n of banks)for(const foot of n.extras.footings){const v=new T.Vector3(...foot).applyMatrix4(transform(n));ray.set(new T.Vector3(v.x,20,v.z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(surfaces,false)[0];assert(hit&&Math.abs(hit.point.y-v.y)<.0001,'Floating bench');footProbes++;}
let foundationProbes=0;for(const n of [house,shop]){const m=transform(n),w=n.extras.footprint.width,d=n.extras.footprint.depth;for(let side=0;side<4;side++)for(let i=0;i<=10;i++){const t=i/10,p=side===0?[-w/2+t*w,-d/2]:side===1?[w/2,-d/2+t*d]:side===2?[w/2-t*w,d/2]:[-w/2,d/2-t*d],v=new T.Vector3(p[0],0,p[1]).applyMatrix4(m);ray.set(new T.Vector3(v.x,20,v.z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(surfaces,false)[0];assert(hit,'Missing building ground');assert(hit.point.y>n.translation[1]-.26,'Foundation above terrain');assert(hit.point.y<n.translation[1]+.11,'Building sunk into terrain');foundationProbes++;}}
const oldBanks=old.g.nodes.filter(n=>n.extras?.plazaBench),bankPart=r=>['wood','frame'].includes(r.material)&&oldBanks.some(n=>{const p=new T.Vector3(...r.t).applyMatrix4(transform(n).invert());return Math.abs(p.x)<1&&Math.abs(p.z)<.35&&p.y>0&&p.y<1.2;});
const oldHouseRegion=r=>r.t[0]>-142&&r.t[0]<-120&&r.t[2]>-166&&r.t[2]<-142,newHouseRegion=r=>r.t[0]>-141&&r.t[0]<-105&&r.t[2]>-209&&r.t[2]<-171;
const physicalHousePart=r=>r.material.endsWith('haus-6')||oldHouseRegion(r)&&['stoneDark','villageWindow','Dorf leaf','Dorf leaf2','Dorf trunk','soil','wood'].includes(r.material);
const vegetation=r=>['trunk','pine','pine2','leaf','leaf2','grassBlade','Dorf trunk','Dorf leaf','Dorf leaf2','Dorf grassBlade','Fototextur Blätter und Blüten','flowerRed','flowerWhite'].includes(r.material);
for(let i=0;i<4;i++){
 const name='Eingefasstes symmetrisches Baumbeet '+i,a=meshPrimitive(now,n=>n.name===name),b=meshPrimitive(old,n=>n.name===name);assert.deepEqual(array(now,a.indices),array(old,b.indices));assert.deepEqual(canonical(now,now.g.materials[a.material]),canonical(old,old.g.materials[b.material]));
 for(const k of ['POSITION','NORMAL','TEXCOORD_0']){const ab=array(now,a.attributes[k]),bb=array(old,b.attributes[k]),av=new Float32Array(ab.buffer,ab.byteOffset,ab.length/4),bv=new Float32Array(bb.buffer,bb.byteOffset,bb.length/4);assert.equal(av.length,bv.length);const tolerance=i===2?(k==='NORMAL'?.01:.006):1e-6;assert(av.every((v,j)=>Math.abs(v-bv[j])<tolerance),'Tree bed changed');if(k==='POSITION')assert(av.every((v,j)=>j<64*3||Math.abs(v-bv[j])<1e-6),'Tree bed upper surface moved');if(k==='TEXCOORD_0')assert.deepEqual(ab,bb);}
}
let remoteTerrainVertices=0;for(const name of ['Bündiger Übergang vom Dorf zur bestehenden Landschaft','Fein modellierte Wiesen und natürliche Uferübergänge']){
 const a=meshPrimitive(now,n=>n.name===name),b=meshPrimitive(old,n=>n.name===name),ab=array(now,a.attributes.POSITION),bb=array(old,b.attributes.POSITION),av=new Float32Array(ab.buffer,ab.byteOffset,ab.length/4),bv=new Float32Array(bb.buffer,bb.byteOffset,bb.length/4);assert.equal(av.length,bv.length);if(a.indices!==undefined&&b.indices!==undefined)assert.deepEqual(array(now,a.indices),array(old,b.indices));else assert.equal(a.indices,b.indices);
 for(let i=0;i<av.length;i+=3){assert.equal(av[i],bv[i]);assert.equal(av[i+2],bv[i+2]);if(bv[i]>-150&&bv[i]<-96&&bv[i+2]>-218&&bv[i+2]<-162)continue;assert(Math.abs(av[i+1]-bv[i+1])<1e-6,'Distant terrain changed');remoteTerrainVertices++;}
}
const allowed=r=>r.extras?.villageGround||r.extras?.villagePlazaFinish||r.extras?.villageTrafficSurface==='walk'||r.extras?.villageTrafficSurface==='curb'||r.extras?.villageCurbFace||r.extras?.villagePavingEdge||r.name==='Fassadenschild rathaus'||bankPart(r)||physicalHousePart(r)||oldHouseRegion(r)&&['gold','frame','flowerPurple','flowerWhite'].includes(r.material)||newHouseRegion(r)&&vegetation(r)||r.name.startsWith('Eingefasstes symmetrisches Baumbeet ')||['Bündiger Übergang vom Dorf zur bestehenden Landschaft','Fein modellierte Wiesen und natürliche Uferübergänge'].includes(r.name);
const missing=before.filter(r=>!has(r)),unexpected=missing.filter(r=>!allowed(r));fs.writeFileSync('.sites-runtime/shop-changed-components.json',JSON.stringify(missing.map(r=>({name:r.name,material:r.material,t:r.t,allowed:allowed(r)})),null,2));assert.equal(unexpected.length,0,'Unexpected scene changes '+JSON.stringify(unexpected.slice(0,5).map(r=>({name:r.name,material:r.material,t:r.t}))));
const report={version:48,shops:1,shopFrontFacesPlaza:true,relocatedHouse:'haus-6',housePosition:[-123,-190],preservedHouseArchitectureParts:hp.length,benches:4,bankFrontClearance:gaps[0],footProbes,foundationProbes,protectedRoadAndLakeSurfacesUnchanged:true,protectedObjectsUnchanged:true,remoteTerrainVertices,preservedPhysicalComponents:before.filter(has).length};fs.writeFileSync('village-shop-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
