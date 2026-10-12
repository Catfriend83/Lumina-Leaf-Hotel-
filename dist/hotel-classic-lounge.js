import {referenceTableLamp} from './lobby-table-lamp.js?v=92';
import {T,Kit,TAU} from './core.js?v=75';
import {RoundedBoxGeometry} from './vendor/addons/geometries/RoundedBoxGeometry.js';

const FLOOR=.3375, cushions=new Map();
function pad(k,m,x,y,z,w,h,d,r=.08,rx=0){
 const key=[w,h,d,r].join(',');if(!cushions.has(key))cushions.set(key,new RoundedBoxGeometry(w,h,d,3,r));
 k.put(cushions.get(key),m,x,y,z,1,1,1,rx);
}
function curve(k,m,points,r=.015,closed=false){
 k.put(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed),Math.max(24,points.length*3),r,6,closed),m,0,0,0);
}
function materials(source){
 const mat=(name,color,props={})=>new T.MeshStandardMaterial({name:'Klassische Lobby – '+name,color,roughness:.8,...props});
 const textile=source.lobbyDamask.clone();textile.wrapS=textile.wrapT=T.RepeatWrapping;textile.repeat.set(.90,.75);
 const curtainMap=source.lobbyDamask.clone();curtainMap.wrapS=curtainMap.wrapT=T.RepeatWrapping;curtainMap.repeat.set(1,4);
 return {
  damask:mat('Champagner-Damastpolster','#e8cd94',{map:textile,bumpMap:textile,bumpScale:.0014,roughness:.93}),
  plain:mat('Goldbeiger Samt','#baa16c',{roughness:.97}),
  walnut:mat('Polierter dunkler Nussbaum','#382319',{roughness:.28,metalness:.03,envMapIntensity:.25}),
  gold:mat('Antikes Messing','#c6a36b',{roughness:.38,metalness:.73,envMapIntensity:.4}),
  piping:mat('Goldene Möbelkeder','#93723d',{roughness:.68,metalness:.18}),
  cream:mat('Elfenbeinfarbene Wandfelder','#d7c3a0',{roughness:.93}),
  stripe:mat('Goldocker-Wandstreifen','#aa8650',{roughness:.88}),
  curtain:mat('Goldbraune Jacquardvorhänge','#9d6f36',{map:curtainMap,roughness:.98,side:T.DoubleSide}),
  rug:mat('Dunkler floraler Loungerteppich','#ffffff',{map:source.lobbyRug,roughness:1}),
  bronze:mat('Goldbraune ovale Deckenfüllung','#8f663d',{roughness:.43,metalness:.24,envMapIntensity:.25}),
  crystal:new T.MeshPhysicalMaterial({name:'Klassische Lobby – facettiertes Kristallglas',color:'#fff1cf',roughness:.18,metalness:.04,transparent:true,opacity:.88,transmission:.16,thickness:.007,ior:1.5,clearcoat:.8,envMapIntensity:.6,side:T.FrontSide}),
  litCrystal:mat('Warme Kristallreflexe','#eedbb7',{emissive:'#ffd899',emissiveIntensity:.42,roughness:.30,metalness:.10}),
  opal:mat('Warmweißer Lampenkern','#fff2d2',{emissive:'#ffd39a',emissiveIntensity:.95,roughness:.72}),
  mirror:new T.MeshPhysicalMaterial({name:'Klassische Lobby – bronziertes Spiegelglas',color:'#8c7350',roughness:.19,metalness:.84,envMapIntensity:.55}),
 };
}
function item(parent,kind,x,z,w,d,angle=0){
 const g=new T.Group();g.name='Klassische Lobby – '+kind;g.position.set(x,FLOOR,z);g.rotation.y=angle;
 g.userData={loungeItem:true,kind,footprint:[w,d],floor:FLOOR};parent.add(g);return g;
}
function seating(parent,m,x,z,sofa=false,angle=0){
 const width=sofa?2.75:1.18,depth=1.45,g=item(parent,sofa?'Damastsofa':'Damastsessel',x,z,width,depth,angle),k=new Kit(g);
 pad(k,m.walnut,0,.28,0,width-.12,.14,1.27,.045);
 pad(k,m.plain,0,.39,0,width-.12,.23,1.27,.08);
 const n=sofa?2:1,seatWidth=(width-.40)/n;
 for(let i=0;i<n;i++){
  const px=(i-(n-1)/2)*(seatWidth+.01);
  pad(k,m.damask,px,.56,.08,seatWidth-.015,.23,1.08,.095);
  pad(k,m.damask,px,.99,-.52,seatWidth+.035,.90,.25,.09,-.13);
  curve(k,m.piping,[[px-seatWidth/2+.06,.58,.60],[px,.585,.63],[px+seatWidth/2-.06,.58,.60]],.010);
 }
 pad(k,m.damask,0,1.08,-.65,width-.10,.72,.115,.045,-.12);
 // Rolled upholstered arms and a fine timber/gold edge give a classical silhouette.
 for(const side of [-1,1]){
  pad(k,m.damask,side*(width/2-.12),.73,.015,.24,.48,1.38,.11);
  k.ball(m.plain,side*(width/2-.12),.89,.39,.15,.15,.28);
  curve(k,m.piping,[[side*(width/2-.03),.47,.61],[side*(width/2-.01),.80,.57],[side*(width/2-.10),.99,.08],[side*(width/2-.10),1.31,-.54]],.013);
 }
 for(const dx of [-width/2+.19,width/2-.19])for(const dz of [-.48,.48]){
  curve(k,m.walnut,[[dx,.31,dz],[dx*1.02,.20,dz*1.05],[dx*1.04,.05,dz*1.10]],.035);
  k.ball(m.gold,dx*1.04,.028,dz*1.10,.036,.026,.040);
 }
 k.finish();return g;
}
function sideTable(parent,m,x,z,index){
 const g=item(parent,'Runder Lampen-Beistelltisch',x,z,.83,.94),k=new Kit(g);
 for(let i=0;i<3;i++){const a=i*TAU/3,dx=Math.cos(a)*.26,dz=Math.sin(a)*.31;k.line(m.walnut,[dx,.65,dz],[dx*1.16,.02,dz*1.16],.030);}
 k.cyl(m.walnut,0,.42,0,.25,.04);k.put(new T.CylinderGeometry(.405,.39,.065,48),m.walnut,0,.685,0,1,1,1.14);
 k.put(new T.TorusGeometry(.40,.008,6,48),m.gold,0,.713,0,1,1.14,1,Math.PI/2);
 k.finish();referenceTableLamp(g,0,.718,0,index);return g;
}
function coffeeTable(parent,m,x,z){
 const g=item(parent,'Nussbaum-Couchtisch',x,z,2.05,1.06),k=new Kit(g);
 pad(k,m.walnut,0,.49,0,2.05,.075,1.06,.07);
 pad(k,m.gold,0,.458,0,1.99,.022,1.0,.06);
 for(const dx of [-.82,.82])for(const dz of [-.35,.35])k.line(m.walnut,[dx,.46,dz],[dx*1.07,.025,dz*1.12],.033);
 pad(k,m.walnut,0,.17,0,1.65,.045,.67,.03);
 // Small central bowl stays below the sight line across each seating group.
 k.put(new T.SphereGeometry(.17,24,12,0,TAU,Math.PI/2,Math.PI/2),m.gold,0,.64,0,1,.62,1);
 for(let i=0;i<5;i++)k.ball(m.cream,.10*Math.sin(i*2.4),.63,.10*Math.cos(i*2.4),.05,.035,.05);
 k.finish();
}
function rug(parent,m,x,z,w=5.5,d=6.8){
 const g=item(parent,'Floraler Lounge-Teppich',x,z,w,d),k=new Kit(g);
 k.box(m.walnut,0,.006,0,w,.012,d);
 const surface=k.mesh(new T.PlaneGeometry(w,d),m.rug,'Ornamentteppich unter der Sitzgruppe');surface.rotation.x=-Math.PI/2;surface.position.y=.013;surface.userData.loungeRug=true;k.finish();
}
function wallDecor(parent,m){
 const k=new Kit(parent);
 for(const center of [15.06]){
  k.box(m.cream,center,3.25,-7.08,4.23,5.82,.25);
  for(let i=0;i<24;i++)k.box(i%2?m.stripe:m.cream,center-2.03+i*.176,3.25,-6.936,.080,5.72,.025);
  for(const y of [.47,1.43,5.94])k.box(m.gold,center,y,-6.90,4.20,.045,.045);
  for(const dx of [-1.87,1.87])k.box(m.gold,center+dx,3.24,-6.91,.045,5.42,.045);
  // Tall bronze mirror with stepped gilded frame, above a slim console.
  k.box(m.walnut,center,3.47,-6.86,2.57,3.05,.12);
  k.box(m.gold,center,3.47,-6.78,2.43,2.91,.08);
  k.box(m.mirror,center,3.47,-6.73,2.20,2.68,.025);
  for(const dx of [-1.07,1.07])k.box(m.walnut,center+dx,.86,-6.33,.075,1.04,.08);
  pad(k,m.walnut,center,1.40,-6.36,2.54,.09,.58,.035);
 }
 // Pulled-back drapes sit against the side piers, clear of the entrance glass.
 for(const side of [-1,1])for(const z of [-4.55,1.90,5.73,9.48]){
  const geo=new T.PlaneGeometry(.72,5.63,24,28),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const u=p.getX(i),v=p.getY(i),pinch=1-.29*Math.exp(-(((v+.8)/.55)**2));p.setX(i,u*pinch);p.setZ(i,.070*Math.cos(u/.72*TAU*5));}geo.computeVertexNormals();
  k.put(geo,m.curtain,side<0?(z>2?-5.13:-2.13):(z>2?21.13:18.13),FLOOR+2.84,z,1,1,1,0,side*Math.PI/2);
  k.line(m.gold,[side<0?(z>2?-5.20:-2.20):(z>2?21.20:18.20),6.05,z-.45],[side<0?(z>2?-5.20:-2.20):(z>2?21.20:18.20),6.05,z+.45],.018);
  k.line(m.gold,[side<0?(z>2?-5.03:-2.03):(z>2?21.03:18.03),2.34,z-.25],[side<0?(z>2?-5.03:-2.03):(z>2?21.03:18.03),2.34,z+.25],.012);
 }
 k.finish();
}
function chandelier(parent,m,x,z,r,index){
 const g=new T.Group();g.name='Klassischer Kristall-Kronleuchter '+index;g.position.set(x,5.85,z);
 g.userData={crystalChandelier:true,axis:'Lobby-Laengsachse',index,diameter:2*r,mountingHeight:5.85,orientation:0};
 parent.add(g);const k=new Kit(g);
 k.cyl(m.gold,0,.27,0,.055,.48);k.cyl(m.gold,0,.48,0,.24,.04);
 for(const [radius,y] of [[r,0],[r*.82,-.28],[r*.52,-.53]])k.put(new T.TorusGeometry(radius,.035,8,64),m.gold,0,y,0,1,1,1,Math.PI/2);
 k.put(new T.CylinderGeometry(r,r,.14,64,1,true),m.gold,0,.04,0);
 const bead=new T.IcosahedronGeometry(1,1);
 for(let i=0;i<64;i++){
  const a=i*TAU/64;
  for(let row=0;row<6;row++){const t=(row+.5)/6,rr=r*Math.sqrt(Math.max(.08,1-t*t)),y=-.04-t*.68;
   k.put(bead,(i+row)%4===0?m.litCrystal:m.crystal,rr*Math.cos(a),y,rr*Math.sin(a),.027,.060,.027);
  }
 }
 k.ball(m.litCrystal,0,-.69,0,.10,.06,.10);k.cyl(m.opal,0,-.10,0,r*.76,.035);k.finish();
 // Same calibrated warm source for all three: reduce glare while keeping crystal detail.
 const light=new T.PointLight('#ffdab1',5.5,8,2);light.name='Weiches Licht des Kristall-Kronleuchters '+index;light.position.y=-.3;g.add(light);
}
function ceiling(parent,m){
 const k=new Kit(parent),shape=new T.Shape();shape.absellipse(8,-1.0,8.8,4.75,0,TAU,false,0);
 const geo=new T.ShapeGeometry(shape,96);k.put(geo,m.bronze,0,6.25,0,1,1,1,Math.PI/2);
 // Matching oval cornice and concealed warm cove below the existing ceiling.
 for(const [rx,rz,y,mat,r] of [[8.85,4.80,6.18,m.gold,.055],[8.68,4.63,6.17,m.opal,.024]]){
  const pts=[];for(let i=0;i<96;i++){const a=i*TAU/96;pts.push([8+rx*Math.cos(a),y,-1+rz*Math.sin(a)]);}curve(k,mat,pts,r,true);
 }
 k.finish();
}
function backPassage(parent,m){
 const g=new T.Group();g.name='Linker Durchgang zum hinteren Hotelbereich';g.userData={hotelPassage:true,clearWidth:2.2,clearHeight:3.1,depth:7.72};parent.add(g);const k=new Kit(g);
 // Real opening, finished reveals and a softly lit corridor beyond the lounge.
 for(const [a,b] of [[-1.175,-.15],[2.05,3.055]]){k.box(m.cream,(a+b)/2,3.25,-7.08,b-a,5.82,.25);for(const y of [.47,5.94])k.box(m.gold,(a+b)/2,y,-6.91,b-a,.045,.04);}
 k.box(m.cream,.95,4.77,-7.08,2.2,2.78,.25);
 for(const x of [-.18,2.08])k.box(m.gold,x,1.89,-6.91,.055,3.1,.055);
 k.box(m.gold,.95,3.45,-6.91,2.31,.065,.055);
 for(const x of [-.25,2.15]){k.box(m.cream,x,1.94,-10.94,.16,3.2,7.72);k.box(m.gold,x, .45,-10.94,.17,.08,7.72);}
 k.box(m.cream,.95,3.57,-10.94,2.56,.12,7.72);k.box(m.cream,.95,1.94,-14.8,2.56,3.2,.16);
 k.box(m.walnut,.95,1.58,-14.70,1.20,2.48,.055);k.cyl(m.gold,1.36,1.45,-14.65,.014,.32);
 for(const z of [-8.4,-11,-13.6])k.cyl(m.opal,.95,3.49,z,.10,.025);
 k.finish();const light=new T.PointLight('#ffdab1',4,8,2);light.position.set(.95,2.9,-10);g.add(light);
}
export function buildClassicLounge(parent,source){
 const g=new T.Group();g.name='Klassische Luxushotellounge nach Referenz 1';g.userData={classicLounge:true,reference:1,seatingGroups:2,tableLamps:4};parent.add(g);const m=materials(source);
 // The two islands beside reception are removed; continuous stone flooring remains.
 for(const [index,x] of [-.7,16.7].entries()){
  rug(g,m,x,8.40);seating(g,m,x,5.85,true);
  seating(g,m,x-1.48,10.60,false,Math.PI-.12);seating(g,m,x+1.48,10.60,false,Math.PI+.12);
  coffeeTable(g,m,x,8.22);sideTable(g,m,x-2.12,5.85,index*2+5);sideTable(g,m,x+2.12,5.85,index*2+6);
 }
 wallDecor(g,m);backPassage(g,m);ceiling(g,m);
 const k=new Kit(g),shape=new T.Shape();shape.absellipse(8,8.3,11.9,4.05,0,TAU,false,0);
 k.put(new T.ShapeGeometry(shape,96),m.bronze,0,6.25,0,1,1,1,Math.PI/2);
 for(const [rx,rz,y,mat,r] of [[11.95,4.10,6.18,m.gold,.055],[11.78,3.93,6.17,m.opal,.024]]){const pts=[];for(let i=0;i<96;i++){const a=i*TAU/96;pts.push([8+rx*Math.cos(a),y,8.3+rz*Math.sin(a)]);}curve(k,mat,pts,r,true);}
 k.finish();
 // Actual lobby depth: reception wall z≈-7, entry glazing z≈13.53.
 // Centre z=3.25, 5.45m identical spacing along x=8. No crosswise alignment.
 // All three are built by the same geometry function, radius and hanging height.
 const chandelierAxis={x:8,y:5.85,centerZ:3.25,spacing:5.45,radius:1.65};
 for(let i=0;i<3;i++){
  const z=chandelierAxis.centerZ+(i-1)*chandelierAxis.spacing;
  chandelier(g,m,chandelierAxis.x,z,chandelierAxis.radius,i+1);
 }
 g.userData.chandelierAlignment={count:3,...chandelierAxis,direction:'from reception toward entrance',identicalGeometry:true};
 return g;
}
