import {T,Kit} from './core.js?v=75';
import {createGroundContact} from './ground-contact.js?v=75';
import {COMPLETE_PLAZA} from './complete-plaza-data.js?v=75';

const FLOOR_NAME='Einheitlicher Natursteinbelag des vollständigen Dorfplatzes';
const polygonArea=ring=>Math.abs(ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
function areaCenter(geometry){
 const p=geometry.attributes.position,ix=geometry.index;let area=0,x=0,z=0;
 for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2),s=Math.abs((p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a)))/2;area+=s;x+=s*(p.getX(a)+p.getX(b)+p.getX(c))/3;z+=s*(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;}
 return {center:[x/area,z/area],area};
}
// Fill the existing constrained openings in the SAME mesh and UV phase.
// The perimeter is reused exactly; no second surface covers the old paving.
function closePlantingHoles(floor){
 const g=floor.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
 const positions=Array.from(p.array),normals=Array.from(n.array),uvs=Array.from(uv.array),indices=Array.from(g.index.array),filled=[];
 for(const region of COMPLETE_PLAZA.patch)for(const ring of region.holes||[]){
  const area=polygonArea(ring);if(area<1||area>3)continue;
  const contour=ring.map(([x,z])=>new T.Vector2(x,z)),triangles=T.ShapeUtils.triangulateShape(contour,[]),ids=[];
  for(const [x,z]of ring){let best=0,distance=Infinity;for(let i=0;i<p.count;i++){const d=(p.getX(i)-x)**2+(p.getZ(i)-z)**2;if(d<distance){distance=d;best=i;}}
   if(distance>1e-7)throw new Error('Planting opening boundary differs from paving');
   ids.push(positions.length/3);positions.push(p.getX(best),p.getY(best),p.getZ(best));normals.push(n.getX(best),n.getY(best),n.getZ(best));uvs.push(uv.getX(best),uv.getY(best));
  }
  for(let [a,b,c]of triangles){const pa=ring[a],pb=ring[b],pc=ring[c];if((pb[0]-pa[0])*(pc[1]-pa[1])-(pb[1]-pa[1])*(pc[0]-pa[0])>0)[b,c]=[c,b];indices.push(ids[a],ids[b],ids[c]);}
  filled.push({area,vertices:ring.length});
 }
 g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();return filled;
}
function lathe(root,name,profile,material,segments=96){const geometry=new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),segments),mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.castShadow=!material.transparent;mesh.receiveShadow=true;root.add(mesh);return mesh;}
function metalColors(mesh){const p=mesh.geometry.attributes.position,colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=.5+.5*Math.sin(x*7.9+Math.sin(y*12.2+z*9.1))*Math.cos(z*11.3-y*4.7),color=new T.Color().setRGB(.085+f*.07,.14+f*.065,.115+f*.048);colors.push(color.r,color.g,color.b);}mesh.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));}
function buildFountain(scene,m,center,y){
 const f=new T.Group();f.name='Referenzbrunnen – achteckiges Steinbecken und zwei Patinaschalen';f.position.set(center[0],y,center[1]);f.userData={villageFountain:true,referencePlaza:true,center,units:'meters',radius:2.2,height:3.76,tiers:2};scene.add(f);
 const stone=m.stone.clone();stone.name='Dorfbrunnen – fein strukturierter grauer Naturstein';stone.color.set('#b8b7af');stone.bumpScale=.012;stone.roughness=.82;
 lathe(f,'Achteckiges geschlossenes Becken mit profiliertem Rand',[[0,0],[2.2,0],[2.2,.08],[2.12,.12],[2.12,.55],[2.2,.57],[2.2,.68],[1.98,.68],[1.98,.58],[1.98,.17],[0,.17]],stone,8);
 const metal=new T.MeshStandardMaterial({name:'Dorfbrunnen – dunkle Bronze mit natürlicher Grünpatina',color:'#ffffff',vertexColors:true,metalness:.62,roughness:.48});
 const body=lathe(f,'Massiver profilierter Bronzekörper',[[0,.17],[.58,.17],[.58,.32],[.52,.39],[.50,1.20],[.44,1.27],[.44,1.41],[.54,1.46],[.54,1.55],[.38,1.59],[.28,1.90],[.26,2.35],[.25,2.44],[.20,2.54],[.24,2.75],[.28,2.90],[.23,3.12],[.18,3.48],[0,3.52]],metal);metalColors(body);
 const lower=lathe(f,'Große untere Brunnenschale',[[.25,1.81],[.35,1.86],[.54,1.93],[.84,2.06],[1.12,2.21],[1.32,2.36],[1.36,2.41],[1.36,2.47],[1.28,2.47],[1.14,2.35],[.90,2.25],[.58,2.18],[.26,2.16]],metal);metalColors(lower);
 const upper=lathe(f,'Kleine obere Brunnenschale',[[.17,3.12],[.27,3.16],[.43,3.24],[.58,3.36],[.64,3.46],[.64,3.52],[.59,3.52],[.48,3.43],[.32,3.39],[.17,3.38]],metal);metalColors(upper);
 const cap=lathe(f,'Oberer Wasserauslass',[[0,3.39],[.08,3.39],[.085,3.67],[.065,3.73],[0,3.76]],metal);metalColors(cap);
 const water=m.water.clone();water.name='Dorfbrunnen – ruhiges klares Beckenwasser';water.color.set('#74908c');water.metalness=.10;water.roughness=.20;water.opacity=.79;water.normalMap=m.water.normalMap.clone();water.normalMap.repeat.set(2,2);water.normalScale.set(.035,.035);
 const floor=new T.Mesh(new T.CircleGeometry(1.977,8),water);floor.rotation.x=-Math.PI/2;floor.position.y=.54;floor.name='Wasserfläche innerhalb des achteckigen Beckens';floor.receiveShadow=true;f.add(floor);
 for(const [radius,height,name]of [[1.26,2.448,'Wasser in der unteren Schale'],[.58,3.50,'Wasser in der oberen Schale']]){const disk=new T.Mesh(new T.CircleGeometry(radius,96),water);disk.rotation.x=-Math.PI/2;disk.position.y=height;disk.name=name;f.add(disk);}
 const flowing=new T.MeshPhysicalMaterial({name:'Dorfbrunnen – feine klare Wasserläufe',color:'#b7d1cb',metalness:0,roughness:.12,transparent:true,opacity:.40,depthWrite:false,clearcoat:1});
 // Fine falling streams follow gravity, without particles or a mist cloud.
 const k=new Kit(f);for(const [count,radius,top,bottom,spread]of [[28,.635,3.505,2.45,.12],[52,1.35,2.456,.542,.15]])for(let i=0;i<count;i++){
  const a=i*Math.PI*2/count,points=Array.from({length:13},(_,j)=>{const t=j/12,r=radius+spread*Math.sqrt(t);return new T.Vector3(Math.sin(a)*r,top-(top-bottom)*t,Math.cos(a)*r);});
  const mesh=k.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.0065+(i%3)*.001,4,false),flowing,'Feiner Schalenüberlauf');mesh.castShadow=false;mesh.receiveShadow=false;
 }
 k.line(flowing,[0,3.74,0],[0,3.51,0],.012);k.finish();
 return {group:f,water,flowing};
}
function buildBench(scene,m,x,y,z,angle,index){
 const g=new T.Group();g.name='Referenz-Holzbank am Dorfbrunnen '+(index+1);g.position.set(x,y,z);g.rotation.y=angle;g.userData={referencePlaza:true,plazaBench:true,villageBench:true,index,frontClearance:1,facesCenter:true,width:1.90,seatHeight:.46,depth:.68};scene.add(g);
 const timber=m.villageTimber.clone();timber.name='Dorfplatzbank – helle geölte Holzleisten';timber.color.set('#d9a26a');timber.roughness=.64;timber.bumpScale=.004;timber.map=timber.map.clone();timber.map.center.set(.5,.5);timber.map.rotation=Math.PI/2;timber.bumpMap=timber.map;
 const frame=new T.MeshStandardMaterial({name:'Dorfplatzbank – anthrazitfarbene seitliche Stahlplatten',color:'#363d3c',metalness:.52,roughness:.48}),k=new Kit(g);
 for(let i=0;i<6;i++)k.bevel(timber,0,.46,-.233+i*.0932,1.9,.055,.094,.008);
 for(let i=0;i<6;i++){const y=.64+i*.084;const slat=k.mesh(new T.BoxGeometry(1.9,.068,.036),timber,'Horizontale Holzleiste der Rückenlehne');slat.position.set(0,y,-.295-(y-.64)*.15);slat.rotation.x=-.149;}
 for(const side of [-1,1]){k.bevel(frame,side*.84,.218,0,.048,.436,.52,.006);k.box(frame,side*.84,.675,-.32,.045,.64,.044);k.box(frame,side*.84,.419,0,.060,.036,.52);}
 k.finish();return g;
}
export function rebuildReferencePlaza(scene,m){
 scene.updateMatrixWorld(true);const floor=scene.getObjectByName(FLOOR_NAME);if(!floor)throw new Error('Complete village paving missing');
 const removed=[];scene.traverse(o=>{if(o.userData.plazaRefinement&&o.userData.kind==='soil'||o.userData.plazaBench||o.userData.villageFountain||o.userData.plazaTree||o.userData.plazaSymmetry||o.userData.newForestTree&&o.userData.zone==='Dorfplatz'||/^Eingefasstes symmetrisches Baumbeet |^Geplante Baumscheibe |^Geländeangepasstes Fundament des zentralen Dorfbrunnens$/.test(o.name))removed.push(o);});removed.forEach(o=>o.removeFromParent());
 const filled=closePlantingHoles(floor),{center,area}=areaCenter(floor.geometry),contact=createGroundContact([floor]),y=contact(...center);
 // The furniture zone is level; a gentle outer blend retains all boundary heights.
 const p=floor.geometry.attributes.position;for(let i=0;i<p.count;i++){const d=Math.hypot(p.getX(i)-center[0],p.getZ(i)-center[1]);if(d>=5.6)continue;const t=Math.max(0,Math.min(1,(d-4.1)/1.5)),s=t*t*(3-2*t);p.setY(i,y*(1-s)+p.getY(i)*s);}floor.geometry.computeVertexNormals();floor.geometry.computeBoundingBox();floor.geometry.computeBoundingSphere();
 const fountain=buildFountain(scene,m,center,y),benches=[],radius=3.48;
 for(const [i,[dx,dz,a]]of [[0,-radius,0],[radius,0,-Math.PI/2],[0,radius,Math.PI],[-radius,0,Math.PI/2]].entries())benches.push(buildBench(scene,m,center[0]+dx,y,center[1]+dz,a,i));
 scene.userData.referencePlaza={version:83,center,centerMethod:'Area centroid of the actual inner stone paving with the four former tree openings restored; building footprints excluded',area,filledOpenings:filled,removedObjects:removed.map(o=>o.name),benches:4,frontClearanceMeters:1,fountainOuterRadius:2.2,benchAxisRadius:radius,levelFurnitureHeight:y};
 scene.updateMatrixWorld(true);return {fountain,benches,report:scene.userData.referencePlaza};
}
export function animateReferenceFountain(built,t){const f=built.referencePlaza?.fountain;if(!f)return;f.water.normalMap.offset.set(t*.009,t*.005);f.flowing.opacity=.40+.018*Math.sin(t*1.7);}
