import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {T} from '../dist/core.js';
function read(path){const bytes=fs.readFileSync(path),n=bytes.readUInt32LE(12);return {g:JSON.parse(bytes.subarray(20,20+n)),bin:bytes.subarray(28+n)};}
const now=read('dist/assets/Lumina_Leaf_Gesamtszene.glb'),old=read(process.argv[2]);
function array(model,i){const {g,bin}=model,a=g.accessors[i],b=g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],bytes={5126:4,5125:4,5123:2,5121:1}[a.componentType],stride=b.byteStride||n*bytes,offset=(b.byteOffset||0)+(a.byteOffset||0),out=Buffer.alloc(a.count*n*bytes);for(let j=0;j<a.count;j++)bin.copy(out,j*n*bytes,offset+j*stride,offset+j*stride+n*bytes);return {data:out,a};}
function signature(model){const {g}=model,hashes=[];function visit(i,car=false){const n=g.nodes[i];car=car||n.name==='Schwarze Lumina Leaf Stretchlimousine';if(!car){const hash=crypto.createHash('sha256');hash.update(JSON.stringify({name:n.name,translation:n.translation,rotation:n.rotation,scale:n.scale,matrix:n.matrix,extras:n.extras}));if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){for(const [k,v] of Object.entries(p.attributes).sort())hash.update(k).update(array(model,v).data);if(p.indices!==undefined)hash.update(array(model,p.indices).data);const m=g.materials[p.material];hash.update(JSON.stringify({name:m.name,color:m.pbrMetallicRoughness?.baseColorFactor,roughness:m.pbrMetallicRoughness?.roughnessFactor,metalness:m.pbrMetallicRoughness?.metallicFactor}));}for(const [key,idx] of Object.entries(n.extensions?.EXT_mesh_gpu_instancing?.attributes||{}).sort())hash.update(key).update(array(model,idx).data);hashes.push(hash.digest('hex'));}n.children?.forEach(j=>visit(j,car));}g.scenes[g.scene||0].nodes.forEach(i=>visit(i));return hashes.sort();}
assert.deepEqual(signature(now),signature(old),'Hotel, landscape, people, camera and exterior geometry must stay unchanged');
const car=now.g.nodes.find(n=>n.name==='Schwarze Lumina Leaf Stretchlimousine'),before=old.g.nodes.find(n=>n.name===car.name);assert.deepEqual(car.translation,before.translation);assert.deepEqual(car.rotation,before.rotation);assert.deepEqual(car.scale,before.scale);
const wraps=now.g.nodes.filter(n=>n.extras?.continuousSideWrap);assert.equal(wraps.length,2);wraps.forEach(n=>{assert.equal(n.extras.hotelName,'Lumina Leaf Hotel');assert.equal(n.extras.stars,5);assert.equal(n.extras.readableOutside,true);});
const mats=wraps.map(n=>now.g.meshes[n.mesh].primitives[0].material);assert.equal(mats[0],mats[1],'Both sides share the same foil');assert(!now.g.materials[mats[0]].extensions?.KHR_materials_unlit,'Foil responds to lighting');
for(const n of now.g.nodes.filter(n=>n.extras?.plainBlackRoof||n.extras?.unprintedBlackBody))for(const p of now.g.meshes[n.mesh].primitives){const mat=now.g.materials[p.material];assert(!mat.pbrMetallicRoughness.baseColorTexture);assert(mat.pbrMetallicRoughness.baseColorFactor.slice(0,3).every(c=>c<.01),'Upper panels remain plain black');}
// Opposite viewing directions require opposite horizontal texture gradients.
for(const n of wraps){const p=now.g.meshes[n.mesh].primitives[0],pos=array(now,p.attributes.POSITION).data,uv=array(now,p.attributes.TEXCOORD_0).data;let first=0,last=0;for(let i=0;i<pos.length/12;i++){if(pos.readFloatLE(i*12)<pos.readFloatLE(first*12))first=i;if(pos.readFloatLE(i*12)>pos.readFloatLE(last*12))last=i;}const delta=uv.readFloatLE(last*8)-uv.readFloatLE(first*8);assert.equal(Math.sign(delta),n.extras.side,'Lettering orientation from outside');for(let i=0;i<uv.length;i+=8){const u=uv.readFloatLE(i);assert(u>=-1e-5&&u<=1+1e-5,'Dedicated unfolded foil UV range');}}
console.log(JSON.stringify({unchangedNonCarNodes:signature(now).length,sideWraps:2,identicalFoil:true,readableBothSides:true,starsPerSide:5,plainBlackUpperPanels:true,carTransformPreserved:true}));
// Verify the new connections from actual exported positions, rather than labels.
function positions(n){const p=now.g.meshes[n.mesh].primitives[0];return array(now,p.attributes.POSITION).data;}
function vertex(data,i){return [0,1,2].map(j=>data.readFloatLE(i*12+j*4));}
function distance(a,b){return Math.hypot(...a.map((x,i)=>x-b[i]));}
const panes=now.g.nodes.filter(n=>n.extras?.attachedGlazing);
assert.equal(panes.length,2);
for(const pane of panes){
 if(pane.extras.rebuiltWindshield)continue; // Complete replacement is checked by check-windshield.mjs.
 const glass=positions(pane),rear=pane.extras.rear,cowl=positions(now.g.nodes.find(n=>n.extras?.windowConnection==='cowl'&&n.extras.rear===rear));
 for(let u=0;u<=48;u++)assert(distance(vertex(glass,u*21),vertex(cowl,u*7))<1e-5,'Glass bottom edge meets the cowl');
 for(const side of [-1,1]){
  const pillar=positions(now.g.nodes.find(n=>n.extras?.windowConnection===(rear?'C-pillar':'A-pillar')&&n.extras.side===side));
  const segments=rear?32:40,stride=rear?7:3,pillarNode=now.g.nodes.find(n=>n.extras?.windowConnection===(rear?'C-pillar':'A-pillar')&&n.extras.side===side),samples=pillarNode.extras.verticalSamples||Array.from({length:segments+1},(_,i)=>i/segments);
  for(let v=0;v<=20;v++){const level=pane.extras.verticalSamples?.[v]??v/20;let j=0;while(j<segments-1&&level>samples[j+1])j++;const f=(level-samples[j])/(samples[j+1]-samples[j]),a=vertex(pillar,j*stride),b=vertex(pillar,(j+1)*stride),edge=a.map((x,k)=>x+(b[k]-x)*f);assert(distance(vertex(glass,(side>0?48:0)*21+v),edge)<.001,'Glass side edge meets its continuous pillar');}
 }
 const roof=positions(now.g.nodes.find(n=>n.extras?.plainBlackRoof));
 for(let u=0;u<=48;u++){const fraction=(!rear&&pane.extras.roundedUpperCorners)?.075+.85*u/48:u/48,t=fraction*20,j=Math.min(19,Math.floor(t)),f=t-j,row=rear?96*21:0,a=vertex(roof,row+j),b=vertex(roof,row+j+1),edge=a.map((x,k)=>x+(b[k]-x)*f);assert(distance(vertex(glass,u*21+20),edge)<.003,'Glass upper edge meets the roof');}
}
const tires=now.g.nodes.filter(n=>n.extras?.roadTire);assert.equal(tires.length,4);
for(const tire of tires){const p=positions(tire),xyz=Array.from({length:p.length/12},(_,i)=>vertex(p,i)),zs=xyz.map(v=>v[2]),ys=xyz.map(v=>v[1]);assert(Math.abs(Math.max(...zs)-Math.min(...zs)-.52)<1e-5,'Road tire width');assert(Math.abs(Math.min(...ys)+tire.translation[1]+car.translation[1]+.005)<1e-5,'Tires touch the road');assert(Math.abs(tire.translation[2])+.26<=1.60,'Wheels fit under the fenders');assert(Math.max(...ys)+tire.translation[1]<.84+.88-.04,'Wheel arch clearance');}
assert.equal(now.g.nodes.filter(n=>n.extras?.rectangularLampHousing).length,4);
for(const name of ['Kühlweiße Xenon-Frontleuchten','Kühlweiße Rückfahrleuchten','Rote Rück- und Bremsleuchten','Orange Blinker'])assert(now.g.materials.some(m=>m.name===name),'Correctly separated lighting functions');
// Preserve the existing foil, roof and rounded body exactly.
for(const flag of ['continuousSideWrap','plainBlackRoof','unprintedBlackBody'])for(const n of now.g.nodes.filter(n=>n.extras?.[flag])){const previous=old.g.nodes.find(x=>x.name===n.name),p=now.g.meshes[n.mesh].primitives[0],q=old.g.meshes[previous.mesh].primitives[0];for(const attribute of ['POSITION','TEXCOORD_0'])if(p.attributes[attribute]!==undefined)assert(array(now,p.attributes[attribute]).data.equals(array(old,q.attributes[attribute]).data),'Existing black panels and foil geometry unchanged');}
console.log(JSON.stringify({attachedGlazing:2,closedPillars:4,roadTires:4,tireWidthMeters:.52,roadContactConfirmed:true,rectangularLampHousings:4,xenonFront:true,separateRearLightColors:true,foilAndUpperPanelsUnchanged:true}));
// Check the new lower closures against the exported body itself.
const bodyNode=now.g.nodes.find(n=>n.extras?.unprintedBlackBody),bodyPrimitive=now.g.meshes[bodyNode.mesh].primitives[0],bodyGeometry=new T.BufferGeometry();
const bodyPositions=positions(bodyNode);bodyGeometry.setAttribute('position',new T.Float32BufferAttribute(Array.from({length:bodyPositions.length/4},(_,i)=>bodyPositions.readFloatLE(i*4)),3));
const bodyIndexAccessor=array(now,bodyPrimitive.indices),bodyIndices=bodyIndexAccessor.data,indexSize=bodyIndexAccessor.a.componentType===5123?2:4;bodyGeometry.setIndex(Array.from({length:bodyIndexAccessor.a.count},(_,i)=>indexSize===2?bodyIndices.readUInt16LE(i*2):bodyIndices.readUInt32LE(i*4)));
const bodyMesh=new T.Mesh(bodyGeometry,new T.MeshBasicMaterial({side:T.DoubleSide}));bodyMesh.updateMatrixWorld();
const ray=new T.Raycaster();
for(const side of [-1,1]){
 const corner=now.g.nodes.find(n=>n.extras?.windshieldCorner&&n.extras.side===side),data=positions(corner),pillar=positions(now.g.nodes.find(n=>n.extras?.solidPillar&&n.extras.side===side));assert(corner,'Both lower corners are modeled');
 for(let u=0;u<=24;u++){
  const base=vertex(data,u*4+3);ray.set(new T.Vector3(base[0],base[1]+.5,base[2]),new T.Vector3(0,-1,0));const hits=ray.intersectObject(bodyMesh);assert(hits.length&&Math.abs(hits[0].point.y-base[1])<.004,'Lower corner closes directly onto the actual body surface');
  const top=vertex(data,u*4),a=vertex(pillar,0),b=vertex(pillar,2),edge=a.map((x,i)=>x+(b[i]-x)*u/24);assert(distance(top,edge)<1e-5,'Corner top and pillar foot meet exactly');
 }
 const sidePane=positions(now.g.nodes.find(n=>n.extras?.carGlass&&n.extras.side===side));
 for(let v=0;v<=12;v++){const samples=now.g.nodes.find(n=>n.extras?.solidPillar&&n.extras.side===side).extras.verticalSamples||Array.from({length:41},(_,i)=>i/40),level=v/12;let j=0;while(j<samples.length-2&&level>samples[j+1])j++;const f=(level-samples[j])/(samples[j+1]-samples[j]),a=vertex(pillar,j*3+2),b=vertex(pillar,(j+1)*3+2),edge=a.map((x,i)=>x+(b[i]-x)*f);assert(distance(vertex(sidePane,v),edge)<.001,'Side glazing and A-pillar share their boundary');}
 assert(now.g.nodes.some(n=>n.extras?.mirrorSail&&n.extras.side===side),'Both mirrors have modeled door sails');
}
for(const n of now.g.nodes.filter(n=>n.extras?.hotelNumberPlate)){
 const before=old.g.nodes.find(x=>x.extras?.hotelNumberPlate&&x.extras.rear===n.extras.rear),p=now.g.meshes[n.mesh].primitives[0],q=old.g.meshes[before.mesh].primitives[0];
 for(const attribute of Object.keys(p.attributes))assert(array(now,p.attributes[attribute]).data.equals(array(old,q.attributes[attribute]).data),'Hotel number plate geometry and artwork coordinates stay unchanged');
}
console.log(JSON.stringify({closedLowerWindshieldCorners:2,bodyContactsVerified:true,sideGlassContactsVerified:true,modeledMirrorSails:2,numberPlatesPreserved:true}));
