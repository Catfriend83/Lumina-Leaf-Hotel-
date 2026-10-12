import {animateReferenceFountain} from './reference-plaza.js?v=83';
import {T} from './core.js?v=75';
import {updateLakePathLights} from './lake-path-furnishing.js?v=91';
import {Water} from './vendor/addons/objects/Water.js';
import {createLakeWaterMaterial} from './lake-water.js?v=77';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/addons/postprocessing/UnrealBloomPass.js';
import {CINEMATIC,createCinematicOutput} from './cinematic.js?v=75';
import {installMountainClarity} from './mountain-clarity.js?v=75';

// Stabilize materials and remove only byte-for-byte identical static
// opaque surfaces. Intentionally layered roads, glass, water and decorations
// with different materials/geometry are preserved; no scene-wide offsets.
function stabilizeStaticRendering(scene,materials,renderer,{mobile=false}={}){
 const seen=new Map(),duplicates=[],textures=new Set(),cap=renderer.capabilities.getMaxAnisotropy();
 let inspected=0;
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{
  if(!o.isMesh||!o.visible)return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const m of mats){
   if(!m)continue;
   for(const key of ['map','bumpMap','normalMap','roughnessMap']){
    const t=m[key];if(t?.isTexture&&!t.isRenderTargetTexture)textures.add(t);
   }
  }
  if(o.isInstancedMesh||o.isBatchedMesh||o.isSkinnedMesh||o.children.length||Array.isArray(o.material)||!o.geometry?.isBufferGeometry)return;
  if(o.material.transparent||o.material.alphaTest||o.material.isShaderMaterial||o.onBeforeRender!==T.Object3D.prototype.onBeforeRender)return;
  // Strict: same *object* geometry/material plus exactly the same 16 world
  // matrix entries. Never approximate positions or deduplicate separate panes.
  const key=o.geometry.uuid+'|'+o.material.uuid+'|'+o.matrixWorld.elements.join(',');
  inspected++;
  if(seen.has(key))duplicates.push(o);else seen.set(key,o);
 });
 for(const mesh of duplicates)mesh.removeFromParent();
 let filtered=0;
 const anisotropy=Math.min(mobile?4:8,cap);
 for(const t of textures){
  if(!t.image||!t.image.width||!t.image.height||t.image.width<2||t.image.height<2)continue;
  let changed=false;
  // Trilinear mipmapping suppresses high-frequency shimmer on oblique
  // roofs, facades, road paint, cobbles and grass, without higher resolution.
  if(t.generateMipmaps&&t.minFilter!==T.LinearMipmapLinearFilter){
   t.minFilter=T.LinearMipmapLinearFilter;changed=true;
  }
  if(t.anisotropy<anisotropy){t.anisotropy=anisotropy;changed=true;}
  if(changed){t.needsUpdate=true;filtered++;}
 }
 // Thin floor decals can share an almost equal depth with the asphalt. Bias
 // only the existing marking materials, not glass/water/walls or ground.
 for(const m of [materials.roadPaint,materials.vipRoadLabel])if(m){
  m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;
 }
 scene.userData.renderStability={duplicateOpaqueSurfacesRemoved:duplicates.length,
  duplicateCandidatesInspected:inspected,texturesConsidered:textures.size,
  texturesImproved:filtered,cameraDepthOptimized:true};
}

