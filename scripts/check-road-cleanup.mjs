import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {T} from '../dist/core.js';
import {FORECOURT,ROAD_BOUNDS,roadOverlapsBox} from '../dist/forecourt.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('dist/assets/Lumina_Leaf_Gesamtszene.glb'),old=read(process.argv[2]);
function array(m,i){const a=m.g.accessors[i],v=m.g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],stride=v.byteStride||n*size,offset=(v.byteOffset||0)+(a.byteOffset||0),out=Buffer.alloc(a.count*n*size);for(let j=0;j<a.count;j++)m.bin.copy(out,j*n*size,offset+j*stride,offset+j*stride+n*size);return out;}
function imageHash(m,texture){if(!texture)return null;const i=m.g.images[m.g.textures[texture.index].source],v=m.g.bufferViews[i.bufferView];return crypto.createHash('sha256').update(m.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).digest('hex');}
function canonical(m,v){if(!v||typeof v!=='object')return v;if(Array.isArray(v))return v.map(x=>canonical(m,x));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='index'?imageHash(m,v):canonical(m,x)]));}


const vegetationNames=new Set(['Fotorealistische Tannensilhouette im entfernten Wald','Fototextur Tannennadeln und Schnee','trunk','pine','pine2','leaf','leaf2','grassBlade','Fototextur Blätter und Blüten','flowerRed','flowerWhite']);
function rows(m){
 const out=[];for(const n of m.g.nodes){if(n.mesh===undefined)continue;const mesh=m.g.meshes[n.mesh],attrs=n.extensions?.EXT_mesh_gpu_instancing?.attributes,count=attrs?m.g.accessors[Object.values(attrs)[0]].count:1,transforms=attrs?Object.fromEntries(Object.entries(attrs).map(([key,i])=>[key,array(m,i)])):null;
 const gh=crypto.createHash('sha256');for(const p of mesh.primitives){for(const [key,i] of Object.entries(p.attributes).sort())gh.update(key).update(array(m,i));if(p.indices!==undefined)gh.update(array(m,p.indices));gh.update(JSON.stringify(canonical(m,m.g.materials[p.material])));}const geometry=gh.digest('hex'),material=m.g.materials[mesh.primitives[0].material].name;
 for(let j=0;j<count;j++){
  const vec=(key,width,fallback)=>transforms?.[key]?Array.from({length:width},(_,i)=>transforms[key].readFloatLE((j*width+i)*4)):fallback;
  const t=vec('TRANSLATION',3,n.translation||[0,0,0]),q=vec('ROTATION',4,n.rotation||[0,0,0,1]),scale=vec('SCALE',3,n.scale||[1,1,1]);
  const matrix=new T.Matrix4().compose(new T.Vector3(...t),new T.Quaternion(...q),new T.Vector3(...scale)),a=m.g.accessors[mesh.primitives[0].attributes.POSITION],box=new T.Box3(new T.Vector3(...a.min),new T.Vector3(...a.max)).applyMatrix4(matrix);
  const h=crypto.createHash('sha256').update(geometry);if(attrs)for(const [key,b] of Object.entries(transforms).sort(([a],[b])=>a.localeCompare(b))){const size=b.length/count;h.update(key).update(b.subarray(j*size,(j+1)*size));}else h.update(JSON.stringify({name:n.name,translation:n.translation,rotation:n.rotation,scale:n.scale,matrix:n.matrix,extras:n.extras}));
  out.push({hash:h.digest('hex'),name:n.name,material,t,scale,box,instanced:!!attrs,geometry});
 }
 }return out;
}
const before=rows(old),after=rows(now),centerKey=r=>r.t[0].toFixed(5)+','+r.t[2].toFixed(5);
const removedCenters=new Set(before.filter(r=>r.material==='Fotorealistische Tannensilhouette im entfernten Wald'&&roadOverlapsBox(r.box)).map(centerKey));
const dashed=(r,z)=>r.instanced&&r.material==='Weiße Straßenmarkierung'&&Math.abs(r.t[2]-z)<1e-5&&Math.abs(r.scale[0]-3)<1e-5&&Math.abs(r.scale[2]-.12)<1e-5;
const removed=r=>(['Fotorealistische Tannensilhouette im entfernten Wald','trunk'].includes(r.material)&&removedCenters.has(centerKey(r)))||(vegetationNames.has(r.material)&&roadOverlapsBox(r.box));
const sorted=rs=>rs.map(r=>r.hash).sort();assert.deepEqual(sorted(after.filter(r=>!dashed(r,FORECOURT.laneDividerZ))),sorted(before.filter(r=>!dashed(r,36)&&!removed(r))),'Only the dashed line and complete trees intruding onto the road may change');
const line=after.filter(r=>dashed(r,FORECOURT.laneDividerZ)).sort((a,b)=>a.t[0]-b.t[0]);assert.equal(line.length,21);for(let i=0;i<line.length;i++){assert(Math.abs(line[i].t[2]-(ROAD_BOUNDS.minZ+ROAD_BOUNDS.maxZ)/2)<1e-5);assert(Math.abs((line[i].t[2]-ROAD_BOUNDS.minZ)-(ROAD_BOUNDS.maxZ-line[i].t[2]))<1e-5);if(i)assert(Math.abs(line[i].t[0]-line[i-1].t[0]-6)<1e-5);assert(Math.abs(line[i].scale[0]-3)<1e-5);}
const obstacles=after.filter(r=>vegetationNames.has(r.material)&&roadOverlapsBox(r.box));assert.equal(obstacles.length,0,'Vegetation in road: '+JSON.stringify(obstacles.map(r=>({name:r.name,material:r.material,t:r.t,box:r.box}))));
const groupSignature=n=>JSON.stringify({name:n.name,translation:n.translation,rotation:n.rotation,scale:n.scale,matrix:n.matrix,extras:n.extras,camera:n.camera,light:n.extensions?.KHR_lights_punctual});assert.deepEqual(now.g.nodes.filter(n=>n.mesh===undefined).map(groupSignature).sort(),old.g.nodes.filter(n=>n.mesh===undefined).map(groupSignature).sort(),'All groups, car position, cameras and light transforms are preserved');assert.deepEqual(now.g.extensions.KHR_lights_punctual,old.g.extensions.KHR_lights_punctual);
console.log(JSON.stringify({removedTrees:removedCenters.size,removedVegetationParts:before.filter(removed).length,unchangedMeshesAndInstances:after.length-line.length,dashes:line.length,lineZ:FORECOURT.laneDividerZ,distanceToEitherRoadEdge:FORECOURT.laneDividerZ-ROAD_BOUNDS.minZ,dashLength:3,dashSpacing:6,vegetationObstaclesOnRoad:obstacles.length,allGroupsAndLightsUnchanged:true}));
