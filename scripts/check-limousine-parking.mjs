// Run with Node and @napi-rs/canvas available, from the repository root.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {T} from '../dist/core.js';
import {createScene} from '../dist/scene.js';
import {LIMO_PARK,LIMO_PARK_WORLD,parkingAccessSection,closedParkingSurface} from '../dist/limousine-parking.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {scene}=await createScene({createCanvas,fastHotel:true,
 loadTexture:async p=>new T.Texture(await loadImage(path.resolve('dist',p)))});
scene.updateMatrixWorld(true);
const expected=new Map([
 ['Sauber angebundener Gartenweg rechts neben dem Hotel','30ed4b0f5c40bd7f736252925458faebfba77d1e49ee10039cc6ce879aff5440'],
 ['Durchgehender seitlicher Rand des Gartenwegs','bba7ec2ade341938a7b4043f3e505b677ac5d88cb785693baf61a3600ffa8016']
]);
for(const [name,hash] of expected){
 const o=scene.getObjectByName(name),h=crypto.createHash('sha256');assert(o);
 for(const [key,a]of Object.entries(o.geometry.attributes).sort())h.update(key).update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));
 if(o.geometry.index)h.update(Buffer.from(o.geometry.index.array.buffer));
 assert.equal(h.digest('hex'),hash,'Original path position, UVs and normals');
 assert.deepEqual(o.matrixWorld.toArray(),[1,0,0,0,0,1,0,0,0,0,1,0,-3.4,0,8,1]);
}
assert.deepEqual(scene.userData.parkingLamps.moves.map(x=>x.parts),[10,10]);
assert.deepEqual(scene.userData.parkingLamps.moves.map(x=>x.to),[[47.3,-6],[47.3,7]]);
assert.equal(LIMO_PARK.bayWidth,7.5);
const park=scene.getObjectByName('Privater Limousinenparkplatz – Lumina Leaf Hotel');
assert.deepEqual(park.position.toArray(),[14,0,61]);
const cars=park.getObjectByName('Drei identische geparkte Lumina Leaf Limousinen');
const boxes=[new T.Box3(),new T.Box3(),new T.Box3()];
cars.traverse(o=>{if(!o.isInstancedMesh)return;o.geometry.computeBoundingBox();
 for(let i=0;i<o.count;i++){const matrix=new T.Matrix4();o.getMatrixAt(i,matrix);
  boxes[i%3].union(o.geometry.boundingBox.clone().applyMatrix4(matrix.premultiply(o.matrixWorld)));}
});
boxes.forEach((box,i)=>{
 assert(Math.abs(box.getCenter(new T.Vector3()).x-(LIMO_PARK.bays[i]+14))<.01);
 assert(LIMO_PARK.bayWidth-box.getSize(new T.Vector3()).x>3.5,'Practical lateral vehicle clearance');
 assert(box.min.z>-14.7&&box.max.z<5.5,'Cars remain inside the bay length');
});
const labels=park.getObjectByName('Drei gut lesbare Limousine-Bodenaufschriften');
for(let i=0;i<labels.count;i++){const a=new T.Matrix4();labels.getMatrixAt(i,a);a.premultiply(labels.matrixWorld);
 assert(a.determinant()>0,'No mirrored text');assert(a.elements[0]<0,'Opposite reading direction');}
for(let z=19;z<=28.4;z+=.01)assert(parkingAccessSection(0,z).right<parkingAccessSection(1,z).left);
for(let i=0;i<2;i++){const s=parkingAccessSection(i,28.4);assert(s.left>=-58.5&&s.right<=66.4969);}
const terrain=[];scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.name==='Wiesen und natürlicher Talboden')terrain.push(o);});
const ray=new T.Raycaster();let checked=0;
for(let x=LIMO_PARK_WORLD.minX+.5;x<LIMO_PARK_WORLD.maxX;x++)for(let z=-17.5;z<19;z++){
 ray.set(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));
 assert(!ray.intersectObjects(terrain,false).some(h=>h.point.y>-.075),'No meadow through asphalt');checked++;
}
// Check actual paving topology, rather than trusting the builder metadata.
for(const o of park.children.filter(o=>o.userData.parkingAccess)){
 const counts=new Map(),ix=o.geometry.index;
 for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){
  const a=ix.getX(i+j),b=ix.getX(i+(j+1)%3),key=[Math.min(a,b),Math.max(a,b)].join(',');
  counts.set(key,(counts.get(key)||0)+1);
 }
 assert([...counts.values()].every(n=>n===2),'Closed manifold approach');
}
// Inspect actual new geometry: plants remain outside paving and the unchanged path.
const landscape=park.getObjectByName('Alpiner Limousinenhof – Pflanzung und Ausstattung');
assert(landscape);assert.equal(landscape.userData.trees,2);
const plantNames=new Set(['Salbeigrüne Sträucher – Limousinenhof','Ziergras – Limousinenhof']);
let plants=0;
landscape.traverse(o=>{if(!o.isInstancedMesh||!plantNames.has(o.material.name))return;
 for(let i=0;i<o.count;i++){const matrix=new T.Matrix4();o.getMatrixAt(i,matrix);
  matrix.premultiply(o.matrixWorld);const v=new T.Vector3().setFromMatrixPosition(matrix);
  assert(Number.isFinite(v.y));
  assert(!(v.x>=46&&v.x<=82&&v.z>=-18&&v.z<=19),'Plants outside parking surface');
  if(v.z>19&&v.z<28.4)for(let lane=0;lane<2;lane++){
   const a=parkingAccessSection(lane,v.z);
   assert(v.x<a.left||v.x>a.right,'Plants outside access lanes');
  }
  plants++;
 }
});
assert(plants>100);assert.equal(landscape.children.filter(o=>o.isPointLight).length,3);
for(const o of landscape.children.filter(o=>o.userData.landscapeBed||o.userData.parkingDrivewayEdging)){
 const counts=new Map(),ix=o.geometry.index;
 for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){
  const a=ix.getX(i+j),b=ix.getX(i+(j+1)%3),key=[Math.min(a,b),Math.max(a,b)].join(',');
  counts.set(key,(counts.get(key)||0)+1);
 }
 assert([...counts.values()].every(n=>n===2),'Closed planting and curb geometry');
}
console.log(JSON.stringify({luxuryLandscapingChecked:true,plantParts:plants,...landscape.userData}));
console.log(JSON.stringify({pathUnchanged:true,parkedCars:3,bayWidth:7.5,
 lamps:2,uniformLampSpacing:13,unmirroredLabels:3,terrainSamples:checked,closedApproaches:2}));
