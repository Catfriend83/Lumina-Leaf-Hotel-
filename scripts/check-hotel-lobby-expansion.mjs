import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {T} from '../dist/core.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb'),old=read('.sites-runtime/models/baseline-v90.glb');
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

const court=transform(nodes.find(n=>n.name==='Eingangsvorplatz und gerader roter Teppich')),courtInv=court.clone().invert();
const cutSurfaceNames=new Set(['Bündiger bestehender Hotelrasen','Bündiger Übergang vom Dorf zur bestehenden Landschaft','Durchgängiges Gelände mit ebenen Hausstandflächen und sanften Böschungen','Hauptstraße mit eigenständiger Hotelvorfahrt','Geschlossene Wiesenflächen um die eigenständige Hotelvorfahrt','Geschlossener Übergang zwischen bestehender und reparierter Hotelwiese']);
// Garage subtraction reindexes entire terrain meshes; check their remote triangles directly.
function terrainTriangles(model,row){const result=[];for(const prim of model.g.meshes[model.g.nodes[row.nodeIndex].mesh].primitives){const b=array(model,prim.attributes.POSITION),a=model.g.accessors[prim.indices],ib=array(model,prim.indices),size={5121:1,5123:2,5125:4}[a.componentType],read=i=>size===4?ib.readUInt32LE(i*4):size===2?ib.readUInt16LE(i*2):ib[i];for(let i=0;i<a.count;i+=3){const p=[0,1,2].map(j=>{const id=read(i+j);return new T.Vector3(b.readFloatLE(id*12),b.readFloatLE(id*12+4),b.readFloatLE(id*12+8)).applyMatrix4(row.matrix);});result.push({p,key:p.map(v=>v.toArray().map(x=>Math.round(x*10000)).join(',')).sort().join('|')});}}return result;}
for(const r of missing.filter(r=>cutSurfaceNames.has(r.name))){const current=after.find(a=>a.name===r.name);assert(current);const keys=new Set(terrainTriangles(now,current).map(t=>t.key));for(const t of terrainTriangles(old,r)){const b=new T.Box3().setFromPoints(t.p);if(b.max.x<-22||b.min.x>-6||b.max.z<-10||b.min.z>29)assert(keys.has(t.key),'Remote terrain changed: '+r.name);}}
const inScope=r=>{const w=r.box.getCenter(new T.Vector3()),p=w.clone().applyMatrix4(inv),c=w.clone().applyMatrix4(courtInv);return cutSurfaceNames.has(r.name)||((r.material==='ivory'||r.name==='Entwässerung der Hotelvorfahrt')&&r.box.min.z>28&&r.box.max.z<29&&r.box.min.x<-6&&r.box.max.x>-23)||(p.x>-6.5&&p.x<22.5&&p.z>-16.5&&p.z<19.8&&p.y>-.6&&p.y<7.8)||(w.x>-23&&w.x<-6&&w.z>-9.5&&w.z<29&&w.y>-5&&w.y<4.6)||(c.x>1.4&&c.x<14.6&&c.z>5&&c.z<25&&c.y>-.1&&c.y<4)||/durchgehenden Teppich|durchgehender roter Eingangsteppich|Vorplatz vor der erweiterten Lobby|Gehweg am Hotel mit freier Garagenquerung|Sauber ausgeschnittener Vorplatz/.test(r.name);};
const unexpected=missing.filter(r=>!inScope(r));fs.writeFileSync('.sites-runtime/unexpected-v91.json',JSON.stringify(unexpected.map(r=>({name:r.name,material:r.material,t:r.t})),null,2));
if(process.argv.includes('--prepare-meadow')){
 const restore=missing.filter(r=>old.g.nodes[r.nodeIndex]?.extras?.alpineBotany&&!inScope(r)).map(r=>({kind:old.g.nodes[r.nodeIndex].extras.species,near:old.g.nodes[r.nodeIndex].extras.botanyLOD===0,matrix:r.matrix.elements}));
 const remove=added.filter(r=>nodes[r.nodeIndex]?.extras?.alpineBotany&&!inScope(r)).map(r=>r.t);
 fs.writeFileSync('dist/hotel-meadow-v91-data.js','// Keep the v90 surroundings outside the remodeled entrance and garage.\nexport const remove='+JSON.stringify(remove)+';\nexport const restore='+JSON.stringify(restore)+';\n');console.log({preparedMeadowPreservation:restore.length,remove:remove.length});
 assert(unexpected.every(r=>old.g.nodes[r.nodeIndex]?.extras?.alpineBotany),'Unrelated non-meadow object changed');
}else assert.equal(unexpected.length,0,'Unrelated object changed: '+JSON.stringify(unexpected.slice(0,3).map(r=>({name:r.name,t:r.t}))));
assert.equal(nodes.filter(n=>n.extras?.receptionist).length,2);assert.equal(nodes.filter(n=>n.extras?.room).length,40);assert.equal(nodes.filter(n=>n.extras?.facadeFixture).length,155);assert.equal(nodes.filter(n=>n.extras?.luggageTrolley).length,0);
const items=nodes.filter(n=>n.extras?.loungeItem),count=kind=>items.filter(n=>n.extras.kind===kind).length;
assert.equal(count('Damastsofa'),4);assert.equal(count('Damastsessel'),8);assert.equal(count('Nussbaum-Couchtisch'),4);assert.equal(count('Runder Lampen-Beistelltisch'),8);
const boxes=items.filter(n=>n.extras.kind!=='Floraler Lounge-Teppich').map(n=>{const [w,d]=n.extras.footprint;return {name:n.name,box:new T.Box3(new T.Vector3(-w/2,0,-d/2),new T.Vector3(w/2,1.5,d/2)).applyMatrix4(transform(n))};});
for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!boxes[i].box.intersectsBox(boxes[j].box),'Furniture overlap');
const desk=new T.Box3(new T.Vector3(3.28,.3375,-2.22),new T.Vector3(12.72,2,-.98)),aisle=new T.Box3(new T.Vector3(5.1,.34,-.9),new T.Vector3(10.9,2.5,13.53));
for(const b of boxes){assert(!b.box.intersectsBox(aisle),'Furniture blocks the central route');assert(!b.box.intersectsBox(desk),'Furniture intersects enlarged reception');}
assert.equal(nodes.filter(n=>n.extras?.referenceTableLamp).length,8);assert.equal(nodes.filter(n=>n.extras?.crystalChandelier).length,3);assert.equal(nodes.filter(n=>n.extras?.hotelPassage).length,1);
nodes.filter(n=>n.extras?.hotelStars).forEach(n=>assert.equal(n.extras.count,5));
const garage=nodes.find(n=>n.extras?.garageStructure);assert.equal(garage.translation[0],-15.615);assert.equal(garage.extras.lanes,2);
for(const r of after.filter(r=>r.extras?.lobbyFinishedFloor))assert(r.box.min.x>garage.extras.trenchBounds.maxX+.5,'Lobby overlaps garage');
const carpet=nodes.find(n=>n.extras?.continuousCarpet),entry=new T.Vector3(...carpet.extras.entry),end=new T.Vector3(...carpet.extras.end),oldCarpet=old.g.nodes.find(n=>n.extras?.continuousCarpet);
assert.deepEqual(end.toArray(),oldCarpet.extras.end);assert(Math.abs(entry.distanceTo(new T.Vector3(...oldCarpet.extras.entry))-6)<1e-6);assert(entry.distanceTo(end)>17);
const across0=new T.Vector3(1,0,0).transformDirection(tower),across1=new T.Vector3(1,0,0).transformDirection(court),fixtures=nodes.filter(n=>n.extras?.carpetFixture).map(n=>({n,p:new T.Vector3(...n.translation).applyMatrix4(court)}));let minimumFixtureClearance=Infinity;
for(const {n,p}of fixtures){const t=n.extras.pathFraction,center=entry.clone().lerp(end,t),across=across0.clone().lerp(across1,t).normalize(),clearance=Math.abs(p.clone().sub(center).dot(across))-(2.90+(2.42-2.90)*t)-.70;assert(clearance>.2);minimumFixtureClearance=Math.min(minimumFixtureClearance,clearance);assert(p.clone().applyMatrix4(inv).z>14.43);}
const planters=nodes.filter(n=>n.extras?.entrancePlanter).map(n=>new T.Vector3(...n.translation).applyMatrix4(tower));assert.equal(planters.length,4);for(const p of planters)for(const f of fixtures)assert(p.distanceTo(f.p)>1.7,'Plant overlaps carpet fixture');
const stray=after.filter(r=>nodes[r.nodeIndex].extras?.alpineBotany).filter(r=>{const p=new T.Vector3(...r.t).applyMatrix4(inv);return p.x>-5.9&&p.x<21.9&&p.z>1.7&&p.z<13.1;});assert.equal(stray.length,0,'Grass inside lobby');
// Surrogate opaque meshes reconstruct actual exported surfaces around the lobby.
const relevant=after.filter(r=>{const p=new T.Vector3(...r.t).applyMatrix4(inv);return p.x>-7&&p.x<23&&p.z>-16&&p.z<21&&p.y>-.5&&p.y<18;}),geoCache=new Map(),solids=[];
for(const r of relevant){const mesh=now.g.meshes[nodes[r.nodeIndex].mesh];for(const prim of mesh.primitives){
 const material=now.g.materials[prim.material];if(material.alphaMode==='BLEND'||material.alphaMode==='MASK')continue;
 let geo=geoCache.get(prim.attributes.POSITION);if(!geo){geo=new T.BufferGeometry();const positions=array(now,prim.attributes.POSITION);geo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(positions.buffer,positions.byteOffset,positions.length/4),3));if(prim.indices!==undefined){const a=now.g.accessors[prim.indices],buf=array(now,prim.indices),Type={5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType];geo.setIndex(Array.from(new Type(buf.buffer,buf.byteOffset,a.count)));}geo.computeBoundingSphere();geoCache.set(prim.attributes.POSITION,geo);}
 const o=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));o.name=r.name;o.userData={material:material.name,extras:r.extras};o.matrixWorld.copy(r.matrix);o.matrixAutoUpdate=false;solids.push(o);
 }}
