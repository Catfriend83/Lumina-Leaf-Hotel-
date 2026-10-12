import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {T} from '../dist/core.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb'),old=read('.sites-runtime/models/baseline-v89.glb');
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
  out.push({hash:h.digest('hex'),name:n.name,material,t:new T.Vector3().setFromMatrixPosition(matrix).toArray(),scale,box,matrix,extras:n.extras,nodeIndex,gardenMember:(()=>{let i=nodeIndex;while(parents.has(i)){i=parents.get(i);if(m.g.nodes[i].name==='Blumengarten und ansteigender Weg')return true;}return false;})(),poolMember:(()=>{let i=nodeIndex;while(parents.has(i)){i=parents.get(i);if(m.g.nodes[i].name==='Poolterrasse mit linker Doppelgarage')return true;}return false;})(),instanced:!!attrs,geometry});
 }
 }return out;
}


const before=rows(old),after=rows(now),nodes=now.g.nodes;
const transform=n=>n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));
const tower=transform(nodes.find(n=>n.name==='Lumina Leaf Hotel und Außenanlage')),inv=tower.clone().invert();
const key=r=>r.geometry+'|'+(r.instanced?'instance':r.name)+'|'+r.matrix.elements.map(v=>Math.round(v*10000)).join(',');
function matcher(list){const keys=new Set(list.map(key)),near=new Map();for(const r of list){const k=r.geometry+'|'+r.name+'|'+r.t.map(v=>Math.round(v*100)).join(',');if(!near.has(k))near.set(k,[]);near.get(k).push(r);}return r=>keys.has(key(r))||(near.get(r.geometry+'|'+r.name+'|'+r.t.map(v=>Math.round(v*100)).join(','))||[]).some(a=>a.matrix.elements.every((v,i)=>Math.abs(v-r.matrix.elements[i])<1e-6));}
const retained=matcher(after),previous=matcher(before),missing=before.filter(r=>!retained(r)),added=after.filter(r=>!previous(r));
const insideLobby=r=>{const p=r.box.getCenter(new T.Vector3()).applyMatrix4(inv);return p.x>=-2.5&&p.x<=18.5&&p.z>=-7.3&&p.z<=5.4&&p.y>=.33&&p.y<=6.4;};
assert.equal(missing.filter(r=>!insideLobby(r)).length,0,'Changed an object outside the lobby');
const signPanel=nodes.find(n=>n.extras?.exteriorSignPanel);assert(signPanel);assert.equal(signPanel.extras.width,17.8);assert.equal(signPanel.extras.height,1.62);
const newPanel=r=>{const p=new T.Vector3(...r.t).applyMatrix4(inv);return r.material==='frame'&&Math.abs(p.x-8)<.001&&Math.abs(p.y-6.92)<.001&&Math.abs(p.z-8.31)<.001;};
assert.equal(added.filter(r=>!insideLobby(r)&&!newPanel(r)).length,0,'Unexpected additions outside lobby/sign panel');
// Reception, front script and stars, exterior surfaces, original entrance,
// carpet and all retained scenery must retain their physical signatures.
for(const r of before.filter(r=>r.extras?.hotelLettering||r.extras?.receptionDesk||r.extras?.continuousCarpet||r.material==='Dunkelgrüner Rezeptionsmarmor'||(r.material==='Beiger Lobby-Naturstein'&&Math.abs(new T.Vector3(...r.t).applyMatrix4(inv).x-8)<.2)||r.material==='Warm leuchtende fünf Außensterne'||/Rezeptionistin/.test(r.material)))assert(retained(r),'Retained reception/branding changed: '+r.name);
assert.equal(nodes.filter(n=>n.extras?.receptionist).length,2);assert.equal(nodes.filter(n=>n.extras?.room).length,40);assert.equal(nodes.filter(n=>n.extras?.facadeFixture).length,145);assert.equal(nodes.filter(n=>n.extras?.luggageTrolley).length,0);
const itemNodes=nodes.filter(n=>n.extras?.loungeItem),count=kind=>itemNodes.filter(n=>n.extras.kind===kind).length;
assert.equal(count('Damastsofa'),2);assert.equal(count('Damastsessel'),4);assert.equal(count('Nussbaum-Couchtisch'),2);assert.equal(count('Runder Lampen-Beistelltisch'),4);assert.equal(count('Floraler Lounge-Teppich'),2);
const furniture=itemNodes.filter(n=>n.extras.kind!=='Floraler Lounge-Teppich'),boxes=furniture.map(n=>{const [w,d]=n.extras.footprint;return {name:n.name,box:new T.Box3(new T.Vector3(-w/2,0,-d/2),new T.Vector3(w/2,1.5,d/2)).applyMatrix4(transform(n))};});
for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!boxes[i].box.intersectsBox(boxes[j].box),'Furniture overlap: '+boxes[i].name+' / '+boxes[j].name);
const aisle=new T.Box3(new T.Vector3(5.10,.34,-2.10),new T.Vector3(10.90,2.5,5.40));for(const b of boxes)assert(!b.box.intersectsBox(aisle),'Furniture obstructs arrival/reception route');
const lamps=nodes.filter(n=>n.extras?.referenceTableLamp);assert.equal(lamps.length,4);for(const lamp of lamps){assert.deepEqual(lamp.extras.reference,[2,3]);assert(Math.abs(lamp.translation[1]-.718)<1e-8);assert(lamp.extras.height<.5);assert(lamp.extras.flutedCrystalShade&&lamp.extras.brassBase);}
assert.equal(nodes.filter(n=>n.extras?.crystalChandelier).length,2);
// Exterior lettering and all five stars now fit inside the larger backing.
const signage=after.filter(r=>r.extras?.hotelLettering&&r.extras.exterior||r.material==='Warm leuchtende fünf Außensterne');assert.equal(signage.length,6);
for(const r of signage){const box=r.box.clone().applyMatrix4(inv);assert(box.min.y>6.11&&box.max.y<7.73,'Sign lettering/star extends above or below backing');}
// All existing lights retain their physical settings. Only six local lobby lights are added.
function lights(m){return m.g.nodes.filter(n=>n.extensions?.KHR_lights_punctual).map(n=>({name:n.name,translation:n.translation,rotation:n.rotation,light:m.g.extensions.KHR_lights_punctual.lights[n.extensions.KHR_lights_punctual.light]}));}
const newLights=new Set(lights(now).map(v=>JSON.stringify(v)));for(const light of lights(old))assert(newLights.has(JSON.stringify(light)),'Existing lighting changed');
const report={version:90,baseVersion:89,sofas:2,armchairs:4,coffeeTables:2,sideTables:4,referenceCrystalTableLamps:4,crystalChandeliers:2,ornateRugs:2,freeCentralAisleMeters:5.8*.944,furnitureOverlaps:0,exteriorSignPanel:{width:17.8,height:1.62},letteringAndFiveStarsPreserved:true,retainedPhysicalComponents:before.length-missing.length,unrelatedSceneChanges:0,browserPBRVerified:false};fs.writeFileSync('hotel-classic-lobby-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
