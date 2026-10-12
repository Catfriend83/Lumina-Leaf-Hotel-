import {T} from './core.js?v=75';

// Runtime-only reorganization. Every original vertex, material and placement survives.
// No LOD, density reduction, texture conversion or resolution changes.
export function optimizeStaticScene(built,{multiDraw=false,cellSize=160}={}){
 const {scene,car,activity}=built,originals=[],optimized=[],matrix=new T.Matrix4(),color=new T.Color();
 const report={fullGeometry:true,multiDraw,batchedDrawGroups:0,batchedInstances:0,spatialChunks:0,spatialInstances:0,sharedMaterials:0,staticTransforms:0};
 scene.updateMatrixWorld(true);
 const dynamic=o=>{for(let a=o;a;a=a.parent)if(a===car||a===activity?.group||a.userData.alpineBotany)return true;return false;};
 // Only identical standard material values are shared; custom shaders stay independent.
 const canonical=new Map(),materialMap=new Map(),ignored=new Set(['uuid','name','userData','version','_listeners']);
 function signature(m){
  if(!m.isMeshStandardMaterial||Object.keys(m.userData||{}).length||m.onBeforeCompile!==T.Material.prototype.onBeforeCompile||m.customProgramCacheKey!==T.Material.prototype.customProgramCacheKey)return null;
  const values={};for(const key of Object.keys(m).sort()){if(ignored.has(key))continue;const v=m[key];if(typeof v==='function')return null;if(v?.isTexture)values[key]=['texture',v.uuid];else if(v?.toArray)values[key]=v.toArray();else if(v===null||typeof v!=='object')values[key]=v;else if(Array.isArray(v)&&v.every(x=>typeof x!=='object'))values[key]=v;else if(Object.getPrototypeOf(v)===Object.prototype&&Object.values(v).every(x=>x===null||typeof x!=='object'))values[key]=Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)));else return null;}return JSON.stringify(values);
 }
 function share(m){if(!m||materialMap.has(m))return materialMap.get(m)||m;const key=signature(m);let shared=key&&canonical.get(key);if(!shared){shared=m;if(key)canonical.set(key,m);}else report.sharedMaterials++;materialMap.set(m,shared);return shared;}
 // Prefer the material dictionary so later environment-map assignments stay linked.
 for(const m of Object.values(built.materials||{}))if(m?.isMaterial)share(m);
 scene.traverse(o=>{if(o.material&&!dynamic(o)&&!Array.isArray(o.material))o.material=share(o.material);});
 const sources=[];
 scene.traverse(o=>{if(!o.isInstancedMesh||!o.visible||dynamic(o)||Array.isArray(o.material)||o.material.transparent||o.material.isShaderMaterial||o.geometry.morphAttributes.position||o.customDepthMaterial||o.customDistanceMaterial)return;const g=o.geometry,n=g.index?.count||g.attributes.position.count;if(g.drawRange.start!==0||g.drawRange.count<n)return;if(Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute||a.isInstancedBufferAttribute))return;sources.push(o);});
 function flags(o){return [o.material.uuid,o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask,!!o.geometry.index,Object.entries(o.geometry.attributes).map(([k,a])=>[k,a.itemSize,a.normalized,a.array.constructor.name]).sort().join(';')].join('|');}
 function remember(source){originals.push({source,visible:source.visible});source.visible=false;}
 function setup(mesh,source){mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.renderOrder=source.renderOrder;mesh.layers.mask=source.layers.mask;mesh.frustumCulled=true;mesh.userData.losslessRuntimeBatch=true;scene.add(mesh);optimized.push(mesh);}
 if(multiDraw){
  const groups=new Map();for(const o of sources){const key=flags(o);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}
  for(const list of groups.values()){
   const geometries=[...new Set(list.map(o=>o.geometry))],count=list.reduce((n,o)=>n+o.count,0);if(geometries.length<2||count<16)continue;
   const vertices=geometries.reduce((n,g)=>n+g.attributes.position.count,0),indices=geometries.reduce((n,g)=>n+(g.index?.count||0),0);
   const batch=new T.BatchedMesh(count,vertices,Math.max(indices,vertices),list[0].material);batch.name='Vollständige statische Geometrie – '+list[0].material.name;batch.sortObjects=false;batch.perObjectFrustumCulled=true;
   const ids=new Map(geometries.map(g=>[g,batch.addGeometry(g)]));batch.losslessGeometrySources=geometries;
   for(const o of list){for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);const id=batch.addInstance(ids.get(o.geometry));batch.setMatrixAt(id,matrix);if(o.instanceColor){o.getColorAt(i,color);batch.setColorAt(id,color);}}remember(o);}
   batch.computeBoundingBox();batch.computeBoundingSphere();setup(batch,list[0]);report.batchedDrawGroups++;report.batchedInstances+=count;
  }
 }
 // Devices without multi-draw keep GPU instancing, with tighter spatial bounds.
 for(const source of sources){
  if(!source.visible||source.count<24||(source.geometry.index?.count||source.geometry.attributes.position.count)<4500)continue;
  source.computeBoundingBox();const bounds=source.boundingBox.clone().applyMatrix4(source.matrixWorld);if(Math.max(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)<cellSize*1.5)continue;
  const cells=new Map();for(let i=0;i<source.count;i++){source.getMatrixAt(i,matrix);matrix.premultiply(source.matrixWorld);const key=Math.floor(matrix.elements[12]/cellSize)+','+Math.floor(matrix.elements[14]/cellSize);if(!cells.has(key))cells.set(key,[]);cells.get(key).push({matrix:matrix.clone(),color:source.instanceColor?(source.getColorAt(i,color),color.clone()):null});}
  for(const rows of cells.values()){const mesh=new T.InstancedMesh(source.geometry,source.material,rows.length);mesh.name=source.name+' – räumlicher Abschnitt';rows.forEach((r,i)=>{mesh.setMatrixAt(i,r.matrix);if(r.color)mesh.setColorAt(i,r.color);});mesh.computeBoundingBox();mesh.computeBoundingSphere();setup(mesh,source);report.spatialChunks++;report.spatialInstances+=rows.length;}
  remember(source);
 }
 // Static transforms need no repeated matrix composition. Moving watercraft remain live.
 scene.matrixAutoUpdate=false;
 scene.traverse(o=>{if(o===scene||o.isCamera||o.isLight||dynamic(o))return;if(o.matrixAutoUpdate){o.updateMatrix();o.matrixAutoUpdate=false;report.staticTransforms++;}});
 scene.updateMatrixWorld(true);
 let originalMode=false;
 function fullDetail(enabled){if(enabled===originalMode)return;originalMode=enabled;for(const o of optimized)o.visible=!enabled;for(const r of originals)r.source.visible=enabled?r.visible:false;}
 function budget(camera,original=false){
  camera.updateMatrixWorld();const f=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)),sphere=new T.Sphere();let triangles=0,calls=0;
  const meshes=original?originals.map(r=>r.source):optimized;
  for(const o of meshes){if(o.isBatchedMesh){let drawn=false;for(let id=0;id<o._instanceInfo.length;id++){const info=o._instanceInfo[id];if(!info.active||!info.visible)continue;const g=o._geometryInfo[info.geometryIndex];o.getBoundingSphereAt(info.geometryIndex,sphere);o.getMatrixAt(id,matrix);sphere.applyMatrix4(matrix).applyMatrix4(o.matrixWorld);if(f.intersectsSphere(sphere)){triangles+=g.count/3;drawn=true;}}if(drawn)calls++;}
   else {if(!o.boundingSphere)o.computeBoundingSphere();sphere.copy(o.boundingSphere).applyMatrix4(o.matrixWorld);if(f.intersectsSphere(sphere)){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.count||1);calls++;}}
  }return {triangles:Math.round(triangles),drawCalls:calls};
 }
 return {report,originals,optimized,fullDetail,budget,dispose(){fullDetail(true);for(const o of optimized){o.removeFromParent();o.dispose();}}};
}
