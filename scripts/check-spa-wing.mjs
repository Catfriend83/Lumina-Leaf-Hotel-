import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {T} from '../dist/core.js';
import {FORECOURT,ROAD_BOUNDS,roadOverlapsBox} from '../dist/forecourt.js';
import {POOL_SHIFT_X,GARAGE_CROSSING} from '../dist/pool-connection.js';
import {cameraViews} from '../dist/scene.js';
import {SPA_WING,inSpaSite,inSpaGallery} from '../dist/spa-wing.js';
import {POOL_LAYOUT} from '../dist/luxury-pool.js';
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


const before=rows(old),after=rows(now),nodes=now.g.nodes;
const nodeMatrix=(model,index)=>{const parent=model.g.nodes.findIndex(n=>n.children?.includes(index)),n=model.g.nodes[index],m=new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));return parent<0?m:nodeMatrix(model,parent).multiply(m);};
const indexBy=(model,match)=>model.g.nodes.findIndex(match);
const oldPoolMatrix=nodeMatrix(old,indexBy(old,n=>n.extras?.resortPool)),poolIndex=indexBy(now,n=>n.extras?.resortPool),poolMatrix=nodeMatrix(now,poolIndex),relocation=poolMatrix.clone().multiply(oldPoolMatrix.clone().invert());
const spaIndex=indexBy(now,n=>n.extras?.independentSpa),garageIndex=indexBy(now,n=>n.extras?.garageStructure);
assert.equal(nodes.filter(n=>n.extras?.resortPool).length,1);assert(nodes[spaIndex].children.includes(poolIndex));assert(!nodes[garageIndex].children.includes(poolIndex));assert(!nodes.some(n=>n.extras?.poolConnection),'Obsolete garage-pool connection remains');
const corners=(matrix,bounds)=>new T.Box3().setFromPoints([[bounds.left,bounds.back],[bounds.left,bounds.front],[bounds.right,bounds.back],[bounds.right,bounds.front]].map(([x,z])=>new T.Vector3(x,0,z).applyMatrix4(matrix)));
const poolBox=corners(poolMatrix,POOL_LAYOUT.deck),spaBox=corners(nodeMatrix(now,spaIndex),SPA_WING.bounds),garageBox=corners(nodeMatrix(now,garageIndex),{left:-22.6,right:-3.55,back:-5.0,front:13.5});
assert(spaBox.min.x>garageBox.max.x+20,'Spa overlaps garage');assert(poolBox.max.z<ROAD_BOUNDS.minZ-3,'Pool terrace overlaps road');const gallery=nodes.find(n=>n.extras?.spaGallery);assert(gallery.extras.start[0]>garageBox.max.x+10);assert(gallery.extras.end[0]>garageBox.max.x+10);assert(gallery.extras.start[2]<ROAD_BOUNDS.minZ-10&&gallery.extras.end[2]<ROAD_BOUNDS.minZ-10);
for(const [property,count]of [['poolLounger',12],['embroideredHotelName',12],['poolWallFixture',12],['privacySection',5],['garageSignal',1],['garageStopLine',1],['continuousCarpet',1]])assert.equal(nodes.filter(n=>n.extras?.[property]).length,count,property);
assert.equal(after.filter(r=>r.material==='Smaragdgrünes gefaltetes Hotelhandtuch').length,36);
const quant=m=>m.elements.map(v=>Math.round(v*10000)/10000),key=(r,matrix=r.matrix)=>r.geometry+'|'+(r.instanced?'instance':r.name)+'|'+JSON.stringify(quant(matrix));
const poolMaterials=new Set(old.g.materials.filter(m=>/Pool|Handtuch|Resortgewebe|Liegenrahmen|Spa-Sichtschutz|Spa-Rahmen|Spa-Pflanz|Spa-Sichtschutz/.test(m.name||'')).map(m=>m.name));
const nowKeys=new Set(after.map(r=>key(r))),byGeometry=new Map();for(const r of after){const k=r.geometry+'|'+(r.instanced?'instance':r.name);if(!byGeometry.has(k))byGeometry.set(k,[]);byGeometry.get(k).push(r);}const hasTransform=(r,m)=>byGeometry.get(r.geometry+'|'+(r.instanced?'instance':r.name))?.some(next=>m.elements.every((v,i)=>Math.abs(v-next.matrix.elements[i])<.00003));let poolParts=0;for(const r of before.filter(r=>{const p=new T.Vector3(...r.t).applyMatrix4(oldPoolMatrix.clone().invert()),d=POOL_LAYOUT.deck;return poolMaterials.has(r.material)&&p.x>d.left-.7&&p.x<d.right+.7&&p.z>d.back-.7&&p.z<d.front+.7&&p.y>-1.34&&p.y<3;})){assert(hasTransform(r,relocation.clone().multiply(r.matrix)),'Pool detail not preserved: '+JSON.stringify({name:r.name,material:r.material,t:r.t}));poolParts++;}assert(poolParts>300);
const oldInverse=oldPoolMatrix.clone().invert();let preserved=0,moved=0,localChanges=0;const unexpected=[];
for(const r of before){if(nowKeys.has(key(r))){preserved++;continue;}if(hasTransform(r,relocation.clone().multiply(r.matrix))){moved++;continue;}const p=new T.Vector3(...r.t).applyMatrix4(oldInverse);
 const poolRegion=p.x>-9&&p.x<11&&p.z>-13&&p.z<18&&p.y>-.5&&p.y<4;
 const oldConnection=(r.t[0]>-3.7&&r.t[0]<0&&r.t[2]>-4&&r.t[2]<12.5&&r.t[1]<4&&['chrome','stone','cobbles'].includes(r.material))||r.extras?.poolConnection||/Natursteintreppe vom Pool|Glasbrüstungen am neuen Poolzugang|Nahtloser Terrassenanschluss/.test(r.name||'');
 const intersectsGallery=r.box.intersectsBox(new T.Box3(new T.Vector3(16,-1,4.1),new T.Vector3(37,4,8.3)));
 const spaArea=intersectsGallery||inSpaSite(r.t[0],r.t[2],8)||inSpaGallery(r.t[0],r.t[2],4);
 if(r.extras?.alpineTerrain||r.extras?.gardenPath||r.extras?.gardenPathEdge||r.extras?.gardenBedEdge||r.name==='Bepflanzte Böschung unter dem Gartenweg'||r.name==='Fein modellierte Wiesen und natürliche Uferübergänge'||oldConnection||poolRegion||spaArea){localChanges++;continue;}unexpected.push({name:r.name,material:r.material,t:r.t});
}
let unchangedDistantVertices=0,alteredSiteVertices=0;for(const n of old.g.nodes.filter(n=>n.extras?.alpineTerrain||n.name==='Fein modellierte Wiesen und natürliche Uferübergänge')){const next=nodes.find(x=>x.name===n.name),op=old.g.meshes[n.mesh].primitives[0],np=now.g.meshes[next.mesh].primitives[0],ob=array(old,op.attributes.POSITION),nb=array(now,np.attributes.POSITION);assert.equal(ob.length,nb.length);const attributes=Object.entries(op.attributes).map(([key,oi])=>({key,oldBytes:array(old,oi),newBytes:array(now,np.attributes[key]),components:{VEC2:2,VEC3:3,VEC4:4}[old.g.accessors[oi].type]}));for(let j=0;j<ob.length;j+=12){const x=ob.readFloatLE(j),z=ob.readFloatLE(j+8);assert.equal(nb.readFloatLE(j),x);assert.equal(nb.readFloatLE(j+8),z);if(ob.readFloatLE(j+4)!==nb.readFloatLE(j+4)){assert(inSpaSite(x,z,2.05),'Terrain changed outside Spa site');alteredSiteVertices++;}if(z< -100||x< -100){for(const {components,oldBytes,newBytes} of attributes){const offset=j/12*components*4;assert(oldBytes.subarray(offset,offset+components*4).equals(newBytes.subarray(offset,offset+components*4)),'Distant mountains changed');}unchangedDistantVertices++;}}}
assert.deepEqual(unexpected,[],'Unrequested changes outside Spa/old connection');
for(const n of old.g.nodes.filter(n=>n.extras?.garageLane||n.extras?.garageSignal||n.extras?.garageStopLine||n.extras?.continuousCarpet||n.name==='Schwarze Lumina Leaf Stretchlimousine')){const next=nodes.find(x=>x.name===n.name);for(const f of ['translation','rotation','scale','extras'])assert.deepEqual(next[f],n[f]);}
const bearing=nodes.find(n=>n.extras?.poolBearingPlate);assert.equal(bearing.extras.minimumRoomClearance,3.09);const poolFloorBottom=SPA_WING.floor+SPA_WING.poolRise-1.33,bearingTop=SPA_WING.floor+3.23+.14;assert(Math.abs(poolFloorBottom-bearingTop)<1e-6);
assert.equal(nodes.filter(n=>n.name==='Glastür der Spa-Passage').length,1);assert.equal(nodes.filter(n=>n.name==='Glastür des Treppenpavillons').length,1);
for(const oldLight of old.g.extensions.KHR_lights_punctual.lights)assert(now.g.extensions.KHR_lights_punctual.lights.some(n=>JSON.stringify(n)===JSON.stringify(oldLight)),'Existing light changed');
const report={version:33,poolOnIndependentSpa:true,spaGarageSeparationMeters:spaBox.min.x-garageBox.max.x,poolRoadClearanceMeters:ROAD_BOUNDS.minZ-poolBox.max.z,preservedParts:preserved,rigidlyRelocatedParts:moved,preservedPoolSpecificParts:poolParts,changedLocalSiteParts:localChanges,alteredSiteVertices,unchangedDistantVertices,loungers:12,embroideredTowels:12,foldedTowelLayers:36,poolWallLights:12,privacySections:5,garageLanes:2,poolBearingPlateContactsBasin:true,minimumSpaRoomClearanceMeters:3.09,existingLightsPreserved:true};fs.writeFileSync('spa-wing-report.json',JSON.stringify(report,null,2)+'\n');console.log(report);
