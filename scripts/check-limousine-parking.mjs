// Run with Node and @napi-rs/canvas available, from the repository root.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {T} from '../dist/core.js';
import {createScene} from '../dist/scene.js';
import {HOTEL_DRIVE as ROAD} from '../dist/hotel-drive-data.js';
import {LIMO_PARK,LIMO_PARK_WORLD,parkingAccessSection,closedParkingSurface,PARKING_CORNERS} from '../dist/limousine-parking.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {scene,materials}=await createScene({createCanvas,fastHotel:true,
 loadTexture:async p=>new T.Texture(await loadImage(path.resolve('dist',p)))});
scene.updateMatrixWorld(true);
const retainedPath=scene.getObjectByName('Sauber angebundener Gartenweg rechts neben dem Hotel');assert(retainedPath);
const connection=scene.userData.parkingGardenConnection;assert(connection?.removedBlindSpur&&connection.closedPaving);assert.equal(connection.pathWidth,2.2);
assert.equal(connection.join[2],-10);
assert.deepEqual(scene.userData.parkingLamps.moves.map(x=>x.parts),[10,10,10]);
assert.deepEqual(scene.userData.parkingLamps.moves.map(x=>x.to),[[45.15,-10],[45.15,6],[45.15,-31.85]]);
assert.equal(LIMO_PARK.bayWidth,4.3);
const park=scene.getObjectByName('Privater Limousinenparkplatz – Lumina Leaf Hotel');
assert.deepEqual(park.position.toArray(),[14,0,61]);
assert.equal(park.userData.markings.parts,12);assert.equal(park.userData.markings.physicalWidth,.09);
const paint=[];park.traverse(o=>{if(o.isInstancedMesh&&o.material.name==='Durchgezogene weiße Limousinen-Stellplatzlinien')paint.push(o);});assert.equal(paint.length,1);assert.equal(paint[0].count,12);
assert.equal(park.getObjectByName('Einbahnführung innerhalb des Limousinenhofs'),undefined);
const hotel=scene.getObjectByName('Lumina Leaf Hotel und Außenanlage');const terracePoint=hotel.localToWorld(new T.Vector3(20.5,.04,-48.4));assert(terracePoint.distanceTo(new T.Vector3(...connection.terraceJoin))<1e-8);
const newWalk=scene.getObjectByName('Durchgehender Fußweg zur vorhandenen Terrasse');assert(newWalk);const edges=new Map(),wi=newWalk.geometry.index;
for(let i=0;i<wi.count;i+=3)for(let j=0;j<3;j++){const a=wi.getX(i+j),b=wi.getX(i+(j+1)%3),key=[Math.min(a,b),Math.max(a,b)].join(',');edges.set(key,(edges.get(key)||0)+1);}assert([...edges.values()].every(n=>n===2),'New terrace connection is closed');
const cars=park.getObjectByName('Drei identische geparkte Lumina Leaf Limousinen');
const boxes=[new T.Box3(),new T.Box3(),new T.Box3()];
cars.traverse(o=>{if(!o.isInstancedMesh)return;o.geometry.computeBoundingBox();
 for(let i=0;i<o.count;i++){const matrix=new T.Matrix4();o.getMatrixAt(i,matrix);
  boxes[i%3].union(o.geometry.boundingBox.clone().applyMatrix4(matrix.premultiply(o.matrixWorld)));}
});
boxes.forEach((box,i)=>{
 assert(Math.abs(box.getCenter(new T.Vector3()).x-(LIMO_PARK.bays[i]+14))<.20);
 assert(box.min.x>46.5&&box.max.x<87.5&&box.min.z>-30.5&&box.max.z<15.5,'Cars inside maneuvering court');
});
const labels=park.getObjectByName('Drei gut lesbare Limousine-Bodenaufschriften');
assert.equal(labels.count,3);assert.equal(labels.userData.text,'LIMOUSINE');
for(let i=0;i<labels.count;i++){const a=new T.Matrix4();labels.getMatrixAt(i,a);a.premultiply(labels.matrixWorld);
 assert(a.determinant()>0,'No mirrored text');assert(a.elements[0]>0,'L begins on the left when viewed from the vehicle front');}
