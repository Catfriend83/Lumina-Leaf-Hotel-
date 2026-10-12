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




const isLamp=r=>['frame','gold','warm','Lichtschein'].includes(r.material)&&[[-31.4,30],[28.6,30]].some(([x,z])=>Math.hypot(r.t[0]-x,r.t[2]-z)<.27)&&r.box.min.y>-.4&&r.box.max.y<2.5;
const isOldCurb=r=>r.extras?.gardenPathEdge&&r.extras.side===-1||r.extras?.gardenBedEdge&&r.extras.side===1||r.instanced&&r.material==='ivory'&&Math.abs(r.t[0]-36.4)<1e-4&&Math.abs(r.t[2]-28.25)<1e-4&&Math.abs(r.scale[0]-60.2)<1e-4;
const unmatched=before.filter(r=>!has(r));for(const r of unmatched)assert(isOldCurb(r)||isLamp(r),'Unrequested element changed: '+JSON.stringify({name:r.name,material:r.material,t:r.t,scale:r.scale,extras:r.extras}));
const removed=unmatched.filter(isLamp);assert.equal(removed.length,20,'Two entire lamp assemblies expected');assert.equal(unmatched.filter(isOldCurb).length,3);assert(!after.some(isLamp),'Lamp remnants remain');
const oldKeys=new Set(before.map(key)),added=after.filter(r=>!oldKeys.has(key(r)));assert.equal(added.length,1);assert(added[0].extras.gardenCurb);assert.equal(added[0].material,'ivory');
const curb=added[0],geo=decoded(now,curb),p=geo.attributes.position,ix=geo.index.array,edgeCounts=new Map(),directions=new Map(),neighbors=new Map();
for(let i=0;i<ix.length;i+=3){const [a,b,c]=[ix[i],ix[i+1],ix[i+2]],u=new T.Vector3().fromBufferAttribute(p,a),v=new T.Vector3().fromBufferAttribute(p,b),w=new T.Vector3().fromBufferAttribute(p,c);assert(v.sub(u).cross(w.sub(u)).length()>1e-9,'Zero-area curb triangle');for(const [s,t]of[[a,b],[b,c],[c,a]]){const k=[s,t].sort((a,b)=>a-b).join(',');edgeCounts.set(k,(edgeCounts.get(k)||0)+1);directions.set(k,(directions.get(k)||0)+(s<t?1:-1));if(!neighbors.has(s))neighbors.set(s,[]);neighbors.get(s).push(t);}}
assert([...edgeCounts.values()].every(c=>c===2),'Curb is not a closed manifold');assert([...directions.values()].every(c=>c===0),'Inconsistent face winding');const visited=new Set(),stack=[0];while(stack.length){const v=stack.pop();if(visited.has(v))continue;visited.add(v);stack.push(...(neighbors.get(v)||[]));}assert.equal(visited.size,p.count,'Curb has disconnected components');
// The unchanged VIP curb section is now joined to the bed edge in one solid.
const mesh=meshFor(now,curb);for(let x=6.31;x<66.49;x+=.1){const h=hit([mesh],x,4,28.25);assert(h&&Math.abs(h.point.y-.12)<1e-5,'VIP curb height or continuity changed');}
const {bedCurbX,gardenCurbCenter}=await import('../dist/garden-curb.js');for(let z=0;z<26.75;z+=.2){const h=hit([mesh],gardenCurbCenter(z),4,z);assert(h,'Gap in bed-following curb');if(z>=15)assert(Math.abs(h.point.y-.12)<1e-5,'Front curb height changed');}
for(let z=-5;z<26;z+=.2){const expected=22.15+Math.max(0,7-(z-8))*.27-3.4;assert(Math.abs(gardenCurbCenter(z)-.15-expected)<.070,'Curb deviates from bed boundary beyond the 7 cm rounding envelope');}
for(const r of before.filter(r=>r.extras?.gardenPath||r.extras?.hotelSidewalk||r.extras?.hotelRoad||r.extras?.hotelDriveTerrain||r.extras?.vipParkingSign||r.extras?.garageStructure))assert(has(r),'Protected paving or architecture changed');
const report={version:63,curbWidthMeters:.30,frontCurbTopMeters:.12,oneClosedConnectedCurb:true,manifoldEdges:edgeCounts.size,bedContourFollowed:true,mergedWithVipCurb:true,removedLampPositions:[[-31.4,30],[28.6,30]],removedLampComponents:removed.length,otherComponentsPreserved:before.length-unmatched.length,flowerbedPathAsphaltTerrainLimousineAndArchitectureUnchanged:true,browserVerification:'unavailable in managed environment'};fs.writeFileSync('garden-curb-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
