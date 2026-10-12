import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {T} from '../dist/core.js';
import {landHeight} from '../dist/landscape.js';
import {mountainHeight,mountainSurface} from '../dist/mountains.js';
import {cameraViews} from '../dist/scene.js';
import {CINEMATIC,FILM_GRADE_GLSL,createCinematicOutput} from '../dist/cinematic.js';
import {EXPORT_8K,exportTiles} from '../dist/export-8k.js';
function read(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const now=read('dist/assets/Lumina_Leaf_Gesamtszene.glb'),old=read(process.argv[2]);
function array(m,i){const a=m.g.accessors[i],v=m.g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],stride=v.byteStride||n*size,offset=(v.byteOffset||0)+(a.byteOffset||0),out=Buffer.alloc(a.count*n*size);for(let j=0;j<a.count;j++)m.bin.copy(out,j*n*size,offset+j*stride,offset+j*stride+n*size);return out;}
function imageHash(m,texture){if(!texture)return null;const i=m.g.images[m.g.textures[texture.index].source],v=m.g.bufferViews[i.bufferView];return crypto.createHash('sha256').update(m.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).digest('hex');}
function canonical(m,v){if(!v||typeof v!=='object')return v;if(Array.isArray(v))return v.map(x=>canonical(m,x));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='index'?imageHash(m,v):canonical(m,x)]));}
function meshSignatures(m){return m.g.nodes.filter(n=>n.mesh!==undefined&&!['Alpine Wiesen und Talboden','Felsgrate mit fotografischer Kalksteinstruktur','Natürliche alpine Schneefelder'].includes(n.name)).map(n=>{const h=crypto.createHash('sha256').update(JSON.stringify({name:n.name,translation:n.translation,rotation:n.rotation,scale:n.scale,matrix:n.matrix,extras:n.extras}));for(const p of m.g.meshes[n.mesh].primitives){for(const [k,i] of Object.entries(p.attributes).sort())h.update(k).update(array(m,i));if(p.indices!==undefined)h.update(array(m,p.indices));h.update(JSON.stringify(canonical(m,m.g.materials[p.material])));}for(const [k,i] of Object.entries(n.extensions?.EXT_mesh_gpu_instancing?.attributes||{}).sort())h.update(k).update(array(m,i));return h.digest('hex');}).sort();}
assert.deepEqual(meshSignatures(now),meshSignatures(old),'Only the three distant terrain surfaces may change; all hotel, car, forest, village and water geometry is identical');
const lights=m=>m.g.extensions.KHR_lights_punctual.lights;
assert.deepEqual(lights(now),lights(old),'All evening and facade lights remain exactly unchanged');
const directionals=lights(now).filter(l=>l.type==='directional');assert.equal(directionals.length,2);assert.deepEqual(directionals.map(l=>l.intensity),[2.1,.7]);assert(directionals[0].color[0]>directionals[0].color[2],'Warm sunset key light');
assert(now.g.nodes.some(n=>n.name==='Filmische Ansicht – warme Abendstimmung'));assert(now.g.nodes.some(n=>n.name==='Originalansicht – Hotel mit Umgebung'));
const view=cameraViews.cinematic,camera=new T.PerspectiveCamera(27.88,16/9,.1,3500);camera.position.fromArray(view.position);camera.lookAt(new T.Vector3(...view.target));camera.updateMatrixWorld();assert(view.position[1]<cameraViews.original.position[1]);
for(const p of [[-25,0,8],[48,24.4,-41],[15,15,-5],[-24,4,5],[13.5,0,36.4],[-3,0,36.4]]){const ndc=new T.Vector3(...p).project(camera);assert(Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1&&ndc.z<1,'Hotel, garage, pool and limousine remain inside the 16:9 shot');}
const output=createCinematicOutput(),exportOutput=createCinematicOutput(new T.Texture());
assert(output.material.fragmentShader.includes(FILM_GRADE_GLSL));assert(exportOutput.material.fragmentShader.includes(FILM_GRADE_GLSL));assert(exportOutput.material.fragmentShader.includes('texture2D(filmBloom,filmCrop.xy+vUv*filmCrop.zw)'));assert.deepEqual(output.uniforms.filmCrop.value.toArray(),[0,0,1,1]);assert.equal(EXPORT_8K.width,7680);assert.equal(EXPORT_8K.height,4320);assert.equal(exportTiles().length,64);assert(CINEMATIC.bloomStrength<.36);output.dispose();exportOutput.dispose();
const terrainNames=['Alpine Wiesen und Talboden','Felsgrate mit fotografischer Kalksteinstruktur','Natürliche alpine Schneefelder'];
const surfaces=m=>m.g.nodes.filter(n=>terrainNames.includes(n.name)).map(n=>m.g.meshes[n.mesh].primitives[0]);
const near=m=>{const rows=[];for(const p of surfaces(m)){const pos=array(m,p.attributes.POSITION),attrs=Object.entries(p.attributes).sort().map(([key,i])=>[key,array(m,i)]),count=pos.length/12;for(let i=0;i<count;i++){const x=pos.readFloatLE(i*12),z=pos.readFloatLE(i*12+8);if(Math.hypot(x,z+80)>=730)continue;rows.push(attrs.map(([key,b])=>key+':'+b.subarray(i*b.length/count,(i+1)*b.length/count).toString('hex')).join('|'));}}return rows.sort();};
assert.deepEqual(near(now),near(old),'Terrain positions, normals, UVs and colors around the lake, forest and hotel are preserved');
let max=0,nearUnchanged=0;for(let x=-1500;x<=1500;x+=25)for(let z=-1700;z<=1300;z+=25){const base=landHeight(x,z),h=mountainHeight(x,z,base);assert(Number.isFinite(h));max=Math.max(max,h);if(Math.hypot(x,z+80)<=760){assert.equal(h,base);nearUnchanged++;}}
assert(max>130&&max<190,'Background relief remains large enough to read but within the existing frame');
for(const slope of [0,.2,.3])assert(mountainSurface(1100,-500,180,slope).category!==2,'Snow stays off steep cliff faces');
assert.notEqual(mountainHeight(1100,-500,0),mountainHeight(-1100,-500,0),'Massifs are asymmetric');
assert(surfaces(now).every(p=>now.g.accessors[p.attributes.POSITION].count>0));
console.log(JSON.stringify({unchangedNonTerrainMeshes:meshSignatures(now).length,foregroundVerticesPreserved:near(now).length,nearHeightSamplesPreserved:nearUnchanged,maximumTerrainHeight:max,asymmetricMountainRanges:true,steepCliffsDoNotCarrySnow:true,allEveningLightsPreserved:true,camerasAndCompositionPreserved:true,terrainSurfaces:3,outputPixels:[7680,4320]}));
