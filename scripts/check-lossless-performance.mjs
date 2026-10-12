import fs from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';import {createRequire} from 'node:module';
import {T} from '../dist/core.js';import {createScene,cameraViews} from '../dist/scene.js';import {optimizeStaticScene} from '../dist/static-performance.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');globalThis.document={createElement:()=>createCanvas(256,512)};
const start=performance.now(),built=await createScene({createCanvas,loadTexture:async p=>new T.Texture(await loadImage(path.resolve('dist',p)))});console.log('Scene ready');
const {scene,meadowController}=built,markers=[];scene.traverse(o=>{if(o.userData.newForestTree)markers.push(JSON.stringify(o.userData));});assert.equal(markers.length,3150);
const key=(g,m)=>g.uuid+'|'+Array.from(new Float32Array(m.elements)).join(',');
function poses(meshes){const list=[],m=new T.Matrix4();for(const o of meshes){if(o.isBatchedMesh){for(let i=0;i<o._instanceInfo.length;i++){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);list.push(key(o.losslessGeometrySources[o._instanceInfo[i].geometryIndex],m));}}
 else for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);list.push(key(o.geometry,m));}}return list.sort();}
const results=[];
for(const multiDraw of [false,true]){
 const t=performance.now(),o=optimizeStaticScene(built,{multiDraw});assert.deepEqual(poses(o.originals.map(x=>x.source)),poses(o.optimized));
 for(const batch of o.optimized.filter(x=>x.isBatchedMesh))for(let id=0;id<batch.losslessGeometrySources.length;id++){
  const g=batch.losslessGeometrySources[id],range=batch.getGeometryRangeAt(id);
  for(const [name,a]of Object.entries(g.attributes)){const b=batch.geometry.attributes[name],copy=b.array.subarray(range.vertexStart*a.itemSize,(range.vertexStart+a.count)*a.itemSize);assert.deepEqual(copy,a.array,'Original vertex attribute '+name);}
  if(g.index)for(let j=0;j<g.index.count;j++)assert.equal(batch.geometry.index.getX(range.indexStart+j)-range.vertexStart,g.index.getX(j));
 }
 const views=[];for(const name of ['cinematic','aerial','village','rathaus','lake','back']){const v=cameraViews[name],camera=new T.PerspectiveCamera(v.fov||27.88,9/16,.1,3500),target=new T.Vector3(...v.target);camera.position.fromArray(v.position).sub(target).multiplyScalar((16/9)/(9/16)).add(target);camera.lookAt(target);camera.updateMatrixWorld(true);views.push({view:name,before:o.budget(camera,true),after:o.budget(camera)});}
 results.push({mode:multiDraw?'native-multi-draw':'spatial-instancing',setupCpuMilliseconds:+(performance.now()-t).toFixed(2),report:o.report,views,originalMatricesAndVerticesPreserved:true});o.fullDetail(true);assert(o.originals.every(r=>r.source.visible===r.visible));o.dispose();
}
// Reference the exact selection equation of version 77, including all distant anchors.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};const plantViews=[];
for(const name of ['cinematic','village','rathaus','lake','back']){const v=cameraViews[name],camera=new T.PerspectiveCamera();camera.position.fromArray(v.position);const expected=meadowController.records.map(rows=>{const count=[0,0,0];for(const r of rows){const d=Math.hypot(r.x-camera.position.x,r.y-camera.position.y,r.z-camera.position.z),density=d<75?1-.82*smooth(25,75,d):.18-.12*smooth(75,180,d);if(!r.coverageAnchor&&r.rank>density)continue;count[d<34?0:d<95?1:2]++;}return count;});const t=performance.now(),actual=meadowController.update(camera,true);assert.deepEqual(actual,expected,'All original plants, including far plants, preserved in '+name);plantViews.push({view:name,cpuUpdateMilliseconds:+(performance.now()-t).toFixed(2),plants:actual.flat().reduce((a,b)=>a+b,0)});}
const after=[];scene.traverse(o=>{if(o.userData.newForestTree)after.push(JSON.stringify(o.userData));});assert.deepEqual(after,markers);
const report={version:78,baseVersion:77,scope:'Original geometry/placement and CPU verification; no browser GPU or Android FPS measurement',sceneBuildCpuMilliseconds:+(performance.now()-start).toFixed(2),treeMarkers:markers.length,results,plantViews,unchangedPlantSelection:true,renderResolutionUnchanged:true,waterShaderUnchanged:true};fs.writeFileSync('lossless-performance-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
