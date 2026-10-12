import assert from 'node:assert/strict';
import fs from 'node:fs';
import {T} from '../dist/core.js';
import {makeVolumetricPlant,createBotanyController,names} from '../dist/alpine-botany.js';
const report=[];
for(let kind=0;kind<names.length;kind++){
 let previous=Infinity;
 for(let level=0;level<3;level++){
  const g=makeVolumetricPlant(kind,level),p=g.attributes.position.array,n=g.attributes.normal.array,ix=g.index.array,edges=new Map();let volume=0,minArea=Infinity;
  assert([...p,...n].every(Number.isFinite));
  for(let j=0;j<ix.length;j+=3){
   const ids=Array.from(ix.subarray(j,j+3)),a=new T.Vector3().fromArray(p,ids[0]*3),b=new T.Vector3().fromArray(p,ids[1]*3),c=new T.Vector3().fromArray(p,ids[2]*3);
   const area=b.clone().sub(a).cross(c.clone().sub(a)).length();assert(area>1e-10,'Degenerate botanical triangle');minArea=Math.min(minArea,area);volume+=a.dot(b.clone().cross(c))/6;
   for(let k=0;k<3;k++){const u=ids[k],v=ids[(k+1)%3],key=Math.min(u,v)+':'+Math.max(u,v),e=edges.get(key)||{count:0,winding:0};e.count++;e.winding+=u<v?1:-1;edges.set(key,e);}
  }
  assert([...edges.values()].every(e=>e.count===2&&e.winding===0),'Open or inconsistent solid geometry');assert(volume>1e-7,'Inverted or flat plant');
  const size=g.boundingBox.getSize(new T.Vector3());assert(size.y>.65&&size.y>size.x*2&&size.y>size.z*2,'Plant is not upright');assert(ix.length<previous,'Detail levels do not descend');previous=ix.length;
  report.push({species:kind,level,triangles:ix.length/3,volume,height:size.y,closed:true});g.dispose();
 }
}
const rows=names.map(()=>[]);for(let k=0;k<names.length;k++)for(const [x,rank,foreground] of [[5,.01,true],[50,.01,false],[150,.01,false],[50,.9,false]])rows[k].push({x,y:0,z:0,h:.3,radial:.9,yaw:.2,rank,foreground});
const controller=createBotanyController(new T.Group(),rows),camera=new T.PerspectiveCamera();camera.position.set(0,0,0);let counts=controller.update(camera,true);
assert.deepEqual(counts,names.map(()=>[1,1,1]));
for(const list of controller.meshes){assert(list[0].castShadow);assert(!list[1].castShadow&&!list[2].castShadow);for(const m of list){assert(m.visible&&m.count===1);assert(!m.material.map&&m.material.side===T.FrontSide);}}
counts=controller.prepareExport();assert.deepEqual(counts,names.map(()=>[1,2,0]));assert(controller.meshes.every(list=>!list[2].visible));
camera.position.set(1000,0,0);counts=controller.update(camera,true);assert.deepEqual(counts,names.map(()=>[0,0,3]));
fs.writeFileSync('volumetric-botany-report.json',JSON.stringify({version:66,closedUprightSolidPlants:39,LODTransitionsVerified:true,singleDetailLevelPerPlant:true,geometry:report},null,2)+'\n');console.log('39 closed upright botanical solids and non-overlapping camera detail levels verified.');
// Coverage anchors remain visible and exportable even in distant meadow cells.
const anchorRows=names.map(()=>[{x:1000,y:0,z:0,h:.4,radial:.95,yaw:1.2,rank:.99,foreground:false,coverageAnchor:true}]);
const anchored=createBotanyController(new T.Group(),anchorRows);assert.deepEqual(anchored.update(new T.PerspectiveCamera(),true),names.map(()=>[0,0,1]));assert.deepEqual(anchored.prepareExport(),names.map(()=>[0,1,0]));
for(const list of anchored.meshes){const m=list[1],im=new T.Matrix4();m.getMatrixAt(0,im);const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(im);assert(m.boundingBox.clone().expandByScalar(1e-5).containsPoint(v),'Solid plant exceeds culling bounds');}}
console.log('Distant coverage anchors and actual plant culling bounds verified.');
