import fs from 'node:fs';
import assert from 'node:assert/strict';
import {T} from '../dist/core.js';
const bytes=fs.readFileSync('.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb');
assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
const length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length),nodes=g.nodes;
const stars=nodes.filter(n=>n.extras?.hotelStars),staff=nodes.filter(n=>n.extras?.referenceStaff);
assert.equal(stars.length,2);stars.forEach(n=>assert.equal(n.extras.count,5));
assert.equal(staff.filter(n=>n.extras.doorman).length,2);assert.equal(staff.filter(n=>n.extras.receptionist).length,2);
const portiers=staff.filter(n=>n.extras.doorman).sort((a,b)=>a.translation[0]-b.translation[0]);
assert.equal((portiers[0].translation[0]+portiers[1].translation[0])/2,8);
assert.equal(portiers[0].translation[2],portiers[1].translation[2]);assert.notEqual(portiers[0].extras.identity,portiers[1].extras.identity);
assert.equal(nodes.filter(n=>n.extras?.hotelLettering).length,2);
const portal=nodes.find(n=>n.extras?.hotelEntrance);assert(portal.extras.noCentralPier);assert(portal.extras.clearHeight>6);
assert.equal(nodes.filter(n=>n.extras?.continuousCarpet).length,1);
assert.equal(nodes.filter(n=>/^Gästezimmer \d+$/.test(n.name||'')).length,32);
assert.equal(nodes.filter(n=>n.extras?.watercraft).length,8);
const parents=new Map();nodes.forEach((n,i)=>n.children?.forEach(c=>parents.set(c,i)));const worlds=new Map();
const transform=n=>n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));
function world(i){if(!worlds.has(i))worlds.set(i,parents.has(i)?world(parents.get(i)).clone().multiply(transform(nodes[i])):transform(nodes[i]));return worlds.get(i);}
const accessorCache=new Map();
function values(i){if(accessorCache.has(i))return accessorCache.get(i);const a=g.accessors[i],v=g.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType],out=new type(a.count*size),width=type.BYTES_PER_ELEMENT,stride=v.byteStride||size*width,off=(v.byteOffset||0)+(a.byteOffset||0);for(let row=0;row<a.count;row++)for(let c=0;c<size;c++){const p=off+row*stride+c*width;out[row*size+c]=a.componentType===5126?bin.readFloatLE(p):width===4?bin.readUInt32LE(p):width===2?bin.readUInt16LE(p):bin[p];}accessorCache.set(i,out);return out;}
const towerIndex=nodes.findIndex(n=>n.name==='Lumina Leaf Hotel und Außenanlage'),tower=world(towerIndex),bounds=new T.Box3(new T.Vector3(2,0,-8),new T.Vector3(14,7,6)).applyMatrix4(tower),meshes=[];
for(const [i,n] of nodes.entries()){
 if(n.mesh===undefined)continue;
 for(const p of g.meshes[n.mesh].primitives){
  const mat=g.materials[p.material];if(mat.alphaMode==='BLEND'||mat.alphaMode==='MASK')continue;
  const a=g.accessors[p.attributes.POSITION],localBox=new T.Box3(new T.Vector3(...a.min),new T.Vector3(...a.max)),instances=n.extensions?.EXT_mesh_gpu_instancing?.attributes;
  const poses=instances?Array.from({length:g.accessors[Object.values(instances)[0]].count},(_,j)=>{
   const vec=(key,size,otherwise)=>instances[key]===undefined?otherwise:Array.from(values(instances[key]).subarray(j*size,(j+1)*size));
   return world(i).clone().multiply(transform({translation:vec('TRANSLATION',3,[0,0,0]),rotation:vec('ROTATION',4,[0,0,0,1]),scale:vec('SCALE',3,[1,1,1])}));
  }):[world(i)];
  const included=poses.filter(m=>localBox.clone().applyMatrix4(m).intersectsBox(bounds));if(!included.length)continue;
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(values(p.attributes.POSITION),3));if(p.indices!==undefined)geo.setIndex(new T.BufferAttribute(values(p.indices),1));geo.computeBoundingSphere();
  for(const m of included){const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.name=n.name;mesh.matrixWorld.copy(m);mesh.matrix.copy(m);mesh.matrixAutoUpdate=false;meshes.push(mesh);}
 }
}
const sightlines=[];
// The central sample is offset 15 cm from the legitimate 24 mm door meeting seal.
for(const x of [6.6,8.15,9.4])for(const [label,target] of [['Branding',[8,3.8,-6.86]],['Tresen',[8,1.0,-2.19]]]){
 const from=new T.Vector3(x,2.8,12).applyMatrix4(tower),to=new T.Vector3(...target).applyMatrix4(tower),ray=new T.Raycaster(from,to.clone().sub(from).normalize());
 const hit=ray.intersectObjects(meshes,false)[0];assert(hit,'No reception geometry hit');
 assert(/Empfang|Rezeptionsmarmor/.test(hit.object.name),'Blocked reception sightline: '+JSON.stringify({x,label,name:hit.object.name,point:hit.point.toArray()}));
 sightlines.push({x,target:label,first:hit.object.name});
}
const report={version:82,starRows:2,starsPerRow:5,doormen:2,receptionists:2,symmetricPortiers:true,tallDoubleDoors:true,continuousCarpet:true,guestRooms:32,watercraft:8,sightlines,validation:'Exported geometry and sightlines checked; browser/GPU visual fidelity not verified.'};
fs.writeFileSync('hotel-reference-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
