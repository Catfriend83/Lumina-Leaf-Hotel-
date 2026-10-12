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
import {PLAZA_REFINEMENT as cfg} from '../dist/plaza-refinement-data.js';
import {insideRegion} from '../dist/village-traffic.js';
const node=n=>n.extras?.villageBuilding&&n.extras?.buildingId==='rathaus';
const hall=nodes.find(node),oldHall=old.g.nodes.find(node);
for(const field of ['translation','rotation','scale','extras'])assert.deepEqual(hall[field],oldHall[field],'Rathaus changed '+field);
const trees=nodes.filter(n=>n.extras?.plazaTree),oldTrees=old.g.nodes.filter(n=>n.extras?.plazaTree);
assert.equal(trees.length,4);
const treeDeltas=[];
for(const tree of trees){
 const index=tree.extras.index,prior=oldTrees.find(t=>t.extras.index===index),selected=cfg.treeIndices.indexOf(index);
 if(selected<0){for(const field of ['translation','rotation','scale','extras'])assert.deepEqual(tree[field],prior[field]);continue;}
 assert.deepEqual([tree.translation[0],tree.translation[2]],cfg.newTrees[selected]);
 assert.equal(tree.translation[2]-cfg.frontZ,3);assert(Math.abs(Math.abs(tree.translation[0]-cfg.facadeAxisX)-9.2)<1e-10);
 for(const field of ['rotation','scale'])assert.deepEqual(tree[field],prior[field]);
 treeDeltas.push({index,prior:prior.translation,delta:tree.translation.map((x,i)=>x-prior.translation[i])});
}
const lamps=nodes.filter(n=>n.extras?.lakePathLamp),beforeLamps=old.g.nodes.filter(n=>n.extras?.lakePathLamp),lights=nodes.filter(n=>n.extras?.lakePathLight);
assert.equal(beforeLamps.length,52);assert.equal(lamps.length,26);assert.equal(lights.length,26);
for(const lamp of lamps){assert.equal(lamp.extras.index%2,0);const prior=beforeLamps.find(n=>n.extras.index===lamp.extras.index);for(const field of ['translation','rotation','scale'])assert.deepEqual(lamp[field],prior[field]);assert(lights.some(n=>n.extras.index===lamp.extras.index));}
const stations=lamps.map(n=>n.extras.station).sort((a,b)=>a-b),gaps=stations.map((s,i)=>(stations[(i+1)%stations.length]+(i===stations.length-1?PROMENADE.length:0))-s);
assert(Math.max(...gaps)<20);assert(Math.max(...gaps)-Math.min(...gaps)<1e-9);
const circularDistance=(a,b)=>Math.min(Math.abs(a-b),PROMENADE.length-Math.abs(a-b));
let maxBenchLampDistance=0;for(const rest of LAKE_RESTS){const station=rest.row.s,distance=Math.min(...stations.map(s=>circularDistance(s,station)));assert(distance<10);maxBenchLampDistance=Math.max(maxBenchLampDistance,distance);}
const geometryRows=new Map();for(const r of after){if(!geometryRows.has(r.geometry))geometryRows.set(r.geometry,[]);geometryRows.get(r.geometry).push(r);}
const rigidMatch=r=>has(r)||(geometryRows.get(r.geometry)||[]).some(a=>a.matrix.elements.every((v,i)=>Math.abs(v-r.matrix.elements[i])<3e-5));
const translated=(r,d)=>{const n={...r,matrix:r.matrix.clone()};for(let i=0;i<3;i++)n.matrix.elements[12+i]+=d[i];return n;};
const treeMove=r=>treeDeltas.find(d=>Math.hypot(r.t[0]-d.prior[0],r.t[2]-d.prior[2])<2&&r.t[1]>d.prior[1]-.01&&r.t[1]<d.prior[1]+5&&rigidMatch(translated(r,d.delta)));
const removedLamps=beforeLamps.filter(n=>n.extras.index%2);
const removedLamp=r=>removedLamps.some(n=>Math.hypot(r.t[0]-n.translation[0],r.t[2]-n.translation[2])<.3&&r.t[1]>n.translation[1]-.08&&r.t[1]<n.translation[1]+3.5&&(/Seeweg/.test(r.material)||/^Bündiger Fuß der Seeweg-Leuchte/.test(r.name)));
const changedSurface=new Set(cfg.surfaces.map(s=>s.name));
const changedBed=r=>cfg.treeIndices.some(i=>r.name==='Eingefasstes symmetrisches Baumbeet '+i||r.name==='Geplante Baumscheibe '+i);
let protectedCount=0,movedComponents=0,removedComponents=0;
const loopBefore=before.find(r=>r.extras?.villageTrafficSurface==='loop'),loopAfter=after.find(r=>r.extras?.villageTrafficSurface==='loop');
const lp=(m,r)=>m.g.meshes[m.g.nodes[r.nodeIndex].mesh].primitives[0],lb=lp(old,loopBefore),la=lp(now,loopAfter);
for(const key of ['POSITION','NORMAL','TEXCOORD_0'])assert.deepEqual(array(now,la.attributes[key]),array(old,lb.attributes[key]),'See path geometry changed '+key);
assert.deepEqual(array(now,la.indices),array(old,lb.indices));assert.deepEqual(canonical(now,now.g.materials[la.material]),canonical(old,old.g.materials[lb.material]));
for(const r of before){
 if(has(r)){protectedCount++;continue;}
 if(r.extras?.villageTrafficSurface==='loop'){protectedCount++;continue;} // Only analytic illumination is recalculated.
 if(treeMove(r)){movedComponents++;continue;}
 if(removedLamp(r)){removedComponents++;continue;}
 if(changedSurface.has(r.name)||changedBed(r)||r.extras?.alpineBotany&&insideRegion(r.t[0],r.t[2],cfg.patch))continue;
 assert.fail('Unrelated component changed: '+JSON.stringify({name:r.name,material:r.material,t:r.t}));
}
assert(movedComponents>200);assert(removedComponents>100);
const surfaces=after.filter(r=>r.extras?.villageGround||r.extras?.villagePlazaFinish||r.extras?.townhallGroundConnection||r.extras?.plazaRefinement||r.extras?.villageTrafficSurface==='walk').map(r=>meshFor(now,r));
let contacts=0,maxGap=0;for(const n of nodes.filter(n=>n.extras?.townhallTreeBed))for(const p of n.extras.contacts){const h=hit(surfaces,p[0],20,p[2]);assert(h,'Unsupported tree bed');const gap=Math.abs(h.point.y-p[1]);assert(gap<1e-4,'Tree bed floats');maxGap=Math.max(maxGap,gap);contacts++;}
let removedLampGroundSamples=0;
for(const lamp of removedLamps)for(const p of lamp.extras.contacts){const h=hit(surfaces,p[0],20,p[2]);assert(h&&Math.abs(h.point.y-p[1])<1e-4,'Open surface at removed lamp');removedLampGroundSamples++;}
// Front elevation and the normal Rathaus camera: no relocated tree mesh may
// intersect a sightline to any of 15 positions across the original sign.
const treeParts=after.filter(r=>treeDeltas.some(d=>Math.hypot(r.t[0]-(d.prior[0]+d.delta[0]),r.t[2]-(d.prior[2]+d.delta[2]))<2)&&['trunk','leaf','leaf2','Dorf trunk','Dorf leaf','Dorf leaf2'].includes(r.material));
assert(treeParts.length>200,'Missing crown geometry in visibility check');
const treeMeshes=treeParts.map(r=>meshFor(now,r));let sightlines=0;
for(const camera of [new T.Vector3(-160.4,6,-149),new T.Vector3(-156.9,13.18,-142.2)])for(const dx of [-1.8,-.9,0,.9,1.8])for(const dy of [3.12,3.36,3.6]){
 const p=new T.Vector3(hall.translation[0]+dx,hall.translation[1]+dy,hall.translation[2]+4.28),direction=p.clone().sub(camera),length=direction.length();ray.set(camera,direction.normalize());ray.far=length;assert.equal(ray.intersectObjects(treeMeshes,false).length,0,'Rathaus sign obscured by tree');sightlines++;}
ray.far=Infinity;
const removedIds=new Set(removedLamps.map(n=>n.extras.index));assert(!nodes.some(n=>/^Bündiger Fuß der Seeweg-Leuchte /.test(n.name||'')&&removedIds.has(Number(n.name.split(' ').at(-1)))));
const report={version:69,rathausTransformAndArchitectureUnchanged:true,treePositions:trees.filter(n=>n.extras.townhallFrontTree).map(n=>n.translation),treeFacadeDistance:3,treeSymmetry:true,treeModelComponentsRigidlyMoved:movedComponents,unrelatedComponentsPreserved:protectedCount,lampsBefore:52,lampsAfter:26,removedFixtureComponents:removedComponents,removedLampGroundSamples,maxLampSpacing:Math.max(...gaps),maxBenchLampDistance,treeContactSamples:contacts,maxTreeGroundGap:maxGap,unobstructedSignSightlines:sightlines};
fs.writeFileSync('plaza-refinement-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
