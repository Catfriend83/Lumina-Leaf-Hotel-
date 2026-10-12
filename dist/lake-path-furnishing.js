import {T,Kit} from './core.js?v=75';
import {PROMENADE,loopSurfaceHeight} from './village-layout.js?v=75';
import {createGroundContact} from './ground-contact.js?v=75';
import {groundedRound} from './plaza-order.js?v=91';
export function buildLakePathFurnishing(scene,m){
 scene.updateMatrixWorld(true);const surfaces=[];scene.traverse(o=>{if(o.isMesh&&(o.userData.villageGround||['loop','rest','walk'].includes(o.userData.villageTrafficSurface)||o.userData.villagePlazaFinish))surfaces.push(o);});const surface=createGroundContact(surfaces);
 const metal=new T.MeshStandardMaterial({name:'Anthrazit-Metall der Seeweg-Leuchten und Mülleimer',color:'#343b38',roughness:.48,metalness:.65}),led=new T.MeshStandardMaterial({name:'Warmweißer abgeschirmter Seeweg-Lichtaustritt',color:'#ffe3b8',emissive:'#ffda9e',emissiveIntensity:1.5,roughness:.65});
 const count=Math.ceil(PROMENADE.length/10),lights=[];
 for(let i=0;i<count;i++){
  const distance=i*PROMENADE.length/count;let j=1;while(PROMENADE.rows[j].s<distance)j++;const a=PROMENADE.rows[j-1],b=PROMENADE.rows[j],t=(distance-a.s)/(b.s-a.s),r={x:T.MathUtils.lerp(a.x,b.x,t),z:T.MathUtils.lerp(a.z,b.z,t),nx:T.MathUtils.lerp(a.nx,b.nx,t),nz:T.MathUtils.lerp(a.nz,b.nz,t)};const norm=Math.hypot(r.nx,r.nz);r.nx/=norm;r.nz/=norm;const x=r.x-r.nx*1.68,z=r.z-r.nz*1.68,base=groundedRound(scene,metal,x,z,.135,surface,.025,'Bündiger Fuß der Seeweg-Leuchte '+i,8),group=new T.Group();group.name='Einheitliche Seeweg-Leuchte '+(i+1);group.position.set(x,base.top,z);group.userData={lakePathLamp:true,index:i,station:distance,landside:true,pathPoint:[r.x,r.z],height:3.2,contacts:base.contacts,spacing:PROMENADE.length/count,warmWhiteKelvin:3000};scene.add(group);const k=new Kit(group);k.cyl(metal,0,1.54,0,.042,3.08);k.cyl(metal,0,3.12,0,.24,.075);k.cyl(led,0,3.075,0,.197,.015);k.cyl(metal,0,3.18,0,.19,.045);k.finish();
  const light=new T.SpotLight('#ffe0b2',22,12,1.04,.7,2);light.name='Warmweißes Weglicht '+(i+1);light.position.set(x,base.top+3.075,z);light.target.position.set(r.x,loopSurfaceHeight(r.x,r.z),r.z);light.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),new T.Vector3().subVectors(light.target.position,light.position).normalize());light.castShadow=false;light.userData={lakePathLight:true,index:i,baseIntensity:22};scene.add(light,light.target);lights.push(light);
 }
 // Analytic irradiance on the existing path material keeps distant sections
 // visible while a fixed eight-light budget supplies nearby live illumination.
 let loop;scene.traverse(o=>{if(o.userData.villageTrafficSurface==='loop')loop=o;});const geometry=loop.geometry,p=geometry.attributes.position,values=[];
 for(let i=0;i<p.count;i++){let v=0;for(const l of lights){const d=new T.Vector3().fromBufferAttribute(p,i).distanceTo(l.position);v+=22/(d*d)*Math.pow(Math.max(0,1-d/12),2);}values.push(Math.min(1,v*.18));}geometry.setAttribute('pathIrradiance',new T.Float32BufferAttribute(values,1));const material=loop.material.clone();material.name=loop.material.name;material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float pathIrradiance;varying float vPathIrradiance;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPathIrradiance=pathIrradiance;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vPathIrradiance;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.30,.21,.12)*vPathIrradiance;');};material.customProgramCacheKey=()=> 'lake-path-irradiance-v69';loop.material=material;
 const seats=[];scene.traverse(o=>{if(o.userData.villageBench&&o.userData.lakeside)seats.push(o);});
 for(const seat of seats){const p=seat.localToWorld(new T.Vector3(1.38,0,0)),base=groundedRound(scene,m.cobbles,p.x,p.z,.29,surface,.025,'Kleine Mülleimer-Aufstellfläche '+seat.userData.padId,16),group=new T.Group();group.name='Mülleimer neben '+seat.userData.padId;group.position.set(p.x,base.top,p.z);group.rotation.copy(seat.rotation);group.userData={lakeBenchBin:true,benchId:seat.userData.padId,sideOffset:1.38,radius:.23,height:.82,contacts:base.contacts};scene.add(group);const k=new Kit(group);k.cyl(metal,0,.39,0,.23,.78);k.cyl(metal,0,.805,0,.27,.045);k.cyl(m.black,0,.79,0,.186,.012);for(const x of [-.17,.17])k.box(metal,x,.73,.19,.027,.13,.018);k.box(m.black,0,.72,.221,.28,.10,.016);k.box(m.gold,0,.49,.232,.065,.08,.007);k.finish();}
 const marker=new T.Object3D();marker.name='Vollständig ausgestatteter und beleuchteter See-Rundweg';marker.userData={lakePathFurnishing:true,lamps:count,spacing:PROMENADE.length/count,bins:seats.length,oneBinPerBench:true};scene.add(marker);
}
const cachedLakeLights=new WeakMap();
export function updateLakePathLights(scene,camera){
 let cache=cachedLakeLights.get(scene);if(!cache){const lights=[];scene.traverse(o=>{if(o.userData.lakePathLight)lights.push(o);});cache={lights,order:new Map(lights.map((l,i)=>[l,i]))};cachedLakeLights.set(scene,cache);}
 const {lights,order}=cache;lights.sort((a,b)=>a.position.distanceToSquared(camera.position)-b.position.distanceToSquared(camera.position)||order.get(a)-order.get(b));lights.forEach((l,i)=>{l.visible=i<8;});
}