for(let z=19;z<=28.4;z+=.01)assert(parkingAccessSection(0,z).right<parkingAccessSection(1,z).left);
for(let i=0;i<2;i++){const s=parkingAccessSection(i,28.4);assert(s.left>=46&&s.right<=102);}
const terrain=[];scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.name==='Wiesen und natürlicher Talboden')terrain.push(o);});
const ray=new T.Raycaster();let checked=0;
for(let x=LIMO_PARK_WORLD.minX+.5;x<LIMO_PARK_WORLD.maxX;x++)for(let z=-30.5;z<19;z++){
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
assert.equal(landscape.userData.cornerLamps,4);
assert.deepEqual(landscape.children.filter(o=>o.userData.parkingCornerLamp).map(o=>[o.position.x,o.position.z]),PARKING_CORNERS);
const plantNames=new Set(['Salbeigrüne Sträucher – Limousinenhof','Ziergras – Limousinenhof']);
let plants=0;
landscape.traverse(o=>{if(!o.isInstancedMesh||!plantNames.has(o.material.name))return;
 for(let i=0;i<o.count;i++){const matrix=new T.Matrix4();o.getMatrixAt(i,matrix);
  matrix.premultiply(o.matrixWorld);const v=new T.Vector3().setFromMatrixPosition(matrix);
  assert(Number.isFinite(v.y));
  assert(!(v.x>=46&&v.x<=88&&v.z>=-31&&v.z<=19),'Plants outside parking surface');
  if(v.z>19&&v.z<28.4)for(let lane=0;lane<2;lane++){
   const a=parkingAccessSection(lane,v.z);
   assert(v.x<a.left||v.x>a.right,'Plants outside access lanes');
  }
  plants++;
 }
});
assert(plants>=68);assert.equal(landscape.children.filter(o=>o.isPointLight).length,3);
for(const o of landscape.children.filter(o=>o.userData.landscapeBed||o.userData.parkingDrivewayEdging)){
 const counts=new Map(),ix=o.geometry.index;
 for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){
  const a=ix.getX(i+j),b=ix.getX(i+(j+1)%3),key=[Math.min(a,b),Math.max(a,b)].join(',');
  counts.set(key,(counts.get(key)||0)+1);
 }
 assert([...counts.values()].every(n=>n===2),'Closed planting and curb geometry');
}
// Ray tests cover the extended road and both complete vehicle paths.
const asphalt=[];scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.material===materials.asphalt)asphalt.push(o);});
const down=new T.Raycaster(),sample=(objects,x,z)=>{down.set(new T.Vector3(x,20,z),new T.Vector3(0,-1,0));return down.intersectObjects(objects,false)[0];};
let roadSamples=0;
for(let x=65.8;x<=101.8;x+=.4)for(const z of [28.6,30,33.9,38,39.5]){
 const h=sample(asphalt,x,z);assert(h,'Connected main road');assert(Math.abs(h.point.y+.005)<.0001);
 assert(!sample(terrain,x,z)||sample(terrain,x,z).point.y<-.07,'No terrain through road');roadSamples++;
}
for(let lane=0;lane<2;lane++)for(let z=19.1;z<34;z+=.2){
 const s=parkingAccessSection(lane,z),hit=sample(asphalt,s.center,z);assert(hit,'Gate joined to main road: '+lane+','+s.center+','+z);
 assert(Math.abs(s.center-[55,74.5][lane])<1e-6,'Straight approach');
}
// All planting bases must meet the actual bed tops, including the rear row.
const beds=landscape.children.filter(o=>o.userData.landscapeBed);let plantContacts=0;
landscape.traverse(o=>{if(!o.isInstancedMesh||o.material.name!=='Salbeigrüne Sträucher – Limousinenhof')return;
 for(let i=0;i<o.count;i++){const a=new T.Matrix4();o.getMatrixAt(i,a);a.premultiply(o.matrixWorld);
  const v=new T.Vector3().setFromMatrixPosition(a),hit=sample(beds,v.x,v.z);assert(hit,'Shrub fully inside a bed');
  assert(Math.abs(v.y-new T.Vector3().setFromMatrixScale(a).y-hit.point.y)<.025,'Shrub base follows the bed surface '+[v.x,v.y,v.z,hit.point.y].join(','));plantContacts++;
 }
});
const corners=landscape.children.filter(o=>o.userData.parkingCornerLamp);
assert(corners.every(o=>Math.abs(o.position.y+.18)<.025),'Corner lanterns on level ground');
let levelSamples=0;
for(let x=90;x<=102;x+=2)for(let z=-24;z<=24;z+=3){
 const h=sample(terrain,x,z);assert(h,'Continuous lawn beside parking');
 assert(Math.abs(h.point.y+.18)<.025,'East hill flattened '+[x,z,h.point.y].join(','));levelSamples++;
}
const goldBases=[];scene.traverse(o=>{if(!o.isInstancedMesh||o.material!==materials.gold)return;
 for(let i=0;i<o.count;i++){const a=new T.Matrix4();o.getMatrixAt(i,a);a.premultiply(o.matrixWorld);
  goldBases.push(new T.Vector3().setFromMatrixPosition(a));
 }
});
for(const [x,z]of PARKING_CORNERS){const wx=x+14,wz=61-z;
 assert.equal(goldBases.filter(v=>Math.abs(v.x-wx)<.01&&Math.abs(v.z-wz)<.01).length,1,'Exactly one actual lantern at each corner');
}
assert.deepEqual(LIMO_PARK.entrances.map(e=>e.label),['Ausfahrt','Einfahrt']);
assert(scene.getObjectByName('Ausfahrt – Fahrtrichtung').rotation.y>3);
assert.equal(scene.getObjectByName('Einfahrt – Fahrtrichtung').rotation.y,0);
assert(!scene.getObjectByName('Privatgelände – gut lesbares Hinweisschild'));
for(const label of ['Ausfahrt','Einfahrt']){
 const sign=scene.getObjectByName(label+' – Hofbeschilderung');assert(sign);
 assert.equal(sign.geometry.parameters.width,3.75);
}
assert(scene.getObjectByName('Lumina Leaf Hotel – Hofbeschilderung'));
assert(scene.getObjectByName('Limousinenservice – Empfangstresen').userData.furniture.includes('Monitor'));
assert(scene.getObjectByName('Security-Kamera oben rechts am Eingang'));
assert(scene.getObjectByName('Roter Teppich direkt zum Wärterbüro'));
assert.equal(landscape.userData.grasses,0,'No stick-like grass in the beds');
assert(ROAD.driveWidth>=6.4);assert(ROAD.minimumRadii.entry>28&&ROAD.minimumRadii.exit>36);
let limousineSweepSamples=0;
for(const route of [ROAD.entry,ROAD.exit])for(let i=1;i<route.length-1;i+=3){
 const [x,z]=route[i],a=route[i-1],b=route[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/l,dz=(b[1]-a[1])/l;
 for(const along of [-8.8,0,8.8])for(const side of [-2.15,0,2.15]){
  const xx=x+along*dx-side*dz,zz=z+along*dz+side*dx;
  if(xx< -58.3||xx>66.2||zz<28.6)continue;
  const h=sample(asphalt,xx,zz);assert(h,'Limousine swept body on continuous road '+[xx,zz]);
  assert(Math.abs(h.point.y+.005)<.01);limousineSweepSamples++;
 }
}
assert(scene.getObjectByName('Gerade Garten- und Straßenränder ohne gebogenen Beetanschluss').userData.curvedBedReturnRemoved);
console.log(JSON.stringify({roadSamples,plantContacts,levelSamples,cornerLamps:corners.length,limousineSweepSamples,
 furnishedGuardhouse:true,separateSigns:true,hotelDriveWidth:ROAD.driveWidth}));
console.log(JSON.stringify({luxuryLandscapingChecked:true,plantParts:plants,...landscape.userData}));
console.log(JSON.stringify({rearSpurRemoved:true,parkedCars:3,bayWidth:LIMO_PARK.bayWidth,
 lamps:2,uniformLampSpacing:13,unmirroredLabels:3,terrainSamples:checked,closedApproaches:2}));
