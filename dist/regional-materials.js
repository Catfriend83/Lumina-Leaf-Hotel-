import {T,rng} from './core.js?v=75';

let plasterMap,tileMap;
export function plasterTexture(){
 if(plasterMap)return plasterMap;
 const ca=document.createElement('canvas');ca.width=ca.height=512;
 const ct=ca.getContext('2d'),im=ct.createImageData(512,512),random=rng(520701);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const value=232+(random()-.5)*17+3*Math.sin(x*.21)*Math.cos(y*.19),i=(y*512+x)*4;
  im.data[i]=im.data[i+1]=im.data[i+2]=value;im.data[i+3]=255;
 }
 ct.putImageData(im,0,0);plasterMap=new T.CanvasTexture(ca);plasterMap.colorSpace=T.SRGBColorSpace;
 plasterMap.wrapS=plasterMap.wrapT=T.RepeatWrapping;plasterMap.anisotropy=16;return plasterMap;
}
export function roofTileTexture(){
 if(tileMap)return tileMap;
 const ca=document.createElement('canvas');ca.width=ca.height=512;
 const ct=ca.getContext('2d'),im=ct.createImageData(512,512),random=rng(520702);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const row=Math.floor(y/102.4),u=(x/128+row*.04)%1,v=(y/102.4)%1;
  const joint=u<.018||u>.986,lap=v>.956,curve=16*Math.sin(u*Math.PI),variation=5*Math.sin(Math.floor(x/128)*13+row*7);
  const value=(joint?116:lap?130:206+curve+variation)+(random()-.5)*9,i=(y*512+x)*4;
  im.data[i]=value;im.data[i+1]=value*.98;im.data[i+2]=value*.94;im.data[i+3]=255;
 }
 ct.putImageData(im,0,0);tileMap=new T.CanvasTexture(ca);tileMap.colorSpace=T.SRGBColorSpace;
 tileMap.wrapS=tileMap.wrapT=T.RepeatWrapping;tileMap.anisotropy=16;return tileMap;
}
export function finishRegionalMaterials(m,b,s){
 m.plaster.map=plasterTexture();m.plaster.bumpMap=m.plaster.map;m.plaster.bumpScale=.004;m.plaster.roughness=.94;
 m.roof.map=roofTileTexture().clone();m.roof.map.needsUpdate=true;
 m.roof.map.repeat.set(Math.hypot(b.w/2+s.eaves,b.w*s.slope)/(.22*4),(b.d+2*s.eaves)/(.32*5));
 m.roof.bumpMap=m.roof.map;m.roof.bumpScale=.012;m.roof.roughness=.90;
 return m;
}
