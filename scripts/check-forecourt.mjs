import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {T} from '../dist/core.js';
import {FORECOURT} from '../dist/forecourt.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('dist/assets/Lumina_Leaf_Gesamtszene.glb'),old=read(process.argv[2]);
function array(m,i){const a=m.g.accessors[i],v=m.g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],stride=v.byteStride||n*size,offset=(v.byteOffset||0)+(a.byteOffset||0),out=Buffer.alloc(a.count*n*size);for(let j=0;j<a.count;j++)m.bin.copy(out,j*n*size,offset+j*stride,offset+j*stride+n*size);return out;}
function imageHash(m,texture){if(!texture)return null;const i=m.g.images[m.g.textures[texture.index].source],v=m.g.bufferViews[i.bufferView];return crypto.createHash('sha256').update(m.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).digest('hex');}
function canonical(m,v){if(!v||typeof v!=='object')return v;if(Array.isArray(v))return v.map(x=>canonical(m,x));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='index'?imageHash(m,v):canonical(m,x)]));}

const signatureLabels=new Map();
function protectedSignatures(m){
 const hashes=[],meshHashes=new Map();
 for(const n of m.g.nodes){
  if(n.mesh===undefined||n.extras?.garageApproach)continue;
  const mesh=m.g.meshes[n.mesh],attrs=n.extensions?.EXT_mesh_gpu_instancing?.attributes;
  const transforms=attrs?Object.fromEntries(Object.entries(attrs).map(([key,i])=>[key,array(m,i)])):null;
  const count=attrs?m.g.accessors[Object.values(attrs)[0]].count:1;
  for(let j=0;j<count;j++){
   const t=transforms?.TRANSLATION,center=t?[t.readFloatLE(j*12),t.readFloatLE(j*12+4),t.readFloatLE(j*12+8)]:n.translation;
   const material=m.g.materials[mesh.primitives[0].material];
   const originalRoad=attrs&&((material.name==='cobbles'&&Math.abs(center[2]-44)<.001)||(material.name==='ivory'&&(Math.abs(center[2]-27.8)<.001||Math.abs(center[2]-60.2)<.001))||(material.name==='stone'&&Math.abs(center[2]-27.8)<.001));
   const drivewayGuide=attrs&&material.name==='ivory'&&center[0]<0&&center[2]>24&&center[2]<39&&center[1]<.2;if(originalRoad||drivewayGuide)continue;
   let geometryHash=meshHashes.get(n.mesh);if(!geometryHash){const base=crypto.createHash('sha256');for(const p of mesh.primitives){for(const [key,i] of Object.entries(p.attributes).sort())base.update(key).update(array(m,i));if(p.indices!==undefined)base.update(array(m,p.indices));base.update(JSON.stringify(canonical(m,m.g.materials[p.material])));}geometryHash=base.digest('hex');meshHashes.set(n.mesh,geometryHash);}
   const h=crypto.createHash('sha256').update(geometryHash);
   if(attrs){for(const [key,i] of Object.entries(attrs).sort()){const b=transforms[key],size=b.length/count;h.update(key).update(b.subarray(j*size,(j+1)*size));}}
   else h.update(JSON.stringify({name:n.name,translation:n.translation,rotation:n.rotation,scale:n.scale,matrix:n.matrix,extras:n.extras}));
   const key=h.digest('hex');hashes.push(key);signatureLabels.set(key,{name:n.name,material:material.name,center});
  }
 }
 return hashes;
}
const oldSignatures=protectedSignatures(old),newCounts=new Map();for(const h of protectedSignatures(now))newCounts.set(h,(newCounts.get(h)||0)+1);
for(const h of oldSignatures){assert(newCounts.get(h)>0,'Unexpected change: '+JSON.stringify(signatureLabels.get(h)));newCounts.set(h,newCounts.get(h)-1);}
const groupSignature=n=>JSON.stringify({name:n.name,translation:n.translation,rotation:n.rotation,scale:n.scale,matrix:n.matrix,extras:n.extras,camera:n.camera,light:n.extensions?.KHR_lights_punctual});
const groupCounts=new Map();for(const n of now.g.nodes.filter(n=>n.mesh===undefined)){const key=groupSignature(n);groupCounts.set(key,(groupCounts.get(key)||0)+1);}for(const n of old.g.nodes.filter(n=>n.mesh===undefined&&n.name!=='Schwarze Lumina Leaf Stretchlimousine')){const key=groupSignature(n);assert(groupCounts.get(key)>0,'Existing group, camera or light transform unchanged: '+n.name);groupCounts.set(key,groupCounts.get(key)-1);}
assert.deepEqual(now.g.extensions.KHR_lights_punctual,old.g.extensions.KHR_lights_punctual,'Existing lighting preserved');
for(const n of old.g.nodes.filter(n=>n.camera!==undefined&&n.name!=='Filmische Hotelansicht'))assert.deepEqual(now.g.nodes.find(q=>q.name===n.name),n,'Exported camera unchanged');
const car=now.g.nodes.find(n=>n.name==='Schwarze Lumina Leaf Stretchlimousine');assert.deepEqual(car.translation,FORECOURT.carPosition);assert(!car.rotation,'Car parallel to straight curb');
const body=now.g.nodes.find(n=>n.extras?.unprintedBlackBody),p=now.g.meshes[body.mesh].primitives[0],position=array(now,p.attributes.POSITION),count=position.length/12;
let zmin=Infinity;for(let i=0;i<count;i++)zmin=Math.min(zmin,position.readFloatLE(i*12+8)+car.translation[2]);const gap=zmin-FORECOURT.curbFaceZ;assert(gap>=.18&&gap<=.26,'Body is within 18–26 cm of the curb');
const bay=now.g.nodes.find(n=>n.extras?.vipDropOff).extras.bounds;assert.deepEqual(bay,FORECOURT.bay);
const tires=now.g.nodes.filter(n=>n.extras?.roadTire);assert.equal(tires.length,4);for(const n of tires){const p=now.g.meshes[n.mesh].primitives[0],a=now.g.accessors[p.attributes.POSITION];assert(Math.abs(a.min[1]+n.translation[1]+car.translation[1]-FORECOURT.roadY)<1e-5,'All four tires contact the new road');assert(n.translation[2]+car.translation[2]-.26>FORECOURT.curbFaceZ,'Road tires do not penetrate curb');}
assert(now.g.nodes.some(n=>n.extras?.hotelRoad&&n.extras.lanes===2));assert(now.g.nodes.some(n=>n.extras?.entranceCurbRamp));
const asphalt=now.g.materials.find(m=>m.name==='Feinkörniger Asphalt der Hotelvorfahrt');assert(asphalt.pbrMetallicRoughness.roughnessFactor>.85);assert(asphalt.pbrMetallicRoughness.baseColorTexture);assert(!asphalt.extensions?.KHR_materials_unlit);
const paints=now.g.materials.filter(m=>/Weiße Straßenmarkierung|VIP Bodenmarkierung/.test(m.name));assert.equal(paints.length,2);for(const m of paints)assert(!m.emissiveFactor||m.emissiveFactor.every(v=>v===0),'Road paint is not emissive');
console.log(JSON.stringify({protectedMeshesAndInstances:oldSignatures.length,unchangedHotelLandscapeAndCarDetails:true,carBodyCurbGapMeters:gap,roadTiresInContact:4,twoTrafficLanes:true,markedVipBay:true,curbRamp:true,allEveningLightsPreserved:true}));
