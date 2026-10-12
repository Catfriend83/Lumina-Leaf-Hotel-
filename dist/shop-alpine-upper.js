import {T,Kit} from './core.js?v=75';
import {woodTexture,ornament,flowerBox,panel,window} from './alpine-houses.js?v=75';

export function shopTimberMaterial(materials){const wood=materials.villageTimber.clone();wood.name='Traditionelle Eichenholzfassade des Dorfladens';wood.color.set('#715139');wood.map=woodTexture();wood.bumpMap=wood.map;wood.bumpScale=.009;wood.roughness=.86;return wood;}
export function buildShopUpper(g,materials,m,b){
 const base=3.88,h=6.95,w=b.w,d=b.d,upper=new T.Group();upper.name='Bayerisches Obergeschoss des Dorfladens';upper.position.y=base;upper.userData={shopUpperStorey:true,baseHeight:base,eavesHeight:h,cladding:'vertical timber',roofType:'gable'};g.add(upper);const k=new Kit(upper),virtual={...b,h:h-base};
 const shutter=materials.velvet.clone();shutter.name='Gedämpft grüne Fensterläden des Dorfladens';shutter.color.set('#435b49');shutter.roughness=.87;const um={...m,plaster:m.wood,shutter},style={window:[1.12,1.42],shutters:'all',flowers:null},sides=[];
 for(const sign of [1,-1])sides.push({axis:'front',sign,angle:sign===1?0:Math.PI,point:x=>[sign*x,sign*d/2],windows:sign===1?[{x:-2.55,y:1.55,w:1.12,h:1.42},{x:0,y:1.075,w:1.02,h:2.12,door:true},{x:2.55,y:1.55,w:1.12,h:1.42}]:[-2.6,0,2.6].map(x=>({x,y:1.55,w:1.06,h:1.36}))});
 for(const sign of [1,-1])sides.push({axis:'side',sign,angle:sign*Math.PI/2,point:x=>[sign*w/2,-sign*x],windows:[-2.5,2.5].map(x=>({x,y:1.53,w:1.0,h:1.34}))});
 for(const side of sides){panel(k,um,virtual,side,side.windows);const length=side.axis==='front'?w:d,count=Math.ceil(length/.20),step=length/count;for(let i=0;i<count;i++){const x=-length/2+(i+.5)*step,cuts=side.windows.filter(o=>Math.abs(x-o.x)<o.w/2+.06).map(o=>[o.y-o.h/2-.06,o.y+o.h/2+.06]).sort((a,b)=>a[0]-b[0]);let y=0;for(const [low,high]of [...cuts,[virtual.h,virtual.h]]){const top=Math.min(low,virtual.h);if(top>y+.01){const [px,pz]=side.point(x);k.box(m.wood,px+Math.sin(side.angle)*.145,(y+top)/2,pz+Math.cos(side.angle)*.145,step,top-y,.05,side.angle);}y=Math.max(y,high);}}
  const face={...side,point:x=>{const [px,pz]=side.point(x);return [px+Math.sin(side.angle)*.16,pz+Math.cos(side.angle)*.16];}};side.windows.forEach((o,i)=>window(k,um,o,face,{...style,shutters:o.door?null:'all'},1,510100+i));
 }
 k.finish();const bk=new Kit(g),deck=3.84,width=6.6,depth=1.10,front=d/2,z=front+depth;
 bk.box(m.wood,0,3.84,0,w-.36,.08,d-.36);for(let x=-width/2+.15;x<width/2;x+=.30)bk.box(m.wood,x,deck-.08,front+depth/2,.08,.22,depth+.10);for(let i=0;i<42;i++){const dw=width/42;bk.box(m.wood,-width/2+(i+.5)*dw,deck+.015,front+depth/2,dw-.004,.08,depth);}
 // The gallery is carried by cantilevered beams and timber knee braces.
 for(const x of [-2.65,2.65])bk.line(m.wood,[x,deck-.16,front+depth*.82],[x,deck-.81,front+.04],.06);
 const rail=(a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),yaw=Math.atan2(-dz,dx),count=Math.ceil(len/.19);bk.line(m.wood,[a[0],deck+1.07,a[1]],[b[0],deck+1.07,b[1]],.06);bk.line(m.wood,[a[0],deck+.18,a[1]],[b[0],deck+.18,b[1]],.042);for(let i=0;i<=count;i++){const t=i/count;bk.put(ornament,m.wood,a[0]+dx*t,deck+.14,a[1]+dz*t,1,.86,1,0,yaw,0);}};
 rail([-width/2,z],[width/2,z]);for(const sign of [-1,1])rail([sign*width/2,front+.04],[sign*width/2,z]);
 const floral=color=>{const mat=materials.flowerRed.clone();mat.map=null;mat.alphaTest=0;mat.transparent=false;mat.opacity=1;mat.color.set(color);mat.roughness=.86;mat.name='Dorfladen Balkonblüten '+color;return mat;},red=floral('#bd3646'),pink=floral('#cb7594'),white=floral('#efe6d4'),violet=floral('#895e99');
 for(const [i,x]of[-2.12,0,2.12].entries())flowerBox(bk,{...m,flowerRed:i===1?pink:red,flowerWhite:white,flowerPurple:violet},x,deck+.80,z+.15,i===1?1.12:1.55,0,true,510311+i);
 // A few side-window boxes balance the long timber walls without crowding the front.
 for(const sign of [-1,1])flowerBox(bk,{...m,flowerRed:pink,flowerWhite:white,flowerPurple:violet},sign*(w/2+.35),base+.55,2.5,1.12,sign*Math.PI/2,false,510420+sign);
 bk.finish();const marker=new T.Object3D();marker.name='Traditioneller Holzbalkon des Dorfladens';marker.position.set(0,deck,front);marker.userData={shopBalcony:true,width,projection:depth,railHeight:1.07,carvedTimber:true,flowerPalette:['red','pink','white','violet'],doorBottom:base+.015,deckTop:deck+.055};g.add(marker);g.userData.architecture='Bayerisches Dorfhaus mit Nahversorger im Erdgeschoss';g.userData.balconyWidth=width;g.userData.roofHeight=h+w*.32;
 return {height:h,slope:.32,eaves:.82};
}
