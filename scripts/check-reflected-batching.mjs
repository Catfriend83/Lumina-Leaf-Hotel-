import assert from 'node:assert/strict';
import {T} from '../dist/core.js';
import {optimizeStaticScene} from '../dist/static-performance.js';
const scene=new T.Scene(),material=new T.MeshStandardMaterial({name:'Naturstein'}),geometries=[new T.BoxGeometry(1,2,.3),new T.BoxGeometry(.5,1,.4)];
for(const sign of [1,-1]){const parent=new T.Group();parent.scale.z=sign;parent.position.set(14,0,61);scene.add(parent);for(const geometry of geometries){const mesh=new T.InstancedMesh(geometry,material,8);for(let i=0;i<8;i++)mesh.setMatrixAt(i,new T.Matrix4().makeTranslation(i*2,1,4));parent.add(mesh);}}
scene.updateMatrixWorld(true);
const poses=meshes=>{const out=[],m=new T.Matrix4();for(const mesh of meshes){if(mesh.isBatchedMesh){mesh._instanceInfo.forEach((info,i)=>{mesh.getMatrixAt(i,m);m.premultiply(mesh.matrixWorld);out.push(mesh.losslessGeometrySources[info.geometryIndex].uuid+':'+m.elements.map(x=>x.toFixed(5)).join(','));});}else for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);m.premultiply(mesh.matrixWorld);out.push(mesh.geometry.uuid+':'+m.elements.map(x=>x.toFixed(5)).join(','));}}return out.sort();};
const result=optimizeStaticScene({scene,materials:{stone:material}},{multiDraw:true});
assert.equal(result.optimized.length,2,'Positive and reflected meshes batch separately');assert.deepEqual(poses(result.originals.map(r=>r.source)),poses(result.optimized),'All world geometry placements preserved');
for(const mesh of result.optimized){for(let i=0;i<mesh._instanceInfo.length;i++){const m=new T.Matrix4();mesh.getMatrixAt(i,m);assert(m.determinant()>0,'No unsupported reflected instance matrices');}}
assert.equal(result.optimized.filter(o=>o.scale.z<0).length,1);result.dispose();console.log('Lossless mirrored scene batching and face winding passed.');
