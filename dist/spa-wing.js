import {T,Kit,rng} from './core.js?v=75';
import {broadLeaf} from './vegetation.js?v=75';
import {buildLuxuryPool,POOL_LAYOUT} from './luxury-pool.js?v=75';
import {buildStraightSpaLink,SPA_LINK} from './spa-link.js?v=75';
import {buildFitnessStudio} from './fitness-studio.js?v=75';

export const SPA_WING={x:-6.3,z:-27.8,rotation:-.448,floor:.24768,poolRise:4.70,bounds:{left:-7.55,right:10.25,back:-12.05,front:16.83},galleryZ:-14.0};
function local(x,z){const dx=x-SPA_WING.x,dz=z-SPA_WING.z,c=Math.cos(SPA_WING.rotation),s=Math.sin(SPA_WING.rotation);return [c*dx-s*dz,s*dx+c*dz];}
export function inSpaSite(x,z,margin=0){const [u,v]=local(x,z),b=SPA_WING.bounds;return u>b.left-margin&&u<b.right+margin&&v>b.back-margin&&v<b.front+margin;}
/**
 * Reject full-sized trees whose trunk or canopy would intrude into the
 * existing rooftop pool, its deck or the immediately adjacent spa terrace.
 * The protection follows the actual rotated SPA_WING transform and the
 * unchanged POOL_LAYOUT.deck, rather than an inaccurate world-space square.
 * Ground, pool water and the surrounding distant forest are untouched.
 */
export function spaPoolTreeClearance(x,z,crownRadius=0){
 const [u,v]=local(x,z),d=POOL_LAYOUT.deck;
 const dx=Math.max(d.left-u,0,u-d.right);
 const dz=Math.max(d.back-v,0,v-d.front);
 return Math.hypot(dx,dz)<6.5+Math.max(0,crownRadius);
}

export function inSpaGallery(x,z,margin=0){const [u,v]=local(x,z);return u>SPA_LINK.spaX-margin&&u<14.78+margin&&Math.abs(v-SPA_LINK.spaZ)<SPA_LINK.outerWidth/2+margin;}
export function spaSiteGroundHeight(x,z,base){const [u,v]=local(x,z),b=SPA_WING.bounds,d=Math.max(b.left-u,u-b.right,b.back-v,v-b.front),t=Math.max(0,Math.min(1,(2.0-d)/2.0)),blend=t*t*(3-2*t);return base*(1-blend)+.04*blend;}
export function gardenSpaJunctionHeight(z,base){return base;}

