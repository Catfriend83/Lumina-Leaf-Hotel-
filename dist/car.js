import {T,Kit,TAU} from './core.js?v=75';
import {FORECOURT} from './forecourt.js?v=91';
const wheelCenters=[-5.6,5.6],wheelY=.84,archRadius=.88,roadWheelY=.775,roadTireRadius=.82,roadTireWidth=.52;
const bodySections=[[-8.44,.80,1.05,.27],[-8.28,1.22,1.15,.41],[-7.70,1.49,1.22,.55],[-6.80,1.58,1.26,.62],[-5.2,1.60,1.28,.65],[-4.3,1.60,1.28,.65],[0,1.60,1.28,.65],[4.3,1.60,1.28,.65],[6.2,1.58,1.25,.63],[7.7,1.45,1.17,.51],[8.42,1.03,1.08,.30]];
// Monotone cubic interpolation keeps section derivatives continuous without bulges.
function profile(sections,x){let i=0;while(i<sections.length-2&&x>sections[i+1][0])i++;const a=sections[i],b=sections[i+1],h=b[0]-a[0],t=T.MathUtils.clamp((x-a[0])/h,0,1);
 const slope=(j,c)=>{const left=j>0?(sections[j][c]-sections[j-1][c])/(sections[j][0]-sections[j-1][0]):null,right=j<sections.length-1?(sections[j+1][c]-sections[j][c])/(sections[j+1][0]-sections[j][0]):null;if(left===null)return right;if(right===null)return left;if(left*right<=0)return 0;const hl=sections[j][0]-sections[j-1][0],hr=sections[j+1][0]-sections[j][0],w1=2*hr+hl,w2=hr+2*hl;return (w1+w2)/(w1/left+w2/right);};
 return [1,2,3].map(c=>(2*t**3-3*t*t+1)*a[c]+(t**3-2*t*t+t)*h*slope(i,c)+(-2*t**3+3*t*t)*b[c]+(t**3-t*t)*h*slope(i+1,c));}
