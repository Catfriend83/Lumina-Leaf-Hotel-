import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {T} from '../dist/core.js';
import {VILLAGE,ROADS,WALKS,MAIN_ROAD,PROMENADE,SQUARE_LINK,BUILDINGS,buildingPoint,lakeContains,constructionInfluence,closestRoute} from '../dist/village-layout.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('dist/assets/Lumina_Leaf_Gesamtszene.glb'),old=read(process.argv[2]);
function array(m,i){const a=m.g.accessors[i],v=m.g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],stride=v.byteStride||n*size,offset=(v.byteOffset||0)+(a.byteOffset||0),out=Buffer.alloc(a.count*n*size);for(let j=0;j<a.count;j++)m.bin.copy(out,j*n*size,offset+j*stride,offset+j*stride+n*size);return out;}
function imageHash(m,texture){if(!texture)return null;const i=m.g.images[m.g.textures[texture.index].source],v=m.g.bufferViews[i.bufferView];return crypto.createHash('sha256').update(m.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).digest('hex');}
function canonical(m,v){if(!v||typeof v!=='object')return v;if(Array.isArray(v))return v.map(x=>canonical(m,x));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='index'?imageHash(m,v):canonical(m,x)]));}


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
  out.push({hash:h.digest('hex'),name:n.name,material,t:new T.Vector3().setFromMatrixPosition(matrix).toArray(),scale,box,matrix,extras:n.extras,nodeIndex,poolMember:(()=>{let i=nodeIndex;while(parents.has(i)){i=parents.get(i);if(m.g.nodes[i].name==='Poolterrasse mit linker Doppelgarage')return true;}return false;})(),instanced:!!attrs,geometry});
 }
 }return out;
}

