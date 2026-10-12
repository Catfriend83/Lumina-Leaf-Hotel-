import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {T} from '../dist/core.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb'),old=read('.sites-runtime/models/baseline-v88.glb');
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

const before=rows(old),after=rows(now),key=r=>r.geometry+'|'+(r.instanced?'instance':r.name)+'|'+r.matrix.elements.map(v=>Math.round(v*10000)).join(',');
const transform=n=>n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));
const tower=transform(old.g.nodes.find(n=>n.name==='Lumina Leaf Hotel und Außenanlage')),inv=tower.clone().invert();
function matcher(list){const keys=new Set(list.map(key)),near=new Map();for(const r of list){const k=r.geometry+'|'+r.name+'|'+r.t.map(v=>Math.round(v*100)).join(',');if(!near.has(k))near.set(k,[]);near.get(k).push(r);}return r=>keys.has(key(r))||(near.get(r.geometry+'|'+r.name+'|'+r.t.map(v=>Math.round(v*100)).join(','))||[]).some(a=>a.matrix.elements.every((v,i)=>Math.abs(v-r.matrix.elements[i])<1e-6));}
const retained=matcher(after),previous=matcher(before),missing=before.filter(r=>!retained(r)),added=after.filter(r=>!previous(r));
const lawnStations=[-18,-10,-2,6,14,22];
const lawnPart=r=>Math.abs(r.t[0]+31.4)<.50&&lawnStations.some(z=>Math.abs(r.t[2]-z)<.50)&&['frame','gold','warm','Lichtschein'].includes(r.material);
const trolleyNode=old.g.nodes.find(n=>n.extras?.luggageTrolley),court=transform(old.g.nodes.find(n=>n.name==='Eingangsvorplatz und gerader roter Teppich')),trolley=court.clone().multiply(transform(trolleyNode)),trolleyInv=trolley.clone().invert();
const trolleyPart=r=>{const p=new T.Vector3(...r.t).applyMatrix4(trolleyInv);return Math.abs(p.x)<.6&&Math.abs(p.z)<.66&&p.y>.04&&p.y<2.5&&['rubber','velvet','gold','wood','suit'].includes(r.material);};
const sideLighting=r=>{const p=new T.Vector3(...r.t).applyMatrix4(inv);return (p.x< -2.9||p.x>18.9)&&p.x> -4.5&&p.x<20.5&&p.z> -40.1&&p.z<5.7&&['gold','warm','greenLight','Lichtschein'].includes(r.material);};
const signPart=r=>r.extras?.hotelLettering&&r.extras.exterior||r.material==='Warm leuchtende fünf Außensterne';
const allowedOld=r=>lawnPart(r)||trolleyPart(r)||sideLighting(r)||signPart(r)||/^Bilddetails im Seitenfenster/.test(r.name||'');
const allowedNew=r=>/^Seitliche Fassadenleuchte/.test(r.material)||signPart(r)||/^Bilddetails im Seitenfenster/.test(r.name||'');
const unexpected=missing.filter(r=>!allowedOld(r)),unexpectedAdded=added.filter(r=>!allowedNew(r));
fs.writeFileSync('.sites-runtime/facade-unexpected.json',JSON.stringify({missing:unexpected.map(r=>({name:r.name,material:r.material,t:r.t})),added:unexpectedAdded.map(r=>({name:r.name,material:r.material,t:r.t}))},null,2));
assert.equal(unexpected.length,0,'Unrelated scene changes: '+JSON.stringify(unexpected.slice(0,8).map(r=>({material:r.material,t:r.t}))));assert.equal(unexpectedAdded.length,0,'Unexpected additions');
const lampParts=before.filter(lawnPart),trolleyParts=before.filter(trolleyPart);assert.equal(lampParts.length,60,'Expected six complete ten-part garden lanterns');assert.equal(trolleyParts.length,12,'Complete trolley geometry must be identified');
for(const r of [...lampParts,...trolleyParts])assert(!retained(r),'Removed object left a physical component');
assert.equal(now.g.nodes.filter(n=>n.extras?.luggageTrolley).length,0);
assert.equal(now.g.nodes.filter(n=>n.extras?.facadeFixture).length,145);assert.equal(now.g.nodes.filter(n=>n.extras?.room).length,40);assert.equal(now.g.nodes.filter(n=>n.extras?.receptionist).length,2);
const lightData=m=>m.g.nodes.filter(n=>n.name==='Dezentes grünes Fassadenlicht').map(n=>({n,light:m.g.extensions.KHR_lights_punctual.lights[n.extensions.KHR_lights_punctual.light]}));
const lightsOld=lightData(old),lightsNow=lightData(now);assert.equal(lightsNow.length,lightsOld.length);let reduced=0,unchanged=0;
for(let i=0;i<lightsOld.length;i++){const a=lightsOld[i],b=lightsNow[i];assert.deepEqual(b.n.translation,a.n.translation);if(b.n.extras?.sideFacadeLight){assert(Math.abs(b.light.intensity/a.light.intensity-.5)<1e-8);reduced++;}else{assert.deepEqual(b.light,a.light);unchanged++;}}
assert.equal(reduced,28);assert.equal(unchanged,13);
const sidePanel=now.g.materials.find(m=>m.name==='Seitliche Fassadenleuchte – greenLight'),oldPanel=old.g.materials.find(m=>m.name==='greenLight'&&m.emissiveFactor);
assert(sidePanel.pbrMetallicRoughness.roughnessFactor>=.95);const luminance=v=>v[0]*.2126+v[1]*.7152+v[2]*.0722;assert(luminance(sidePanel.emissiveFactor)<luminance(oldPanel.emissiveFactor)*.5);
const sideMetal=now.g.materials.find(m=>m.name==='Seitliche Fassadenleuchte – gold');assert(sideMetal.pbrMetallicRoughness.roughnessFactor>=.9);assert(sideMetal.pbrMetallicRoughness.metallicFactor<.3);
const stars=now.g.nodes.filter(n=>n.extras?.hotelStars);assert.equal(stars.length,2);stars.forEach(n=>assert.equal(n.extras.count,5));
const starParts=after.filter(r=>r.material==='Warm leuchtende fünf Außensterne');assert.equal(starParts.length,5);
const xs=starParts.map(r=>new T.Vector3(...r.t).applyMatrix4(inv).x).sort((a,b)=>a-b);for(let i=2;i<5;i++)assert(Math.abs((xs[i]-xs[i-1])-(xs[1]-xs[0]))<1e-5);
const exterior=now.g.nodes.find(n=>n.extras?.hotelLettering&&n.extras.exterior);assert.equal(exterior.extras.reference,5);
const report={version:89,baseVersion:88,removedLawnLamps:6,removedLampPhysicalComponents:lampParts.length,removedLuggageTrolleys:1,removedTrolleyPhysicalComponents:trolleyParts.length,sideWashIntensityReduction:.5,sideLightsReduced:reduced,frontAndRearLightsUnchanged:unchanged,facadeFixtures:145,guestRooms:40,stars:5,retainedPhysicalComponents:before.length-missing.length,unexpectedChanges:0,browserPBRVerified:false};
fs.writeFileSync('hotel-facade-refinement-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
