import {T,Kit} from './core.js?v=75';
import {closedParkingSurface} from './limousine-parking.js?v=114';

// Replace the blind diagonal spur with a pedestrian connection to the existing
// rear terrace. The main garden walk south of z=-10 stays in its original place.
function subtractQuads(source,quads){
 const names=Object.keys(source.attributes),out=Object.fromEntries(names.map(n=>[n,[]])),a=source.attributes.position,ix=source.index;
 const read=i=>Object.fromEntries(names.map(n=>{const b=source.attributes[n];return[n,Array.from({length:b.itemSize},(_,j)=>b.array[i*b.itemSize+j])];}));
 const split=(poly,fn,sign)=>{const result=[];for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],dp=fn(p.position)*sign,dq=fn(q.position)*sign;
  if(dp>=-1e-9)result.push(p);
  if(dp*dq<0){const t=dp/(dp-dq);result.push(Object.fromEntries(names.map(n=>[n,p[n].map((x,j)=>x+(q[n][j]-x)*t)])));}
 }return result;};
 const cuts=quads.map(poly=>{const area=poly.reduce((s,p,i)=>s+p[0]*poly[(i+1)%poly.length][1]-poly[(i+1)%poly.length][0]*p[1],0);if(area<0)poly=poly.slice().reverse();return{poly,planes:poly.map((p,i)=>{const q=poly[(i+1)%poly.length];return v=>(q[0]-p[0])*(v[2]-p[1])-(q[1]-p[1])*(v[0]-p[0]);})};});
 for(let i=0;i<(ix?.count??a.count);i+=3){let polys=[[0,1,2].map(j=>read(ix?ix.getX(i+j):i+j))];
  const p=polys[0];
  if(p.some(v=>v.position[0]>26)&&p.some(v=>v.position[0]<41)&&p.some(v=>v.position[2]>-30)&&p.some(v=>v.position[2]<-9)){
   for(const cut of cuts){const kept=[];for(const poly of polys){let inside=poly;
    for(const fn of cut.planes){if(inside.length<3)break;const outside=split(inside,fn,-1);if(outside.length>=3)kept.push(outside);inside=split(inside,fn,1);}
   }polys=kept;}
  }
  for(const poly of polys)for(let j=1;j<poly.length-1;j++)for(const v of[poly[0],poly[j],poly[j+1]])for(const n of names)out[n].push(...v[n]);
 }
 const g=new T.BufferGeometry();for(const n of names)g.setAttribute(n,new T.Float32BufferAttribute(out[n],source.attributes[n].itemSize));
 if(!g.attributes.normal)g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export function finishParkingGardenConnection(scene,m,controller=null){
 scene.updateMatrixWorld(true);
 const old=scene.getObjectByName('Sauber angebundener Gartenweg rechts neben dem Hotel'),hotel=scene.getObjectByName('Lumina Leaf Hotel und Außenanlage');
 if(!old||!hotel)throw Error('Garden walk and existing terrace required');
 const a=old.geometry.attributes.position,worldA=new T.Vector3((a.getX(0)+a.getX(1))/2,a.getY(0),a.getZ(0)).applyMatrix4(old.matrixWorld);
 const end=hotel.localToWorld(new T.Vector3(20.5,.04,-48.4));
 const outside=new T.Vector3(1,0,0).transformDirection(hotel.matrixWorld),bend=end.clone().addScaledVector(outside,3.7);bend.y=0;
 const first=worldA.clone().lerp(bend,.22);first.y=0;
 const points=[worldA,first,bend,end],lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
 const height=t=>worldA.y+(end.y-worldA.y)*t/lengths.at(-1);
 const normals=points.slice(0,-1).map((p,i)=>{const d=points[i+1].clone().sub(p);d.y=0;d.normalize();return new T.Vector3(-d.z,0,d.x);});
 const sections=points.map((p,i)=>{
  let n;if(i===0)n=new T.Vector3(1,0,0);else if(i===points.length-1)n=normals.at(-1).clone();else{n=normals[i-1].clone().add(normals[i]).normalize();n.divideScalar(n.dot(normals[i]));}
  const half=i===0?2.75:1.1;return{p,n,half,y:height(lengths[i])};
 });
 const nearest=(x,z)=>{let best=Infinity,record=null;for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
  if(d<best){best=d;record={d,y:height(lengths[i]+t*(lengths[i+1]-lengths[i])),half:sections[i].half+(sections[i+1].half-sections[i].half)*t};}
 }return record;};
 const side=(sign,extra=0)=>sections.map(s=>[s.p.x+s.n.x*(s.half+extra)*sign,s.p.z+s.n.z*(s.half+extra)*sign]);
 const left=side(-1),right=side(1),outerLeft=side(-1,.18),outerRight=side(1,.18);
 const quads=[];for(let i=0;i<sections.length-1;i++)quads.push([outerLeft[i],outerRight[i],outerRight[i+1],outerLeft[i+1]]);
 const blocked=(x,z,pad=.45)=>{const n=nearest(x,z);return n.d<n.half+pad&&z<=worldA.z+.3&&z>=end.z-1.3;};
 controller?.excludeArea?.((x,z)=>blocked(x,z,.8));
 const world=new T.Vector3();scene.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||o.material!==m.meadow&&o.name!=='Wiesen und natürlicher Talboden')return;
  o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);if(box.max.x<26||box.min.x>42||box.max.z<-31||box.min.z>-8)return;
  const g=o.geometry.clone().applyMatrix4(o.matrixWorld),p=g.attributes.position;
  for(let i=0;i<p.count;i++){world.fromBufferAttribute(p,i);const n=nearest(world.x,world.z),d=Math.max(0,n.d-n.half-.18);if(world.z>end.z-4&&world.z<worldA.z+2&&d<3){const t=1-T.MathUtils.smoothstep(d,0,3);p.setY(i,world.y+(n.y-.16-world.y)*t);}}
  o.geometry=subtractQuads(g,quads).applyMatrix4(o.matrixWorld.clone().invert());g.dispose();o.geometry.computeBoundingSphere();
 });
 // No garden plants or regenerated meadow instances may grow through the ramp.
 const vegetation=/Wiesenbotanik|Mischwald|leaf|pine|spruce|trunk|flower|shrub|Sträucher|Blüten|Salbei/i;
 scene.traverse(o=>{if(!o.isInstancedMesh||!vegetation.test(o.material?.name||''))return;const kept=[],colors=[],matrix=new T.Matrix4();
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);const w=matrix.clone().premultiply(o.matrixWorld);if(blocked(w.elements[12],w.elements[14],.8))continue;kept.push(matrix.clone());if(o.instanceColor){const c=new T.Color();o.getColorAt(i,c);colors.push(c);}}
  if(kept.length===o.count)return;o.count=kept.length;kept.forEach((v,i)=>{o.setMatrixAt(i,v);if(colors[i])o.setColorAt(i,colors[i]);});o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;o.computeBoundingSphere();
 });
 const root=new T.Group();root.name='Kurzer Gartenanschluss zur bestehenden rückwärtigen Hotelterrasse';scene.add(root);
 const heights=new Map(),curbHeights=new Map(),key=(x,z)=>x.toFixed(8)+','+z.toFixed(8);
 for(const edge of[left,right,outerLeft,outerRight])edge.forEach(([x,z],i)=>{heights.set(key(x,z),sections[i].y);curbHeights.set(key(x,z),sections[i].y+(i===0?.12:.09));});
 const path=closedParkingSurface([...left,...right.slice().reverse()],(x,z)=>heights.get(key(x,z))??nearest(x,z).y,m.cobbles,'Durchgehender Fußweg zur vorhandenen Terrasse',.20);root.add(path);
 for(const [inner,outer]of[[left,outerLeft],[right,outerRight]])root.add(closedParkingSurface([...inner,...outer.slice().reverse()],(x,z)=>curbHeights.get(key(x,z))??nearest(x,z).y+.09,m.ivory,'Sauberer niedriger Rand am Terrassenanschluss',.29));
 root.userData={parkingGardenConnection:true,removedBlindSpur:true,join:worldA.toArray(),terraceJoin:end.toArray(),points:points.map(p=>p.toArray()),pathWidth:2.2,closedPaving:true};
 scene.userData.parkingGardenConnection=root.userData;scene.updateMatrixWorld(true);return root;
}
