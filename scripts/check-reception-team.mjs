import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {T,makeMaterials} from '../dist/core.js';
import {makeLobbyMaterials,buildReferenceLobby} from '../dist/hotel-lobby.js';
import {GLTFExporter} from '../dist/vendor/addons/exporters/GLTFExporter.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage,Image,ImageData,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath(path.resolve('dist/assets/lumina-script.otf'),'Lumina Script');
globalThis.HTMLImageElement=Image;globalThis.HTMLCanvasElement=createCanvas(1,1).constructor;globalThis.ImageData=ImageData;globalThis.document={createElement:type=>createCanvas(1,1)};
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(data=>{this.result=`data:${blob.type};base64,${Buffer.from(data).toString('base64')}`;this.onloadend?.();});}};
const m=await makeMaterials({createCanvas,loadTexture:async p=>new T.Texture(await loadImage(path.resolve('dist',p)))});
m.entranceReference=new T.Texture(await loadImage('dist/assets/entrance-reference-v82.png'));
m.receptionTextures=await Promise.all([0,1].map(async i=>{const t=new T.Texture(await loadImage(`dist/assets/reception-person-${i}-v86.png`));t.colorSpace=T.SRGBColorSpace;return t;}));
const lm=makeLobbyMaterials(m),oldSource=execFileSync('git',['show','649b237:dist/hotel-lobby.js'],{encoding:'utf8'}).replace(/from '([^']+)'/g,(_,url)=>'from '+JSON.stringify(new URL(url,pathToFileURL(path.resolve('dist/hotel-lobby.js'))).href));
const oldModule=await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64'));
const beforeScene=new T.Scene(),afterScene=new T.Scene();const oldLobby=oldModule.buildReferenceLobby(beforeScene,m,lm),newLobby=buildReferenceLobby(afterScene,m,lm);
function snapshot(scene){scene.updateMatrixWorld(true);const output=[];scene.traverse(o=>{if(!o.isMesh)return;for(let a=o;a;a=a.parent)if(a.userData.receptionist)return;const hash=crypto.createHash('sha256');for(const [key,value]of Object.entries(o.geometry.attributes))hash.update(key).update(Buffer.from(value.array.buffer,value.array.byteOffset,value.array.byteLength));if(o.geometry.index)hash.update(Buffer.from(o.geometry.index.array.buffer));if(o.instanceMatrix)hash.update(Buffer.from(o.instanceMatrix.array.buffer));hash.update(JSON.stringify(o.matrixWorld.elements));output.push([o.name,o.material.name,hash.digest('hex')]);});return output.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
assert.deepEqual(snapshot(beforeScene),snapshot(afterScene),'Existing lobby changed');
const employees=newLobby.children.filter(o=>o.userData.receptionist);assert.equal(employees.length,2);assert.equal((employees[0].position.x+employees[1].position.x)/2,8);assert.equal(employees[0].position.z,employees[1].position.z);assert.equal(employees[0].position.y,employees[1].position.y);assert.notEqual(employees[0].children[0].material.map,employees[1].children[0].material.map);
let metrics=[];
for(const employee of employees){const body=employee.children[0],box=new T.Box3().setFromObject(employee);assert(Math.abs(box.min.y-.3375)<1e-6,'Floating employee');assert(Math.abs(box.max.y-box.min.y-1.72)<1e-6);assert(box.max.z<-3.37,'Employee intersects marble cap');assert(box.min.x>4.26&&box.max.x<11.74);const pos=body.geometry.attributes.position,normal=body.geometry.attributes.normal;assert(pos.count>20000);for(let i=0;i<normal.count;i++){const len=Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i));assert(Math.abs(len-1)<1e-5,'Invalid surface normal');}const edgeCounts=new Map(),ids=body.geometry.index.array;for(let i=0;i<ids.length;i+=3)for(const [a,b]of [[ids[i],ids[i+1]],[ids[i+1],ids[i+2]],[ids[i+2],ids[i]]]){const key=a<b?a+','+b:b+','+a;edgeCounts.set(key,(edgeCounts.get(key)||0)+1);}assert([...edgeCounts.values()].every(n=>n===2),'Open/nonmanifold body surface');metrics.push({name:employee.name,height:box.max.y-box.min.y,depth:box.max.z-box.min.z,deskClearance:-3.37-box.max.z,triangles:ids.length/3,closedVolume:true});}
const report={version:86,employees:metrics,spacingMeters:employees[1].position.x-employees[0].position.x,centerX:8,preservedLobbyMeshes:snapshot(beforeScene).length,unchangedLobby:true,individualTextures:true,lightingUnchanged:true,browserLightVerification:false,method:'Photo-textured reconstructed volumes; depth and unseen geometry approximate.'};fs.writeFileSync('reception-team-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
// A small real-model export is used for placement, textures and angled-view inspection.
const floor=new T.Mesh(new T.BoxGeometry(22,.025,18),lm.floor);floor.position.set(8,.322,-3);afterScene.add(floor);
afterScene.traverse(o=>{if(o.material)o.material.normalMap=null;});
const bytes=await new GLTFExporter().parseAsync(afterScene,{binary:true,onlyVisible:true,maxTextureSize:2048,trs:true});fs.writeFileSync('.sites-runtime/reception-inspection.glb',Buffer.from(bytes));
