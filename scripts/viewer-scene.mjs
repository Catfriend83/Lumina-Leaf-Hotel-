import * as T from '../dist/vendor/three.module.js';
import {makeVolumetricPlant} from '../dist/alpine-botany.js';
import {mergeGeometries,mergeVertices} from '../dist/vendor/addons/utils/BufferGeometryUtils.js';

// A model viewer frames geometry bounds. Keep the property as the viewing subject,
// and retain the distant landscape separately in the full-scene export.
export const viewerBounds={minX:-58.5,maxX:66.5,minZ:-45,maxZ:65};
// Preserve the previous cut for peripheral conifers; the broader property
// frame adds the corrected shore, water and low vegetation without importing
// another dense background tree into the portable 25 MiB viewer file.
const coniferBounds={minX:-29,maxX:58,minZ:-45,maxZ:45};
const coniferMaterials=new Set(['trunk','pine','pine2','Fototextur Tannennadeln und Schnee','Fotorealistische Tannensilhouette im entfernten Wald']);

function clipGeometry(geometry,clipBounds=viewerBounds){
 const names=Object.keys(geometry.attributes),output=Object.fromEntries(names.map(n=>[n,[]]));
 const index=geometry.index?.array,count=index?.length??geometry.attributes.position.count;
 const planes=[['minX',0,1],['maxX',0,-1],['minZ',2,1],['maxZ',2,-1]];
 const vertex=i=>Object.fromEntries(names.map(n=>{const a=geometry.attributes[n];return[n,Array.from(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize))];}));
 const interpolate=(a,b,t)=>Object.fromEntries(names.map(n=>[n,a[n].map((v,i)=>v+(b[n][i]-v)*t)]));
 for(let i=0;i<count;i+=3){
  let polygon=[vertex(index?index[i]:i),vertex(index?index[i+1]:i+1),vertex(index?index[i+2]:i+2)];
  for(const [key,axis,sign] of planes){
   const result=[],edge=clipBounds[key];
   for(let j=0;j<polygon.length;j++){
    const a=polygon[j],b=polygon[(j+1)%polygon.length],da=(a.position[axis]-edge)*sign,db=(b.position[axis]-edge)*sign;
    if(da>=0)result.push(a);
    if((da>=0)!==(db>=0))result.push(interpolate(a,b,da/(da-db)));
   }
   polygon=result;if(polygon.length<3)break;
  }
  for(let j=1;j<polygon.length-1;j++){
   const tri=[polygon[0],polygon[j],polygon[j+1]],a=tri[0].position,b=tri[1].position,c=tri[2].position;
   const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
   const area=(ab[1]*ac[2]-ab[2]*ac[1])**2+(ab[2]*ac[0]-ab[0]*ac[2])**2+(ab[0]*ac[1]-ab[1]*ac[0])**2;
   if(area<1e-12)continue;
   for(const v of tri)for(const n of names)output[n].push(...v[n]);
  }
 }
 if(!output.position.length)return null;
 const result=new T.BufferGeometry();
 for(const n of names)result.setAttribute(n,new T.Float32BufferAttribute(output[n],geometry.attributes[n].itemSize));
 result.normalizeNormals();result.setIndex(Array.from({length:result.attributes.position.count},(_,i)=>i));result.computeBoundingBox();result.computeBoundingSphere();return result;
}

