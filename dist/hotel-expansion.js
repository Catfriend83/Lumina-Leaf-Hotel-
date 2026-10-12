import {T,Kit,facadeLamp,facadeWash} from './core.js?v=75';
export const HOTEL_EXPANSION={baseVersion:90,frontAdvance:8,worldAdvance:6,sideAdvance:3,worldWidthIncrease:5.664,previousDoorFront:5.53,doorFront:13.53,lobbyFloor:.3375,addedStoreys:0,roof:15.69};
export function buildGroundStructure(parent,m){
 const g=new T.Group();g.name='Geschlossene Tragplatte der erweiterten Lobby';g.userData={lobbyStructure:true};parent.add(g);const k=new Kit(g);
 k.box(m.frame,8,.0825,(-16+1.7)/2,21.5,.40,17.7);
 k.box(m.frame,8,.0825,(1.7+11.95)/2,28.1,.40,10.25);
 for(const [a,b] of [[-6.05,5.02],[10.98,22.05]])k.box(m.frame,(a+b)/2,.0825,(11.95+13.53)/2,b-a,.40,1.58);
 k.box(m.stone,8,-.1,(1.7+13.53)/2,28.2,.55,11.83);k.finish();return g;
}
export function buildLobbyExtension(parent,exterior,m,sideLight=exterior){
 const g=new T.Group();g.name='Breite und tiefe gläserne Empfangshalle';g.userData={lobbyExtension:true,...HOTEL_EXPANSION};parent.add(g);const k=new Kit(g);
 const stone=m.floor.clone();stone.map=m.floor.map.clone();stone.map.wrapS=stone.map.wrapT=T.RepeatWrapping;
 const floor=(a,b,z0,z1)=>{const geo=new T.BoxGeometry(b-a,.055,z1-z0),p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++)if(Math.abs(n.getY(i))>.5)uv.setXY(i,(p.getX(i)+(a+b)/2)/3.45,(p.getZ(i)+(z0+z1)/2)/17.4);
  const slab=k.mesh(geo,stone,'Durchgehender Natursteinboden der vergrößerten Lobby');slab.position.set((a+b)/2,.310,(z0+z1)/2);slab.userData={lobbyFinishedFloor:true,finishedHeight:.3375};};
 floor(-2.31,18.31,-15.5,1.7);floor(-5.91,21.91,1.7,11.95);
 for(const [a,b] of [[-5.91,5.02],[10.98,21.91]])floor(a,b,11.95,13.53);
 k.box(m.plaster,8,6.32,7.55,27.8,.09,11.7);
 k.box(exterior.frame,8,7.13,7.65,28.2,.24,12.3);
 for(const x of [-6,22])k.box(exterior.frame,x,7.15,7.65,.16,.30,12.3);
 k.box(exterior.frame,8,7.15,13.6,28.2,.30,.16);
 for(const x of [-4.6,20.6])k.box(m.diffuser,x,6.23,7.5,.035,.03,11.4);
 for(const x of [-2,2,14,18])for(const z of [3.5,7.5,11.5])k.cyl(m.diffuser,x,6.255,z,.085,.025);
 // Symmetrical front bays leave the unchanged six-metre centre portal clear.
 const piers=[-5.6,-1.7,2.2,4.85,11.15,13.8,17.7,21.6];
 for(const x of piers){k.box(exterior.stone,x,3.69,13.22,.4,6.9,.7);if(x!==4.85&&x!==11.15)facadeLamp(k,exterior,x,.24,13.64,6.9);}
 for(const [a,b] of [[-5.4,-1.9],[-1.5,2.0],[2.4,4.65],[11.35,13.6],[14,17.5],[17.9,21.4]]){
  k.box(exterior.glass,(a+b)/2,3.828,13.15,b-a,6.55,.038);
  k.box(exterior.frame,(a+b)/2,3.828,13.14,.038,6.55,.055);
  for(const y of [.553,7.103])k.box(exterior.frame,(a+b)/2,y,13.15,b-a,.045,.06);
 }
 // Both side returns continue the original stone / slim bronze glazing language.
 for(const side of [-1,1]){
  const sx=side<0?-5.6:21.6,gx=sx+side*.36;
  for(const y of [.39,7.01])k.box(exterior.stone,sx,y,7.55,.58,.26,11.7);
  for(const z of [1.98,5.73,9.48,13.22]){k.box(exterior.stone,sx,3.69,z,.58,6.9,.76);facadeLamp(k,sideLight,sx+side*.41,.24,z,6.9,side*Math.PI/2);}
  for(const [a,b] of [[2.36,5.35],[6.11,9.10],[9.86,12.84]]){
   k.box(exterior.glass,gx+side*.05,3.69,(a+b)/2,.025,6.14,b-a);
   for(const z of [a,b,(a+b)/2])k.box(exterior.frame,gx,3.69,z,.10,6.26,.055);
   for(const y of [.59,6.79])k.box(exterior.frame,gx,y,(a+b)/2,.10,.06,b-a+.12);
  }
  const shoulder=side<0?-4.1:20.1;
  k.box(exterior.stone,shoulder,.39,1.98,3,.30,.58);k.box(exterior.stone,shoulder,7.01,1.98,3,.26,.58);
  k.box(exterior.glass,shoulder,3.69,1.89,2.42,6.14,.025);k.box(exterior.frame,shoulder,3.69,1.90,.06,6.24,.10);
  for(const y of [.59,6.79])k.box(exterior.frame,shoulder,y,1.90,2.54,.06,.10);
  const wash=facadeWash(parent,sx,2.02,7.5,{orientation:side*Math.PI/2,range:10,intensity:2});wash.color.set('#89bfa0');wash.userData.sideFacadeLight=true;
 }
 for(const x of [0,16]){facadeWash(parent,x,2.02,13.68,{range:7,intensity:2.8});const light=new T.PointLight('#ffd8a6',9,10,2);light.name='Sanftes Licht der erweiterten Lounge';light.position.set(x,5.3,8);g.add(light);}
 k.finish();return g;
}
