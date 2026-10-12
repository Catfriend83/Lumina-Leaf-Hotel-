import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {T} from '../dist/core.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb'),old=read('.sites-runtime/models/baseline-v86.glb');
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
const before=rows(old),after=rows(now),nodes=now.g.nodes,key=r=>r.geometry+'|'+(r.instanced?'instance':r.name)+'|'+r.matrix.elements.map(v=>Math.round(v*10000)).join(','),keys=new Set(after.map(key));
const transform=n=>n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));
const towerNode=nodes.find(n=>n.name==='Lumina Leaf Hotel und Außenanlage'),tower=transform(towerNode),inv=tower.clone().invert();
assert.equal(towerNode.extras.hotelExpansion.baseVersion,86);assert.equal(towerNode.extras.hotelExpansion.addedStoreys,1);
assert.equal(nodes.filter(n=>n.extras?.doorman).length,0);assert.equal(nodes.filter(n=>n.extras?.receptionist).length,2);
assert.equal(nodes.filter(n=>/^Gästezimmer \d+$/.test(n.name||'')).length,40);
const oldStaff=old.g.nodes.filter(n=>n.extras?.receptionist),staff=nodes.filter(n=>n.extras?.receptionist);const staffShape=n=>Object.fromEntries(Object.entries(n).filter(([k])=>k!=='children'));assert.deepEqual(staff.map(staffShape),oldStaff.map(staffShape),'Reception staff placement/identity changed');
assert.equal(nodes.filter(n=>n.extras?.hotelStars).length,2);nodes.filter(n=>n.extras?.hotelStars).forEach(n=>assert.equal(n.extras.count,5));
const exteriorMaterial=now.g.materials.find(m=>m.name==='Warm leuchtende fünf Außensterne');assert(exteriorMaterial.emissiveFactor.every(v=>v>.1));
assert.equal(nodes.filter(n=>n.extras?.continuousCarpet).length,1);assert.equal(nodes.filter(n=>n.extras?.luggageTrolley).length,1);assert(!nodes.some(n=>n.extras?.hotelPassage));
// Expand only the requested building and entry fixture zones. Check exact retained
// geometry/material/placement signatures outside them, including the limousine.
const oldTower=transform(old.g.nodes.find(n=>n.name===towerNode.name)),oldInv=oldTower.clone().invert(),courtNode=old.g.nodes.find(n=>n.name==='Eingangsvorplatz und gerader roter Teppich'),courtInv=transform(courtNode).invert();
const nearKeys=new Map();for(const r of after){const k=r.geometry+'|'+r.name+'|'+r.t.map(v=>Math.round(v*100)).join(',');if(!nearKeys.has(k))nearKeys.set(k,[]);nearKeys.get(k).push(r);}
const retained=r=>keys.has(key(r))||(nearKeys.get(r.geometry+'|'+r.name+'|'+r.t.map(v=>Math.round(v*100)).join(','))||[]).some(a=>a.matrix.elements.every((v,i)=>Math.abs(v-r.matrix.elements[i])<1e-6));
const missing=before.filter(r=>!retained(r)),unexpected=missing.filter(r=>{
 const p=new T.Vector3(...r.t).applyMatrix4(oldInv),c=new T.Vector3(...r.t).applyMatrix4(courtInv);
 if(p.x>-4.8&&p.x<21&&p.z>-41&&p.z<6.8&&p.y>-.55&&p.y<17)return false;
 if(c.x>1.4&&c.x<12.4&&c.z>2.5&&c.z<23.5&&c.y>=-.05&&c.y<4)return false;
 if(/durchgehenden Teppich|durchgehender roter Eingangsteppich/.test(r.name))return false;
 return true;
});
fs.writeFileSync('.sites-runtime/unexpected-expansion-changes.json',JSON.stringify(unexpected.map(r=>({name:r.name,material:r.material,t:r.t})),null,2));
assert.equal(unexpected.length,0,'Unrelated objects changed: '+JSON.stringify(unexpected.slice(0,6).map(r=>({name:r.name,t:r.t}))));
// Surrogate opaque meshes reconstruct actual exported surfaces around the lobby.
const relevant=after.filter(r=>{const p=new T.Vector3(...r.t).applyMatrix4(inv);return p.x>-4&&p.x<20&&p.z>-16&&p.z<12&&p.y>-.5&&p.y<18;}),geoCache=new Map(),solids=[];
for(const r of relevant){const mesh=now.g.meshes[nodes[r.nodeIndex].mesh];for(const prim of mesh.primitives){
 const material=now.g.materials[prim.material];if(material.alphaMode==='BLEND'||material.alphaMode==='MASK')continue;
 let geo=geoCache.get(prim.attributes.POSITION);if(!geo){geo=new T.BufferGeometry();const positions=array(now,prim.attributes.POSITION);geo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(positions.buffer,positions.byteOffset,positions.length/4),3));if(prim.indices!==undefined){const a=now.g.accessors[prim.indices],buf=array(now,prim.indices),Type={5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType];geo.setIndex(Array.from(new Type(buf.buffer,buf.byteOffset,a.count)));}geo.computeBoundingSphere();geoCache.set(prim.attributes.POSITION,geo);}
 const o=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));o.name=r.name;o.userData={material:material.name,extras:r.extras};o.matrixWorld.copy(r.matrix);o.matrixAutoUpdate=false;solids.push(o);
 }}