export function clearSpaSiteGardens(scene){
 const garden=scene.getObjectByName('Blumengarten und ansteigender Weg');if(!garden)return 0;
 scene.updateMatrixWorld(true);let removed=0;scene.traverse(mesh=>{if(!mesh.isInstancedMesh||mesh.geometry.type!=='DodecahedronGeometry')return;const matrix=new T.Matrix4(),kept=[];for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const p=new T.Vector3().setFromMatrixPosition(matrix.clone().premultiply(mesh.matrixWorld));const [u,v]=local(p.x,p.z);if(u> -9.4&&u<11.2&&v> -13.2&&v<21.0)removed++;else kept.push(matrix.clone());}mesh.count=kept.length;kept.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();});
 garden.traverse(mesh=>{if(!mesh.isInstancedMesh)return;const kept=[],matrix=new T.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const p=new T.Vector3().setFromMatrixPosition(matrix.clone().premultiply(mesh.matrixWorld));if(inSpaSite(p.x,p.z,.8)||inSpaGallery(p.x,p.z,.75)){removed++;}else kept.push(matrix.clone());}mesh.count=kept.length;kept.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();});return removed;
}
function regionSlab(k,m,x0,x1,z0,z1,y,h,name){const g=new T.BoxGeometry(x1-x0,h,z1-z0),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++)if(Math.abs(n.getY(i))>.5)uv.setXY(i,(p.getX(i)+(x0+x1)/2)/2,(p.getZ(i)+(z0+z1)/2)/2);const mesh=k.mesh(g,m,name);mesh.position.set((x0+x1)/2,y,(z0+z1)/2);return mesh;}
export function buildIndependentSpa(root,m,tower){
 const cfg=SPA_WING,d=POOL_LAYOUT.deck,b=POOL_LAYOUT.basin,group=new T.Group();group.name='Eigenständiger Spa-Flügel mit Dachpool';group.position.set(cfg.x,cfg.floor,cfg.z);group.rotation.y=cfg.rotation;group.userData={independentSpa:true,poolSeparateFromGarage:true,groundFloorY:cfg.floor,poolDeckY:cfg.floor+cfg.poolRise};root.add(group);const k=new Kit(group);
 regionSlab(k,m.stone,d.left-.42,d.right+.42,d.back-.42,d.front+.42,-.18,.36,'Eigenes Fundament des Spa-Gebäudes');
 regionSlab(k,m.poolDeck,d.left-.34,d.right+.34,d.back-.34,d.front+.34,-.055,.11,'Natursteinboden der Wellness-Lounge');
 // The concrete/stone bearing plate sits BELOW the unchanged basin. Four
 // columns and two beams carry it independently of the distant garage.
 const bearing=regionSlab(k,m.stoneDark,b.left-.25,b.right+.25,b.back-.25,b.front+.25,3.23,.28,'Eigenständige Tragplatte unter dem Poolbecken');bearing.userData={poolBearingPlate:true,minimumRoomClearance:3.09};
 for(const x of [-4.98,4.98]){k.box(m.stoneDark,x,3.075,.45,.25,.31,11.15);for(const z of [-4.99,5.89])k.box(m.stone,x,1.515,z,.34,3.03,.34);}
 const h=cfg.poolRise;
 for(const [x0,x1,z0,z1]of [[d.left-.35,b.left-.24,d.back-.35,d.front+.35],[b.right+.24,d.right+.35,d.back-.35,d.front+.35],[b.left-.24,b.right+.24,d.back-.35,b.back-.24],[b.left-.24,b.right+.24,b.front+.24,d.front+.35]])regionSlab(k,m.stoneDark,x0,x1,z0,z1,h-.43,.36,'Tragende Dachplatte neben dem Pool');
 // Horizontal stone piers and full-height glazed lounge elevations.
 for(const z of [d.back-.28,d.front+.28]){
  k.box(m.stone,0,.29,z,14.62,.58,.40);k.box(m.frame,0,h-.26,z,14.66,.36,.43);
  const count=4,width=14.0/count;
  for(let i=0;i<=count;i++){const x=-7+i*width;k.box(m.stone,x,2.23,z,.25,3.87,.41);}
  for(let i=0;i<count;i++){const x=-7+(i+.5)*width;k.box(m.glass,x,2.22,z+.015,width-.27,3.55,.038);k.box(m.frame,x,2.22,z+.043,.05,3.55,.055);}
 }
 for(const x of [d.left-.28,d.right+.28]){
  if(x<0){for(const [z0,z1]of [[-11.875,-.55],[1.85,16.675]])k.box(m.stone,x,.29,(z0+z1)/2,.42,.58,z1-z0);}else{for(const [z0,z1]of [[-11.875,SPA_LINK.spaZ-1.04],[SPA_LINK.spaZ+1.04,16.675]])k.box(m.stone,x,.29,(z0+z1)/2,.42,.58,z1-z0);}k.box(m.frame,x,h-.26,2.4,.43,.36,28.55);
  for(let z=d.back;z<d.front;z+=3.5){const span=Math.min(3.5,d.front-z);k.box(m.stone,x,2.23,z,.38,3.87,.25);const center=z+span/2;
   if(x>0&&SPA_LINK.spaZ>z&&SPA_LINK.spaZ<z+span){const a=SPA_LINK.spaZ-1.04,b=SPA_LINK.spaZ+1.04;for(const [z0,z1]of [[z+.13,a],[b,z+span-.13]])if(z1>z0)k.box(m.glass,x,2.22,(z0+z1)/2,.038,3.55,z1-z0);k.box(m.glass,x,3.5175,SPA_LINK.spaZ,.038,.955,2.08);}
   else if(!(x<0&&Math.abs(center-.65)<2.2))k.box(m.glass,x,2.22,center,.038,3.55,span-.26);
   else{const door=k.mesh(new T.BoxGeometry(.045,2.80,2.4),m.glass,'Glastür der Spa-Passage');door.position.set(x,1.40,.65);for(const [z0,z1]of [[z+.13,-.55],[1.85,z+span-.13]])if(z1>z0)k.box(m.glass,x,2.22,(z0+z1)/2,.038,3.55,z1-z0);k.box(m.glass,x,3.40,.65,.038,1.18,2.4);for(const dz of [-1.22,1.22])k.box(m.frame,x-.04,1.40,.65+dz,.065,2.8,.045);k.box(m.gold,x-.06,1.18,.15,.035,.38,.035);}
  }
 }
 // Stone/metal frames and the hotel's established emerald fixture design.
 for(const x of [-6.85,0,6.70])for(const z of [d.back-.50,d.front+.50]){
  const side=z<0?-1:1;k.box(m.gold,x,2.20,z,.22,.83,.23);k.box(m.greenLight,x,2.20,z+side*.15,.12,.56,.065);for(const y of [1.67,2.74])k.box(m.warm,x,y,z+side*.07,.33,.075,.25);
 }
 // Replace the lower lounge furniture only; bearing geometry and roof pool stay.
 buildFitnessStudio(group,m);
 for(const z of [-7.7,1.0,10.8]){k.box(m.warm,0,3.02,z,1.6,.028,.11);const light=new T.PointLight('#ffd2a0',13,9,2);light.name='Warme Innenbeleuchtung der Spa-Lounge';light.position.set(0,2.55,z);group.add(light);}
 // Separate, enclosed stair pavilion reaches the existing right-side opening
 // in the privacy screen, without cutting or altering the relocated pool deck.
 const sx=8.60,start=2.7475,steps=26,tread=.28,rise=h/steps;
 regionSlab(k,m.stone,7.05,10.0,-6.30,4.10,-.18,.36,'Fundament des Spa-Treppenpavillons');
 for(let i=0;i<steps;i++){const z=start-(i+.5)*tread,y=(i+1)*rise;k.box(m.poolDeck,sx,y/2,z,1.48,y,tread+.005);}
 regionSlab(k,m.poolDeck,6.82,9.4,-5.705,-3.36,h-.12,.24,'Oberes Podest zur bestehenden Sichtschutzöffnung');
 for(const side of [-1,1]){const x=sx+side*.81;k.line(m.chrome,[x,1.01,start+.14],[x,h+1.01,start-steps*tread],.026);for(const i of [0,13,26]){const z=start-i*tread,y=i*rise;k.line(m.chrome,[x,y,z],[x,y+1.01,z],.022);}}
 k.box(m.frame,8.55,6.98,-1.05,3.2,.20,10.6);k.box(m.glass,10.0,3.50,-1.05,.045,6.82,10.1);for(const z of [-6.20,4.10]){if(z<0)k.box(m.glass,8.6,3.50,z,2.75,6.82,.045);else{for(const dx of [-1.13,1.13])k.box(m.glass,8.6+dx,3.50,z,.49,6.82,.045);k.box(m.glass,8.6,4.97,z,1.77,3.88,.045);const door=k.mesh(new T.BoxGeometry(1.73,2.90,.045),m.glass,'Glastür des Treppenpavillons');door.position.set(8.6,1.45,z);k.box(m.gold,9.1,1.14,z+.05,.035,.38,.035);}k.box(m.stone,9.96,3.48,z,.16,6.92,.18);}k.box(m.stone,7.1,3.48,-6.2,.18,6.92,.18);
 k.finish();const pool=buildLuxuryPool(group,m,{position:[0,cfg.poolRise,0]});pool.userData.onIndependentSpa=true;
 buildStraightSpaLink(root,m,tower,group);buildGardenWalk(root,m,group);buildSpaLandscape(root,m,group);
 return {group,pool};
}
function buildGardenWalk(root,m,spa){
 // The existing lounge door stays on the west elevation. A waterfront garden
 // walk reaches it around the south end, wholly behind the garage building.
 const points=[[9.0,18.35],[-8.15,18.35],[-8.15,.65],[-7.34,.65]].map(([x,z])=>spa.localToWorld(new T.Vector3(x,0,z)));
 const path=new T.Group();path.name='Fußweg zur unveränderten westlichen Spa-Lounge';path.userData={spaLoungePath:true};root.add(path);const q=new Kit(path);
 for(let i=0;i<points.length-1;i++){const p=points[i],r=points[i+1],l=p.distanceTo(r),mid=p.clone().lerp(r,.5),ry=-Math.atan2(r.z-p.z,r.x-p.x);q.box(m.stone,mid.x,SPA_WING.floor-.18,mid.z,l+.10,.36,1.45,ry);q.box(m.poolDeck,mid.x,SPA_WING.floor-.025,mid.z,l+.10,.05,1.42,ry);}
 const c=spa.localToWorld(new T.Vector3(8.60,0,4.13));const d=points[0];const l=c.distanceTo(d),mid=c.clone().lerp(d,.5),ry=-Math.atan2(d.z-c.z,d.x-c.x);q.box(m.stone,mid.x,SPA_WING.floor-.18,mid.z,l,.36,1.50,ry);q.box(m.poolDeck,mid.x,SPA_WING.floor-.025,mid.z,l,.05,1.46,ry);q.finish();return path;
}

