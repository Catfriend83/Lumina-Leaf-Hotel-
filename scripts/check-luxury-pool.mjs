import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {T} from '../dist/core.js';
import {FORECOURT,ROAD_BOUNDS,roadOverlapsBox} from '../dist/forecourt.js';
import {POOL_SHIFT_X,GARAGE_CROSSING} from '../dist/pool-connection.js';
import {cameraViews} from '../dist/scene.js';
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

const before=rows(old),after=rows(now),key=r=>r.geometry+'|'+(r.instanced?'instance':r.name)+'|'+r.matrix.elements.map((v,i)=>v.toFixed(i>=12&&i<=14?3:5)).join(',');
const terrace=now.g.nodes.find(n=>n.name==='Poolterrasse mit linker Doppelgarage'),oldTerrace=old.g.nodes.find(n=>n.name===terrace.name);for(const field of ['translation','rotation','scale'])assert.deepEqual(terrace[field],oldTerrace[field]);
const poolWorld=new T.Matrix4().compose(new T.Vector3(...terrace.translation),new T.Quaternion(...terrace.rotation),new T.Vector3(...terrace.scale)),inverse=poolWorld.clone().invert();
const corridor=new T.Box3(new T.Vector3(-21.88,-.2,13.41),new T.Vector3(-4.27,1.9,16.15));
const poolPart=r=>{const p=new T.Vector3(...r.t).applyMatrix4(inverse);return r.poolMember||r.extras?.garageApproach||r.extras?.garageStripe||(p.x>=-23&&p.x<=-2.1&&p.y>=-.08&&p.y<=5.5&&p.z>=-6&&p.z<=16.4);};
const crossingPart=r=>r.name==='Gehweg am Hotel mit freier Garagenquerung'||r.instanced&&((r.material==='ivory'&&Math.abs(r.t[2]-28.25)<1e-4)||(r.material==='Entwässerung der Hotelvorfahrt'&&Math.abs(r.t[2]-28.47)<1e-4));
const vegetationPart=r=>vegetationNames.has(r.material)&&r.box.clone().applyMatrix4(inverse).intersectsBox(corridor);
const allowed=r=>poolPart(r)||crossingPart(r)||vegetationPart(r);
const protectedBefore=before.filter(r=>!allowed(r)),protectedAfter=after.filter(r=>!allowed(r)),remaining=new Map();for(const r of protectedAfter){const k=key(r);remaining.set(k,(remaining.get(k)||0)+1);}let unchanged=0;for(const r of protectedBefore){const k=key(r);assert(remaining.get(k)>0,'Unexpected changed part outside pool/garage: '+JSON.stringify({name:r.name,material:r.material,t:r.t}));remaining.set(k,remaining.get(k)-1);unchanged++;}assert([...remaining.values()].every(n=>n===0),'Unexpected added part outside the authorized zone');
const chairs=now.g.nodes.filter(n=>n.extras?.poolLounger);assert.equal(chairs.length,12);assert(chairs.every(n=>n.extras.towel&&n.extras.hotelName==='Lumina Leaf Hotel'));
assert.equal(now.g.nodes.filter(n=>n.extras?.embroideredHotelName==='Lumina Leaf Hotel').length,12);
assert.equal(after.filter(r=>r.material==='Smaragdgrünes gefaltetes Hotelhandtuch').length,36);
const water=now.g.nodes.find(n=>n.extras?.resortWater);assert.equal(water.extras.depthMeters,1.095);const poolGroup=now.g.nodes.find(n=>n.extras?.resortPool);assert.equal(poolGroup.extras.chairs,12);assert.equal(poolGroup.extras.depthMeters,1.15);
const cushionParts=after.filter(r=>r.material==='Dicke Polster aus hellem Resortgewebe');assert.equal(cushionParts.length,36);const poolOrigin=new T.Vector3(...poolGroup.translation).applyMatrix4(poolWorld);const metricInverse=new T.Matrix4().makeRotationY(-(-.077));metricInverse.setPosition(0,0,0);
for(const r of cushionParts){const point=new T.Vector3(...r.t).sub(poolOrigin).applyMatrix4(metricInverse);assert(point.z< -6.6||point.z>7.8,'Lounge furniture intrudes into pool circulation');}
const floorParts=now.g.nodes.filter(n=>n.extras?.garageAsphaltFloor);assert.equal(floorParts.length,2);for(const n of floorParts){const material=now.g.materials[now.g.meshes[n.mesh].primitives[0].material];assert.equal(material.name,'Feinkörniger Asphalt der Hotelvorfahrt');}
const stripes=now.g.nodes.filter(n=>n.extras?.garageStripe);assert.equal(stripes.length,3);
const vectors=(accessor)=>{const a=now.g.accessors[accessor],raw=array(now,accessor);return Array.from({length:a.count},(_,i)=>new T.Vector3(raw.readFloatLE(i*12),raw.readFloatLE(i*12+4),raw.readFloatLE(i*12+8)));};
for(const n of stripes){const prim=now.g.meshes[n.mesh].primitives[0],p=vectors(prim.attributes.POSITION);assert(Math.abs(p[0].x-p[1].x)<1e-6&&Math.abs(p[2].x-p[3].x)<1e-6,'Stripe bends');assert(Math.abs((p[3].x-p[0].x)*terrace.scale[0]-.12)<1e-5);for(const i of [1,2])assert(Math.abs(p[i].clone().applyMatrix4(poolWorld).z-28.4)<1e-5,'Stripe fails to meet road');}
const approach=now.g.nodes.find(n=>n.extras?.garageApproach);assert(approach.extras.straightGarageAccess);const points=vectors(now.g.meshes[approach.mesh].primitives[0].attributes.POSITION);assert.equal(points.length,4);for(const i of [0,1])assert(Math.abs(points[i].y-.024)<1e-6,'Asphalt threshold has a step');assert(Math.abs(points[0].x-points[2].x)<1e-6&&Math.abs(points[1].x-points[3].x)<1e-6);for(const i of [2,3]){const p=points[i].clone().applyMatrix4(poolWorld);assert(Math.abs(p.z-28.4)<1e-5&&Math.abs(p.y+.005)<1e-6);assert(p.x>GARAGE_CROSSING.minX&&p.x<GARAGE_CROSSING.maxX,'Curb closes straight access');}
assert(!after.some(r=>vegetationPart(r)),'Vegetation remains in garage access');
// The basin replaces the obstructing old ceiling locally; its lowest soffit is
// above 2.3 m in world units, measured from the garage asphalt.
const basinFloor=after.find(r=>r.material==='Feine türkisgraue Poolkeramik'&&r.box.getSize(new T.Vector3()).y<.19&&r.box.getSize(new T.Vector3()).x>9);assert(basinFloor);assert(basinFloor.box.min.y-.034>2.3,'Insufficient garage headroom under basin');
const newLights=now.g.extensions.KHR_lights_punctual.lights;
for(const light of old.g.extensions.KHR_lights_punctual.lights){if(light.intensity===18&&light.color?.[1]===1&&light.color?.[2]===1)continue;assert(newLights.some(n=>JSON.stringify(n)===JSON.stringify(light)),'Existing hotel light changed');}
const car=now.g.nodes.find(n=>n.name==='Schwarze Lumina Leaf Stretchlimousine'),oldCar=old.g.nodes.find(n=>n.name===car.name);for(const f of ['translation','rotation','scale','extras'])assert.deepEqual(car[f],oldCar[f]);
const oldCameras=old.g.nodes.filter(n=>n.camera!==undefined);for(const n of oldCameras){const current=now.g.nodes.find(m=>m.name===n.name);for(const f of ['translation','rotation'])assert.deepEqual(current[f],n[f]);}
console.log(JSON.stringify({protectedPartsUnchanged:unchanged,loungers:12,embroideredTowels:12,foldedLayers:36,straightAsphaltLanes:2,straightMarkings:3,roadConnectionFlush:true,curbCrossing:GARAGE_CROSSING,basinWaterDepthMeters:water.extras.depthMeters,garageHeadroomMeters:basinFloor.box.min.y-.034,limousineUnchanged:true,hotelLightsPreserved:true}));
