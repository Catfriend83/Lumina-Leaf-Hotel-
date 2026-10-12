import {T,Kit,facadeLamp} from './core.js?v=75';

export const HOTEL_ENTRANCE={center:8,left:5.02,right:10.98,front:13.53,inner:11.95,outerFloor:.194/1.032,innerFloor:.3375,doorTop:6.24,head:6.29};

// Recess just the floor strips inside the portal. The original room flooring
// remains unchanged everywhere outside the short, flush threshold transition.
export function entranceBayFloor(k,wood,x,y){
 const a=x-3.45/2,b=x+3.45/2,z0=-15.5,z1=HOTEL_ENTRANCE.inner;
 k.box(wood,x,y,(z0+z1)/2,3.45,.055,z1-z0);
 for(const [left,right]of [[a,Math.min(b,HOTEL_ENTRANCE.left)],[Math.max(a,HOTEL_ENTRANCE.right),b]])
  if(right>left)k.box(wood,(left+right)/2,y,(z1+HOTEL_ENTRANCE.front)/2,right-left,.055,HOTEL_ENTRANCE.front-z1);
}

export function buildMainEntrance(parent,m){
 const g=new T.Group();g.name='Symmetrischer Haupteingang – Glas-Doppelflügeltür';
 g.userData={hotelEntrance:true,doubleGlassDoor:true,center:8,clearWidth:5.88,clearHeight:6.024,noCentralPier:true};parent.add(g);const k=new Kit(g),p=HOTEL_ENTRANCE;
 // Two flush outer jambs and one header; no solid central wall or mullion.
 for(const x of [p.left,p.right])k.box(m.gold,x,3.24,p.front,.08,6.10,.10);
 k.box(m.gold,p.center,p.head-.0375,p.front,5.96,.075,.10);
 // Equal glass leaves with a 24 mm meeting gap and a slim weather seal.
 const bottom=.216,top=p.doorTop,leafWidth=2.928;
 for(const side of [-1,1]){
  const x=p.center+side*1.476;
  k.box(m.glass,x,(bottom+top)/2,p.front-.025,leafWidth,top-bottom,.045);
  for(const y of [bottom+.018,top-.018])k.box(m.gold,x,y,p.front,leafWidth,.036,.035);
  const edge=p.center+side*.012;
  k.box(m.gold,edge,(bottom+top)/2,p.front,.024,top-bottom,.035);
  const handle=p.center+side*.30;
  k.cyl(m.gold,handle,2.65,p.front+.075,.022,2.15);
  for(const y of [1.64,3.66])k.box(m.gold,handle,y,p.front+.04,.042,.042,.07);
 }
 k.box(m.frame,p.center,(bottom+top)/2,p.front-.027,.014,top-bottom,.035);
 k.box(m.frame,p.center,.203,p.front-.025,5.88,.022,.045);
 // The outside edge exactly meets the existing carpet. A continuous ramp
 // joins the original higher lobby floor, instead of leaving a step or gap.
 const width=p.right-p.left,depth=p.front-p.inner,ramp=new T.BoxGeometry(width,.08,depth),a=ramp.attributes.position;
 for(let i=0;i<a.count;i++){
  const z=a.getZ(i)+(p.front+p.inner)/2,t=(p.front-z)/depth;
  a.setXYZ(i,a.getX(i)+p.center,p.outerFloor+(p.innerFloor-p.outerFloor)*t+(a.getY(i)>0?0:-.08),z);
 }
 ramp.computeVertexNormals();const threshold=k.mesh(ramp,m.wood,'Bündiger Übergang vom roten Teppich zum Lobbyboden');threshold.userData={entranceThreshold:true,outerHeight:p.outerFloor,innerHeight:p.innerFloor};
 const warm={...m};
 for(const x of [4.85,11.15]){
  facadeLamp(k,warm,x,.24,p.front+.11,6.9);
  const marker=g.children.at(-1);marker.name='Grüne seitliche Eingangsleuchte mit warmen Abschlüssen';marker.userData.hotelEntranceLight=true;
 }
 k.finish();return g;
}