function archFloor(x){let y=-Infinity;for(const wx of wheelCenters){const dx=x-wx;if(Math.abs(dx)<archRadius)y=Math.max(y,wheelY+Math.sqrt(archRadius**2-dx**2));}return y;}
function grid(nx,ny,point,{reverse=false}={}){const p=[],uv=[],ix=[];for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++){p.push(...point(i/nx,j/ny));uv.push(i/nx,j/ny);}for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const a=i*(ny+1)+j,b=a+ny+1;ix.push(...(reverse?[a,b+1,b,a,a+1,b+1]:[a,b,b+1,a,b+1,a+1]));}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}
function bodyGeometry(){const p=[],uv=[],ix=[],nx=192,nr=48,power=3.4;
 for(let i=0;i<=nx;i++){const x=-8.44+16.86*i/nx,[w,c,h]=profile(bodySections,x);for(let j=0;j<=nr;j++){const a=j/nr*TAU;p.push(x,c+Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**(2/power)*h,Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**(2/power)*w);uv.push(i/nx,j/nr);}}
 for(let i=0;i<nx;i++)for(let j=0;j<nr;j++){const a=i*(nr+1)+j,b=a+nr+1,x=(p[a*3]+p[b*3])*.5,y=(p[a*3+1]+p[(a+1)*3+1])*.5,z=(p[a*3+2]+p[(a+1)*3+2])*.5;const w=profile(bodySections,x)[0];if(Math.abs(z)>w*.58&&y<archFloor(x))continue;ix.push(a,b+1,a+1,a,b,b+1);}
 for(const i of [0,nx]){const x=-8.44+16.86*i/nx,center=p.length/3;p.push(x,profile(bodySections,x)[1],0);uv.push(i===0?0:1,.5);for(let j=0;j<nr;j++){const a=i*(nr+1)+j;ix.push(...(i===0?[center,a,a+1]:[center,a+1,a]));}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
function sideSkin(side){const p=[],uv=[],ix=[],nx=192,ny=12;
 for(let i=0;i<=nx;i++){const u=i/nx,x=-8.22+16.44*u,[w,c,h]=profile(bodySections,x),qmax=.68+.18*T.MathUtils.smoothstep(x,-7.4,-4.4)*(1-T.MathUtils.smoothstep(x,6.4,8.25)),top=c+h*qmax,bottom=Math.min(top,Math.max(c-h*.92,archFloor(x)));for(let j=0;j<=ny;j++){const y=bottom+(top-bottom)*j/ny,q=Math.min(.995,Math.abs((y-c)/h)),z=side*(w*(1-q**3.4)**(1/3.4)+.009);p.push(x,y,z);const tx=side>0?x:-x;const textureU=tx< -2.9?(tx+8.22)/5.32*.20:tx>2.9?.80+(tx-2.9)/5.32*.20:.20+(tx+2.9)/5.8*.60;uv.push(textureU,T.MathUtils.clamp((y-.65)/1.19,0,1));}}
 for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const a=i*(ny+1)+j,b=a+ny+1;const cross=new T.Vector3().fromArray(p,b*3).sub(new T.Vector3().fromArray(p,a*3)).cross(new T.Vector3().fromArray(p,(b+1)*3).sub(new T.Vector3().fromArray(p,a*3)));if(cross.lengthSq()<1e-12)continue;ix.push(...(side>0?[a,b,b+1,a,b+1,a+1]:[a,b+1,b,a,a+1,b+1]));}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
const cabinWidth=v=>1.49-.215*v+.022*Math.sin(Math.PI*v);
function sideGlass(side){return grid(96,12,(u,v)=>{const left=-4.48+.99*v,right=5.85-1.42*v;return[left+(right-left)*u,1.96+.74*v,side*(cabinWidth(v)-.035*(2*u-1)**4)];},{reverse:side<0});}
const roofSections=[[-3.61,1.25,2.79,.09],[-3.30,1.31,2.88,.16],[-2.8,1.32,2.90,.18],[3.85,1.32,2.90,.18],[4.34,1.30,2.85,.17],[4.53,1.26,2.73,.09]];
function roofGeometry(){return grid(96,20,(u,v)=>{const x=-3.61+8.14*u,[w,top,camber]=profile(roofSections,x),q=v*2-1;return[x,top-camber*Math.abs(q)**2.2,w*q];},{reverse:true});}
function bodyHeight(x,z){const [w,c,h]=profile(bodySections,x);return c+h*Math.max(0,1-(Math.abs(z)/w)**3.4)**(1/3.4);}
function roofHeight(x,z){const [w,top,camber]=profile(roofSections,x);return top-camber*Math.abs(z/w)**2.2;}
// Shared boundary samples make the glass, roof rail, pillars and cowl meet.
function originalEndGlassPoint(rear,u,v){const q=2*u-1,bx=rear?5.94:-4.72,tx=rear?4.53:-3.61,bw=1.44,tw=rear?1.26:1.25,z=(bw+(tw-bw)*v)*q,by=bodyHeight(bx,bw*q)+.014,ty=roofHeight(tx,tw*q);return [bx+(tx-bx)*v+(rear?.08:-.08)*Math.sin(Math.PI*v),by+(ty-by)*v+.015*Math.sin(Math.PI*v)*(1-q*q),z];}
// Quarter-ellipse cuts in all four corners. The existing upper opening is
// retained; the lower corners turn smoothly into the cowl within 12% height.
function upperCornerInset(v){const t=T.MathUtils.clamp((v-.80)/.20,0,1);return .075*(1-Math.sqrt(Math.max(0,1-t*t)));}
function lowerCornerInset(v){const t=T.MathUtils.clamp(1-v/.12,0,1);return .055*(1-Math.sqrt(Math.max(0,1-t*t)));}
// Cosine/sine sampling resolves the horizontal tangents at the rounded ends.
function windV(t){return t<.25?.12*(1-Math.cos(t/.25*Math.PI/2)):t<=.60?.12+(t-.25)/.35*.68:.80+.20*Math.sin((t-.60)/.40*Math.PI/2);}
function endGlassPoint(rear,u,v){if(rear)return originalEndGlassPoint(true,u,v);const inset=upperCornerInset(v)+lowerCornerInset(v);return originalEndGlassPoint(false,inset+(1-2*inset)*u,v);}
function endGlass(rear){return grid(48,20,(u,v)=>endGlassPoint(rear,u,rear?v:windV(v)),{reverse:rear});}
// A closed metal section has an exterior, an interior and capped edges.
// Its visible boundary uses the exact same samples as the adjacent glass.
function pillarShell(nx,ny,point,side,depth=.045){
 const g=grid(nx,ny,point,{reverse:side<0}),front=Array.from(g.attributes.position.array),p=[...front],uv=Array.from(g.attributes.uv.array),ix=Array.from(g.index.array),count=front.length/3;
 for(let i=0;i<count;i++){p.push(front[i*3],front[i*3+1],front[i*3+2]-side*depth);uv.push(uv[i*2],uv[i*2+1]);}
 for(let i=0,n=ix.length;i<n;i+=3)ix.push(ix[i]+count,ix[i+2]+count,ix[i+1]+count);
 const cap=(a,b)=>ix.push(a,b,b+count,a,b+count,a+count);
 for(let i=0;i<nx;i++){cap(i*(ny+1),(i+1)*(ny+1));cap((i+1)*(ny+1)+ny,i*(ny+1)+ny);}
 for(let j=0;j<ny;j++){cap(j+1,j);cap(nx*(ny+1)+j,nx*(ny+1)+j+1);}
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
function frontPillarPoint(v,t,side){const a=endGlassPoint(false,side>0?1:0,v),b=sideGlassPoint(0,v,side);return a.map((n,i)=>n+(b[i]-n)*t);}
function frontCornerPoint(u,v,side){
 const a=endGlassPoint(false,side>0?1:0,0),b=sideGlassPoint(0,0,side),top=a.map((n,i)=>n+(b[i]-n)*u),z=top[2]+(side*1.50-top[2])*u*v;
 return [top[0],top[1]+(bodyHeight(top[0],z)-top[1])*v,z];
}
function roadTireGeometry(){const sections=[[-.26,.63],[-.255,.69],[-.23,.77],[-.19,.812],[-.12,.82],[0,.82],[.12,.82],[.19,.812],[.23,.77],[.255,.69],[.26,.63],[.23,.615],[-.23,.615],[-.26,.63]];return grid(80,sections.length-1,(u,v)=>{const j=Math.min(sections.length-2,Math.floor(v*(sections.length-1))),t=v*(sections.length-1)-j,a=sections[j],b=sections[j+1],r=a[1]+(b[1]-a[1])*t,z=a[0]+(b[0]-a[0])*t;return[r*Math.cos(u*TAU),r*Math.sin(u*TAU),z];});}
export function buildCar(root,m,wrapTexture){const group=new T.Group();group.name='Schwarze Lumina Leaf Stretchlimousine';group.position.fromArray(FORECOURT.carPosition);group.rotation.y=0;group.userData={roundedLimousine:true,plainBlackUpperPanels:true,sideWraps:2};root.add(group);const k=new Kit(group);
 m.paint.metalness=.32;m.paint.roughness=.18;m.paint.clearcoatRoughness=.075;
 const glass=m.carGlass.clone();glass.name='Gebogenes reflektierendes Fahrzeugglas';glass.side=T.DoubleSide;glass.roughness=.08;glass.metalness=.24;glass.envMapIntensity=.85;
 const foil=new T.MeshPhysicalMaterial({name:'Identische botanische Seitenfolierung',map:wrapTexture,color:'#ffffff',roughness:.32,metalness:.08,clearcoat:.6,clearcoatRoughness:.15});
 const bumper=m.paint.clone();bumper.name='Gerundete schwarze Stoßfänger';bumper.roughness=.24;
 const frame=m.paint.clone();frame.name='Geschlossene schwarze Fensterrahmen';frame.side=T.DoubleSide;
 const seal=m.rubber.clone();seal.name='Schwarze Scheibendichtungen';seal.roughness=.82;
 const body=k.mesh(bodyGeometry(),m.paint,'Rund geformte schwarze Karosserie');body.userData={unprintedBlackBody:true};
 const roof=k.mesh(roofGeometry(),m.paint,'Schlicht schwarzes gewölbtes Dach');roof.userData={plainBlackRoof:true};
 for(const side of [-1,1]){
  const pane=k.mesh(sideGlass(side),glass,'Gebogene Seitenscheiben');pane.userData={carGlass:true,side};
  const wrap=k.mesh(sideSkin(side),foil,'Durchgehende botanische Folierung '+(side>0?'links':'rechts'));wrap.userData={continuousSideWrap:true,side,hotelName:'Lumina Leaf Hotel',stars:5,readableOutside:true};
  // Fine black pillars and curved metal surrounds remain separate from the foil.
  for(const x of [-2.35,-.58,1.48,3.53])k.line(m.paint,[x,1.95,side*1.49],[x,2.71,side*1.28],.039);
  for(const edge of [0,1])for(let i=0;i<64;i++){const u=i/64,v=edge,a=sideGlassPoint(u,v,side),b=sideGlassPoint((i+1)/64,v,side);k.line(m.chrome,a,b,.015);}
  for(const u of [0,1])for(let i=0;i<12;i++)k.line(m.chrome,sideGlassPoint(u,i/12,side),sideGlassPoint(u,(i+1)/12,side),.018);
  for(const x of [-2.31,-.55,1.5,3.55]){
   for(let i=0;i<12;i++){const ya=.70+i/12*1.16,yb=.70+(i+1)/12*1.16;k.line(m.black,[x,ya,sideZ(x,ya,side,.018)],[x,yb,sideZ(x,yb,side,.018)],.010);}
   k.bevel(m.chrome,x+.30,1.72,sideZ(x+.3,1.72,side,.022),.30,.052,.070,.022);
  }
  for(let i=0;i<96;i++){const x=-7.6+15.3*i/96,x2=-7.6+15.3*(i+1)/96,y=.62;if(y>archFloor(x)&&y>archFloor(x2))k.line(m.chrome,[x,y,sideZ(x,y,side,.016)],[x2,y,sideZ(x2,y,side,.016)],.016);}
  // The mirror foot grows from the solid door sail beside the A-pillar.
  // The triangular sail shares its leading edge with the side of the pillar.
  const sailPoint=(u,v)=>{const t=.34*u,a=sideGlassPoint(0,t,side),b=sideGlassPoint(.003+.044*(1-u),t,side);return a.map((n,i)=>n+(b[i]-n)*v+(i===2?side*.006*v:0));};
  const sail=k.mesh(pillarShell(12,3,sailPoint,side,.035),frame,'Geschlossenes Spiegeldreieck');sail.userData={mirrorSail:true,side};
  const anchor=sideGlassPoint(.018,.12,side),foot=[anchor[0]+.028,anchor[1]-.010,anchor[2]+side*.155],center=[foot[0]+.025,foot[1]+.008,side*1.77];
  k.line(m.paint,anchor,foot,.057);k.line(m.paint,foot,center,.050);
  k.ball(m.paint,...center,.28,.12,.18);k.ball(glass,center[0]+.03,center[1]+.01,side*1.895,.18,.07,.015);
  // Smooth wheel arch lip follows the same clearance on both sides.
  for(const wx of wheelCenters)for(let i=0;i<48;i++){const a=i/48*Math.PI,b=(i+1)/48*Math.PI,r=archRadius+.014,x=wx+Math.cos(a)*r,x2=wx+Math.cos(b)*r,y=wheelY+Math.sin(a)*r,y2=wheelY+Math.sin(b)*r;k.line(m.paint,[x,y,sideZ(x,y,side,.014)],[x2,y2,sideZ(x2,y2,side,.014)],.028);}
 }
 // Seal the lower window belt and the roof rails as actual surfaces.
 for(const side of [-1,1]){
  const belt=k.mesh(grid(96,6,(u,v)=>{const a=sideGlassPoint(u,0,side),b=[a[0],bodyHeight(a[0],side*1.50),side*1.50];return a.map((n,i)=>n+(b[i]-n)*v);}),frame,'Geschlossener Fenstersockel');belt.userData={windowConnection:'belt',side};
  k.mesh(grid(96,6,(u,v)=>{const a=sideGlassPoint(u,1,side),b=[a[0],roofHeight(a[0],a[2]),a[2]];return a.map((n,i)=>n+(b[i]-n)*v);}),frame,'Geschlossene Dachrahmenkante');
 }
 for(const rear of [false,true]){
  if(rear){const pane=k.mesh(endGlass(true),glass,'Eingefasste Heckscheibe');pane.userData={attachedGlazing:true,rear:true};}else buildNewWindshield(k);
  // Cowl/apron joins the glass to the actual rounded body surface.
  const cowl=k.mesh(grid(48,6,(u,v)=>{const a=endGlassPoint(rear,u,0),x=a[0]+(rear?.13:-.13)*v,z=a[2];return[x,bodyHeight(x,z)+.014*(1-v),z];},{reverse:rear}),frame,rear?'Geschlossene Heckscheibenauflage':'Geschlossene Windschutzscheibenauflage');cowl.userData={windowConnection:'cowl',rear};
  for(const side of [-1,1]){
   const geometry=rear?grid(32,6,(v,t)=>{const a=endGlassPoint(true,side>0?1:0,v),b=sideGlassPoint(1,v,side);return a.map((n,i)=>n+(b[i]-n)*t);}):pillarShell(32,2,(v,t)=>frontPillarPoint(windV(v),t,side),side);
   const pillar=k.mesh(geometry,frame,rear?'Geschlossene C-Säule':'Geschlossene A-Säule');pillar.userData={windowConnection:rear?'C-pillar':'A-pillar',side,...(!rear?{solidPillar:true,depthMeters:.045,verticalSamples:Array.from({length:33},(_,i)=>windV(i/32))}:{})};
   if(!rear){const corner=k.mesh(pillarShell(24,3,(u,v)=>frontCornerPoint(u,v,side),side),frame,'Geschlossener Übergang A-Säule zum Windlauf');corner.userData={windshieldCorner:true,side};}
  }
  for(const edge of [0,1])for(let i=0;i<48;i++)k.line(seal,endGlassPoint(rear,i/48,edge),endGlassPoint(rear,(i+1)/48,edge),.021);
  for(const edge of [0,1])for(let i=0;i<32;i++)k.line(seal,endGlassPoint(rear,edge,rear?i/32:windV(i/32)),endGlassPoint(rear,edge,rear?(i+1)/32:windV((i+1)/32)),.023);
 }
 for(const u of [.28,.60])k.line(m.black,endGlassPoint(false,u,.035),endGlassPoint(false,u+.17,.18),.012);
 // Low-profile road tires: a flat tread band, rounded shoulders and fine grooves.
 const tire=roadTireGeometry(),trim=new T.TorusGeometry(.598,.014,8,72),groove=new T.TorusGeometry(.819,.0045,6,96),tread=m.rubber.clone();tread.name='Feine Straßenprofilrillen';tread.color.set('#050607');tread.roughness=.92;
 for(const x of wheelCenters)for(const side of [-1,1]){
  const z=side*1.33,wheel=k.mesh(tire,m.rubber,'Breiter Straßenreifen');wheel.position.set(x,roadWheelY,z);wheel.userData={roadTire:true,width:roadTireWidth,radius:roadTireRadius,rimRadius:.60,roadContactY:-.005,side,wheelCenterX:x};
  k.put(trim,m.gold,x,roadWheelY,z+side*.232);k.cyl(m.black,x,roadWheelY,z,.596,.45,Math.PI/2);k.cyl(m.gold,x,roadWheelY,z+side*.232,.16,.018,Math.PI/2);k.cyl(m.black,x,roadWheelY,z+side*.244,.078,.015,Math.PI/2);
  for(let i=0;i<36;i++){const a=i*TAU/36;k.line(m.gold,[x+Math.cos(a)*.15,roadWheelY+Math.sin(a)*.15,z+side*.244],[x+Math.cos(a+.025)*.585,roadWheelY+Math.sin(a+.025)*.585,z+side*.234],.012);}
  for(const dz of [-.115,0,.115])k.put(groove,tread,x,roadWheelY,z+dz);
  for(let i=0;i<36;i++){const a=i*TAU/36;for(const band of [-1,1]){const b=a+.023;treadLine(k,tread,[x+Math.cos(a)*.8205,roadWheelY+Math.sin(a)*.8205,z+band*.014],[x+Math.cos(b)*.816,roadWheelY+Math.sin(b)*.816,z+band*.187],.0035);}}
 }
 k.bevel(m.black,-8.445,1.20,0,.045,.48,.62,.018);for(const y of [.95,1.45])k.line(m.chrome,[-8.473,y,-.31],[-8.473,y,.31],.018);for(let z=-.29;z<=.30;z+=.064)k.line(m.chrome,[-8.476,.96,z],[-8.476,1.44,z],.010);
 const housing=m.paint.clone();housing.name='Rechteckige eingelassene Leuchtengehäuse';housing.roughness=.30;
 const reflector=m.chrome.clone();reflector.name='Leuchtenreflektoren';reflector.roughness=.22;
 const cover=new T.MeshPhysicalMaterial({name:'Klare rechteckige Leuchtengläser',color:'#eff7ff',transparent:true,opacity:.24,roughness:.07,metalness:0,clearcoat:1,depthWrite:false});
 const luminous=(name,color,intensity)=>new T.MeshPhysicalMaterial({name,color,emissive:color,emissiveIntensity:intensity,roughness:.19,metalness:.06,clearcoat:.8});
 const xenon=luminous('Kühlweiße Xenon-Frontleuchten','#cfe7ff',1.8),reverse=luminous('Kühlweiße Rückfahrleuchten','#d8ebff',1.35),tail=luminous('Rote Rück- und Bremsleuchten','#ec1827',1.30),indicator=luminous('Orange Blinker','#ff8c21',1.1);
 for(const rear of [false,true])for(const side of [-1,1]){
  const x=rear?8.40:-8.41,face=rear?8.468:-8.478,z=side*.72;
  const casing=k.mesh(new T.BoxGeometry(.14,.35,.70),housing,rear?'Rechteckiges Heckleuchtengehäuse':'Rechteckiges Frontleuchtengehäuse');casing.position.set(x,1.235,z);if(!rear)casing.scale.x=.648659793814433;casing.userData={rectangularLampHousing:true,rear,side};
  k.bevel(reflector,face-(rear?.024:-.024),1.235,z,.012,.286,.638,.010);
  if(!rear)for(const dz of [-.17,.075])k.bevel(xenon,face,1.235,z+side*dz,.010,.228,.194,.008);
  else {k.bevel(tail,face,1.235,z-side*.145,.010,.230,.276,.008);k.bevel(reverse,face,1.235,z+side*.084,.010,.230,.145,.006);}
  k.bevel(indicator,face,1.235,z+side*.264,.010,.228,.073,.006);
  k.bevel(cover,face+(rear?.008:-.008),1.235,z,.012,.288,.640,.010);
  // Thin frame lips keep the lens visually recessed in its black housing.
  for(const y of [1.068,1.402])k.bevel(housing,face,y,z,.024,.024,.70,.006);
  for(const dz of [-.338,.338])k.bevel(housing,face,1.235,z+dz,.024,.35,.024,.006);
 }
 k.ball(bumper,-8.16,.68,0,.20,.19,1.28);k.ball(bumper,8.10,.67,0,.20,.17,1.29);for(const x of [-8.26,8.23])k.line(m.chrome,[x,.69,-1.1],[x,.69,1.1],.024);
 k.finish();
 // Preserve the original front overhang, placement and overall scene scale.
 const compress=x=>x< -6.5?-6.5+(x+6.5)*.648659793814433:x;
 group.traverse(o=>{if(!o.isMesh)return;if(o.isInstancedMesh){const a=new T.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,a);if(a.elements[12]<-6.5){a.elements[12]=compress(a.elements[12]);a.elements[0]*=.648659793814433;a.elements[1]*=.648659793814433;a.elements[2]*=.648659793814433;o.setMatrixAt(i,a);}}o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();}else{const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setX(i,compress(p.getX(i)));o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();o.position.x=compress(o.position.x);}});
 buildHotelPlates(group,m,wrapTexture,compress);
 return group;
}
function sideGlassPoint(u,v,side){return[-4.48+.99*v+(10.33-2.41*v)*u,1.96+.74*v,side*(cabinWidth(v)-.035*(2*u-1)**4)];}
function sideZ(x,y,side,offset=0){const [w,c,h]=profile(bodySections,x),q=Math.min(.995,Math.abs((y-c)/h));return side*(w*(1-q**3.4)**(1/3.4)+offset);}

const treadLineGeometry=new T.CylinderGeometry(1,1,1,6);
function treadLine(k,m,a,b,r){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),center=av.add(bv).multiplyScalar(.5),e=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize()));k.put(treadLineGeometry,m,center.x,center.y,center.z,r,d.length(),r,e.x,e.y,e.z);}