function buildSpaLandscape(root,m,spa){
 const garden=new T.Group();garden.name='Geplante Außenanlagen am separaten Spa';garden.position.copy(spa.position);garden.rotation.copy(spa.rotation);root.add(garden);const k=new Kit(garden),random=rng(330613),d=POOL_LAYOUT.deck;
 // Front apron ends behind the existing public sidewalk, with a gentle approach.
 const geometry=new T.BoxGeometry(17.0,.30,2.9,1,1,5);geometry.translate(1.1,0,18.2);const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i),t=Math.max(0,Math.min(1,(z-16.75)/2.9));p.setY(i,p.getY(i)>0?-.01-.11768*t:-.42);}geometry.computeVertexNormals();k.mesh(geometry,m.poolDeck,'Natursteinvorplatz vor der Spa-Lounge');
 function planter(x,z,w=2.15){k.box(m.stone,x,.16,z,w,.32,.67);k.box(m.soil,x,.327,z,w-.16,.025,.51);for(let i=0;i<16;i++){const xx=x+(random()-.5)*(w-.30),a=random()*Math.PI*2,yy=.52+random()*.27,zz=z+(random()-.5)*.30;k.line(m.trunk,[xx,.33,zz],[xx,yy,zz],.008);k.put(broadLeaf,i%2?m.leaf:m.leaf2,xx,yy,zz,.24,.43,.26,-.3,a,.15);}k.box(m.poolWarm,x,.08,z+.345,w-.25,.027,.014);}
 for(const x of [-5.1,0,5.1])planter(x,19.55,2.1);
 k.finish();
}