const floors=solids.filter(o=>o.userData.material==='Beiger Lobby-Naturstein'||o.userData.extras?.continuousCarpet),ray=new T.Raycaster(),floorProbes=[];
for(const x of [-5.2,-3,0,4.7,8.15,11.3,16,20,21.4])for(const z of [2.7,5,8,11.8]){
 const from=new T.Vector3(x,.65,z).applyMatrix4(tower);ray.set(from,new T.Vector3(0,-1,0));const hit=ray.intersectObjects(floors,false)[0];assert(hit,'Missing finished lobby floor');const expected=.3375*1.032;assert(Math.abs(hit.point.y-expected)<1e-5,'Lobby floor step/gap');floorProbes.push([x,z,hit.point.y]);
}
for(const z of [11.95,12.3,12.8,13.2,13.53]){
 const from=new T.Vector3(8.15,.65,z).applyMatrix4(tower);ray.set(from,new T.Vector3(0,-1,0));const hit=ray.intersectObjects(floors,false)[0];const t=(13.53-z)/(13.53-11.95),expected=(.194/1.032+(.3375-.194/1.032)*t)*1.032;assert(hit&&Math.abs(hit.point.y-expected)<1e-5,'Discontinuous entrance ramp');floorProbes.push([8.15,z,hit.point.y]);
}
const sightlines=[];
for(const x of [6.6,8.15,9.4])for(const [label,target]of [['Branding',[8,3.8,-6.86]],['Tresen',[8,1.0,-1.04]]]){
 const from=new T.Vector3(x,2.8,20).applyMatrix4(tower),to=new T.Vector3(...target).applyMatrix4(tower);ray.set(from,to.clone().sub(from).normalize());const hit=ray.intersectObjects(solids,false)[0];assert(hit&&/Empfang|Rezeptionsmarmor/.test(hit.object.name),'Blocked reception: '+hit?.object.name);sightlines.push({x,label,first:hit.object.name});
}

