import {referenceTableLamp} from './lobby-table-lamp.js?v=92';
import {T,facadeLamp,facadeWash} from './core.js?v=75';
import {photoPlane} from './photo-surfaces.js?v=75';

const sidePhoto=[[1118,458],[1269,332],[1282,199],[1118,150]];
function imagePoint(u,v){return [0,1].map(axis=>(sidePhoto[0][axis]*(1-u)+sidePhoto[1][axis]*u)*(1-v)+(sidePhoto[3][axis]*(1-u)+sidePhoto[2][axis]*u)*v);}
const curtain=new T.PlaneGeometry(.47,1,12,1);
for(let i=0;i<curtain.attributes.position.count;i++){const p=curtain.attributes.position;p.setZ(i,.028*Math.cos((p.getX(i)/.47+.5)*Math.PI*8));}
curtain.computeVertexNormals();
function foldedCurtain(k,m,x,y,z,h,rotation=0){k.put(curtain,m.curtain,x,y,z,1,h,1,0,rotation);}

export function sideElevation(k,m,root,side,y,rise,level,f=m,sideLight=f){
 // Separate stone piers leave genuine window openings instead of a solid wall.
 if(side<0&&level===0){for(const [a,b]of [[-16,-7.526666667],[-4.873333333,2.0]])k.box(f.stone,side,y+.15,(a+b)/2,.58,.30,b-a);}else k.box(f.stone,side,y+.15,-7,.58,.30,18);
 k.box(f.stone,side,y+rise-.13,-7,.58,.26,18);
 for(const z of [-15.3,-11.375,-7.925,-4.475,-1.025,1.98])k.box(f.stone,side,y+rise*.5,z,.58,rise,z===-15.3?1.42:.76);
 // The same pier positions repeat on every floor and both side elevations.
 const orientation=side<0?-Math.PI/2:Math.PI/2;
 for(const z of [-15.3,-11.375,-7.925,-4.475,-1.025,1.98])facadeLamp(k,sideLight,side+(side<0?-.41:.41),y,z,rise,orientation);
 const wash=facadeWash(root,side,y+1.78,-6.8,{orientation,range:10,intensity:2.0});wash.color.set('#89bfa0');wash.userData.sideFacadeLight=true;
 for(let z=-13.1;z<1;z+=3.45){
  const x=side+(side<0?-.36:.36),height=rise-.76;
  const spaDoor=side<0&&level===0&&Math.abs(z+6.20)<.01;
  for(const dy of [-height/2-.04,height/2+.04])if(!spaDoor||dy>0)k.box(f.frame,x,y+rise*.5+dy,z,.10,.08,2.58);
  for(const dz of [-1.24,1.24])if(!spaDoor)k.box(f.frame,x,y+rise*.5,z+dz,.10,height+.16,.08);
  // Recessed glass and a slim central mullion sit between the stone piers.
  if(spaDoor){const top=y+rise*.5+height/2,doorTop=y+3.04/1.032;k.box(f.glass,x-.05,(doorTop+top)/2,z,.025,top-doorTop,2.64);for(const dz of [-1.326666667,1.326666667])k.box(f.frame,x-.05,y+rise*.5,z+dz,.07,height+.16,.045);k.box(f.frame,x-.05,doorTop,z,.07,.055,2.64);}
  else{k.box(f.glass,x+(side<0?-.05:.05),y+rise*.5,z,.025,height,2.40);k.box(f.frame,x+(side<0?-.065:.065),y+rise*.5,z,.03,height,.043);}
  // Open the window in the frame with glass in front; the interior remains visible.
  if(!spaDoor){k.box(m.interior,side+(side<0?1.3:-1.3),y+.46,z,.38,.12,1.25);
  if(level===0)referenceTableLamp(root,side+(side<0?.95:-.95),y+.52,z,'Fenster '+side+' '+z);
  else {k.cyl(m.gold,side+(side<0?.95:-.95),y+.81,z,.022,.58);k.put('cone',m.warm,side+(side<0?.95:-.95),y+1.16,z,.16,.21,.16);}
  for(const offset of [-1.01,1.01])foldedCurtain(k,m,side+(side<0?.32:-.32),y+rise*.5,z+offset,height,Math.PI/2);}
  if(side>0){
   const u0=(1.7-(z+1.20))/17.4,u1=(1.7-(z-1.20))/17.4,v0=((level===3?y-2.85:y)+rise*.5-height/2-.16)/12.7,v1=((level===3?y-2.85:y)+rise*.5+height/2-.16)/12.7;
   photoPlane(root,sideLight.photoMaterial,{name:`Bilddetails im Seitenfenster ${level+1}`,x:x+.018,y:y+rise*.5,z,width:2.40,height,rotation:Math.PI/2,corners:[imagePoint(u0,v0),imagePoint(u1,v0),imagePoint(u1,v1),imagePoint(u0,v1)]});
  }
 }
}

export function rearDetails(k,m,level,y,rise,f=m){
 for(let i=0;i<6;i++){
  const x=-1.15+i*3.5,height=rise-.65;
  if(i===2||i===3)continue;
  for(const dx of [-1.28,1.28])foldedCurtain(k,m,x+dx,y+rise*.5,-15.15,height);
  for(const dx of [-1.63,1.63])k.box(f.frame,x+dx,y+rise*.5,-15.92,.045,rise-.25,.11);
  k.box(f.frame,x,y+rise*.5,-15.92,.055,rise-.25,.11);
  k.box(m.warm,x,y+rise-.30,-15.25,1.3,.035,.07);
  if(level>0){
   k.box(m.stone,x-1.7,y+rise*.5,-8,.12,rise-.28,12.5);
   k.bevel(m.wood,x+.92,y+.4,-13.50,.55,.80,.45,.025);
   k.cyl(m.gold,x+.92,y+.99,-13.50,.017,.43);
   k.put('cone',m.warm,x+.92,y+1.25,-13.50,.18,.20,.18);
  }
 }
 // The central rear opening connects directly to the new guest corridor.
}
