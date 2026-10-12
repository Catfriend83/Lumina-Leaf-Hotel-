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
import {CHURCH_FLOOR as cfg} from '../dist/church-floor-data.js';
import {insideRegion} from '../dist/village-traffic.js';
const affected=new Set(cfg.surfaces.map(s=>s.name)),edgeNames=new Set(cfg.edges.map(s=>s.name));let preserved=0;
for(const r of before){if(affected.has(r.name)||edgeNames.has(r.name)||r.extras?.alpineBotany&&insideRegion(r.t[0],r.t[2],cfg.patch))continue;assert(has(r),'Unrelated scene component changed: '+r.name+' '+r.material);preserved++;}
for(const predicate of [n=>n.extras?.villageBuilding,n=>n.extras?.plazaTree,n=>n.extras?.plazaBench,n=>n.extras?.villageFountain,n=>n.extras?.lakePathLamp]){
 const prior=old.g.nodes.filter(predicate),current=nodes.filter(predicate);assert.equal(prior.length,current.length);for(let i=0;i<prior.length;i++)for(const field of ['translation','rotation','scale','extras'])assert.deepEqual(current[i][field],prior[i][field]);
}
let maxUVError=0;const replacements=after.filter(r=>r.extras?.churchFloorRepair);assert.equal(replacements.length,2);
for(const r of replacements){
 const p=now.g.meshes[nodes[r.nodeIndex].mesh].primitives[0],prior=before.find(q=>r.extras.kind==='stone'?q.extras?.villagePlazaFinish:q.extras?.villageTrafficSurface==='walk'),priorPrim=old.g.meshes[old.g.nodes[prior.nodeIndex].mesh].primitives[0];
 assert.deepEqual(canonical(now,now.g.materials[p.material]),canonical(old,old.g.materials[priorPrim.material]),'Original paving material differs');
 const b=array(now,p.attributes.POSITION),uv=array(now,p.attributes.TEXCOORD_0),scale=r.extras.kind==='stone'?1.2:2;
 for(let i=0;i<b.length/12;i++){const x=b.readFloatLE(i*12),z=b.readFloatLE(i*12+8),u=uv.readFloatLE(i*8),v=uv.readFloatLE(i*8+4);maxUVError=Math.max(maxUVError,Math.abs(u-x/scale),Math.abs(v-z/scale));}
}assert(maxUVError<.00002,'Stone joint phase differs');
const floorPositions=replacements.map(r=>array(now,now.g.meshes[nodes[r.nodeIndex].mesh].primitives[0].attributes.POSITION));assert.deepEqual(floorPositions[0],floorPositions[1],'Stone and path seam heights differ');
const stoneIds=new Set(cfg.indices.stone),sharedSeamVertices=new Set(cfg.indices.walk.filter(i=>stoneIds.has(i))).size;assert(sharedSeamVertices>100,'Disconnected stone/path seam');
const floors=after.filter(r=>r.extras?.villageGround||r.extras?.villagePlazaFinish||r.extras?.townhallGroundConnection||r.extras?.plazaRefinement||r.extras?.townhallFloorRepair||r.extras?.churchFloorRepair||r.extras?.villageTrafficSurface).map(r=>{const m=meshFor(now,r);m.material.side=T.FrontSide;return m;});
let symbolSightlines=0;
for(const position of [[-154,12,-133],[-159,10,-148],[-178,10,-142]])for(let a=0;a<2*Math.PI;a+=Math.PI/24)for(const radius of [.1,.4,.75]){
 const camera=new T.Vector3(...position),target=new T.Vector3(-168.06857+Math.cos(a)*radius,4.24,-152.7861+Math.sin(a)*radius),direction=target.clone().sub(camera).normalize();ray.set(camera,direction);ray.far=target.distanceTo(camera)+.7;const h=ray.intersectObjects(floors,false)[0];assert(h,'Former church symbol remains open');assert(Math.hypot(h.point.x-target.x,h.point.z-target.z)<.7,'Missed repaired church floor');symbolSightlines++;
}
for(const part of cfg.edges){const previous=before.find(r=>r.name===part.name),current=after.find(r=>r.name===part.name);const op=old.g.meshes[old.g.nodes[previous.nodeIndex].mesh].primitives[0],np=now.g.meshes[nodes[current.nodeIndex].mesh].primitives[0];assert.deepEqual(array(old,op.attributes.POSITION),array(now,np.attributes.POSITION),'Unrelated edge coordinates changed');assert.equal(old.g.accessors[op.indices].count-now.g.accessors[np.indices].count,part.remove.length*3,'Old internal lines remain');}
const report={...cfg.report,unrelatedComponentsPreserved:preserved,allBuildingsTreesFountainBenchesAndLightsUnchanged:true,identicalOriginalMaterials:true,worldAlignedStoneAndJointUV:true,maxUVError,closedFormerSymbolSightlines:symbolSightlines,stoneAndPathSharedSeamVertices:sharedSeamVertices};fs.writeFileSync('church-floor-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