// Use the existing artwork with a crop whose aspect ratio equals 520/110.
// One shared texture keeps the design identical, with no anisotropic stretch.
function hotelPlateGeometry(image){const w=.520,h=.110,r=.004,x=-w/2,y=-h/2,shape=new T.Shape();shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);const g=new T.ShapeGeometry(shape,6),p=g.attributes.position,uv=g.attributes.uv,cropHeight=(image.width/image.height)/(w/h),bottom=.18;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+w/2)/w,bottom+(p.getY(i)+h/2)/h*cropHeight);return g;}
function buildHotelPlates(car,m,artwork,compress){
 const surface=new T.MeshPhysicalMaterial({name:'Botanisches Hotelkennzeichen – Lumina Leaf Hotel ★★★★★',map:artwork,color:'#ffffff',roughness:.34,metalness:.10,clearcoat:.45,clearcoatRoughness:.2,side:T.FrontSide});
 const holder=m.paint.clone();holder.name='Schwarze Kennzeichenhalterungen';holder.roughness=.45;holder.metalness=.12;
 const screw=m.chrome.clone();screw.name='Dezente Kennzeichenschrauben';screw.roughness=.4;
 const geometry=hotelPlateGeometry(artwork.image);
 for(const rear of [false,true]){
  const group=new T.Group();group.name=rear?'Hotelkennzeichen hinten':'Hotelkennzeichen vorne';group.position.set(rear?8.437:compress(-8.435)-.014,.83,0);group.rotation.y=rear?Math.PI/2:-Math.PI/2;group.userData={hotelPlateAssembly:true,rear};car.add(group);
  const k=new Kit(group);k.bevel(holder,0,0,-.010,.538,.128,.040,.004);k.bevel(holder,0,0,.010,.520,.110,.002,.003);
  const plate=k.mesh(geometry,surface,'Deutsches Hotelnummernschild');plate.position.z=.012;plate.userData={hotelNumberPlate:true,rear,widthMeters:.520,heightMeters:.110,hotelName:'Lumina Leaf Hotel',stars:5,readableOutside:true,artworkSource:'limousine-side-wrap-v12.png'};
  // Fasteners occupy the narrow holder border, clear of the complete artwork.
  for(const x of [-.261,.261]){const fastener=k.mesh(new T.CylinderGeometry(.0025,.0025,.0015,8),screw,'Kennzeichenbefestigung');fastener.rotation.x=Math.PI/2;fastener.position.set(x,0,.012);}
  k.finish();
 }
}

