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

const before=rows(old),after=rows(now);
const meadow=r=>r.material==='meadow'||/Uferwiese|Alpine Blumenwiese/.test(r.material);
const grass=r=>/grassBlade/.test(r.material);
const botany=r=>/Wiesenbotanik/.test(r.material);
const key=r=>r.geometry+'|'+(r.instanced?'instance':r.name)+'|'+r.matrix.elements.map(v=>Math.round(v*10000)).join(',');
const oldProtected=before.filter(r=>!meadow(r)&&!grass(r)&&!botany(r)),newProtected=after.filter(r=>!meadow(r)&&!botany(r));
const currentKeys=new Set(newProtected.map(key)),previousKeys=new Set(oldProtected.map(key));
for(const r of oldProtected)assert(currentKeys.has(key(r)),'Protected scene component changed: '+JSON.stringify({name:r.name,material:r.material,t:r.t}));
for(const r of newProtected)assert(previousKeys.has(key(r)),'Unrequested new component: '+r.name);
assert(!after.some(grass),'Old grass tufts remain');assert(before.some(botany),'Baseline botany not found');
const oldGround=before.filter(meadow),newGround=after.filter(meadow);
assert.equal(oldGround.length,newGround.length,'Ground mesh count changed');
function primitives(m,r){return m.g.meshes[m.g.nodes[r.nodeIndex].mesh].primitives;}
for(const r of oldGround){
 const n=newGround.find(x=>x.name===r.name);assert(n,'Ground mesh missing: '+r.name);assert.deepEqual(n.matrix.elements,r.matrix.elements,'Terrain transform changed');
 const op=primitives(old,r),np=primitives(now,n);assert.equal(op.length,np.length);
 op.forEach((p,i)=>{assert(array(old,p.attributes.POSITION).equals(array(now,np[i].attributes.POSITION)),'Terrain vertex moved');
 if(p.indices!==undefined)assert(array(old,p.indices).equals(array(now,np[i].indices)),'Terrain topology changed');});
 assert.equal(n.material,'Alpine Blumenwiese – vollständig ersetzte Bodenvegetation');
}
const used=new Set(now.g.meshes.flatMap(m=>m.primitives.map(p=>p.material))),newMat=now.g.materials.find(m=>/Alpine Blumenwiese/.test(m.name));
assert.deepEqual((newMat.pbrMetallicRoughness.baseColorFactor||[1,1,1,1]),[1,1,1,1]);
const oldMat=old.g.materials.find(m=>/Alpine Blumenwiese/.test(m.name));
assert(!newMat.pbrMetallicRoughness.baseColorTexture,'Printed ground flowers remain');
for(const r of newGround)for(const p of primitives(now,r))assert(p.attributes.COLOR_0!==undefined,'Meadow vertex colors missing');
assert(!oldMat.pbrMetallicRoughness.baseColorTexture,'Baseline should be the volumetric v65 meadow');
assert(![...used].some(i=>now.g.materials[i].name==='meadow'),'Old meadow material remains');
const plants=after.filter(botany);assert(plants.length>5000,'Not enough 3D botany');
const meshes=new Set(plants.map(r=>now.g.nodes[r.nodeIndex].mesh));assert.equal(meshes.size,26,'Near and medium solid botany for all thirteen forms expected');
const species=new Set(plants.map(r=>r.extras?.species));assert.equal(species.size,13);
assert(plants.every(r=>r.extras?.solidGeometry),'Non-solid botany present');
// The original six flowers and grass retain their exact botanical geometry.
for(const r of Array.from(new Map(before.filter(botany).map(r=>[r.extras.species+':'+r.extras.botanyLOD,r])).values())){
 const match=plants.find(p=>p.extras.species===r.extras.species&&p.extras.botanyLOD===r.extras.botanyLOD);assert(match,'Missing established botanical form');
 const op=primitives(old,r),np=primitives(now,match);
 for(let j=0;j<op.length;j++){for(const key of ['POSITION','NORMAL','COLOR_0'])assert(array(old,op[j].attributes[key]).equals(array(now,np[j].attributes[key])),'Established meadow plant shape changed');assert(array(old,op[j].indices).equals(array(now,np[j].indices)));}
}
const reportNode=now.g.nodes.find(n=>n.extras?.alpineMeadows);assert(reportNode);const zones=reportNode.extras.zones;
for(const name of ['Hotel','Dorf','Seeufer','Offene Landschaft'])assert(zones[name]?.sites>100,'Missing zone '+name);
assert(zones.Hotel.minHeight<zones.Dorf.minHeight&&zones.Dorf.maxHeight<zones['Offene Landschaft'].maxHeight);
const report={version:66,groundMeshes:newGround.length,terrainVerticesAndTopologyUnchanged:true,oldTextureRemoved:true,oldGrassInstancesRemoved:before.filter(grass).length,protectedPhysicalComponentsUnchanged:oldProtected.length,newBotanicalInstances:plants.length,previousBotanicalInstances:before.filter(botany).length,printedGroundFlowersRemoved:true,solidVegetation:true,originalBotanicalShapesRetained:true,flowerSpecies:12,coverage:reportNode.extras.coverage,zones,browserVerification:'unavailable in managed environment'};
fs.writeFileSync('alpine-meadow-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