for(const x of [-5,0,4,8,12,16,21])for(const z of [3.4,6,9,12.9]){ray.set(new T.Vector3(x,8,z).applyMatrix4(tower),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(solids,false)[0];assert(hit&&hit.point.y>7.2*1.032,'Open podium roof');}
// Real open passage and an unobstructed approach behind the left lounge.
for(const x of [.2,.95,1.7]){const from=new T.Vector3(x,1.9,-5.9).applyMatrix4(tower),to=new T.Vector3(x,1.9,-10).applyMatrix4(tower);ray.set(from,to.clone().sub(from).normalize());const hit=ray.intersectObjects(solids,false)[0];assert(!hit||hit.distance>from.distanceTo(to),'Blocked backoffice passage');}
const report={version:91,baseVersion:90,forwardMeters:6,totalAdditionalWidthMeters:5.664,receptionDeskWidthMeters:9.2*.944,seatingGroups:4,tableLamps:8,chandeliers:3,centralAisleMeters:5.8*.944,carpetLengthMeters:entry.distanceTo(end),garageShiftLeftMeters:3,vipAndLimousinePreserved:true,minimumFixtureClearance,unrelatedChanges:unexpected.length,floorProbes,sightlines,browserPBRVerified:false};
if(!process.argv.includes('--prepare-meadow'))fs.writeFileSync('hotel-lobby-expansion-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