const floors=solids.filter(o=>o.userData.material==='Beiger Lobby-Naturstein'||o.userData.extras?.continuousCarpet),ray=new T.Raycaster(),floorProbes=[];
for(const x of [-1,2,4.7,8.15,11.3,14,17])for(const z of [1.9,2.4,3.8]){
 const from=new T.Vector3(x,.65,z).applyMatrix4(tower);ray.set(from,new T.Vector3(0,-1,0));const hit=ray.intersectObjects(floors,false)[0];assert(hit,'Missing finished lobby floor');const expected=.3375*1.032;assert(Math.abs(hit.point.y-expected)<1e-5,'Lobby floor step/gap');floorProbes.push([x,z,hit.point.y]);
}
for(const z of [3.95,4.3,4.8,5.2,5.53]){
 const from=new T.Vector3(8.15,.65,z).applyMatrix4(tower);ray.set(from,new T.Vector3(0,-1,0));const hit=ray.intersectObjects(floors,false)[0];const t=(5.53-z)/(5.53-3.95),expected=(.194/1.032+(.3375-.194/1.032)*t)*1.032;assert(hit&&Math.abs(hit.point.y-expected)<1e-5,'Discontinuous entrance ramp');floorProbes.push([8.15,z,hit.point.y]);
}
const sightlines=[];
for(const x of [6.6,8.15,9.4])for(const [label,target]of [['Branding',[8,3.8,-6.86]],['Tresen',[8,1.0,-2.19]]]){
 const from=new T.Vector3(x,2.8,12).applyMatrix4(tower),to=new T.Vector3(...target).applyMatrix4(tower);ray.set(from,to.clone().sub(from).normalize());const hit=ray.intersectObjects(solids,false)[0];assert(hit&&/Empfang|Rezeptionsmarmor/.test(hit.object.name),'Blocked reception: '+hit?.object.name);sightlines.push({x,label,first:hit.object.name});
}
const extension=nodes.find(n=>n.extras?.lobbyExtension);assert(extension);assert.equal(extension.extras.doorFront,5.53);
const fixtures=nodes.filter(n=>n.extras?.carpetFixture);assert.equal(fixtures.length,8);assert.deepEqual(fixtures.map(n=>n.extras.pathFraction).sort(),[.16,.16,.34,.34,.52,.52,.70,.70]);
const carpet=nodes.find(n=>n.extras?.continuousCarpet),end=new T.Vector3(...carpet.extras.end),entry=new T.Vector3(...carpet.extras.entry),endOld=old.g.nodes.find(n=>n.extras?.continuousCarpet).extras.end;
assert.deepEqual(end.toArray(),endOld,'Limousine-side carpet end changed');assert(entry.distanceTo(end)>20);
const court=transform(nodes.find(n=>n.name===courtNode.name)),carpetAcross=new T.Vector3(1,0,0).transformDirection(tower),endAcross=new T.Vector3(1,0,0).transformDirection(court);let minimumFixtureClearance=Infinity;
for(const n of fixtures){const t=n.extras.pathFraction,world=new T.Vector3(...n.translation).applyMatrix4(court),center=entry.clone().lerp(end,t),side=carpetAcross.clone().lerp(endAcross,t).normalize(),distance=Math.abs(world.clone().sub(center).dot(side)),halfWidth=2.90+(2.42-2.90)*t,clearance=distance-halfWidth-.70;minimumFixtureClearance=Math.min(minimumFixtureClearance,clearance);assert(clearance>.2,'Plant overlaps carpet');const local=world.clone().applyMatrix4(inv);assert(local.z>5.53+.9,'Exterior fixture collides with extension');}
const trolley=nodes.find(n=>n.extras?.luggageTrolley),trolleyWorld=new T.Vector3(...trolley.translation).applyMatrix4(court),trolleyLocal=trolleyWorld.clone().applyMatrix4(inv);assert(trolleyLocal.z>7.5&&trolleyLocal.x<2,'Trolley interferes with entrance');
// Confirm that the original four exterior figures and their physical descendants are absent.
const parents=new Map();old.g.nodes.forEach((n,i)=>n.children?.forEach(c=>parents.set(c,i)));let removedExteriorBodyParts=0;
for(const r of before){let i=r.nodeIndex,remove=false;while(i!==undefined){const n=old.g.nodes[i];if(n.extras?.doorman||(n.name==='Hotelgast'&&n.translation?.[2]>22&&n.translation?.[2]<23))remove=true;i=parents.get(i);}const p=new T.Vector3(...r.t).applyMatrix4(oldInv),c=new T.Vector3(...r.t).applyMatrix4(courtInv);if(p.y>.1&&p.y<3.7&&p.z>3.4&&p.z<4.2&&(Math.abs(p.x-3.7)<.65||Math.abs(p.x-12.3)<.65))remove=true;if(c.y>.05&&c.y<2.7&&c.z>22.1&&c.z<23.1&&(Math.abs(c.x-7.12)<.45||Math.abs(c.x-8.8)<.45))remove=true;if(remove){assert(!keys.has(key(r)),'Exterior figure body retained');removedExteriorBodyParts++;}}
assert(removedExteriorBodyParts>50);
const report={version:88,baseVersion:86,forwardExtensionMeters:2.55,additionalStoreys:1,additionalStoreyWorldHeight:2.85*1.032,guestRooms:40,removedExteriorPeople:4,removedExteriorBodyParts,receptionistsPreserved:2,starsPerRow:5,brightExteriorStars:true,continuousCarpet:true,floorProbes,sightlines,minimumFixtureClearance,retainedUnrelatedPhysicalComponents:before.length-missing.length,browserPBRVerified:false};fs.writeFileSync('hotel-expansion-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
