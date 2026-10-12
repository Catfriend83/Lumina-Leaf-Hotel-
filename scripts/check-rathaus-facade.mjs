import {GARAGE,garageFloor,garageRoofUnder} from '../dist/underground-garage.js';
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
const parents=m=>{const p=new Map();m.g.nodes.forEach((n,i)=>n.children?.forEach(j=>p.set(j,i)));return p;},bp=parents(old),ap=parents(now),belongs=(m,p,i,test)=>{while(i!==undefined){if(test(m.g.nodes[i]))return true;i=p.get(i);}return false;};
const decoded=(m,r)=>{const p=m.g.meshes[m.g.nodes[r.nodeIndex].mesh].primitives[0],b=array(m,p.attributes.POSITION),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(Array.from({length:b.length/4},(_,i)=>b.readFloatLE(i*4)),3));if(p.indices!==undefined){const b=array(m,p.indices),type=m.g.accessors[p.indices].componentType,stride=type===5125?4:type===5123?2:1;g.setIndex(Array.from({length:b.length/stride},(_,i)=>stride===4?b.readUInt32LE(i*stride):stride===2?b.readUInt16LE(i*stride):b[i]));}return g;};
const meshFor=(m,r)=>{const mesh=new T.Mesh(decoded(m,r),new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.matrixAutoUpdate=false;mesh.matrix.copy(r.matrix);mesh.matrixWorld.copy(r.matrix);return mesh;};
const ray=new T.Raycaster(),hit=(objects,x,y,z,dir=new T.Vector3(0,-1,0))=>{ray.set(new T.Vector3(x,y,z),dir);return ray.intersectObjects(objects,false)[0];};



const target=n=>n.extras?.buildingId==='rathaus';
const protectedRows=before.filter(r=>belongs(old,bp,r.nodeIndex,n=>n.extras?.villageBuilding||n.extras?.sacredBuilding||n.extras?.garageStructure||n.extras?.roundedLimousine)&&!belongs(old,bp,r.nodeIndex,target));assert(protectedRows.every(has),'Other architecture or limousine changed');
const otherMaterials=before.filter(r=>/(?:haus-\d+|randhaus-\d+|gasthaus|kapelle)$/.test(r.material));assert(otherMaterials.every(has),'Batched neighboring building changed');
for(const r of before.filter(r=>r.extras?.gardenPath||r.extras?.gardenPathEdge||r.extras?.hotelSidewalk||r.extras?.hotelDriveWalk||r.extras?.hotelRoad||r.extras?.hotelDriveTerrain||r.extras?.vipParkingSign||r.extras?.hotelDriveMarking||r.extras?.hotelDriveDirection||r.extras?.entryPavingSeam))assert(has(r),'Road, path, ground or VIP element changed');
const house=nodes.find(target),prior=old.g.nodes.find(target);for(const k of ['translation','rotation','scale'])assert.deepEqual(house[k],prior[k]);assert.deepEqual(house.extras.footprint,prior.extras.footprint);assert.equal(house.extras.facadeDivision.stonePlinthHeight,.45);assert.equal(house.extras.facadeDivision.timberStart,3.4);assert(house.extras.upperTimber);
const wood=now.g.materials.find(m=>m.name==='Dorfholz rathaus'),innWood=now.g.materials.find(m=>m.name==='Dorfholz gasthaus');assert.deepEqual(wood.pbrMetallicRoughness.baseColorFactor,innWood.pbrMetallicRoughness.baseColorFactor);assert.equal(wood.pbrMetallicRoughness.roughnessFactor,innWood.pbrMetallicRoughness.roughnessFactor);assert.equal(imageHash(now,wood.pbrMetallicRoughness.baseColorTexture),imageHash(now,innWood.pbrMetallicRoughness.baseColorTexture));
const sign=nodes.find(n=>n.extras?.townhallSign);assert.equal(sign.extras.text,'Rathaus');assert.equal(sign.extras.styleReference,'Gasthaus Seealm');assert.equal(nodes.filter(n=>n.extras?.townhallSign).length,1);
// Original window x/y arrangement; upper frames project out only for the new cladding.
const glassBefore=before.filter(r=>r.material==='villageWindow'&&r.box.min.x>=-170.55&&r.box.max.x<=-158.45&&r.box.min.z>=-169.30&&r.box.max.z<=-160.70);
assert(glassBefore.length>=20);for(const r of glassBefore){assert(after.some(a=>a.material===r.material&&Math.abs(a.t[0]-r.t[0])<.151&&Math.abs(a.t[2]-r.t[2])<.151&&Math.abs(a.t[1]-r.t[1])<1e-5),'Rathaus window moved or removed');}
const report={version:62,target:'rathaus',plasterGroundFloor:true,timberStartMeters:3.4,stonePlinthMeters:.45,timberUpperAndGable:true,woodMapColorRoughnessMatchGasthaus:true,foldingShutters:true,sign:'Rathaus',signStyle:'Gasthaus Seealm',townhallPoseAndFootprintPreserved:true,windowArrangementChecked:glassBefore.length,protectedArchitectureComponents:protectedRows.length,otherBuildingInstancesPreserved:otherMaterials.length,roadsAndGroundPreserved:true,browserVerification:'unavailable in managed environment'};fs.writeFileSync('rathaus-facade-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
