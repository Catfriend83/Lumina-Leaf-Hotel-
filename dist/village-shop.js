import {shopTimberMaterial,buildShopUpper} from './shop-alpine-upper.js?v=75';
import {T,Kit} from './core.js?v=75';
import {FOUNDATION_LEVELS} from './foundation-data.js?v=75';
import {buildingPoint,nearestRoadAccess} from './village-layout.js?v=75';
import {buildBavarianRoof} from './bavarian-houses.js?v=75';

export function buildVillageShop(root,materials,b,height){
 const floor=FOUNDATION_LEVELS[b.id],g=new T.Group();g.name='Dorfladen Seealm – Nahversorgung am Platz';g.position.set(b.x,floor,b.z);g.rotation.y=b.rot;
 g.userData={villageBuilding:true,villageShop:true,buildingId:b.id,kind:'shop',footprint:{width:b.w,depth:b.d},floorY:floor,storeys:2,frontFacesPlaza:true,frontDirection:[Math.sin(b.rot),Math.cos(b.rot)],shopAtFormerHouse:'haus-6'};root.add(g);
 const plaster=materials.villagePlaster.clone();plaster.name='Heller mineralischer Putz des Dorfladens';plaster.color.set('#e8e1d3');
 const wood=shopTimberMaterial(materials);
 const roof=materials.villageTiles.clone();roof.name='Traditionelle graue Ziegel des Dorfladens';roof.color.set('#69665f');
 const glass=new T.MeshPhysicalMaterial({name:'Klare Schaufenster des Dorfladens',color:'#dbe9e5',transparent:true,opacity:.22,roughness:.06,metalness:.06,depthWrite:false,side:T.DoubleSide});
 const floorMat=materials.stone.clone();floorMat.name='Natursteinboden im Dorfladen';floorMat.color.set('#d0c8b6');floorMat.roughness=.86;
 const shelf=new T.MeshStandardMaterial({name:'Helle Eichenregale im Dorfladen',color:'#bba789',roughness:.79}),dark=new T.MeshStandardMaterial({name:'Dezente Ladenrahmen und Kassenmöbel',color:'#303934',roughness:.50,metalness:.25});
 const cream=new T.MeshStandardMaterial({name:'Helle Lebensmittelverpackungen',color:'#e6d8ac',roughness:.83}),red=new T.MeshStandardMaterial({name:'Rote Lebensmittel und Äpfel',color:'#a44032',roughness:.76}),green=new T.MeshStandardMaterial({name:'Grünes Obst und Gemüse',color:'#708446',roughness:.85}),yellow=new T.MeshStandardMaterial({name:'Gelbes Obst und Verpackungen',color:'#cfab48',roughness:.79});
 const m={...materials,plaster,wood,roof},k=new Kit(g),{w,d}=b,h=3.88,front=d/2;
 // Foundation closes down into the established parcel terrain on every side.
 const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]],p=[];
 for(const [x,z]of corners){const [wx,wz]=buildingPoint(b,x,z);p.push(x,Math.min(height(wx,wz)-.10,floor-.24)-floor,z);}for(const [x,z]of corners)p.push(x,0,z);
 const foundation=new T.BufferGeometry();foundation.setAttribute('position',new T.Float32BufferAttribute(p,3));foundation.setAttribute('uv',new T.Float32BufferAttribute(corners.concat(corners).flatMap(([x,z])=>[x/3,z/3]),2));foundation.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);foundation.computeVertexNormals();k.mesh(foundation,materials.stoneDark,'Geschlossener Natursteinsockel des Dorfladens');
 k.box(floorMat,0,.025,0,w-.30,.05,d-.30);k.box(plaster,0,h/2,-d/2,w,h,.28);for(const side of [-1,1])k.box(plaster,side*(w/2-.14),h/2,0,.28,h,d);
 // Actual front openings: two three-metre windows and a centred glass door.
 for(const [x,pw]of [[-4.55,.90],[-1.2,.60],[1.2,.60],[4.55,.90]])k.box(plaster,x,h/2,front,pw,h,.28);
 k.box(plaster,0,(h+2.67)/2,front,w,h-2.67,.28);
 for(const x of [-2.8,2.8]){
  k.box(materials.stoneDark,x,.22,front,2.6,.44,.30);k.box(glass,x,1.55,front+.006,2.6,2.22,.026);
  for(const dx of [-1.30,1.30])k.box(wood,x+dx,1.55,front+.18,.07,2.30,.08);
  for(const y of [.44,2.67])k.box(wood,x,y,front+.18,2.67,.065,.08);k.box(dark,x,1.55,front+.050,.04,2.22,.036);
 }
 const door=new T.Group();door.name='Automatische Glastür zum Dorfplatz';door.position.set(0,0,front);door.userData={shopEntrance:true,width:1.8,height:2.67,unobstructed:true};g.add(door);const dk=new Kit(door);
 for(const side of [-1,1]){dk.box(glass,side*.445,1.35,.014,.855,2.60,.024);dk.box(wood,side*.89,1.35,.18,.075,2.65,.10);}dk.box(wood,0,2.67,.18,1.90,.085,.10);dk.box(dark,0,1.35,.039,.042,2.65,.036);dk.box(dark,0,.037,.025,1.8,.025,.12);dk.finish();
 // An orderly central aisle remains open behind the door.
 for(const x of [-3.15,0,3.15]){
  k.box(shelf,x,1.31,-2.90,2.35,2.50,.07);for(const y of [.30,.84,1.38,1.92,2.46])k.box(shelf,x,y,-2.65,2.35,.055,.56);
  for(let row=0;row<4;row++)for(let j=0;j<8;j++){const mat=[cream,red,green,yellow][(j+row)%4],xx=x+(j-3.5)*.26,y=.5175+row*.54;k.box(mat,xx,y,-2.54,.18,.38,.21);k.box(cream,xx,y+.015,-2.423,.13,.10,.008);}
 }
 for(const x of [-3.0,-1.95]){
  k.box(shelf,x,.48,2.28,.94,.88,1.22);k.box(wood,x,.92,2.28,.98,.10,1.27);
  for(const z of [1.99,2.56]){k.box(wood,x,1.00,z,.88,.10,.50);for(let j=0;j<12;j++)k.ball(j%3?green:red,x+(j%4-1.5)*.18,1.105+Math.floor(j/4)*.015,z+(Math.floor(j/4)-1)*.13,.09,.083,.09);}
 }
 k.box(shelf,3.0,.49,2.25,2.15,.94,.95);k.box(materials.stoneDark,3.0,.995,2.25,2.25,.06,1.03);k.box(dark,2.77,1.08,2.19,.38,.10,.31);k.box(dark,2.77,1.135,2.07,.08,.09,.07);k.box(dark,2.77,1.30,2.07,.40,.31,.07);k.box(materials.black,2.77,1.30,2.11,.33,.23,.012);
 const lightMat=new T.MeshStandardMaterial({name:'Warme Innenbeleuchtung des Dorfladens',color:'#ffedcd',emissive:'#ffdcaa',emissiveIntensity:1.6,roughness:.7});
 k.box(plaster,0,3.75,0,w-.4,.10,d-.4);for(const x of [-2.9,0,2.9])k.box(lightMat,x,3.69,-.3,.11,.035,3.65);
 const light=new T.PointLight('#ffe1b4',8,13,2);light.name='Warme Ladenbeleuchtung';light.position.set(0,3.3,.4);light.userData={shopInteriorLight:true};g.add(light);
 const signMaterial=materials.makeSign('Dorfladen',{subtitle:'',width:1536,height:300,fontScale:.54,italic:false,fontFamily:'"DejaVu Sans", Arial, sans-serif',foreground:'#f4edda',background:'#433226'});signMaterial.name='Dezente Beschriftung Dorfladen';signMaterial.emissiveIntensity=.10;
 const sign=k.mesh(new T.PlaneGeometry(3.1,.55),signMaterial,'Dorfladen-Schild über dem Haupteingang');sign.position.set(0,3.23,front+.23);
 const upper=buildShopUpper(g,materials,m,b);buildBavarianRoof(k,{...m,plaster:wood},{...b,h:upper.height},{slope:upper.slope,eaves:upper.eaves,cladding:true});k.finish();
 const [dx,dz]=buildingPoint(b,0,front+.70);g.userData.entrance=[dx,floor,dz];g.userData.interior={produce:true,foodShelves:3,checkout:true,centralAisleFree:true};
 return {group:g,building:b,floor,door:{x:dx,z:dz,y:floor},access:nearestRoadAccess(dx,dz),corners:corners.map(p=>buildingPoint(b,...p))};
}