export function createViewerScene(source){
 source.updateMatrixWorld(true);
 const scene=new T.Scene();scene.name='Lumina Leaf Hotel – GLBViewer';
 scene.userData={title:'Lumina Leaf Hotel',description:'Hotelanlage und Limousine ohne Himmelskugel. Der entfernte Hintergrund ist in der separaten Gesamtszene enthalten.',units:'meters',version:source.userData.version,guestRooms:40};
 const bounds=new T.Box3(new T.Vector3(viewerBounds.minX,-100,viewerBounds.minZ),new T.Vector3(viewerBounds.maxX,100,viewerBounds.maxZ));
 const batches=new Map(),materials=new Map(),lod=new Map();let retainedInstances=0,discardedInstances=0;
 const add=(object,matrix)=>{
  const clipBounds=coniferMaterials.has(object.material.name)?coniferBounds:viewerBounds;
  const objectBounds=clipBounds===viewerBounds?bounds:new T.Box3(new T.Vector3(clipBounds.minX,-100,clipBounds.minZ),new T.Vector3(clipBounds.maxX,100,clipBounds.maxZ));
  object.geometry.computeBoundingBox();const box=object.geometry.boundingBox.clone().applyMatrix4(matrix);
  if(!box.intersectsBox(objectBounds)){discardedInstances++;return;}
  let base=object.geometry;
  if(object.userData.alpineBotany){
   const key='botany:'+object.userData.species;
   if(!lod.has(key))lod.set(key,makeVolumetricPlant(object.userData.species,1));
   base=lod.get(key);
  }
  // Small decorative spheres do not need the browser's higher tessellation.
  if(base.type==='SphereGeometry'&&base.parameters.widthSegments>12){
   if(!lod.has(base.uuid))lod.set(base.uuid,new T.SphereGeometry(base.parameters.radius,10,6));
   base=lod.get(base.uuid);
  }
  if((base.type==='CylinderGeometry'||base.type==='ConeGeometry')&&base.parameters.radialSegments>8){
   const p=base.parameters;
   if(!lod.has(base.uuid))lod.set(base.uuid,base.type==='ConeGeometry'?new T.ConeGeometry(p.radius,p.height,8):new T.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,8));
   base=lod.get(base.uuid);
  }
  let g=base.clone().applyMatrix4(matrix);
  // UV coordinates are unnecessary on solid-color surfaces. Removing them also
  // lets coincident sphere seam vertices merge without changing the silhouette.
  if(!['map','emissiveMap','roughnessMap','metalnessMap','aoMap','alphaMap'].some(key=>object.material[key]))g.deleteAttribute('uv');
  if(!objectBounds.containsBox(box)){const clipped=clipGeometry(g,clipBounds);g.dispose();g=clipped;if(!g)return;}
  if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
  retainedInstances++;const key=object.material.uuid+Object.keys(g.attributes).sort().join(',');
  let batch=batches.get(key);if(!batch){
   let material=materials.get(object.material.uuid);if(!material){material=object.material.clone();material.bumpMap=null;material.bumpScale=1;material.normalMap=null;materials.set(object.material.uuid,material);}
   batch={material,geometries:[]};batches.set(key,batch);
  }
  batch.geometries.push(g);
 };
 source.traverse(o=>{
  if(!o.isMesh||!o.visible||o.name==='Himmelspanorama 360°'||o.material.name==='Lichtschein')return;
  if(o.isInstancedMesh){const m=new T.Matrix4();for(let i=0;i<o.count;i++){if(o.userData.alpineBotany&&i%5!==0)continue;o.getMatrixAt(i,m);add(o,m.clone().premultiply(o.matrixWorld));}}
  else add(o,o.matrixWorld);
 });
 // Split large material batches into 16-bit index chunks without moving vertices
 // or altering triangles, normals, UVs, or material assignments.
 const split16=geometry=>{
  if(geometry.attributes.position.count<=65535)return [geometry];
  const parts=[],names=Object.keys(geometry.attributes);let map=new Map(),vertices=[],indices=[];
  const flush=()=>{if(!indices.length)return;const part=new T.BufferGeometry();for(const name of names){const a=geometry.attributes[name],values=new a.array.constructor(vertices.length*a.itemSize);vertices.forEach((old,i)=>values.set(a.array.subarray(old*a.itemSize,(old+1)*a.itemSize),i*a.itemSize));part.setAttribute(name,new T.BufferAttribute(values,a.itemSize,a.normalized));}part.setIndex(indices);part.computeBoundingBox();part.computeBoundingSphere();parts.push(part);map=new Map();vertices=[];indices=[];};
  const source=geometry.index.array;for(let i=0;i<source.length;i+=3){const tri=[source[i],source[i+1],source[i+2]],fresh=new Set(tri.filter(v=>!map.has(v))).size;if(vertices.length+fresh>65535)flush();for(const v of tri){if(!map.has(v)){map.set(v,vertices.length);vertices.push(v);}indices.push(map.get(v));}}flush();geometry.dispose();return parts;
 };
 let outputMeshes=0;
 for(const batch of batches.values()){
  const merged=mergeGeometries(batch.geometries);if(!merged)throw new Error('Unable to merge viewer geometry');
  const geometry=mergeVertices(merged,1e-5);merged.dispose();geometry.normalizeNormals();
  batch.geometries.forEach(g=>g.dispose());for(const part of split16(geometry)){const mesh=new T.Mesh(part,batch.material);mesh.name=batch.material.name;scene.add(mesh);outputMeshes++;}
 }
 source.traverse(o=>{
  if(!o.isDirectionalLight&&!o.isPointLight)return;
  if(o.isPointLight&&!bounds.containsPoint(o.getWorldPosition(new T.Vector3())))return;
  const light=o.clone(false);o.matrixWorld.decompose(light.position,light.quaternion,light.scale);
  if(o.isDirectionalLight){const target=new T.Object3D();target.position.set(0,0,-1);light.add(target);light.target=target;}
  scene.add(light);
 });
 const camera=new T.PerspectiveCamera(27.88,16/9,.1,350);
 camera.name='Filmische Hotelansicht';camera.position.set(7,26,112);camera.lookAt(6,3.5,-10);scene.add(camera);
 scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(scene),size=box.getSize(new T.Vector3());
 if(size.x>viewerBounds.maxX-viewerBounds.minX+.01||size.z>viewerBounds.maxZ-viewerBounds.minZ+.01||!size.toArray().every(Number.isFinite)||size.y<10)throw new Error('Unexpected viewer framing');
 return {scene,report:{bounds:{min:box.min.toArray(),max:box.max.toArray()},size:size.toArray(),retainedInstances,discardedInstances,meshes:outputMeshes}};
}
