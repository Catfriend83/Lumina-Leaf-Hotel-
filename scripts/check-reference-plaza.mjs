import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {T} from '../dist/core.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath(path.resolve('dist/assets/lumina-script.otf'),'Lumina Script');
globalThis.document={createElement:()=>createCanvas(1,1)};
const before=new Map(),allowed=new Set(),soil=[];
function signature(o){const h=crypto.createHash('sha256');for(const [key,a]of Object.entries(o.geometry.attributes))h.update(key).update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));if(o.geometry.index)h.update(Buffer.from(o.geometry.index.array.buffer));if(o.instanceMatrix)h.update(Buffer.from(o.instanceMatrix.array.buffer));h.update(JSON.stringify(o.matrixWorld.elements));h.update(o.material.uuid);return h.digest('hex');}
globalThis.plazaBefore=scene=>{
 scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isMesh){before.set(o,signature(o));let a=o;while(a){if(a.userData.plazaRefinement&&a.userData.kind==='soil'||a.userData.plazaBench||a.userData.villageFountain||a.userData.plazaTree||/^Eingefasstes symmetrisches Baumbeet |^Geplante Baumscheibe |^Geländeangepasstes Fundament des zentralen Dorfbrunnens$/.test(a.name))allowed.add(o);a=a.parent;}if(o.userData.completePlazaRepair&&o.userData.kind==='stone')allowed.add(o);if(o.material.name.includes('erde')||o.material.name==='soil')soil.push({name:o.name,extras:o.userData});}});
 console.log(JSON.stringify({preRebuildSoil:soil}));
};
globalThis.plazaAfter=(scene,result)=>{
 scene.updateMatrixWorld(true);let preserved=0;for(const [o,hash]of before)if(!allowed.has(o)){assert(o.parent,'Unrelated object removed: '+o.name);assert.equal(signature(o),hash,'Unrelated geometry, placement or material changed: '+o.name);preserved++;}
 const {center,filledOpenings}=result.report;assert.equal(filledOpenings.length,4);const floor=scene.getObjectByName('Einheitlicher Natursteinbelag des vollständigen Dorfplatzes'),ray=new T.Raycaster();
 const ground=(x,z)=>{ray.set(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(floor,false)[0];assert(hit,'Missing paving at '+x+','+z);return hit.point.y;};
 const aabb=o=>new T.Box3().setFromObject(o),fountain=result.fountain.group,fr=result.report.fountainOuterRadius,gaps=[];
 for(const b of result.benches){const forward=new T.Vector3(0,0,1).applyQuaternion(b.quaternion),toward=new T.Vector3(center[0]-b.position.x,0,center[1]-b.position.z).normalize();assert(forward.dot(toward)>.999999999);const box=aabb(b),front=new T.Vector3().copy(b.position).addScaledVector(forward,.28);const gap=Math.hypot(front.x-center[0],front.z-center[1])-fr;assert(Math.abs(gap-1)<1e-9,'Bench clearance differs: '+gap);gaps.push(gap);assert(Math.abs(box.min.y-ground(b.position.x,b.position.z))<.00002,'Bank floats');for(const other of result.benches)if(other!==b)assert(!box.intersectsBox(aabb(other)),'Benches overlap');}
 assert.equal(result.benches.length,4);assert(Math.abs(ground(...center)-fountain.position.y)<1e-6);
 const supportMeshes=[];scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&(o.userData.villageGround||o.userData.alpineTerrain||o.userData.terrainTransition||o.userData.plazaRefinement||o.userData.completePlazaRepair))supportMeshes.push(o);});
 for(const [x,z]of [[-137.46857196541154,-159.18609902793065],[-138.30028554880138,-150.07013011599963],[-169.6,-156.2],[-151.2,-156.2]]){const y=ground(x,z);ray.set(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));const hits=ray.intersectObjects(supportMeshes,false);assert.equal(hits[0].object,floor,'Old ground protrudes through restored planting opening: '+hits[0].object.name);assert(Math.abs(hits[0].point.y-y)<.00001);}
 const old=[];scene.traverse(o=>{if(o.userData.plazaTree||/^Geplante Baumscheibe |^Eingefasstes symmetrisches Baumbeet /.test(o.name))old.push(o.name);});assert.deepEqual(old,[]);
 const p=floor.geometry.attributes.position,uv=floor.geometry.attributes.uv;for(let i=0;i<p.count;i++){assert(Math.abs(uv.getX(i)-p.getX(i)/1.2)<.00002);assert(Math.abs(uv.getY(i)-p.getZ(i)/1.2)<.00002);}
 const report={...result.report,preservedUnrelatedMeshes:preserved,measuredFrontClearances:gaps,oldCircularAssemblies:old.length,groundContactsVerified:true,pavingUVPhaseVerified:true};fs.writeFileSync('reference-plaza-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
};
let source=fs.readFileSync('dist/scene.js','utf8');source=source.replace(/from '([^']+)'/g,(_,url)=>'from '+JSON.stringify(new URL(url,pathToFileURL(path.resolve('dist/scene.js'))).href));source=source.replace('const referencePlaza=rebuildReferencePlaza(scene,materials);','globalThis.plazaBefore(scene);const referencePlaza=rebuildReferencePlaza(scene,materials);globalThis.plazaAfter(scene,referencePlaza);');
const {createScene}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
await createScene({createCanvas,loadTexture:async p=>{const t=new T.Texture(await loadImage(path.resolve('dist',p)));t.needsUpdate=true;return t;}});
