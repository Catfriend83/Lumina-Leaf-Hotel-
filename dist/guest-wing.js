import {T,Kit,addLamp,facadeLamp,facadeWash} from './core.js?v=75';

// Local coordinates continue the original hotel structure and its floor levels.
export function inGuestWing(x,z,margin=0){const a=-.448,c=Math.cos(a),s=Math.sin(a),dx=x-7.223,dz=z-1.91;const lx=8+(c*dx-s*dz)/.944,lz=1.91+(s*dx+c*dz)/.75;return lx>-4.5-margin&&lx<20.5+margin&&lz<-15&&lz>-51-margin;}
export const guestWingPlan={rooms:40,floors:[.24,3.69,7.14,9.99,12.84],roof:15.69,front:-15.9,rear:-40,width:21.5};
const curtain=new T.PlaneGeometry(.55,1,12,1);
for(let i=0;i<curtain.attributes.position.count;i++){const p=curtain.attributes.position;p.setZ(i,.035*Math.cos(p.getX(i)*48));}curtain.computeVertexNormals();
function chair(k,m,x,y,z,rotation=0){k.bevel(m.velvet,x,y+.49,z,.68,.15,.72,.035,rotation);k.box(m.velvet,x,y+.88,z-.29,.68,.69,.12,rotation);for(const dx of [-.26,.26])for(const dz of [-.26,.26])k.cyl(m.gold,x+dx,y+.23,z+dz,.022,.46);}
function room(k,m,side,z,y,rise,index){
 const x=side<0?2.25:13.75,inner=side<0?6.32:9.68;
 // Each room opens to the corridor through an actual gap in its partition.
 for(const dz of [-1.92,1.92])k.box(m.ivory,inner,y+rise/2,z+dz,.12,rise-.24,2.20);
 k.box(m.ivory,inner,y+rise-.36,z,.12,.5,1.60);
 k.box(m.wood,inner,y+1.12,z+.26,.085,2.05,.76);k.box(m.gold,inner+side*.055,y+1.08,z-.02,.03,.035,.16);
 k.box(m.wood,x,y+.12,z,8.34,.06,5.75);
 if(z>-36)k.box(m.ivory,x,y+rise/2,z-2.91,8.55,rise-.2,.12);
 // Upholstered headboard, double bed, duvet, runner and separate pillows.
 const bedx=side<0?3.25:12.75;
 k.bevel(m.wood,bedx,y+.34,z-.18,2.22,.48,2.94,.045);
 k.bevel(m.white,bedx,y+.64,z-.18,2.16,.27,2.88,.035);
 k.bevel(m.velvet,bedx,y+.87,z-1.59,2.40,1.38,.16,.035);
 k.bevel(m.white,bedx,y+.81,z+.02,2.15,.10,2.3,.025);
 k.box(m.velvet,bedx,y+.875,z+.81,2.17,.045,.56);
 for(const dx of [-.54,.54])k.bevel(m.white,bedx+dx,y+.90,z-1.15,.84,.19,.49,.035);
 for(const dx of [-1.44,1.44]){k.bevel(m.wood,bedx+dx,y+.34,z-1.09,.50,.62,.58,.025);k.cyl(m.gold,bedx+dx,y+.96,z-1.10,.020,.63);k.put('cone',m.warm,bedx+dx,y+1.28,z-1.10,.21,.28,.21);}
 // En-suite bathroom and wardrobe are inside the room, near the corridor.
 const bathx=side<0?5.10:10.90;
 k.box(m.stoneDark,bathx,y+rise*.44,z+1.80,2.05,rise*.80,.10);
 k.box(m.stoneDark,bathx+side*1.0,y+rise*.44,z+2.18,.10,rise*.80,1.46);
 k.box(m.white,bathx,y+.80,z+2.43,1.45,.12,.48);k.ball(m.white,bathx,y+.89,z+2.44,.35,.06,.19);
 k.box(m.chrome,bathx,y+1.18,z+2.45,.035,.48,.035);
 k.box(m.chrome,bathx,y+1.48,z+2.84,1.30,.8,.024);
 k.box(m.wood,bathx,y+1.16,z-2.50,1.85,2.06,.64);k.box(m.gold,bathx,y+1.16,z-2.155,.028,.32,.024);
 const sittingx=side<0?-.92:16.92;
 chair(k,m,sittingx,y,z+1.45);k.cyl(m.gold,sittingx+side*.40,y+.39,z+.52,.021,.70);k.cyl(m.wood,sittingx+side*.40,y+.77,z+.52,.35,.07);
 k.box(m.wood,side<0?-.45:16.45,y+.81,z-2.32,2.55,.08,.57);chair(k,m,side<0?-.45:16.45,y,z-1.86);
 k.box(m.interior,x,y+rise-.32,z-1.65,2.35,.036,.08);
 const marker=new T.Object3D();marker.name=`Gästezimmer ${index}`;marker.position.set(x,y,z);marker.userData={room:index,floor:y,ensuite:true};k.root.add(marker);
}
function balcony(k,m,side,z,y,f=m){const x=side<0?-3.48:19.48;
 k.bevel(f.frame,x,y-.01,z,1.90,.19,5.78,.025);k.box(f.wood,x,y+.105,z,1.69,.045,5.50);
 k.box(f.glass,x+side*.85,y+.68,z,.04,1.03,5.65);k.box(m.chrome,x+side*.85,y+1.22,z,.045,.046,5.76);
 for(const dz of [-2.82,2.82]){k.box(f.glass,x,y+.68,z+dz,1.69,1.03,.04);k.box(m.chrome,x,y+1.22,z+dz,1.74,.046,.045);k.box(m.chrome,x+side*.85,y+.68,z+dz,.04,1.08,.04);}
 k.box(f.warm,x,y-.13,z,.035,.03,4.9);k.cyl(f.frame,x,y+.26,z+2.1,.25,.49);k.ball(m.leaf2,x,y+.60,z+2.1,.33,.36,.33);
}
export function buildGuestWing(parent,m,f=m,sideLight=f){
 const wing=new T.Group();wing.name='Nahtlos verbundener Gästetrakt – 40 Zimmer und Suiten';wing.userData={guestRooms:40,floors:5};parent.add(wing);const k=new Kit(wing);
 k.box(f.stone,8,-.12,-28,22,.59,24.5);
 const centers=[-19.1,-25.0,-30.9,-36.8];
 let number=101;
 for(let level=0;level<5;level++){
  const y=guestWingPlan.floors[level],top=level===4?15.69:guestWingPlan.floors[level+1],rise=top-y;
  k.bevel(f.frame,8,y,-28,21.5,.29,24.20,.035);k.box(f.ivory,8,top-.18,-28,20.8,.07,23.6);
  k.box(m.carpet,8,y+.165,-28,3.16,.035,23.7);
  for(const side of [-1,1])for(const z of centers){
   room(k,m,side,z,y,rise,number++);
   const x=side<0?-2.6:18.6,height=rise-.66;
   k.box(f.stone,x,y+.22,z,.58,.40,5.9);k.box(f.stone,x,top-.22,z,.58,.4,5.9);
   k.box(f.stone,x,y+rise/2,z-2.95,.58,rise,.46);
   for(const dz of [-2.64,2.64])k.box(f.frame,x+side*.31,y+rise/2,z+dz,.085,height,.065);
   for(const dy of [-height/2,height/2])k.box(f.frame,x+side*.31,y+rise/2+dy,z,.085,.06,5.32);
   k.box(f.glass,x+side*.35,y+rise/2,z,.025,height,5.21);k.box(f.frame,x+side*.375,y+rise/2,z,.03,height,.048);
   for(const dz of [-2.31,2.31])k.put(curtain,m.curtain,x-side*.18,y+rise/2,z+dz,1,height,1,0,Math.PI/2);
   k.box(sideLight.warm,x+side*.34,y+rise-.18,z-2.70,.09,.05,.38);
   if(level>0)balcony(k,m,side,z,y+.13,{...f,warm:sideLight.warm});
  }
  // Continue the rhythm along the existing room-dividing stone piers.
  for(const side of [-1,1]){
   const x=side<0?-3.02:19.02,orientation=side*Math.PI/2;
   for(const z of [-22.05,-27.95,-33.85,-39.75])facadeLamp(k,sideLight,x,y,z,rise,orientation);
   for(const z of [-22.05,-33.85]){const wash=facadeWash(wing,x,y+1.78,z,{orientation,range:8,intensity:1.6});wash.color.set('#89bfa0');wash.userData.sideFacadeLight=true;}
  }
  // Back elevation has two wide suite windows and a central corridor opening.
  for(const x of [-2.6,6.85,9.15,18.6])k.box(f.stone,x,y+rise/2,-39.83,.48,rise,.60);
  k.box(f.stone,8,y+.20,-39.83,21.5,.38,.56);k.box(f.stone,8,top-.20,-39.83,21.5,.36,.56);
  for(const x of [2.16,13.84]){
   k.box(f.glass,x,y+rise/2,-40.15,8.55,rise-.72,.035);
   for(const dx of [-4.22,0,4.22])k.box(f.frame,x+dx,y+rise/2,-40.18,.05,rise-.68,.07);
   for(const dy of [y+.34,top-.34])k.box(f.frame,x,dy,-40.18,8.5,.065,.07);
   for(const dx of [-3.75,3.75])k.put(curtain,m.curtain,x+dx,y+rise/2,-39.7,1,rise-.75,1);
  }
  k.box(f.glass,8,y+rise/2,-40.15,1.76,rise-.72,.035);
  for(const x of [-2.6,2.16,6.85,9.15,13.84,18.6]){
   facadeLamp(k,f,x,y,-40.34,rise,true);

  }
  facadeWash(wing,8,y+1.78,-40.34,{orientation:Math.PI,range:12,intensity:3.6});
  for(let z=-18;z>-39;z-=5.9)k.box(m.warm,8,top-.25,z,.85,.036,.15);
  // Stairs and lift occupy the central circulation space, linking all floors.
  if(level<4){const steps=18;for(let s=0;s<steps;s++)k.box(m.stoneDark,7.2,y+(s+1)*rise/steps,-22.7+s*.22,1.60,.14,.24);k.line(m.chrome,[6.4,y+1.03,-22.8],[6.4,top+1.03,-18.85],.026);}
  k.box(m.frame,7.2,y+rise/2,-29.75,1.60,rise-.27,.11);k.box(m.chrome,7.2,y+1.14,-29.68,1.35,2.03,.045);k.box(m.black,7.2,y+1.14,-29.65,.035,2.0,.024);
  const light=new T.PointLight('#ffc98a',18,10,2);light.position.set(8,y+rise-.45,-24);wing.add(light);
 }
 k.bevel(f.frame,8,15.69,-28,21.8,.31,24.60,.04);
 for(const x of [-2.75,18.75])k.box(f.frame,x,15.91,-28,.22,.52,24.5);
 k.box(f.frame,8,15.91,-40.25,21.7,.52,.24);
 // Rear arrival terrace and planted roof, kept below the main roof silhouette.
 k.box(m.cobbles,8,.04,-43.55,25,.13,6.6);
 k.bevel(f.frame,8,3.17,-41.3,4.4,.19,2.65,.035);
 for(const x of [6.65,9.35])k.box(m.gold,x,1.63,-40.21,.045,2.80,.06);
 for(const x of [-1.5,17.5])addLamp(k,m,x,.14,-44.55,2.05);
 for(const x of [1.0,15.0]){k.bevel(m.stoneDark,x,15.98,-36,3.6,.30,4.3,.035);for(let z=-37.3;z<-34.4;z+=.8)k.ball(m.leaf2,x,16.29,z,1.25,.24,.46);}
 k.finish();return wing;
}