console.log("Reading exported village geometry");
const before=rows(old),after=rows(now),nodes=now.g.nodes;console.log("Comparing",before.length,"original parts",after.length,"current parts");
const keyed=new Map(),key=r=>r.geometry+'|'+(r.instanced?'instance':r.name);
for(const r of after){const k=key(r);if(!keyed.has(k))keyed.set(k,[]);keyed.get(k).push(r);}
const transformKey=r=>key(r)+'|'+r.matrix.elements.map(v=>Math.round(v*10000)).join(',');const sameTransforms=new Set(after.map(transformKey));
const has=r=>sameTransforms.has(transformKey(r));
const oldVillageMaterials=new Set(['wood','villageRoof','villageWindow','villagePlaster','black','velvet','gold','ivory','stoneDark']);
let preserved=0,replacedVillageParts=0,localVegetationChanges=0,localShoreStoneHeightsAdjusted=0;const unexpected=[];
for(const r of before){
 if(r.extras?.alpineTerrain||r.name==='Fein modellierte Wiesen und natürliche Uferübergänge')continue;
 if(has(r)){preserved++;continue;}
 const [x,,z]=r.t;
 if(oldVillageMaterials.has(r.material)&&x>-105&&x<-10&&z>-129&&z<-83){replacedVillageParts++;continue;}
 if(vegetationNames.has(r.material)&&constructionInfluence(x,z,22)){localVegetationChanges++;continue;}
 if(r.material==='cliff'&&constructionInfluence(x,z)&&keyed.get(key(r))?.some(n=>Math.abs(n.t[0]-x)<.00005&&Math.abs(n.t[2]-z)<.00005&&n.scale.every((v,i)=>Math.abs(v-r.scale[i])<.00005))){localShoreStoneHeightsAdjusted++;continue;}
 unexpected.push({name:r.name,material:r.material,t:r.t});
}
console.log("Preservation checked",unexpected.length,"unexpected changes");
if(unexpected.length)fs.writeFileSync('village-unexpected.json',JSON.stringify(unexpected,null,2));assert.deepEqual(unexpected,[],'Unrelated model elements changed');
// Distant terrain attributes remain byte-identical, independent of material re-bucketing.
const terrainMap=model=>{const map=new Map();for(const n of model.g.nodes.filter(n=>n.extras?.alpineTerrain||n.name==='Fein modellierte Wiesen und natürliche Uferübergänge'))for(const p of model.g.meshes[n.mesh].primitives){const attrs=Object.fromEntries(Object.entries(p.attributes).map(([k,i])=>[k,array(model,i)])),a=model.g.accessors[p.attributes.POSITION];for(let i=0;i<a.count;i++){const x=attrs.POSITION.readFloatLE(i*12),z=attrs.POSITION.readFloatLE(i*12+8);if(constructionInfluence(x,z,24))continue;const h=crypto.createHash('sha256');for(const [k,b] of Object.entries(attrs).sort(([a],[b])=>a.localeCompare(b))){const width=b.length/a.count;h.update(k).update(b.subarray(i*width,(i+1)*width));}map.set(n.name+'|'+x+','+z,h.digest('hex'));}}return map;};
const bt=terrainMap(old),nt=terrainMap(now);for(const [k,h] of bt)assert.equal(nt.get(k),h,'Distant terrain changed: '+k);
const find=predicate=>nodes.filter(predicate);
assert.equal(find(n=>n.extras?.alpineVillage).length,1);assert.equal(find(n=>n.extras?.villageBuilding).length,12);assert.equal(find(n=>n.extras?.villageBuilding&&['house','pension'].includes(n.extras.kind)).length,10);assert.equal(find(n=>n.extras?.villageBuilding&&n.extras.kind==='chapel').length,1);assert.equal(find(n=>n.extras?.villageBuilding&&n.extras.kind==='inn').length,1);
for(const marker of ['villageSquare','villageFountain','villageInnTerrace','villageEntrance','villageTurningHead'])assert.equal(find(n=>n.extras?.[marker]).length,1);
assert.equal(find(n=>n.extras?.villageBuildingAccess).length,12);assert.equal(find(n=>n.name==='Alpendorf Chalet').length,7);assert.equal(find(n=>n.name==='Kirche am See').length,0);
for(const marker of ['independentSpa','resortPool','fitnessStudio','straightSpaLink'])assert.equal(find(n=>n.extras?.[marker]).length,1);
assert.equal(find(n=>n.extras?.watercraft).length,8);
for(const n of old.g.nodes.filter(n=>n.name==='Spiegelnder Bergsee'||n.extras?.spaShoreBank||n.extras?.spaShoreLawn))assert(has(before.find(r=>r.nodeIndex===old.g.nodes.indexOf(n))),'Lake or Spa shore changed');
assert.deepEqual(now.g.extensions.KHR_lights_punctual,old.g.extensions.KHR_lights_punctual,'Existing lights changed');
for(const c of old.g.cameras){assert(now.g.cameras.some(n=>JSON.stringify(n)===JSON.stringify(c)),'Existing camera changed');}
assert.deepEqual([MAIN_ROAD.rows[0].x,MAIN_ROAD.rows[0].y,MAIN_ROAD.rows[0].z],VILLAGE.roadJoin);
const clip=(pts,axis,edge,sign)=>{const out=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],da=(a[axis]-edge)*sign,db=(b[axis]-edge)*sign;if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return out;};
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
const buildingInverse=b=>new T.Matrix4().compose(new T.Vector3(b.x,0,b.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),b.rot),new T.Vector3(1,1,1)).invert();
const trianglePoints=r=>{const p=now.g.meshes[nodes[r.nodeIndex].mesh].primitives[0],pb=array(now,p.attributes.POSITION),ib=p.indices===undefined?null:array(now,p.indices),index=ib?Array.from(new ({5123:Uint16Array,5125:Uint32Array,5121:Uint8Array}[now.g.accessors[p.indices].componentType])(ib.buffer,ib.byteOffset,now.g.accessors[p.indices].count)):Array.from({length:now.g.accessors[p.attributes.POSITION].count},(_,i)=>i);return {index,points:Array.from({length:now.g.accessors[p.attributes.POSITION].count},(_,i)=>new T.Vector3(pb.readFloatLE(i*12),pb.readFloatLE(i*12+4),pb.readFloatLE(i*12+8)).applyMatrix4(r.matrix))};};
console.log('Checking street footprint and gradients');
for(const r of after.filter(r=>r.extras?.villageRoute&&ROADS.some(p=>p.id===r.extras?.routeId)||r.extras?.villageTurningHead)){const {index,points}=trianglePoints(r);for(const p of points)assert(!lakeContains(p.x,p.z),'Road enters lake');for(const b of BUILDINGS){const inv=buildingInverse(b);for(let j=0;j<index.length;j+=3){let poly=index.slice(j,j+3).map(i=>{const v=points[i].clone().applyMatrix4(inv);return[v.x,v.z];});for(const [axis,edge,sign]of[[0,-b.w/2-.15,1],[0,b.w/2+.15,-1],[1,-b.d/2-.15,1],[1,b.d/2+.15,-1]])poly=clip(poly,axis,edge,sign);assert(poly.length<3||area(poly)<1e-6,'Road intersects '+b.id);}}}
const grades={};for(const path of [...ROADS,...WALKS]){let max=0;for(let i=1;i<path.rows.length;i++){const a=path.rows[i-1],b=path.rows[i];max=Math.max(max,Math.abs(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z));}assert(max<(ROADS.includes(path)?.06:.12),'Excessive route grade: '+path.id);grades[path.id]=max;for(const r of path.rows)for(const side of [-.5,.5])assert(!lakeContains(r.x+r.nx*r.width*side,r.z+r.nz*r.width*side),'Path enters lake: '+path.id);}
for(const n of find(n=>n.extras?.villageBuildingAccess)){const end=n.extras.points.at(-1),nearest=closestRoute(end[0],end[1],[...ROADS,SQUARE_LINK],5);assert(nearest&&nearest.distance<nearest.width/2+1.2,'Disconnected building '+n.extras.buildingId);}
const e=SQUARE_LINK.rows.at(-1),link=closestRoute(e.x,e.z,[PROMENADE],5);assert(link.distance<.2&&Math.abs(link.y-e.y)<.03,'Promenade link not joined');
console.log("Checking terrain support");const terrain=[];for(const r of after.filter(r=>r.extras?.alpineTerrain||r.name==='Fein modellierte Wiesen und natürliche Uferübergänge'||r.extras?.villageGrading)){const {index,points}=trianglePoints(r),p=[];for(let i=0;i<index.length;i+=3){const tri=index.slice(i,i+3).map(j=>points[j]);if(!tri.some(v=>v.x>-240&&v.x<-45&&v.z>-215&&v.z<65))continue;for(const v of tri)p.push(v.x,v.y,v.z);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.updateMatrixWorld();terrain.push(m);}
const ray=new T.Raycaster(),blocked=[];let minimumTerrainGap=Infinity,terrainSamples=0;
for(const path of [...ROADS,...WALKS])for(let i=0;i<path.rows.length;i+=3){const r=path.rows[i];for(const side of [-1,0,1]){const x=r.x+r.nx*side*(r.width/2-.10),z=r.z+r.nz*side*(r.width/2-.10),surface=r.y+(WALKS.includes(path)?.022:0);ray.set(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(terrain,false)[0];assert(hit,'Road has no terrain support');const gap=surface-hit.point.y;minimumTerrainGap=Math.min(minimumTerrainGap,gap);terrainSamples++;if(terrainSamples%150===0)console.log("Ground checks",terrainSamples);if(gap<-.012)blocked.push({path:path.id,x,z,surface,terrain:hit.point.y,gap});}}
if(blocked.length)fs.writeFileSync('village-blocked.json',JSON.stringify(blocked,null,2));assert.deepEqual(blocked,[],'Terrain obscures roads/walks');
const report={version:37,dwellings:10,chapels:1,inns:1,accesses:12,roadLengths:Object.fromEntries(ROADS.map(p=>[p.id,p.length])),walkLengths:Object.fromEntries(WALKS.map(p=>[p.id,p.length])),maxGrades:grades,terrainSamples,minimumTerrainGap,preserved,replacedVillageParts,localVegetationChanges,localShoreStoneHeightsAdjusted,preservedDistantTerrainVertices:bt.size};fs.writeFileSync('village-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
