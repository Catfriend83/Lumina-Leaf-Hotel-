import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const canvasLib=require('@napi-rs/canvas');
const {createCanvas,loadImage,Image,ImageData,GlobalFonts}=canvasLib;
GlobalFonts.registerFromPath(path.resolve('dist/assets/lumina-script.otf'),'Lumina Script');
const retained=[];
const viewerOnly=process.argv.includes('--viewer-only');
function makeCanvas(w,h){const c=createCanvas(w,h);const blob=c.toBlob.bind(c);c.toBlob=(callback,mime,quality)=>blob(callback,mime,mime==='image/jpeg'?.90:quality);retained.push(c,c.getContext('2d'));return c;}
import * as T from '../dist/vendor/three.module.js';
import {createScene,cameraViews} from '../dist/scene.js';
import {createViewerScene} from './viewer-scene.mjs';
import {GLTFExporter} from '../dist/vendor/addons/exporters/GLTFExporter.js';
globalThis.HTMLImageElement=Image;globalThis.HTMLCanvasElement=createCanvas(1,1).constructor;globalThis.ImageData=ImageData;
globalThis.document={createElement:type=>{if(type!=='canvas')throw new Error('Unsupported DOM element: '+type);return makeCanvas(1,1);}};
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();}).catch(e=>this.onerror?.(e));}readAsDataURL(blob){blob.arrayBuffer().then(data=>{this.result=`data:${blob.type};base64,${Buffer.from(data).toString('base64')}`;this.onloadend?.();}).catch(e=>this.onerror?.(e));}};
const {scene,dome,meadowController}=await createScene({createCanvas:makeCanvas,loadTexture:async p=>{const image=await loadImage(path.resolve('dist',p));const t=new T.Texture(image);t.needsUpdate=true;return t;}});
// Exercise the live near-meadow replacement before restoring the full export.
const meadowChecks=[];
for(const name of ['meadow','rathaus','gasthaus','dorfeinfahrt','car']){
 const camera=new T.PerspectiveCamera();camera.position.fromArray(cameraViews[name].position);
 const start=performance.now(),counts=meadowController.update(camera,true);
 if(!counts.flat().every(Number.isInteger)||!counts.flat().some(n=>n>0))throw new Error('Invalid live botanical population');
 meadowChecks.push({view:name,visiblePlants:counts.flat().reduce((a,b)=>a+b,0),milliseconds:Math.round(performance.now()-start)});
}
const meadowMeshes=[];scene.traverse(o=>{if(o.isMesh&&/Alpine Blumenwiese/.test(o.material?.name||''))meadowMeshes.push(o);});
for(const [x,z]of [[-500,-400],[450,-350],[-350,180]]){
 const ray=new T.Raycaster(new T.Vector3(x,100,z),new T.Vector3(0,-1,0)),hit=ray.intersectObjects(meadowMeshes,false)[0];if(!hit)continue;
 const camera=new T.PerspectiveCamera();camera.position.set(x,hit.point.y+1.2,z);const counts=meadowController.update(camera,true);
 meadowChecks.push({view:'valley-'+x+','+z,visiblePlants:counts.flat().reduce((a,b)=>a+b,0),nearPlants:counts.reduce((n,r)=>n+r[0],0)});
 if(counts.reduce((n,r)=>n+r[0],0)<200)throw new Error('Remote close meadow is not volumetrically populated');
}
meadowController.prepareExport();
await fs.writeFile('meadow-live-detail-report.json',JSON.stringify({version:75,checks:meadowChecks},null,2)+'\n');
console.log(JSON.stringify({liveMeadowChecks:meadowChecks}));
const opaqueTextures=new Set(),alphaTextures=new Set();scene.traverse(o=>{if(!o.material)return;for(const material of (Array.isArray(o.material)?o.material:[o.material])){if((material.alphaTest||material.transparent)&&material.map)alphaTextures.add(material.map);if(!material.alphaTest&&!material.transparent&&material.map&&!material.map.image?.getContext)opaqueTextures.add(material.map);}});opaqueTextures.add(dome.material.map);for(const texture of opaqueTextures)if(!alphaTextures.has(texture))texture.userData.mimeType='image/jpeg';
const generated=new Set();scene.traverse(o=>{if(!o.material)return;for(const material of (Array.isArray(o.material)?o.material:[o.material])){material.normalMap=null;for(const value of Object.values(material))if(value?.isTexture&&value.image instanceof HTMLCanvasElement)generated.add(value);}});
for(const texture of generated){const c=texture.image;if(!c?.getContext)continue;const w=c.width,h=c.height,source=c.getContext('2d').getImageData(0,0,w,h).data,data=new Uint8Array(source.length);for(let y=0;y<h;y++)data.set(source.subarray(y*w*4,(y+1)*w*4),(texture.flipY?h-1-y:y)*w*4);texture.image={data,width:w,height:h};}
let meshes=0,instances=0,triangles=0,invalid=[];scene.traverse(o=>{if(!o.isMesh)return;meshes++;instances+=o.isInstancedMesh?o.count:1;const positions=o.geometry.attributes.position.array;for(let i=0;i<positions.length;i++)if(!Number.isFinite(positions[i])){invalid.push(o.name);break;}triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);if(!o.matrixWorld.elements.every(Number.isFinite))invalid.push(o.name);});if(invalid.length)throw new Error('Invalid mesh data: '+invalid.join(','));
// A sky dome hides the property in auto-framing viewers. Background belongs to the viewer.
dome.removeFromParent();
const unsupported=[];scene.traverse(o=>{if(o.isHemisphereLight)unsupported.push(o);});unsupported.forEach(o=>o.removeFromParent());scene.updateMatrixWorld(true);
const directional=[];scene.traverse(o=>{if(o.isDirectionalLight||o.isSpotLight)directional.push(o);});directional.forEach(o=>{const direction=new T.Vector3().subVectors(o.target.getWorldPosition(new T.Vector3()),o.getWorldPosition(new T.Vector3())).normalize();o.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),direction);o.target.removeFromParent();const target=new T.Object3D();target.position.set(0,0,-1);o.add(target);o.target=target;});
scene.updateMatrixWorld(true);
const originalCamera=new T.PerspectiveCamera(27.88,16/9,.1,3500);originalCamera.name='Originalansicht – Hotel mit Umgebung';originalCamera.position.fromArray(cameraViews.original.position);originalCamera.lookAt(new T.Vector3(...cameraViews.original.target));scene.add(originalCamera);scene.updateMatrixWorld(true);
const cinematicCamera=originalCamera.clone();cinematicCamera.name='Filmische Ansicht – warme Abendstimmung';cinematicCamera.position.fromArray(cameraViews.cinematic.position);cinematicCamera.lookAt(new T.Vector3(...cameraViews.cinematic.target));scene.add(cinematicCamera);scene.updateMatrixWorld(true);
const fitnessCamera=new T.PerspectiveCamera(58,16/9,.1,350);fitnessCamera.name='Fitnessstudio unter dem Pool';fitnessCamera.position.fromArray(cameraViews.fitness.position);fitnessCamera.lookAt(new T.Vector3(...cameraViews.fitness.target));scene.add(fitnessCamera);scene.updateMatrixWorld(true);
const villageCamera=new T.PerspectiveCamera(52,16/9,.1,3500);villageCamera.name="Dorfplatz Seealm";villageCamera.position.fromArray(cameraViews.village.position);villageCamera.lookAt(new T.Vector3(...cameraViews.village.target));scene.add(villageCamera);scene.updateMatrixWorld(true);
const loopCamera=new T.PerspectiveCamera(52,16/9,.1,3500);loopCamera.name='See-Rundweg';loopCamera.position.fromArray(cameraViews.rundweg.position);loopCamera.lookAt(new T.Vector3(...cameraViews.rundweg.target));scene.add(loopCamera);scene.updateMatrixWorld(true);
if(!viewerOnly){const full=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true,maxTextureSize:4096,trs:true});
 await fs.writeFile('dist/assets/Lumina_Leaf_Gesamtszene.glb',Buffer.from(full));
 execFileSync(process.execPath,['scripts/finish-forest-export.mjs','dist/assets/Lumina_Leaf_Gesamtszene.glb'],{stdio:'inherit'});
 execFileSync('python',['scripts/optimize-viewer-png.py','dist/assets/Lumina_Leaf_Gesamtszene.glb'],{stdio:'inherit'});
}
loopCamera.removeFromParent();villageCamera.removeFromParent();originalCamera.removeFromParent();cinematicCamera.removeFromParent();fitnessCamera.removeFromParent();
const viewer=createViewerScene(scene);
const result=await new GLTFExporter().parseAsync(viewer.scene,{binary:true,onlyVisible:true,maxTextureSize:4096,trs:true});
await fs.writeFile('dist/assets/Lumina_Leaf_Hotel.glb',Buffer.from(result));
await fs.writeFile('dist/assets/Lumina_Leaf_Hotel_Viewer.glb',Buffer.from(result));
execFileSync('python',['scripts/optimize-viewer-png.py','dist/assets/Lumina_Leaf_Hotel.glb','dist/assets/Lumina_Leaf_Hotel_Viewer.glb'],{stdio:'inherit'});
const buffer=await fs.readFile('dist/assets/Lumina_Leaf_Hotel_Viewer.glb'),length=buffer.readUInt32LE(12),json=JSON.parse(buffer.subarray(20,20+length));
const report={viewer:viewer.report,fullSceneBytes:(await fs.stat(viewerOnly?'.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb':'dist/assets/Lumina_Leaf_Gesamtszene.glb')).size,meshes,instances,triangles:Math.round(triangles),bytes:buffer.byteLength,glbVersion:buffer.readUInt32LE(4),gltfMeshes:json.meshes.length,nodes:json.nodes.length,images:json.images.length,extensions:json.extensionsUsed};
await fs.writeFile('model-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

await fs.mkdir('.sites-runtime/models',{recursive:true});
for(const name of (viewerOnly?['Lumina_Leaf_Hotel','Lumina_Leaf_Hotel_Viewer']:['Lumina_Leaf_Gesamtszene','Lumina_Leaf_Hotel','Lumina_Leaf_Hotel_Viewer'])){const raw=await fs.readFile('dist/assets/'+name+'.glb');await fs.writeFile('.sites-runtime/models/'+name+'.glb',raw);if(name!=='Lumina_Leaf_Hotel')await fs.writeFile('dist/assets/'+name+'.glb.gz',gzipSync(raw,{level:9}));await fs.unlink('dist/assets/'+name+'.glb');}
report.downloadBytes={full:(await fs.stat('dist/assets/Lumina_Leaf_Gesamtszene.glb.gz')).size,hotel:(await fs.stat('dist/assets/Lumina_Leaf_Hotel_Viewer.glb.gz')).size};await fs.writeFile('model-report.json',JSON.stringify(report,null,2)+'\n');

execFileSync(process.execPath,['scripts/package-model-download.mjs'],{stdio:'inherit'});
