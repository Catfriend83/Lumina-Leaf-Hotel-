import {T} from './core.js?v=75';

// A single surface pass: analytic sky tint, Fresnel and one normal texture.
// No reflection camera, render target, scene capture, depth map or SSR.
export function createLakeWaterMaterial(normalMap,sunDirection,{mobile=false}={}){
 const material=new T.ShaderMaterial({
  name:'Bergsee – ruhige, günstige Himmelsreflexion',fog:true,side:T.DoubleSide,
  defines:mobile?{}:{SECOND_WAVE:1},
  uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{
   normalSampler:{value:normalMap},time:{value:0},
   waterDeep:{value:new T.Color('#294e59')},waterShallow:{value:new T.Color('#3c6668')},
   skyHorizon:{value:new T.Color('#737f81')},skyTop:{value:new T.Color('#8094a7')},
   sunColor:{value:new T.Color('#ffdfba')},sunDirection:{value:sunDirection.clone().normalize()},
   reflectionStrength:{value:.18},waveStrength:{value:.10}
  }]),
  vertexShader:`
   varying vec3 waterWorldPosition;
   #include <common>
   #include <fog_pars_vertex>
   #include <logdepthbuf_pars_vertex>
   void main(){
    waterWorldPosition=(modelMatrix*vec4(position,1.0)).xyz;
    vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
    gl_Position=projectionMatrix*mvPosition;
    #include <logdepthbuf_vertex>
    #include <fog_vertex>
   }`,
  fragmentShader:`
   uniform sampler2D normalSampler;
   uniform float time,reflectionStrength,waveStrength;
   uniform vec3 waterDeep,waterShallow,skyHorizon,skyTop,sunColor,sunDirection;
   varying vec3 waterWorldPosition;
   #include <common>
   #include <fog_pars_fragment>
   #include <logdepthbuf_pars_fragment>
   void main(){
    #include <logdepthbuf_fragment>
    vec2 uv=waterWorldPosition.xz*.018;
    vec2 ripple=texture2D(normalSampler,uv+vec2(time*.004,time*.002)).rg*2.0-1.0;
    #ifdef SECOND_WAVE
     ripple=mix(ripple,texture2D(normalSampler,uv*.83-vec2(time*.002,time*.003)).rg*2.0-1.0,.35);
    #endif
    vec3 n=normalize(vec3(ripple.x*waveStrength,1.0,ripple.y*waveStrength));
    vec3 viewDirection=normalize(cameraPosition-waterWorldPosition);
    float cosine=clamp(dot(n,viewDirection),0.0,1.0);
    float fresnel=(.02+.98*pow(1.0-cosine,5.0))*reflectionStrength;
    vec3 sky=mix(skyHorizon,skyTop,smoothstep(0.0,.8,reflect(-viewDirection,n).y));
    float variation=.5+.5*sin(waterWorldPosition.x*.008+waterWorldPosition.z*.006);
    vec3 water=mix(waterDeep,waterShallow,.25+.30*variation);
    float glint=pow(max(dot(n,normalize(viewDirection+sunDirection)),0.0),24.0)*.035;
    gl_FragColor=vec4(mix(water,sky,fresnel)+sunColor*glint,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
   }`,
  userData:{lakeWaterQuality:mobile?'mobile':'desktop',normalSamples:mobile?1:2,planarReflection:false,screenSpaceReflection:false,reflectionStrength:.18,roughness:.62,opaqueNaturalWater:true}
 });
 material.uniforms.normalSampler.value=normalMap;
 return material;
}
