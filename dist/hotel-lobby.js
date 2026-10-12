import {buildClassicLounge} from './hotel-classic-lounge.js?v=92';
import {T,Kit,person,TAU} from './core.js?v=75';
import {hotelLettering,fiveStars} from './hotel-reference-details.js?v=82';
import {buildReceptionTeam} from './reception-team.js?v=86';

// The reference lobby is real, navigable geometry behind the clear entrance.
// Its materials are independent of the exterior, guest rooms and landscape.
export function makeLobbyMaterials(source){
 const marble=(name,color)=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512),hex=parseInt(color.slice(1),16),base=[(hex>>16&255)/255,(hex>>8&255)/255,(hex&255)/255];
  // Quiet diagonal mineral veins, with fine branching and no regular tile grid.
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
   const bend=21*Math.sin(y*.018)+9*Math.sin(y*.049+x*.013),v=Math.sin((x-y*.61+bend)*.032);
   const vein=Math.pow(Math.max(0,1-Math.abs(v)),21),fine=Math.pow(Math.max(0,1-Math.abs(Math.sin((x+y*.36+13*Math.sin(y*.06))*.091))),35)*.17;
   const grain=.025*Math.sin(x*1.9+y*2.7),i=(y*512+x)*4;
   for(let c=0;c<3;c++)pixels.data[i+c]=Math.min(255,255*(base[c]+.29*vein+fine+grain));
   pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  return new T.MeshStandardMaterial({name,map,roughness:.32,metalness:.02,envMapIntensity:.32,bumpMap:source.stone.bumpMap,bumpScale:.001});
 };
 const mat=(name,color,props={})=>new T.MeshStandardMaterial({name,color,roughness:.76,...props});
 return {
  marble:marble('Dunkelgrüner Rezeptionsmarmor','#142d24'),
  floor:marble('Beiger Lobby-Naturstein','#bdab8e'),
  gold:mat('Gebürstetes Lobby-Messing','#bfa16c',{roughness:.36,metalness:.72,envMapIntensity:.4,side:T.DoubleSide}),
  panel:mat('Warme Designer-Wandflächen','#9d7953',{roughness:.83,bumpMap:source.wood.bumpMap}),
  plaster:mat('Beige Lobbydecke und Pfeiler','#ccb99b',{roughness:.92}),
  seat:mat('Dunkelgrüner Lounge-Stoff','#263e32',{roughness:.96}),
  cream:mat('Cremefarbener Lounge-Stoff','#c1ae8b',{roughness:.95}),
  shade:mat('Warme textile Lampenschirme','#e2cc9b',{emissive:'#ffc77d',emissiveIntensity:.38,roughness:.94}),
  diffuser:mat('Kontrolliertes warmes Lobbylicht','#dcc596',{emissive:'#ffd59a',emissiveIntensity:.75,roughness:.82}),
  dark:mat('Dunkle Lobbydetails','#161d1a',{roughness:.72}),
  rug:mat('Grüner Empfangsteppich','#19362c',{roughness:1}),
  leaf:source.leaf,leaf2:source.leaf2,wood:source.wood,white:source.white
 };
}

function fern(k,m,x,y,z,scale=1){
 k.cyl(m.dark,x,y+.32*scale,z,.30*scale,.64*scale);
 for(const dy of [.04,.59])k.cyl(m.gold,x,y+dy*scale,z,.305*scale,.022*scale);
 for(let a=0;a<11;a++){
  const theta=a*2.399,h=(1.25+.26*Math.sin(a*1.8))*scale;
  const end=[x+Math.cos(theta)*.60*scale,y+h,z+Math.sin(theta)*.6*scale];
  k.line(m.wood,[x,y+.58*scale,z],end,.014*scale);
  k.ball(a%2?m.leaf:m.leaf2,...end,.16*scale,.42*scale,.07*scale);
 }
}
function leafEmblem(k,m,x,y,z,size=1){
 for(let i=0;i<5;i++){
  const side=i%2?-1:1,level=Math.floor(i/2),a=i===4?0:side*(.75-.11*level);
  const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(-.19,.30,0,.67);shape.quadraticCurveTo(.19,.30,0,0);
  const geo=new T.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:false,curveSegments:12});
  k.put(geo,m.gold,x+side*(i===4?0:.12)*size,y+level*.25*size,z,size,size,size,0,0,a);
 }
 k.line(m.gold,[x,y-.12*size,z],[x,y+1.03*size,z],.013*size);
}

