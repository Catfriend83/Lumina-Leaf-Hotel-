import {entryTerrainHeight} from './entry-terrain.js?v=75';
import {FOUNDATION_LEVELS} from './foundation-data.js?v=75';
import {TRAFFIC} from './village-traffic-data.js?v=75';
import {gardenMeadowHeight,gardenPathShift,rearMeadowHeight,rearMeadowWeight} from './meadow-grade.js?v=75';
import {VILLAGE_GROUND} from './village-ground-data.js?v=75';
import {TERRAIN_CUTS} from './terrain-cuts.js?v=75';
import {buildAlpineVillage,discardVillageTree} from './village.js?v=91';
import {villageGroundHeight,villageMeshGroundHeight,closestRoute,PROMENADE,MAIN_ROAD,LAKE_RESTS,constructionInfluence,BUILDINGS,VILLAGE_LANE,SQUARE_LINK} from './village-layout.js?v=75';
import {inSpaSite,spaSiteGroundHeight,spaPoolTreeClearance} from './spa-wing.js?v=98';
import {T,Kit,rand,rng,TAU,addLamp} from './core.js?v=75';
import {spruce} from './vegetation.js?v=75';
import {mountainHeight,mountainWeight,mountainSurface} from './mountains.js?v=75';
import {buildForecourt,discardTreeOnRoad} from './forecourt.js?v=112';
import {POOL_SHIFT_X} from './pool-connection.js?v=91';
import {createSpaLakeGeometry,buildSpaShoreLand,spaLakeShore,spaShoreRetreat,originalLakeShore} from './spa-shore.js?v=75';
function cottage(k,m,x,z,s=1,rot=0,church=false,y=0){
 const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rot;g.scale.setScalar(s);g.name=church?'Kirche am See':'Alpendorf Chalet';k.root.add(g);const c=new Kit(g);
 c.box(m.stoneDark,0,.12,0,3.92,.24,3.84);c.box(m.villagePlaster,0,1.27,0,3.7,2.3,3.6);c.box(m.wood,0,2.72,0,3.7,.65,3.6);
 for(let slat=-1.8;slat<1.8;slat+=.18)for(const face of [-1,1])c.box(m.wood,slat,2.73,face*1.819,.13,.64,.029);
 for(const side of [-1,1]){c.put('box',m.villageRoof,side*1.02,3.42,0,2.5,.12,4.4,0,0,side*-.47);c.box(m.wood,side*2.05,2.97,0,.09,.13,4.45);c.box(m.stoneDark,side*2.05,3.01,0,.07,.06,4.45);}
 c.box(m.villageRoof,0,3.96,0,.15,.11,4.45);
 for(const wy of [1.14,2.65])for(const px of [-1.09,1.09])for(const side of [-1,1]){
  c.box(m.wood,px,wy,side*1.832,.76,.88,.095);c.box(m.villageWindow,px,wy,side*1.889,.56,.67,.028);
  c.box(m.wood,px,wy,side*1.910,.04,.68,.019);c.box(m.wood,px,wy,side*1.910,.57,.037,.020);
  for(const dx of [-.49,.49]){c.box(m.velvet,px+dx,wy,side*1.850,.19,.82,.056);for(let yy=-.32;yy<.36;yy+=.13)c.box(m.wood,px+dx,wy+yy,side*1.887,.17,.029,.018);}
  c.box(m.stoneDark,px,wy-.49,side*1.895,.86,.075,.20);
 }
 c.box(m.wood,0,.69,1.85,.68,1.30,.075);c.box(m.gold,.21,.73,1.91,.025,.13,.025);
 c.box(m.wood,0,2.21,2.20,3.40,.12,.78);for(const xx of [-1.6,-1.2,-.8,-.4,0,.4,.8,1.2,1.6])c.box(m.wood,xx,2.65,2.58,.047,.87,.052);c.box(m.wood,0,3.06,2.58,3.48,.07,.08);
 c.box(m.stoneDark,-.85,3.93,-.68,.44,1.00,.47);c.box(m.villageRoof,-.85,4.49,-.68,.58,.09,.59);
 if(church){c.box(m.villagePlaster,0,3.20,2.1,1.7,6.4,1.75);c.put('cone',m.villageRoof,0,7.90,2.1,1.35,3.3,1.35,0,Math.PI/4);c.box(m.gold,0,9.71,2.1,.04,.72,.04);c.box(m.gold,0,9.83,2.1,.37,.04,.04);for(const side of [-1,1]){c.box(m.black,0,5.46,2.1+side*.895,.62,.96,.065);c.cyl(m.ivory,0,6.13,2.1+side*.940,.23,.025,Math.PI/2);c.box(m.black,0,6.14,2.1+side*.958,.025,.18,.02);}}
 c.finish();return g;}
