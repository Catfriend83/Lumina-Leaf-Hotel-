import {T,Kit} from './core.js?v=75';
export const GARAGE={x:-15.615,z:28.4,width:12.2,laneWidth:5.3,divider:.5,length:32,drop:3.6,transition:4,coveredFrom:0,tunnelFrom:26,end:37,roadY:-.005,roofUnder:-.05,roofThickness:.30};
const smooth=t=>t*t*(3-2*t);
export const garageRoofUnder=s=>Math.max(GARAGE.roofUnder,garageFloor(s)+3.255);
export const garageRoofTop=s=>garageRoofUnder(s)+(.30+.38*(1-smooth(Math.max(0,Math.min(1,(s-1.3)/2)))));
export function garageFloor(s){const c=GARAGE,L=c.transition,m=c.drop/(c.length-L);s=Math.max(0,Math.min(c.length,s));let d;if(s<L){const t=s/L;d=m*L*(t*t*t-t*t*t*t/2);}else if(s<=c.length-L)d=m*(s-L/2);else{const t=(c.length-s)/L;d=c.drop-m*L*(t*t*t-t*t*t*t/2);}return c.roadY-d;}
const stations=(a,b,step=.5)=>{const out=[a];for(let s=a+step;s<b-1e-7;s+=step)out.push(s);out.push(b);return out;};
function ribbon(k,m,name,x0,x1,a,b,height,extras={}){const p=[],uv=[],ix=[];for(const s of stations(a,b))for(const x of [x0,x1]){p.push(x,height(s),-s);uv.push(x/2,s/2);}for(let i=0;i<p.length/6-1;i++){const n=i*2;ix.push(n,n+1,n+2,n+1,n+3,n+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const o=k.mesh(g,m,name);o.userData={garageNew:true,...extras};return o;}
function wall(k,m,name,x0,x1,a,b,bottom,top,extras){const p=[],uv=[],ix=[],ss=stations(a,b);for(const s of ss)for(const [x,y]of [[x0,bottom(s)],[x1,bottom(s)],[x1,top(s)],[x0,top(s)]]){p.push(x,y,-s);uv.push(s/3,y/3);}for(let j=0;j<ss.length-1;j++)for(let f=0;f<4;f++){const a=j*4+f,b=j*4+(f+1)%4,c=(j+1)*4+(f+1)%4,d=(j+1)*4+f;ix.push(a,c,b,a,d,c);}ix.push(0,1,2,0,2,3);const t=(ss.length-1)*4;ix.push(t,t+2,t+1,t,t+3,t+2);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const o=k.mesh(g,m,name);o.userData={garageNew:true,garageWall:true,...extras};return o;}
function arrow(k,m,x,s,direction){const shape=new T.Shape();shape.moveTo(-.14,-.65);for(const p of [[.14,-.65],[.14,.10],[.38,.10],[0,.73],[-.38,.10],[-.14,.10]])shape.lineTo(...p);shape.closePath();const g=new T.ShapeGeometry(shape),p=g.attributes.position;for(let i=0;i<p.count;i++){const z=-s+p.getY(i)*(direction==='out'?1:-1);p.setXYZ(i,x+p.getX(i),garageFloor(-z)+.004,z);}const ix=g.index;for(let i=0;i<ix.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,ix.getX(i)),b=new T.Vector3().fromBufferAttribute(p,ix.getX(i+1)),c=new T.Vector3().fromBufferAttribute(p,ix.getX(i+2));if(b.sub(a).cross(c.sub(a)).y<0){const n=ix.getX(i+1);ix.setX(i+1,ix.getX(i+2));ix.setX(i+2,n);}}g.computeVertexNormals();const o=k.mesh(g,m,'Eindeutiger Richtungspfeil '+direction);o.castShadow=false;o.userData={garageNew:true,garageDirection:direction,station:s};}
export function buildUndergroundGarage(root,m){const c=GARAGE,g=new T.Group();g.name='Eigenständige Hotel-Tiefgarage';g.position.set(c.x,0,c.z);g.userData={garageStructure:true,poolAbove:false,reconstructed:true,underground:true,revision:57,lanes:2,rampLength:c.length,depth:c.drop,laneWidth:c.laneWidth,maxGrade:c.drop/(c.length-c.transition),upperTransition:c.transition,lowerTransition:c.transition,clearPortalHeight:3.25,minimumTunnelClearance:3.255,fullyCovered:true,trenchBounds:{minX:c.x-c.width/2,maxX:c.x+c.width/2,minZ:c.z-c.end-.35,maxZ:c.z}};root.add(g);const k=new Kit(g);
 const clone=(src,name)=>{const a=src.clone();a.name=name;return a;},stone=clone(m.stone,'Tiefgarage · Naturstein des Hotels'),concrete=clone(m.villagePlaster,'Tiefgarage · feiner Sichtbeton');concrete.color.set('#b9b8ad');concrete.bumpScale=.007;concrete.roughness=.91;
 const metal=clone(m.frame,'Tiefgarage · anthrazitfarbenes Metall'),asphalt=clone(m.asphalt,'Tiefgarage · rutschhemmender Asphalt');asphalt.roughness=.94;asphalt.bumpScale=.005;
 const light=clone(m.warm,'Tiefgarage · warmweiße lineare LED');light.color.set('#f8e6cc');light.emissive.set('#ffd5a0');light.emissiveIntensity=.78;
 const paint=clone(m.roadPaint,'Tiefgarage · dezente Fahrtrichtungsmarkierung'),drain=clone(m.roadDrain,'Tiefgarage · eingelassene Entwässerungsrinne');
 const half=5.55,outer=c.width/2,wallTop=garageRoofUnder;
 for(const [direction,x0,x1]of [['out',-half,-.25],['in',.25,half]]){const lane=ribbon(k,asphalt,direction==='in'?'Kontinuierlich abwärts führende Einfahrtsrampe':'Kontinuierlich aufwärts führende Ausfahrtsrampe',x0,x1,0,c.length,garageFloor,{garageRamp:true,direction,width:c.laneWidth,startY:garageFloor(0),endY:garageFloor(c.length)});lane.userData.stations=stations(0,c.length).map(s=>[s,garageFloor(s)]);
  wall(k,concrete,'Geschlossene tragende Rampensohle '+direction,x0,x1,0,c.length,s=>garageFloor(s)-.28,s=>garageFloor(s)-.006,{part:'rampSlab',direction});
  for(const x of [x0+.13,x1-.13])ribbon(k,paint,'Bündige Rampenbegrenzung '+direction,x-.035,x+.035,.8,c.length,s=>garageFloor(s)+.003,{garageStripe:true,direction});for(const s of [5,14,24])arrow(k,paint,(x0+x1)/2,s,direction);
  ribbon(k,drain,'Entwässerungsrinne am oberen Rampenende '+direction,x0,x1,.28,.47,s=>garageFloor(s)+.001,{garageDrain:true,direction});for(let x=x0+.05;x<x1-.02;x+=.085)ribbon(k,metal,'Schlitz der Entwässerungsrinne',x,x+.027,.30,.45,s=>garageFloor(s)+.002);
  const mark=new T.Object3D();mark.name=direction==='in'?'EINFAHRT – Straße zur Tiefgarage':'AUSFAHRT – Tiefgarage zur Straße';mark.position.set((x0+x1)/2,c.roadY,0);mark.userData={garageLane:true,direction,clearWidthMeters:c.laneWidth,depth:c.drop};g.add(mark);
 }
 for(const [side,x0,x1]of [['left',-outer,-half],['right',half,outer]]){wall(k,stone,'Massive geschlossene Rampenwand '+side,x0,x1,0,c.end+.35,s=>garageFloor(s)-.28,wallTop,{part:side,closed:true});
  const x=side==='left'?-half+.004:half-.004,p=[],ix=[],ss=stations(1.4,c.end);for(const s of ss){const h=Math.min(garageFloor(s)+.78,wallTop(s)-.10);p.push(x,h,-s,x,h+.045,-s);}for(let i=0;i<ss.length-1;i++){const n=i*2;ix.push(n,n+1,n+2,n+1,n+3,n+2);}const led=new T.BufferGeometry();led.setAttribute('position',new T.Float32BufferAttribute(p,3));led.setIndex(ix);led.computeVertexNormals();const lm=light.clone();lm.side=T.DoubleSide;const line=k.mesh(led,lm,'Durchgehende warmweiße Rampenbeleuchtung '+side);line.userData={garageNew:true,garageLinearLight:true,side};
  for(let s=4;s<32;s+=6)k.box(m.gold,x,garageFloor(s)+.36,-s,.027,.07,.14);
 }
 wall(k,stone,'Niedriger Mittelsteg zwischen den beiden Rampen',-.25,.25,1.3,c.tunnelFrom,garageFloor,s=>garageFloor(s)+.34,{part:'median',closed:true});wall(k,stone,'Tragender mittlerer Portalpfeiler',-.25,.25,0,1.3,garageFloor,garageRoofUnder,{part:'centralPier'});wall(k,concrete,'Geschlossene mittlere Tunnelwand',-.25,.25,c.tunnelFrom,c.length,garageFloor,garageRoofUnder,{part:'tunnelDivider'});
 ribbon(k,asphalt,'Ausgebauter unterirdischer Garagenraum',-half,half,c.length,c.end+.35,()=>garageFloor(c.length),{garageInterior:true});wall(k,concrete,'Geschlossene Bodenplatte des Garagenraums',-half,half,c.length,c.end+.35,()=>garageFloor(c.length)-.28,()=>garageFloor(c.length)-.006,{part:'interiorSlab'});k.box(concrete,0,(garageFloor(c.length)+c.roofUnder)/2,-c.end-.175,half*2,c.roofUnder-garageFloor(c.length),.35);
 const shell=(name,material,x,y,z,w,h,d,part)=>{const o=k.mesh(new T.BoxGeometry(w,h,d),material,name);o.position.set(x,y,z);o.userData={garageNew:true,garageShell:true,part};return o;};
 wall(k,concrete,'Vollständig geschlossenes tragendes Dach über beiden Rampen',-outer,outer,0,c.end+.35,garageRoofUnder,garageRoofTop,{garageShell:true,part:'fullRampRoof',fullyCovered:true});
 for(const [side,x0,x1]of [['left',-outer-.012,-outer],['right',outer,outer+.012]])wall(k,metal,'Durchgehende anthrazitfarbene Dachblende '+side,x0,x1,0,c.end+.35,garageRoofUnder,garageRoofTop,{part:'roofFascia',side});
 // V103: Three FRONT-FACING portal wall faces use the very same original
 // alpine stone material, hue, texture repeat and roughness as the adjacent
 // side walls. Previously the front faces looked flat / mismatched.
 // All faces are flush with the original wall: no portal width or height
 // changes, and nothing intersects lettering, lights or the signal.
 const portalFrontFaces=[
  {name:'links',left:-outer,right:-half},
  {name:'mitte',left:-.25,right:.25},
  {name:'rechts',left:half,right:outer}
 ];
 for(const face of portalFrontFaces){
  const low=garageFloor(0)-.28,high=garageRoofUnder(0);
  const frontZ=.022;
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute([
   face.left,low,frontZ,face.right,low,frontZ,
   face.left,high,frontZ,face.right,high,frontZ
  ],3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute([
   face.left/3,low/3,face.right/3,low/3,
   face.left/3,high/3,face.right/3,high/3
  ],2));
  geometry.setIndex([0,1,2,1,3,2]);
  geometry.computeVertexNormals();
  const facing=k.mesh(geometry,stone,'Steinverkleidete Garagenfront '+face.name);
  facing.castShadow=false;
  facing.userData={garageNew:true,garagePortalFront:true,frontFace:face.name,
   matchesSideWalls:true,originalMaterial:true};
 }
 // Large, bold glyphs sampled from a dedicated sign atlas remain readable
 // at the normal Android portal camera distance. Reuse the original sign
 // material pipeline rather than adding geometry or expensive text shaders.
 for(const [x,label]of [[-2.9,'AUSFAHRT'],[2.9,'EINFAHRT']]){
  const ma=m.makeSign(label,{
   subtitle:'',width:1536,height:256,italic:false,
   fontFamily:'Arial, Helvetica, sans-serif',fontScale:.81,
   foreground:'#fffaf0',background:'#151d23'
  });
  ma.name='Tiefgarage · scharfe Beschriftung '+label;
  ma.emissiveIntensity=.20;ma.roughness=.95;
  ma.map.anisotropy=8;ma.map.minFilter=T.LinearMipmapLinearFilter;
  ma.map.magFilter=T.LinearFilter;ma.map.needsUpdate=true;
  shell('Integriertes anthrazitfarbenes Fassadenfeld '+label,
   metal,x,3.55,.006,4.85,.53,.012,'letteringField');
  const sign=k.mesh(new T.PlaneGeometry(4.78,.47),ma,
   'Deutlich lesbare Garagenbeschriftung '+label);
  sign.position.set(x,3.55,.014);sign.castShadow=false;
  sign.userData={garageNew:true,garageLabel:label,centeredOnLane:true,
   highResolutionCanvas:true,crispTypography:true};
 }
 const signal=new T.Group();signal.name='Fassadenintegrierte Rot-Grün-Zufahrtsampel';signal.position.set(5.825,1.65,.095);signal.userData={garageSignal:true,state:'red',wallMounted:true,noPole:true,outsideDrivingLane:true,controls:'entry',revision:57};g.add(signal);const sk=new Kit(signal),red=clone(m.signalRed,'Tiefgarage · aktive rote Ampellinse'),green=clone(m.signalGreen,'Tiefgarage · ausgeschaltete grüne Ampellinse');red.emissiveIntensity=1;green.emissiveIntensity=1;green.emissive.set('#000000');green.color.set('#183829');sk.bevel(metal,0,0,0,.27,.63,.15,.025);for(const [y,mat]of [[.14,red],[-.14,green]]){sk.cyl(m.chrome,0,y,.085,.075,.018,Math.PI/2);sk.cyl(mat,0,y,.099,.061,.014,Math.PI/2);sk.box(metal,0,y+.092,.13,.19,.022,.10);}sk.finish();
 // Single stop line directly at the beginning of the portal's front wall
 // (s=0), 6–19 cm inside the covered ramp. Do not duplicate it.
 ribbon(k,paint,'Haltelinie ausschließlich auf der Ausfahrt',-half+.17,-.42,.06,.19,s=>garageFloor(s)+.006,{garageStopLine:true,direction:'out',alignedToPortalFront:true});
 // Remove the obsolete white bay lines at the very bottom of both ramps.
 // Preserve the warm linear ceiling lights and point lights in each lane.
 for(const x of [-2.9,2.9]){for(const s of [3,8,13,18,23,28,32,36])k.box(light,x,garageRoofUnder(s)-.012,-s,3.8,.024,.065);for(const s of [3,8,13,18,23,28,34]){const l=new T.PointLight('#ffd6aa',s<23?3.2:5.2,6.4,2);l.name='Dezente Tiefgaragenbeleuchtung';l.position.set(x,Math.min(garageFloor(s)+1.85,garageRoofUnder(s)-.40),-s);l.userData={garageLight:true,station:s};g.add(l);}}
 for(const [x0,x1]of [[-6.185,-outer],[outer,6.185]])ribbon(k,m.cobbles,'Bündiger seitlicher Anschluss der Garagenquerung',x0,x1,0,2.1,()=>.105,{garageShoulder:true});k.finish();return g;
}