// Thin after the original botanical population has been generated. This keeps
// the seeded meadow and every unrelated scene object identical to version 68.
export function thinLakePathFurnishing(scene){
 const lamps=[],lights=[];let loop,marker;
 scene.traverse(o=>{if(o.userData.lakePathLamp)lamps.push(o);if(o.userData.lakePathLight)lights.push(o);if(o.userData.villageTrafficSurface==='loop')loop=o;if(o.userData.lakePathFurnishing)marker=o;});
 const originalCount=lamps.length,kept=[];
 for(const lamp of lamps){
  const index=lamp.userData.index;
  if(index%2){lamp.removeFromParent();scene.getObjectByName('Bündiger Fuß der Seeweg-Leuchte '+index)?.removeFromParent();}
  else {lamp.userData.spacing=2*PROMENADE.length/originalCount;kept.push(lamp);}
 }
 const remaining=[];
 for(const light of lights){if(light.userData.index%2){light.target.removeFromParent();light.removeFromParent();}else remaining.push(light);}
 const p=loop.geometry.attributes.position,values=[];
 for(let i=0;i<p.count;i++){let v=0;for(const l of remaining){const d=new T.Vector3().fromBufferAttribute(p,i).distanceTo(l.position);v+=22/(d*d)*Math.pow(Math.max(0,1-d/12),2);}values.push(Math.min(1,v*.18));}
 loop.geometry.setAttribute('pathIrradiance',new T.Float32BufferAttribute(values,1));
 Object.assign(marker.userData,{lamps:kept.length,originalLamps:originalCount,removedLamps:originalCount-kept.length,retainedIndices:kept.map(l=>l.userData.index),revision:69,spacing:2*PROMENADE.length/originalCount});
 scene.userData.lakeLightingReduction={originalCount,remainingCount:kept.length,reduction:.5,everySecondFixtureRemoved:true,maxSpacing:2*PROMENADE.length/originalCount};
}