export function buildReferenceLobby(parent,source,m){
 const g=new T.Group();g.name='Referenz-Lobby – Marmor und klassisch-goldene Lounge';
 g.userData={hotelLobby:true,referenceGuided:true,receptionists:2,ringChandelier:false,classicLounge:true};parent.add(g);const k=new Kit(g),floor=.3375;
 // Back wall and restrained fluted columns frame the reception, as in the image.
 k.box(m.marble,8,3.21,-6.98,7.65,5.74,.22);
 for(const x of [3.48,12.52]){
  k.box(m.plaster,x,3.32,-6.77,1.12,5.96,.53);
  for(let i=0;i<13;i++)k.box(m.panel,x-.49+i*.081,3.32,-6.48,.012,5.88,.018);
  k.box(m.gold,x, floor+.07,-6.72,1.16,.12,.59);
 }
 k.box(m.plaster,8,6.32,-3.10,20.40,.09,9.6);
 // Thin ceiling coves and downlights stay below the strong bloom threshold.
 for(const x of [-1.6,17.6])k.box(m.diffuser,x,6.23,-3.2,.035,.03,9.1);
 for(const x of [1.1,4,12,14.9])for(const z of [-4.6,-.45])k.cyl(m.diffuser,x,6.255,z,.085,.025);
 // Reception: green marble, one pale stone cap and a brushed brass plinth.
 const desk=k.mesh(new T.BoxGeometry(9.2,1.19,1.10),m.marble,'Empfang');desk.position.set(8,floor+.675,-1.6);desk.userData.receptionDesk=true;
 k.bevel(m.floor,8,floor+1.30,-1.6,9.44,.09,1.24,.025);
 k.box(m.gold,8,floor+.08,-1.6,9.28,.16,1.14);
 for(const x of [3.46,12.54])k.box(m.gold,x,floor+.69,-1.037,.026,1.13,.021);
 hotelLettering(g,{x:8,y:3.78,z:-6.855,width:6.10,height:1.0});
 fiveStars(g,m.gold,8,3.09,-6.83,2.16);
 leafEmblem(k,m,8,4.45,-6.85,.95);
 k.box(m.rug,8,floor+.008,.70,5.25,.016,2.48);
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=612;
 const ctx=canvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#d6bc7d';
 ctx.font='240px "Lumina Script", "Z003", cursive';ctx.fillText('Lumina Leaf Hotel',1024,200,1870);
 for(let star=0;star<5;star++){const cx=1024+(star-2)*130,cy=449;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?21:48,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();}
 const printMap=new T.CanvasTexture(canvas);printMap.colorSpace=T.SRGBColorSpace;printMap.anisotropy=8;
 const printMaterial=new T.MeshStandardMaterial({name:'Goldene eingewebte Teppichbeschriftung',map:printMap,transparent:true,roughness:1,metalness:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const rugPrint=new T.Mesh(new T.PlaneGeometry(4.65,1.75),printMaterial);rugPrint.name='Empfangsteppich – Lumina Leaf Hotel und fünf Sterne';rugPrint.position.set(8,floor+.017,.70);rugPrint.rotation.x=-Math.PI/2;rugPrint.userData={receptionRugBranding:true,text:'Lumina Leaf Hotel',stars:5,flatWovenPrint:true};g.add(rugPrint);
 // The two receptionists face the entrance and stand naturally behind the desk.
 for(const person of buildReceptionTeam(g,source,floor))person.position.z+=1.15;
 for(const x of [5.15,10.85]){
  k.cyl(m.gold,x,floor+1.40,-1.55,.16,.20);
  for(let i=0;i<7;i++){const a=i*TAU/7;k.ball(m.leaf2,x+.14*Math.cos(a),floor+1.56,-1.55+.14*Math.sin(a),.09,.08,.09);k.ball(source.flowerWhite,x+.12*Math.cos(a),floor+1.63,-1.55+.12*Math.sin(a),.058);}
 }
 k.box(m.dark,7.08,floor+1.39,-1.79,.34,.20,.025);
 k.box(m.floor,8.45,floor+1.42,-1.43,.43,.18,.025);
 // Two classic lounge groups and reference crystal lamps surround the reception axis.
 buildClassicLounge(g,source);
 for(const x of [-4.8,20.8])for(const z of [4.3,11.8])fern(k,m,x,floor,z,1.04);
 k.finish();return g;
}
