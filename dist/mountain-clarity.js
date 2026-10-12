import {T} from './core.js?v=75';

export const MOUNTAIN_FOG_DENSITY=.00022;
export function clarityFogShader(source=T.ShaderChunk.fog_fragment){
 return source.replace('#ifdef USE_FOG','#ifdef USE_FOG\n float mountainZone=smoothstep(760.0,900.0,length(vMountainXZ+vec2(0.0,80.0)));')
  .replace('float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );','float mountainDensity=mix(fogDensity,mountainFogDensity,mountainZone);\n float fogFactor=1.0-exp(-mountainDensity*mountainDensity*vFogDepth*vFogDepth);')
  .replace('gl_FragColor.rgb = mix','fogFactor=mix(fogFactor,min(fogFactor,0.18),mountainZone);\n gl_FragColor.rgb = mix');
}
export function installMountainClarity(scene){
 let count=0;scene.traverse(mesh=>{if(!mesh.userData.alpineTerrain)return;
  // Clone only at runtime: the portable GLB keeps standard PBR materials.
  const material=mesh.material.clone();mesh.material=material;
  material.onBeforeCompile=shader=>{
   shader.uniforms.mountainFogDensity={value:MOUNTAIN_FOG_DENSITY};
   shader.vertexShader=shader.vertexShader.replace('#include <fog_pars_vertex>','#include <fog_pars_vertex>\nvarying vec2 vMountainXZ;')
    .replace('#include <fog_vertex>','#include <fog_vertex>\nvMountainXZ=(modelMatrix*vec4(transformed,1.0)).xz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <fog_pars_fragment>','#include <fog_pars_fragment>\nvarying vec2 vMountainXZ;\nuniform float mountainFogDensity;')
    .replace('#include <fog_fragment>',clarityFogShader());
  };
  material.customProgramCacheKey=()=> 'lumina-mountain-clarity-23';material.needsUpdate=true;count++;
 });return count;
}
