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



import {TOWNHALL_PLACEMENT as cfg} from '../dist/townhall-placement-data.js';
import {insideRegion} from '../dist/village-traffic.js';
const target=n=>n.extras?.villageBuilding&&n.extras?.buildingId==='rathaus';
const geometryRows=new Map();for(const r of after){if(!geometryRows.has(r.geometry))geometryRows.set(r.geometry,[]);geometryRows.get(r.geometry).push(r);}
const rigidMatch=r=>keys.has(key(r))||(geometryRows.get(r.geometry)||[]).some(a=>a.matrix.elements.every((v,i)=>Math.abs(v-r.matrix.elements[i])<3e-5));
const shifted=r=>{const a={...r,matrix:r.matrix.clone()};a.matrix.elements[12]+=4.1;a.matrix.elements[13]+=.18;a.matrix.elements[14]+=1.8;return a;};
// Global batching discards ownership of shared sill, hinge, soil and leaf meshes.
// Recover those only inside the old building envelope and only when their exact
// geometry/material is found with the same single rigid building displacement.
const oldEnvelope=r=>r.t[0]>-171.4&&r.t[0]<-157.6&&r.t[2]>-170.2&&r.t[2]<-159.45&&r.t[1]>4&&r.t[1]<15.2;
const local=r=>/rathaus$/.test(r.material)||belongs(old,bp,r.nodeIndex,target)||r.instanced&&oldEnvelope(r)&&!has(r)&&rigidMatch(shifted(r));
const hallBefore=before.filter(local);assert(hallBefore.length>100);
for(const r of hallBefore)assert(rigidMatch(shifted(r)),'Rathaus component changed rather than rigidly moved: '+r.name+' '+r.material);
const affectedNames=new Set(cfg.surfaces.map(s=>s.name));
const protectedRows=before.filter(r=>!local(r)&&!affectedNames.has(r.name)&&!(r.extras?.alpineBotany&&insideRegion(r.t[0],r.t[2],cfg.patch)));
for(const r of protectedRows)assert(has(r),'Unrelated component changed: '+r.name+' '+r.material);
const hall=nodes.find(target);assert.deepEqual(hall.translation,cfg.position);assert.deepEqual(hall.rotation||[0,0,0,1],[0,0,0,1]);assert.deepEqual(hall.scale||[1,1,1],[1,1,1]);
assert.deepEqual(hall.extras.footprint,old.g.nodes.find(target).extras.footprint);assert.deepEqual(hall.extras.facadeDivision,old.g.nodes.find(target).extras.facadeDivision);
const sign=nodes.find(n=>n.extras?.townhallSign);assert.equal(sign.extras.text,'Rathaus');assert.equal(nodes.filter(n=>n.extras?.townhallSign).length,1);
const surfaces=after.filter(r=>r.extras?.villageGround||r.extras?.villagePlazaFinish||r.extras?.townhallGroundConnection).map(r=>meshFor(now,r));
const w=11.86,d=8.36,x=cfg.position[0],z=cfg.position[2];let contactMin=Infinity,contactMax=-Infinity,contacts=0;
for(let i=0;i<=24;i++)for(const [px,pz]of [[x-w/2+i*w/24,z-d/2],[x-w/2+i*w/24,z+d/2],[x-w/2,z-d/2+i*d/24],[x+w/2,z-d/2+i*d/24]]){
 const h=hit(surfaces,px,20,pz);assert(h,'Missing foundation contact');contactMin=Math.min(contactMin,h.point.y);contactMax=Math.max(contactMax,h.point.y);assert(h.point.y>=cfg.position[1]-.24-1e-4&&h.point.y<=cfg.position[1]+1e-4,'Floating or buried base');contacts++;
}
for(const [px,pz]of [[x-1.5,z+5.475],[x+1.5,z+5.475],[x,z+5.475]]){const h=hit(surfaces,px,20,pz);assert(h&&Math.abs(h.point.y-cfg.position[1])<1e-4,'Unsupported entrance landing');}
const report={version:68,position:cfg.position,rotation:[0,0,0],rigidlyMovedOriginalBuildingComponents:hallBefore.length,protectedComponentsUnchanged:protectedRows.length,foundationSamples:contacts,contactMin,contactMax,foundationClosed:true,entranceSupported:true,signPreserved:true,facadeAndRoofUnchanged:true,roadsAndPathsUnchanged:true,browserVerification:'Not available in managed environment; exported geometry and CPU projections checked'};
fs.writeFileSync('townhall-placement-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