// Real scene reflections are captured once for the static car and metalwork.
// The portable GLB keeps its standard PBR materials.
export function createRendering(renderer,built,camera,{mobile=false,monitor=null}={}){
 const {scene,materials,car,sun}=built;
 stabilizeStaticRendering(scene,materials,renderer,{mobile});
 installMountainClarity(scene);updateLakePathLights(scene,camera);
 // Keep the full cinematic environment probe on desktop. Capturing six complete
 // scenes on a mobile GPU delays startup and consumes extra render-target memory.
 let probeTarget=null;
 if(!mobile){
  probeTarget=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
  const probe=new T.CubeCamera(.15,1600,probeTarget);
  probe.position.copy(car.position).add(new T.Vector3(0,3.26,0));scene.add(probe);
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;car.visible=false;
  try{probe.update(renderer,scene);}finally{car.visible=true;probe.removeFromParent();}
  renderer.shadowMap.needsUpdate=true;
  for(const m of [materials.paint,materials.carGlass,materials.chrome,materials.gold]){
   m.envMap=probeTarget.texture;m.envMapIntensity=m===materials.paint?1.4:.9;m.needsUpdate=true;
  }
 }else{
  // Static shadows need one modest shadow map, not a 2048² buffer.
  sun.shadow.mapSize.set(768,768);
  renderer.shadowMap.needsUpdate=true;
 }
 const originals=[];scene.traverse(o=>{if(o.name==='Pool Wasseroberfläche'||o.name==='Spiegelnder Bergsee')originals.push(o);});
 const waters=[];let lake=null;
 for(const mesh of originals){if(mesh.name==='Spiegelnder Bergsee'){lake=mesh;mesh.material=createLakeWaterMaterial(materials.lake.normalMap,sun.position,{mobile});mesh.userData={...mesh.userData,mobileWaterOptimized:true};continue;}
  // A reflective Water mesh renders the scene again on every frame.
  // Reuse the authored pool surface on phones instead of adding a second camera.
  if(mobile){mesh.userData.mobileWaterOptimized=true;continue;}
  const pool=mesh.name==='Pool Wasseroberfläche';const water=new Water(mesh.geometry,{textureWidth:1024,textureHeight:1024,waterNormals:pool?materials.water.normalMap:materials.lake.normalMap,sunDirection:sun.position.clone().normalize(),sunColor:'#ffdfba',alpha:pool?.72:1,waterColor:pool?'#527f7c':'#355a61',distortionScale:pool?.22:.48,fog:true});
  water.name=mesh.name;water.position.copy(mesh.position);water.quaternion.copy(mesh.quaternion);water.scale.copy(mesh.scale);water.material.uniforms.size.value=pool?3:1.3;if(pool){water.material.transparent=true;water.material.depthWrite=false;water.renderOrder=2;}
  mesh.parent.add(water);mesh.removeFromParent();waters.push(water);
 }
 // The pool keeps its existing reflection; the lake never captures the scene.
 for(const water of waters){const original=water.onBeforeRender,others=[...waters.filter(w=>w!==water),...(lake?[lake]:[])],states=others.map(w=>w.visible);water.onBeforeRender=function(...args){others.forEach((w,i)=>states[i]=w.visible);others.forEach(w=>w.visible=false);try{if(monitor)monitor.measure('poolReflection',()=>original.apply(this,args));else original.apply(this,args);}finally{others.forEach((w,i)=>w.visible=states[i]);}};}
 // Multi-pass HDR bloom is expensive on low-memory mobile browsers.
 // Direct rendering keeps the established scene materials and tone mapping.
 const composer=mobile?null:new EffectComposer(renderer);
 if(composer){
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new T.Vector2(1,1),CINEMATIC.bloomStrength,CINEMATIC.bloomRadius,CINEMATIC.bloomThreshold);
  composer.addPass(bloom);composer.addPass(createCinematicOutput());
  if(monitor){const pass=bloom.render;bloom.render=function(...args){return monitor.measure('postprocessing',()=>pass.apply(this,args));};}
 }
 let shadowsReady=false;const lastLightCamera=new T.Vector3(Infinity,Infinity,Infinity);
 return {resize(w,h){composer?.setSize(w,h);},update(t){if(!lastLightCamera.equals(camera.position)){updateLakePathLights(scene,camera);lastLightCamera.copy(camera.position);}built.activity?.update(t);animateReferenceFountain(built,t);if(lake)lake.material.uniforms.time.value=t;for(const water of waters)water.material.uniforms.time.value=t*.24;},render(dt){if(composer)composer.render(dt);else renderer.render(scene,camera);if(!shadowsReady){renderer.shadowMap.autoUpdate=false;shadowsReady=true;}},
  createExport(w,h){
   // One full-frame glow and reflection capture keeps tiles continuous.
   const maxSize=renderer.capabilities.maxTextureSize,gl=renderer.getContext();
   const supported=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES)||[]);
   const samples=supported.filter(n=>n<=4).reduce((a,b)=>Math.max(a,b),0);
   const linear=new T.WebGLRenderTarget(w,h,{type:T.HalfFloatType,samples});
   const overview=new T.WebGLRenderTarget(1920,1080,{type:T.HalfFloatType,samples});
   const glow=new UnrealBloomPass(new T.Vector2(1920,1080),CINEMATIC.bloomStrength,CINEMATIC.bloomRadius,CINEMATIC.bloomThreshold),output=createCinematicOutput(glow.renderTargetsHorizontal[0].texture);output.renderToScreen=false;
   const textures=new Map();scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)for(const t of Object.values(m))if(t?.isTexture&&!t.isRenderTargetTexture&&!textures.has(t)){textures.set(t,t.anisotropy);t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;}});
   const oldShadow=sun.shadow.mapSize.clone(),waterState=waters.map(water=>{const target=water.getReflectionTarget();return {water,target,width:target.width,height:target.height,callback:water.onBeforeRender};});
   let disposed=false;
   const restore=()=>{if(disposed)return;disposed=true;for(const [texture,anisotropy] of textures){texture.anisotropy=anisotropy;texture.needsUpdate=true;}
    waterState.forEach(s=>{s.water.onBeforeRender=s.callback;s.target.setSize(s.width,s.height);});
    sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.copy(oldShadow);sun.shadow.needsUpdate=true;renderer.shadowMap.autoUpdate=true;shadowsReady=false;
    renderer.setRenderTarget(null);linear.dispose();overview.dispose();glow.dispose();output.dispose();};
   try{
    sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(Math.min(4096,maxSize),Math.min(4096,maxSize));sun.shadow.needsUpdate=true;renderer.shadowMap.autoUpdate=true;
    waterState.forEach(s=>s.target.setSize(Math.min(mobile?1024:2048,maxSize),Math.min(mobile?1024:2048,maxSize)));
    renderer.setRenderTarget(overview);renderer.clear();renderer.render(scene,camera);
    renderer.shadowMap.autoUpdate=false;waterState.forEach(s=>s.water.onBeforeRender=()=>{});
    glow.render(renderer,null,overview);
    return {render(target,area,full){output.uniforms.filmCrop.value.set(area.x/full.width,1-(area.y+area.height)/full.height,area.width/full.width,area.height/full.height);
     renderer.setRenderTarget(linear);renderer.clear();renderer.render(scene,camera);output.render(renderer,target,linear);},dispose:restore};
   }catch(e){restore();throw e;}
  },dispose(){composer?.dispose();for(const pass of composer?.passes||[])pass.dispose?.();for(const water of waters)water.getReflectionTarget().dispose();probeTarget?.dispose();},composer,waters};
}