const fract=v=>v-Math.floor(v),smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function hash(x,z){return fract(Math.sin(x*127.1+z*311.7)*43758.5453123);}
function valueNoise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);const a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return (a+(b-a)*sx)*(1-sz)+(c+(d-c)*sx)*sz;}
function fbm(x,z){let amp=.5,sum=0,norm=0;for(let i=0;i<6;i++){sum+=amp*valueNoise(x,z);norm+=amp;x=x*2.13+21.7;z=z*2.13+35.1;amp*=.51;}return sum/norm;}
function ridged(x,z){let amp=.6,sum=0,norm=0;for(let i=0;i<5;i++){const v=1-Math.abs(valueNoise(x,z)*2-1);sum+=amp*v*v;norm+=amp;x=x*2.03+4.3;z=z*2.03-7.2;amp*=.54;}return sum/norm;}
export const lakeCenter=[-94,-55],lakeRadius=[86,65];
const shoreScale=a=>1+.030*Math.cos(a*5)+.021*Math.sin(a*3);
function lakeDistance(x,z){const dx=(x-lakeCenter[0])/lakeRadius[0],dz=(z-lakeCenter[1])/lakeRadius[1];return (dx*dx+dz*dz)/shoreScale(Math.atan2(dz,dx))**2;}
import {inGuestWing as inWing} from './guest-wing.js?v=75';
function baseLandHeight(x,z){const near=Math.hypot(x-6,z+6),distant=Math.hypot(x,z+80),envelope=smooth(420,1000,distant)*(1-smooth(1450,1820,distant));let h=(4+(fbm(x*.025,z*.025)-.5)*12)*smooth(44,83,near);h+=envelope*(10+ridged(x*.0045,z*.0045)*62+ridged(x*.014,z*.014)*18);const lakeD=lakeDistance(x,z);if(lakeD<1.005)h=-3;else h*=smooth(1.005,1.22,lakeD);if(near<44)h=-.18;if(x>-62&&x<69&&z>27&&z<81)h=-.18;const rear=rearMeadowWeight(x,z);h=h*(1-rear)+rearMeadowHeight(x,z)*rear;const gx=x+3.4,gz=z-8,gardenWeight=(1-smooth(24,35,Math.abs(gx-26-gardenPathShift(gz))))*smooth(-60,-49,gz)*(1-smooth(19,25,gz));h=h*(1-gardenWeight)+(gardenMeadowHeight(gx,gz)-.06)*gardenWeight;if(inWing(x,z))h=-.11;h=spaSiteGroundHeight(x,z,h);if(x>-37.5&&x<57.5&&z>-53&&z<45&&(x<20||inWing(x,z)||inSpaSite(x,z)))h=-.11;return h;}
export function landHeight(x,z){let base=baseLandHeight(x,z);if(x<-270||x>110||z<-260||z>100)return base;const n=closestRoute(x,z,[MAIN_ROAD],43),w=n&&x<-58.5?1-smooth(n.width/2+20,n.width/2+43,n.distance):0;if(w){const ld=lakeDistance(x,z),organic=(3.6+.75*Math.sin(x*.037+z*.018)+.52*Math.cos(z*.047-x*.023))*smooth(1.005,1.22,ld);base=base*(1-w)+organic*w;}return villageGroundHeight(x,z,base);}
let coarseTerrain;
function coarseGrid(){if(coarseTerrain)return coarseTerrain;const g=new T.PlaneGeometry(3100,3100,360,360);g.rotateX(-Math.PI/2);g.translate(0,0,-220);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,mountainHeight(p.getX(i),p.getZ(i),villageMeshGroundHeight(p.getX(i),p.getZ(i),landHeight(p.getX(i),p.getZ(i))))-.045);g.computeVertexNormals();coarseTerrain=g;return g;}
function coarseSample(x,z){const g=coarseGrid(),p=g.attributes.position,ix=Math.max(0,Math.min(359,Math.floor((x+1550)/(3100/360)))),iz=Math.max(0,Math.min(359,Math.floor((z+1770)/(3100/360)))),a=iz*361+ix,b=a+361,c=b+1,d=a+1,u=(x-p.getX(a))/(p.getX(d)-p.getX(a)),v=(z-p.getZ(a))/(p.getZ(b)-p.getZ(a));return u+v<=1?{ids:[a,b,d],weights:[1-u-v,v,u]}:{ids:[b,c,d],weights:[1-u,u+v-1,1-v]};}
function coarseSurfaceHeight(x,z){if(x>=-37.5&&x<=57.5&&z>=-53&&z<=45)return -.11;const {ids,weights}=coarseSample(x,z),p=coarseGrid().attributes.position;return ids.reduce((y,id,i)=>y+p.getY(id)*weights[i],0);}
function outerBorderDistance(x,z){let distance=Infinity;for(const poly of VILLAGE_GROUND.region)for(let i=0;i<poly.outer.length;i++){const a=poly.outer[i],b=poly.outer[(i+1)%poly.outer.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return distance;}
function originalRenderedGroundHeight(x,z,borderDistance=null){const border=borderDistance??outerBorderDistance(x,z);let w=smooth(0,14,border);const loop=closestRoute(x,z,[PROMENADE],13);if(loop)w=Math.max(w,(1-smooth(1.6,6.5,loop.distance))*smooth(0,2,border));for(const rest of LAKE_RESTS){const dx=x-rest.x,dz=z-rest.z,edge=Math.hypot(Math.max(0,Math.abs(dx*rest.row.nz-dz*rest.row.nx)-1.65),Math.max(0,Math.abs(dx*rest.row.nx+dz*rest.row.nz)-1.2));w=Math.max(w,(1-smooth(.15,1.5,edge))*smooth(0,2,border));}return coarseSurfaceHeight(x,z)*(1-w)+landHeight(x,z)*w;}

const entryHouses=BUILDINGS.filter(b=>['haus-7','haus-8'].includes(b.id));
const easing=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*t*(t*(6*t-15)+10);};
function gradedGroundHeight(x,z,borderDistance=null){
 const original=originalRenderedGroundHeight(x,z,borderDistance);
 const influence=easing(-211,-205,x)*(1-easing(-173,-168,x))*easing(-132,-130,z)*(1-easing(-108,-102,z));if(!influence)return original;
 // Restrict grading north of the plaza; preserve its source triangles, mesh seam, roads and accesses.
 const border=borderDistance??outerBorderDistance(x,z);let weight=influence*easing(0,4,border);
 for(const b of BUILDINGS.filter(b=>!entryHouses.includes(b))){const c=Math.cos(b.rot),s=Math.sin(b.rot),dx=x-b.x,dz=z-b.z;const edge=Math.hypot(Math.max(0,Math.abs(c*dx-s*dz)-b.w/2),Math.max(0,Math.abs(s*dx+c*dz)-b.d/2));weight*=easing(2,5,edge);}
 for(const b of entryHouses){const c=Math.cos(b.rot),s=Math.sin(b.rot),dx=x-b.x,dz=z-b.z,edge=Math.hypot(Math.max(0,Math.abs(c*dx-s*dz)-b.w/2),Math.max(0,Math.abs(s*dx+c*dz)-b.d/2));weight*=easing(1.7,3.1,edge);}
 if(!weight)return original;let average=original*.24;
 for(let i=0;i<8;i++){const a=i*Math.PI/4;average+=originalRenderedGroundHeight(x+Math.cos(a)*2.7,z+Math.sin(a)*2.7)*.095;}
 let target=average;
 for(const b of entryHouses){const c=Math.cos(b.rot),s=Math.sin(b.rot),dx=x-b.x,dz=z-b.z,edge=Math.hypot(Math.max(0,Math.abs(c*dx-s*dz)-b.w/2),Math.max(0,Math.abs(s*dx+c*dz)-b.d/2)),flat=1-easing(.65,7.5,edge);target=target*(1-flat)+(FOUNDATION_LEVELS[b.id]-.16)*flat;}
 const footpath=closestRoute(x,z,[PROMENADE,SQUARE_LINK],15);if(footpath)weight*=easing(footpath.width/2+5,footpath.width/2+8,footpath.distance);
 const road=closestRoute(x,z,[MAIN_ROAD,VILLAGE_LANE],15);if(road)weight*=easing(road.width/2+2.5,road.width/2+5.5,road.distance);
 // The two entrance ramps retain their original profile and blend softly to grass.
 for(const a of TRAFFIC.accesses.filter(a=>['haus-7','haus-8'].includes(a.id))){const p=a.points[0],q=a.points.at(-1),dx=q[0]-p[0],dz=q[1]-p[1],t=Math.max(0,Math.min(1,((x-p[0])*dx+(z-p[1])*dz)/(dx*dx+dz*dz))),d=Math.hypot(x-p[0]-dx*t,z-p[1]-dz*t);weight*=easing(1.1,2.6,d);}
 return original*(1-weight)+target*weight;
}

export function renderedGroundHeight(x,z,borderDistance=null){return entryTerrainHeight(x,z,gradedGroundHeight(x,z,borderDistance),landHeight);}

const shoreRock=new T.DodecahedronGeometry(1,0);

function terrainSeams(k,m,positions,cuts,name){const p=[],uv=[],normal=[],colors=[],sourceNormal=coarseGrid().attributes.normal;for(const cut of Object.values(cuts)){const [a,b,c]=cut.source.map(i=>[positions.getX(i),positions.getY(i),positions.getZ(i)]),den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);for(const [x,z]of cut.vertices){const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den,weights=[u,v,1-u-v],n=new T.Vector3();p.push(x,u*a[1]+v*b[1]+(1-u-v)*c[1],z);uv.push(x/4,z/4);cut.source.forEach((id,i)=>n.addScaledVector(new T.Vector3().fromBufferAttribute(sourceNormal,id),weights[i]));n.normalize();normal.push(n.x,n.y,n.z);const color=.88+.10*fbm(x*.12,z*.12);colors.push(color,color,color);}}const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(p,3));geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geom.setAttribute('color',new T.Float32BufferAttribute(colors,3));const mesh=k.mesh(geom,m.meadow,name);mesh.castShadow=false;mesh.userData={terrainTransition:true};}
function villageGround(k,m){const p=[],uv=[],colors=[];for(const [i,[x,z]]of VILLAGE_GROUND.vertices.entries()){p.push(x,renderedGroundHeight(x,z,VILLAGE_GROUND.borderDistances[i]),z);uv.push(x/4,z/4);const c=.88+.10*fbm(x*.12,z*.12);colors.push(c,c,c);}const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(p,3));geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.setAttribute('color',new T.Float32BufferAttribute(colors,3));geom.setIndex(VILLAGE_GROUND.indices);geom.computeVertexNormals();const normal=geom.attributes.normal,sourceNormal=coarseGrid().attributes.normal;for(const [i,[x,z]]of VILLAGE_GROUND.vertices.entries()){const w=smooth(0,14,VILLAGE_GROUND.borderDistances[i]);if(w>=1)continue;const {ids,weights}=coarseSample(x,z),n=new T.Vector3();ids.forEach((id,j)=>n.addScaledVector(new T.Vector3().fromBufferAttribute(sourceNormal,id),weights[j]));n.normalize().lerp(new T.Vector3().fromBufferAttribute(normal,i),w).normalize();normal.setXYZ(i,n.x,n.y,n.z);}const mesh=k.mesh(geom,m.meadow,'Durchgängiges Gelände mit ebenen Hausstandflächen und sanften Böschungen');mesh.castShadow=false;mesh.userData={villageGround:true,groundRevision:43,foundationContact:true};}

