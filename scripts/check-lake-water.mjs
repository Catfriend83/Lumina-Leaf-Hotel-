import assert from 'node:assert/strict';
import fs from 'node:fs';
import {T} from '../dist/core.js';
import {createRendering} from '../dist/rendering.js';
import {createLakeWaterMaterial} from '../dist/lake-water.js';
const normal=new T.Texture(),sun=new T.DirectionalLight();sun.position.set(40,90,-30);
for(const mobile of [true,false]){
 const m=createLakeWaterMaterial(normal,sun.position,{mobile});assert.equal(m.uniforms.normalSampler.value,normal);assert.equal(m.userData.normalSamples,mobile?1:2);assert.equal(m.uniforms.reflectionStrength.value,.18);
 assert(!/mirrorSampler|textureMatrix|shadowmap|samplerCube/.test(m.fragmentShader+m.vertexShader));
 for(const shader of [m.vertexShader,m.fragmentShader])for(const match of shader.matchAll(/#include <(\w+)>/g))assert(T.ShaderChunk[match[1]],'Missing shader chunk '+match[1]);
 m.dispose();
}
const scene=new T.Scene(),camera=new T.PerspectiveCamera(55,1,.1,3500);camera.position.set(0,20,30);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const lake=new T.Mesh(new T.PlaneGeometry(100,80),new T.MeshStandardMaterial());lake.name='Spiegelnder Bergsee';lake.position.set(-94,-.22,-55);lake.rotation.x=-Math.PI/2;lake.scale.set(86,65,1);lake.userData={shoreRevision:36};scene.add(lake);
const pool=new T.Mesh(new T.PlaneGeometry(8,5),new T.MeshStandardMaterial());pool.name='Pool Wasseroberfläche';pool.rotation.x=-Math.PI/2;scene.add(pool);
const car=new T.Group();scene.add(car,sun);scene.updateMatrixWorld();const shape={geometry:lake.geometry,matrix:lake.matrixWorld.clone(),metadata:{...lake.userData}};
let calls=0,target=null;const renderer={coordinateSystem:T.WebGLCoordinateSystem,xr:{enabled:false},shadowMap:{autoUpdate:true},getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,getPixelRatio:()=>1,getSize:v=>v.set(400,800),render:()=>{calls++;},state:{buffers:{depth:{setMask(){}}},viewport(){}},autoClear:true};
const materials={paint:new T.MeshStandardMaterial(),carGlass:new T.MeshStandardMaterial(),chrome:new T.MeshStandardMaterial(),gold:new T.MeshStandardMaterial(),water:{normalMap:normal},lake:{normalMap:normal}};
const result=createRendering(renderer,{scene,materials,car,sun},camera,{mobile:true});
assert.equal(calls,6,'Only the pre-existing static car cubemap capture');assert.equal(result.waters.length,1);assert.equal(result.waters[0].name,'Pool Wasseroberfläche');assert.equal(scene.getObjectByName(lake.name),lake);assert.equal(lake.geometry,shape.geometry);scene.updateMatrixWorld();assert.deepEqual(lake.matrixWorld.elements,shape.matrix.elements);
for(let frame=0;frame<300;frame++){camera.position.x+=.1;camera.position.z-=.05;camera.updateMatrixWorld();result.update(frame/60);lake.onBeforeRender(renderer,scene,camera,lake.geometry,lake.material,null);}
assert.equal(calls,6,'Lake adds zero scene renders during movement');assert.equal(lake.getReflectionTarget,undefined);assert.equal(lake.material.uniforms.time.value,299/60);
result.waters[0].onBeforeRender(renderer,scene,camera);assert.equal(calls,7,'Pool retains one planar reflection');assert.equal(lake.visible,true);assert.equal(lake.userData.shoreRevision,36);
const report={version:77,baseVersion:75,scope:'Lake-only rendering optimization; runtime callbacks and geometry verified, no Android FPS/GPU measurement',lakeReflectionSceneRendersPerFrame:0,lakeReflectionRenderTargets:0,mobileNormalSamples:1,desktopNormalSamples:2,reflectionStrength:.18,geometryAndTransformUnchanged:true,poolReflectionPreserved:true};fs.writeFileSync('lake-water-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
