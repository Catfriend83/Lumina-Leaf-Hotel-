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


const oldTrees=old.g.nodes.filter(n=>n.extras?.plazaTree).map(n=>({x:n.translation[0],z:n.translation[2],y:n.translation[1],height:n.extras.height}));
const oldForestMaterials=new Set(['Fotorealistische Tannensilhouette im entfernten Wald','Fototextur Tannennadeln und Schnee','pine','pine2']);
const removedSites=Array.from({length:7},(_,i)=>({x:50+Math.sin(i*.9)*13,z:-50-i*24}));
let preserved=0,removedHouseParts=0;for(const r of before){
 const removedPart=!/Alpine Blumenwiese|^meadow$|Uferwiese/.test(r.material)&&removedSites.some(b=>Math.hypot(r.t[0]-b.x,r.t[2]-b.z)<7)&&!r.extras?.alpineBotany&&!/Alpiner Mischwald|Alpiner Waldboden/.test(r.material);
 if(removedPart&&!has(r)){removedHouseParts++;assert(!has(r),'Removed house part retained '+r.material);continue;}
 if(/Alpiner Mischwald|Alpiner Waldboden/.test(r.material)||r.extras?.newForestFloor)continue;
 const treePart=oldForestMaterials.has(r.material)||r.material==='trunk'||['leaf','leaf2'].includes(r.material)&&oldTrees.some(b=>Math.hypot(r.t[0]-b.x,r.t[2]-b.z)<2.8&&r.t[1]>=b.y-.2);
 if(treePart||r.extras?.alpineBotany)continue;
 assert(has(r),'Protected scene component changed: '+r.name+' '+r.material);preserved++;
}
for(const a of old.g.nodes.filter(n=>(n.extras?.villageBuilding&&!/^randhaus-/.test(n.extras.buildingId||''))||n.extras?.villageFountain||n.extras?.plazaBench||n.extras?.lakePathLamp)){const b=nodes.find(n=>n.name===a.name&&JSON.stringify(n.translation)===JSON.stringify(a.translation));assert(b,'Missing retained object '+a.name);for(const key of ['translation','rotation','scale','extras'])assert.deepEqual(b[key],a[key]);}
assert.equal(new Set(old.g.nodes.filter(n=>/^randhaus-/.test(n.extras?.buildingId||'')).map(n=>n.extras.buildingId)).size,7);assert(!nodes.some(n=>/^randhaus-/.test(n.extras?.buildingId||'')||n.extras?.outerHouseAccess),'Hotel rear building/access remains');assert(removedHouseParts>100);
const fresh=nodes.filter(n=>n.extras?.newForestTree);assert(fresh.length>2000);assert.equal(new Set(fresh.map(n=>n.extras.species)).size,5);assert(fresh.some(n=>n.extras.height<6));assert(fresh.some(n=>n.extras.height>20));assert(!now.g.materials.some(m=>oldForestMaterials.has(m.name)),'Old conifer geometry retained');
assert(nodes.some(n=>n.extras?.newForestFloor));
const report={version:75,trees:fresh.length,species:Object.fromEntries([...new Set(fresh.map(n=>n.extras.species))].map(s=>[s,fresh.filter(n=>n.extras.species===s).length])),protectedComponentsPreserved:preserved,mainVillageHotelPathsLakeAndTerrainPreserved:true,removedHotelRearHouses:7,removedHouseParts,oldConiferMaterialsAbsent:true,solidCrowns:true};fs.writeFileSync('forest-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
