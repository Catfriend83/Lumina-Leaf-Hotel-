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

const target=n=>n.extras?.buildingId==='haus-8';
const protectedRows=before.filter(r=>belongs(old,bp,r.nodeIndex,n=>n.extras?.villageBuilding||n.extras?.sacredBuilding||n.extras?.garageStructure||n.extras?.roundedLimousine)&&!belongs(old,bp,r.nodeIndex,target));
const otherHouseRows=before.filter(r=>/haus-\d+$/.test(r.material)&&!r.material.endsWith('haus-8'));assert(otherHouseRows.every(has),'Batched neighboring house changed');
assert(protectedRows.every(has),'Protected architecture, limousine or garage changed');
for(const r of before.filter(r=>r.extras?.vipParkingSign||r.name==='VIP HOTEL auf der Fahrbahn'||r.extras?.hotelDriveMarking||r.extras?.hotelDriveDirection))assert(has(r),'Protected VIP element/marking changed');
const house=nodes.find(target);assert(house.extras.upperTimber&&house.extras.balcony==='wrap');assert.equal(house.extras.facadeDivision.stonePlinthHeight,.45);
const oldHouse=old.g.nodes.find(target);for(const k of ['translation','rotation','scale'])assert.deepEqual(house[k],oldHouse[k]);
const road=after.find(r=>r.extras?.singleAsphaltUnion),obj=meshFor(now,road);let count=0;
for(let x=-6.50;x<-3.21;x+=.08)for(let z=28.42;z<33.60;z+=.08){const h=hit([obj],x,2,z);assert(h,'Asphalt hole '+x+','+z);assert(Math.abs(h.point.y+.005)<1e-6);count++;}
const beforeRoad=before.find(r=>r.extras?.singleAsphaltUnion);assert.deepEqual(canonical(now,now.g.materials[now.g.meshes[now.g.nodes[road.nodeIndex].mesh].primitives[0].material]),canonical(old,old.g.materials[old.g.meshes[old.g.nodes[beforeRoad.nodeIndex].mesh].primitives[0].material]));
const plan=nodes.find(n=>n.extras?.hotelDrivePlan),beforePlan=old.g.nodes.find(n=>n.extras?.hotelDrivePlan);assert.deepEqual(plan,beforePlan);
const report={version:59,target:'haus-8',stonePlinthMeters:.45,upperAndGableTimber:true,balconyPreserved:true,housePositionPreserved:true,otherArchitectureAndCarComponentsPreserved:protectedRows.length,otherHouseInstancesPreserved:otherHouseRows.length,asphaltCoverageSamples:count,asphaltHeight:-.005,matchingAsphaltMaterial:true,trafficRoutesPreserved:true,browserVerification:'unavailable in managed environment'};
fs.writeFileSync('entry-house-apron-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