// A new Coons patch fills the existing opening from four boundary curves.
// The old front-glass mesh is never built. Only the metal opening is sampled.
function windshieldSurface(u,v){
 const B=endGlassPoint(false,u,0),Tt=endGlassPoint(false,u,1),L=endGlassPoint(false,0,v),R=endGlassPoint(false,1,v),BL=endGlassPoint(false,0,0),BR=endGlassPoint(false,1,0),TL=endGlassPoint(false,0,1),TR=endGlassPoint(false,1,1),bow=.055*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
 return [0,1,2].map(i=>(1-v)*B[i]+v*Tt[i]+(1-u)*L[i]+u*R[i]-((1-u)*(1-v)*BL[i]+u*(1-v)*BR[i]+(1-u)*v*TL[i]+u*v*TR[i])+bow*(i===0?-.62:i===1?.78460181:0));
}
function windshieldNormal(u,v){const e=.0001,a=new T.Vector3(...windshieldSurface(Math.max(0,u-e),v)),b=new T.Vector3(...windshieldSurface(Math.min(1,u+e),v)),c=new T.Vector3(...windshieldSurface(u,Math.max(0,v-e))),d=new T.Vector3(...windshieldSurface(u,Math.min(1,v+e)));return b.sub(a).cross(d.sub(c)).normalize();}
function laminatedWindshieldGeometry(){
 const nx=32,ny=16,g=grid(nx,ny,(u,v)=>windshieldSurface(u,windV(v))),front=Array.from(g.attributes.position.array),p=[...front],uv=Array.from(g.attributes.uv.array),ix=Array.from(g.index.array),count=front.length/3;
 for(let u=0;u<=nx;u++)for(let v=0;v<=ny;v++){const i=u*(ny+1)+v,n=windshieldNormal(u/nx,windV(v/ny));p.push(front[i*3]-.006*n.x,front[i*3+1]-.006*n.y,front[i*3+2]-.006*n.z);uv.push(u/nx,v/ny);}
 for(let i=0,n=ix.length;i<n;i+=3)ix.push(ix[i]+count,ix[i+2]+count,ix[i+1]+count);
 const cap=(a,b)=>ix.push(a,b,b+count,a,b+count,a+count);
 for(let u=0;u<nx;u++){cap(u*(ny+1),(u+1)*(ny+1));cap((u+1)*(ny+1)+ny,u*(ny+1)+ny);}
 for(let v=0;v<ny;v++){cap(v+1,v);cap(nx*(ny+1)+v,nx*(ny+1)+v+1);}
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
// Place the printed border on the actual triangulated front surface.
function triangulatedWindshieldPoint(u,v){const t=v<.12?.25*(2/Math.PI)*Math.acos(T.MathUtils.clamp(1-v/.12,0,1)):v<=.80?.25+.35*(v-.12)/.68:.60+.40*(2/Math.PI)*Math.asin(T.MathUtils.clamp((v-.80)/.20,0,1)),x=u*32,y=t*16,i=Math.min(31,Math.floor(x)),j=Math.min(15,Math.floor(y)),fx=x-i,fy=y-j,A=new T.Vector3(...windshieldSurface(i/32,windV(j/16))),B=new T.Vector3(...windshieldSurface((i+1)/32,windV(j/16))),C=new T.Vector3(...windshieldSurface(i/32,windV((j+1)/16))),D=new T.Vector3(...windshieldSurface((i+1)/32,windV((j+1)/16))),a=fx>=fy?B:C,b=D,n=a.clone().sub(A).cross(b.clone().sub(A)).normalize();if(fx<fy)n.negate();const p=fx>=fy?A.clone().add(B.clone().sub(A).multiplyScalar(fx-fy)).add(D.clone().sub(A).multiplyScalar(fy)):A.clone().add(D.clone().sub(A).multiplyScalar(fx)).add(C.clone().sub(A).multiplyScalar(fy-fx));return p.add(n.multiplyScalar(.004)).toArray();}
function buildNewWindshield(k){
 const material=new T.MeshPhysicalMaterial({name:'Leicht getöntes gewölbtes Verbundglas',color:'#293d47',metalness:0,roughness:.045,ior:1.52,transmission:.15,thickness:.006,clearcoat:1,clearcoatRoughness:.035,envMapIntensity:1,side:T.FrontSide});
 const pane=k.mesh(laminatedWindshieldGeometry(),material,'Neu modellierte gewölbte Verbundglas-Windschutzscheibe');pane.userData={attachedGlazing:true,rear:false,rebuiltWindshield:true,closedLaminatedGlass:true,thicknessMeters:.006,uSegments:32,vSegments:16,frontVertexCount:561,roundedUpperCorners:true,roundedLowerCorners:true,upperCornerWidthMeters:.1875,lowerCornerWidthMeters:.1584,verticalSamples:Array.from({length:17},(_,i)=>windV(i/16))};
 const frit=new T.MeshPhysicalMaterial({name:'Schwarzer Keramikrand der Frontscheibe',color:'#060b0e',roughness:.34,metalness:0,clearcoat:.6,side:T.DoubleSide});
 const band=k.mesh(grid(72,4,(t,s)=>{const a=t*TAU,x=Math.cos(a),y=Math.sin(a),scale=1/Math.max(Math.abs(x),Math.abs(y)),px=x*scale,py=y*scale,r=(Math.abs(px)**6+Math.abs(py)**6)**(-1/6),u=.5+px*((1-s)*.5+s*.49*r),v=.5+py*((1-s)*.5+s*.475*r),p=triangulatedWindshieldPoint(u,v);return p;}),frit,'Passgenauer gerundeter Frontscheibenrand');band.userData={windshieldFrit:true,roundedVisibleCorners:4};
}
