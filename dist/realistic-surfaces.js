import {T,rng} from './core.js?v=75';

// Material-only refinement: the authored buildings, landscape and access geometry
// remain unchanged. Shared textures and a single static sun shadow suit phones.
export function finishRealisticSurfaces(scene,materials,createCanvas,{mobile=false}={}){
 const random=rng(115071),size=512,c=createCanvas(size,size),ctx=c.getContext('2d');
 const grids=[4,9,23,61].map(n=>({n,data:Float32Array.from({length:n*n},()=>random())}));
 const field=(x,z,g)=>{const xx=x*g.n/size,zz=z*g.n/size,ix=Math.floor(xx),iz=Math.floor(zz),u=xx-ix,v=zz-iz,tx=u*u*(3-2*u),tz=v*v*(3-2*v),at=(a,b)=>g.data[((b%g.n+g.n)%g.n)*g.n+(a%g.n+g.n)%g.n];return (at(ix,iz)*(1-tx)+at(ix+1,iz)*tx)*(1-tz)+(at(ix,iz+1)*(1-tx)+at(ix+1,iz+1)*tx)*tz;};
 const pixels=ctx.createImageData(size,size);
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const u=x/size*Math.PI*2,v=z/size*Math.PI*2;
  const broad=(field(x,z,grids[0])-.5)*1.1+(field(x,z,grids[1])-.5)*.65+(field(x,z,grids[2])-.5)*.3,grain=(random()-.5)*24;
  const i=(z*size+x)*4;
  pixels.data[i]=85+broad*9+grain*.7;pixels.data[i+1]=109+broad*11+grain;pixels.data[i+2]=53+broad*5+grain*.4;pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);
 // Fine overlapping blades, wrapped at tile edges; no painted flowers.
 for(let i=0;i<19000;i++){
  const x=random()*size,z=random()*size,len=2+random()*9,lean=(random()-.5)*4;
  ctx.strokeStyle=i%4===0?'rgba(182,179,106,.25)':i%3===0?'rgba(34,65,28,.34)':'rgba(126,155,72,.36)';ctx.lineWidth=.5+random()*.45;
  for(const ox of[-size,0,size])for(const oz of[-size,0,size]){ctx.beginPath();ctx.moveTo(x+ox,z+oz);ctx.quadraticCurveTo(x+ox+lean*.3,z+oz-len*.6,x+ox+lean,z+oz-len);ctx.stroke();}
 }
 const grass=new T.CanvasTexture(c);grass.colorSpace=T.SRGBColorSpace;grass.wrapS=grass.wrapT=T.RepeatWrapping;grass.anisotropy=4;grass.name='Feine natürliche Gräser – nahtlose gemeinsame Textur';
 const heightCanvas=createCanvas(256,256),hc=heightCanvas.getContext('2d');hc.drawImage(c,0,0,256,256);const height=new T.CanvasTexture(heightCanvas);height.wrapS=height.wrapT=T.RepeatWrapping;height.name='Feines Grasrelief';
 const seen=new Set(),meadows=new Set();let refined=0;
 scene.traverse(o=>{if(!o.isMesh)return;
  for(const mat of(Array.isArray(o.material)?o.material:[o.material])){
   if(!mat||seen.has(mat))continue;seen.add(mat);
   const name=mat.name||'';
   if(mat===materials.meadow||/Alpine Blumenwiese|Natürlich schattierte Wiesen|Uferwiese/.test(name)){
    mat.map=grass;mat.bumpMap=height;mat.bumpScale=.022;mat.color.set('#ffffff');mat.vertexColors=false;mat.roughness=.98;mat.metalness=0;
    const previous=mat.onBeforeCompile;
    mat.onBeforeCompile=shader=>{
     previous.call(mat,shader);
     shader.vertexShader='varying vec3 vLawnWorld;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 lawnPosition=vec4(transformed,1.0);
      #ifdef USE_BATCHING
       lawnPosition=batchingMatrix*lawnPosition;
      #endif
      #ifdef USE_INSTANCING
       lawnPosition=instanceMatrix*lawnPosition;
      #endif
      vLawnWorld=(modelMatrix*lawnPosition).xyz;
      #ifdef USE_BUMPMAP
       vBumpMapUv=vLawnWorld.xz*.42;
      #endif`);
     shader.fragmentShader='varying vec3 vLawnWorld;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec3 grassFine=texture2D(map,vLawnWorld.xz*.42).rgb;
      vec3 grassBroad=texture2D(map,vLawnWorld.xz*.037+vec2(.31,.68)).rgb;
      float lawnTone=dot(grassBroad,vec3(.2126,.7152,.0722));
      diffuseColor.rgb*=grassFine*(.88+.30*clamp(lawnTone*4.0,0.0,1.0));
      #endif`);
    };
    mat.customProgramCacheKey=()=> 'natural-world-grass-v115';mat.userData={...mat.userData,worldMappedGrass:true};mat.needsUpdate=true;meadows.add(mat);refined++;continue;
   }
   if(!mat.isMeshStandardMaterial)continue;
   if(/Putz|plaster|Sichtbeton/i.test(name)){mat.roughness=.91;mat.bumpScale=Math.min(mat.bumpScale||.004,.006);refined++;}
   else if(/Naturstein|stone|Marmor|marble|Kalkstein/i.test(name)&&!/Wiesen|mountain/i.test(name)){mat.roughness=/Marmor|marble/i.test(name)?.34:.79;mat.bumpScale=Math.min(mat.bumpScale||.018,.024);refined++;}
   else if(/Holz|wood|timber/i.test(name)){mat.roughness=.68;mat.metalness=0;refined++;}
   else if(/Asphalt|asphalt/i.test(name)){mat.color.set('#aaa9a3');mat.roughness=.93;mat.bumpScale=Math.min(mat.bumpScale||.003,.005);refined++;}
   else if(/Glas|glass/i.test(name)&&mat.transparent){mat.roughness=Math.min(mat.roughness,.09);mat.envMapIntensity=.8;refined++;}
   if(mat.map){mat.map.anisotropy=Math.max(4,mat.map.anisotropy||1);mat.map.minFilter=T.LinearMipmapLinearFilter;}
  }
  if(!o.isInstancedMesh&&o.material&&meadows.has(o.material))o.receiveShadow=true;
  // Tiny luminous details and cutout foliage do not need their own shadow pass.
  // Buildings, roof silhouettes, tree trunks and cars remain real occluders.
  if(mobile){const mats=Array.isArray(o.material)?o.material:[o.material];if(o.userData.alpineBotany||mats.every(m=>m&&(m.transparent||m.alphaTest>0||/flower|Blüte|Blatt|leaf|Wiesenbotanik|Licht|LED|warm|greenLight|glow|curtain|headlight|tail|chrome|gold/i.test(m.name))))o.castShadow=false;}
 });
 if(materials.forestPine){materials.forestPine.emissive.set('#203b22');materials.forestPine.emissiveIntensity=.15;}
 // A restrained blue-hour sky replaces the old strongly orange backdrop.
 // It is a new procedural sky asset, without modifying any source image.
 const skyCanvas=createCanvas(1024,512),skyCtx=skyCanvas.getContext('2d');
 const gradient=skyCtx.createLinearGradient(0,0,0,512);
 for(const[t,col]of[[0,'#253c57'],[.26,'#596c85'],[.43,'#ad9ea5'],[.50,'#e3b593'],[.57,'#b0b5ad'],[1,'#61736a']])gradient.addColorStop(t,col);
 skyCtx.fillStyle=gradient;skyCtx.fillRect(0,0,1024,512);
 const glow=skyCtx.createRadialGradient(180,238,2,180,238,220);glow.addColorStop(0,'rgba(255,197,129,.28)');glow.addColorStop(1,'rgba(255,197,129,0)');skyCtx.fillStyle=glow;skyCtx.fillRect(0,0,1024,512);
 const atmosphere=new T.CanvasTexture(skyCanvas);atmosphere.name='Ruhige natürliche Abendatmosphäre';atmosphere.colorSpace=T.SRGBColorSpace;atmosphere.mapping=T.EquirectangularReflectionMapping;materials.naturalSky=atmosphere;
 scene.background=atmosphere;scene.environment=atmosphere;scene.backgroundBlurriness=0;scene.backgroundIntensity=.9;scene.environmentIntensity=.76;
 const sun=scene.children.find(o=>o.isDirectionalLight&&o.castShadow);
 if(sun){sun.color.set('#ffe1b8');sun.intensity=2.25;sun.shadow.normalBias=.025;sun.shadow.bias=-.00018;}
 scene.userData.realisticSurfaces={revision:115,refinedMaterials:refined,grassMaterials:meadows.size,worldScaledGrass:true,paintedFlowers:false,sharedTextures:3,geometryPreserved:true};
 return scene.userData.realisticSurfaces;
}