export function buildLandscape(root,m){const group=new T.Group();group.name='Zusammenhängendes alpines Gelände mit Wald und See';root.add(group);const k=new Kit(group);
 const lawnPositions=VILLAGE_GROUND.hotelLawn.vertices.flatMap(([x,z])=>[x,-.11,z]),lawnGeometry=new T.BufferGeometry();lawnGeometry.setAttribute('position',new T.Float32BufferAttribute(lawnPositions,3));lawnGeometry.setAttribute('uv',new T.Float32BufferAttribute(VILLAGE_GROUND.hotelLawn.vertices.flatMap(([x,z])=>[x/4,z/4]),2));lawnGeometry.setIndex(VILLAGE_GROUND.hotelLawn.indices);lawnGeometry.computeVertexNormals();const lawn=k.mesh(lawnGeometry,m.meadow,'Bündiger bestehender Hotelrasen');lawn.userData={hotelLawn:true};k.box(m.cobbles,8,-.07,18,30,.1,20);buildForecourt(root,m);
 const lakeGeometry=createSpaLakeGeometry();const lake=k.mesh(lakeGeometry,m.lake,'Spiegelnder Bergsee');lake.rotation.x=-Math.PI/2;lake.scale.set(...lakeRadius,1);lake.position.set(lakeCenter[0],-.22,lakeCenter[1]);lake.userData={localSpaShore:true,shoreRevision:36};
 // The complete, clipped shoreline terrain replaces the former overlapping Spa shore ribbons.
 // Real material textures distinguish meadow, cliff faces and snow.
 const ground=new T.PlaneGeometry(3100,3100,360,360);ground.rotateX(-Math.PI/2);ground.translate(0,0,-220);
 const pos=ground.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,mountainHeight(pos.getX(i),pos.getZ(i),villageMeshGroundHeight(pos.getX(i),pos.getZ(i),landHeight(pos.getX(i),pos.getZ(i))))-.045);ground.computeVertexNormals();coarseTerrain=ground;
 const normals=ground.attributes.normal,uv=ground.attributes.uv;
 for(let i=0;i<pos.count;i++){const h=pos.getY(i),cliff=h>42||normals.getY(i)<.60,scale=cliff?(mountainWeight(pos.getX(i),pos.getZ(i))>0?24:12):4;uv.setXY(i,(cliff&&normals.getY(i)<.55?pos.getZ(i):pos.getX(i))/scale,(cliff&&normals.getY(i)<.55?h:pos.getZ(i))/scale);}
 const indices=ground.index.array,buckets=[[],[],[]];
 for(let i=0;i<indices.length;i+=3){if(Object.hasOwn(TERRAIN_CUTS.global,i))continue;const tri=[indices[i],indices[i+1],indices[i+2]],h=tri.reduce((sum,j)=>sum+pos.getY(j),0)/3,ny=tri.reduce((sum,j)=>sum+normals.getY(j),0)/3,x=pos.getX(tri[0]),z=pos.getZ(tri[0]);const snowLine=62+fbm(x*.025,z*.025)*14;
  const category=mountainWeight(x,z)>0?mountainSurface(x,z,h,ny).category:h>snowLine&&(ny>.40||h>85)?2:h>42||ny<.60?1:0;buckets[category].push(...tri);
 }
 for(let category=0;category<3;category++){
  const remap=new Map(),p=[],n=[],u=[],color=[],ix=[];
  for(const old of buckets[category]){if(!remap.has(old)){remap.set(old,remap.size);p.push(pos.getX(old),pos.getY(old),pos.getZ(old));n.push(normals.getX(old),normals.getY(old),normals.getZ(old));u.push(uv.getX(old),uv.getY(old));const h=pos.getY(old),x=pos.getX(old),z=pos.getZ(old),distant=mountainWeight(x,z)>0,surface=mountainSurface(x,z,h,normals.getY(old)),variation=distant?.86+.13*surface.variation:.88+.10*fbm(x*.12,z*.12),tint=new T.Color();
   if(distant){if(category===1)tint.set('#807464').lerp(new T.Color('#d6cbb8'),surface.bedding*.68+surface.variation*.32).lerp(new T.Color('#808c70'),surface.vegetation*.7).lerp(new T.Color('#dce3e5'),surface.snow*.48);else if(category===2)tint.set('#b5b8b4').lerp(new T.Color('#f0f3f4'),smooth(.4,.85,surface.snow));else tint.set('#e5e7da');}
   else if(category===1)tint.set('#99a286').lerp(new T.Color('#faf9f6'),smooth(42,78,h));else if(category===2)tint.set('#d5dce0').lerp(new T.Color('#ffffff'),smooth(65,85,h));else tint.set('#ffffff');tint.multiplyScalar(variation);color.push(tint.r,tint.g,tint.b);}ix.push(remap.get(old));}
  const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(p,3));geom.setAttribute('normal',new T.Float32BufferAttribute(n,3));geom.setAttribute('uv',new T.Float32BufferAttribute(u,2));geom.setAttribute('color',new T.Float32BufferAttribute(color,3));geom.setIndex(ix);
  const mesh=k.mesh(geom,[m.meadow,m.cliff,m.alpineSnow][category],['Alpine Wiesen und Talboden','Felsgrate mit fotografischer Kalksteinstruktur','Natürliche alpine Schneefelder'][category]);mesh.castShadow=false;mesh.userData={alpineTerrain:true,mountainRevision:22};
 }
 terrainSeams(k,m,pos,TERRAIN_CUTS.global,'Bündiger Übergang vom Dorf zur bestehenden Landschaft');
 // A finer shoreline patch follows the terrain and leaves actual water openings.
 const detail=new T.PlaneGeometry(270,205,90,68);detail.rotateX(-Math.PI/2);detail.translate(-88,0,-78);const dp=detail.attributes.position,du=detail.attributes.uv;
 for(let i=0;i<dp.count;i++){dp.setY(i,villageMeshGroundHeight(dp.getX(i),dp.getZ(i),landHeight(dp.getX(i),dp.getZ(i)),3)+.012);du.setXY(i,dp.getX(i)/4,dp.getZ(i)/4);}
 const di=[];for(let i=0;i<detail.index.count;i+=3){if(Object.hasOwn(TERRAIN_CUTS.detail,i))continue;const tri=[detail.index.getX(i),detail.index.getX(i+1),detail.index.getX(i+2)];const x=tri.reduce((sum,j)=>sum+dp.getX(j),0)/3,z=tri.reduce((sum,j)=>sum+dp.getZ(j),0)/3;if(lakeDistance(x,z)<1.035||(x>-38&&x<57&&z>-56))continue;di.push(...tri);}detail.setIndex(di);detail.computeVertexNormals();k.mesh(detail,m.meadow,'Fein modellierte Wiesen und natürliche Uferübergänge');villageGround(k,m);
 // Small, irregular grass tufts add depth without a smooth plastic surface.
 const grass=new T.BufferGeometry();grass.setAttribute('position',new T.Float32BufferAttribute([-.06,0,0,0,.25,.03,.04,0,0,0,0,-.06,.025,.19,0,0,0,.05],3));grass.setIndex([0,1,2,3,4,5]);grass.computeVertexNormals();
 const meadowRng=rng(947);for(let i=0;i<2100;i++){const x=-213+meadowRng()*260,z=-168+meadowRng()*186;if(lakeDistance(x,z)<1.08||(x>-35&&x<53&&z>-55))continue;const size=.45+meadowRng()*.7;k.put(grass,m.grassBlade,x,constructionInfluence(x,z)?renderedGroundHeight(x,z)+.016:landHeight(x,z)+.016,z,size,size,size,0,meadowRng()*TAU);}
 function tree(x,z,h,y=null,detailed=false){
  // Preserve the procedural random sequence of every other tree while
  // omitting only crowns intruding on the real rotated pool and terrace.
  if(spaPoolTreeClearance(x,z,Math.max(2.5,h*.32))){spruce(new Kit(new T.Group()),m,x,0,z,h,rand,detailed);return;}
  if(x===-18.57&&z===17.59)x+=POOL_SHIFT_X;if(inWing(x,z,7)||(x>8&&x<52&&z<-26&&z>-49)){x=60+hash(x,z)*8;y=null;}if(inSpaSite(x,z,h*.28)){x=61+hash(x,z)*5;y=null;}discardVillageTree(k,()=>discardTreeOnRoad(k,()=>spruce(k,m,x,(constructionInfluence(x,z)?renderedGroundHeight(x,z):y??landHeight(x,z)),z,h,rand,detailed)));}
 for(const [x,z,h] of [[-18.57,17.59,8.2],[-24.94,14.37,7.6],[-30,-17,14],[-22,-20,12],[-16.8,-40.21,10.7],[-9,-28,12],[0,-31,16],[13,-31,15],[22,-28,13],[35,16,11],[35,4,14],[37,-10,15],[36,-24,15]])tree(x,z,h,x>25?landHeight(x,z):0,true);
 for(let i=0;i<560;i++){const x=-95+rand()*440,z=-405+rand()*445;if(x>-31&&x<33&&z>-30)continue;if(((x-lakeCenter[0])/(lakeRadius[0]+4))**2+((z-lakeCenter[1])/(lakeRadius[1]+4))**2<1.02)continue;tree(x,z,6+rand()*14,null,false);}
 // Smaller stands fill gaps on the ridges, with size variation rather than repeated silhouettes.
 for(let i=0;i<160;i++){const x=-540+rand()*900,z=-570+rand()*430;if(((x-lakeCenter[0])/(lakeRadius[0]+8))**2+((z-lakeCenter[1])/(lakeRadius[1]+8))**2<1.02)continue;tree(x,z,8+rand()*13,null,false);}
 // The village follows the true shoreline and its buildings sit on the terrain.
 for(let i=0;i<29;i++){const a=4.75+i*.032,x=lakeCenter[0]+Math.cos(a)*(lakeRadius[0]*shoreScale(a)+4.2),z=lakeCenter[1]+Math.sin(a)*(lakeRadius[1]*shoreScale(a)+4.2),y=landHeight(x,z);cottage(k,m,x,z,.65+rand()*.35,.05,i===3,y+.06).removeFromParent();if(i%3===0)tree(x-2,z-7,6+rand()*5,null,false);}
 // Retain the original random draws, then place restrained irregular shore details.
 const unusedShore=new Kit(new T.Group());for(let i=0;i<90;i++){const a=i*TAU/90;unusedShore.put(shoreRock,m.cliff,0,0,0,.7+rand()*.4,.25+rand()*.3,.5+rand()*.5,0,a,.16*Math.sin(a*4));}
 const shoreRandom=rng(430051);for(let i=0;i<28;i++){const a=(i+shoreRandom()*.8)*TAU/28,[sx,sz]=spaLakeShore(a),nx=Math.cos(a)/86,nz=Math.sin(a)/65,l=Math.hypot(nx,nz),d=.45+shoreRandom()*.4,x=sx+nx/l*d,z=sz+nz/l*d;k.put(shoreRock,m.cliff,x,landHeight(x,z)-.025,z,.22+shoreRandom()*.26,.10+shoreRandom()*.11,.18+shoreRandom()*.24,0,shoreRandom()*TAU,0);}

 for(let i=0;i<75;i++){const x=30+rand()*35,z=-72+rand()*60;tree(x,z,11+rand()*13,null,i<12);}
 group.updateMatrixWorld(true);
 // The seven hotel-rear houses and their private aprons are no longer built.
 // Keep legacy random draws stable; these trees are replaced later as before.
 for(let i=0;i<7;i++){const z=-50-i*24,x=50+Math.sin(i*.9)*13;tree(x+8,z,11,null,true);}
 k.finish();buildAlpineVillage(root,m,landHeight);return group;
}
