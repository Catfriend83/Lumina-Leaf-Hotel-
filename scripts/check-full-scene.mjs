import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {T} from '../dist/core.js';
import {createScene} from '../dist/scene.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const start=performance.now();
const built=await createScene({createCanvas,mobile:true,fastHotel:false,
 loadTexture:async p=>new T.Texture(await loadImage(path.resolve('dist',p))),
 onProgress:(percent,message)=>console.log(percent+'% '+message)});
const {scene}=built;
for(const key of ['townhallPlacement','plazaRefinement','townhallFloorRepair','churchFloorRepair','completePlazaRepair'])assert(scene.userData[key],key+' completed');
assert.deepEqual(scene.getObjectByName('Rathaus Seealm').position.toArray(),[-160.4,4.49,-163.2]);
assert(scene.getObjectByName('Privater Limousinenparkplatz – Lumina Leaf Hotel'));
assert.equal(scene.userData.parkingLamps.moves.length,2);
console.log(JSON.stringify({fullSceneLoaded:true,rathausPlaced:true,allPavingRepairsCompleted:true,
 limousineParkingPresent:true,elapsedSeconds:Math.round((performance.now()-start)/1000)}));
