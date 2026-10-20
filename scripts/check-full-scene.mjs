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
assert.equal(scene.userData.parkingLamps.moves.length,3);
let checkedBatches=0;
for(const mesh of scene.children.filter(o=>o.userData.losslessSceneBatch)){
 for(let i=0;i<mesh.count;i++){const matrix=new T.Matrix4();mesh.getMatrixAt(i,matrix);assert(matrix.determinant()>=-1e-8,'Reflections remain on mesh transforms for correct face winding');}
 checkedBatches++;
}
assert(checkedBatches>20);
console.log(JSON.stringify({fullSceneLoaded:true,rathausPlaced:true,allPavingRepairsCompleted:true,
 limousineParkingPresent:true,correctlyOrientedStaticBatches:checkedBatches,elapsedSeconds:Math.round((performance.now()-start)/1000)}));
