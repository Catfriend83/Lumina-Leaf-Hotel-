import {T} from './core.js?v=75';
// Spatial proxies are constructed once. Dense botanical instances never enter
// the camera's collision set; ground triangles are indexed in an X/Z grid.
export function createCameraCollision(scene){
 const cell=8,cells=new Map(),ground=new Map(),solids=[],tmp=new T.Matrix4(),box=new T.Box3();
 const bounds={minX:-400,maxX:300,minZ:-420,maxZ:220,minY:-12,maxY:180};
 const key=(x,y,z)=>`${x},${y},${z}`,gkey=(x,z)=>`${x},${z}`;
 const structural=/stone|marble|Marmor|Naturstein|Stein|Beton|plaster|Putz|ivory|wood|Holz|frame|Rahmen|Bronze|Glas|glass|Fassade|Fahrzeuglack|carGlass|rubber|Dach|roof|Boden|floor/i;
 const vegetation=/Wiesenbotanik|Mischwald|Blatt|Blätter|Nadel|flower|leaf|spruce|forestPine|pine|trunk|Ziergras|Sträucher|Pflanz|Blüten|Himmel|sky|Bergsee|Poolwasser|Lichtschein/i;
 const addSolid=r=>{const b=r.box;if(b.max.x<bounds.minX||b.min.x>bounds.maxX||b.max.z<bounds.minZ||b.min.z>bounds.maxZ)return;
  const id=solids.push(r)-1;
  for(let x=Math.floor(Math.max(bounds.minX,b.min.x)/cell);x<=Math.floor(Math.min(bounds.maxX,b.max.x)/cell);x++)
   for(let z=Math.floor(Math.max(bounds.minZ,b.min.z)/cell);z<=Math.floor(Math.min(bounds.maxZ,b.max.z)/cell);z++)
    for(let y=Math.floor(Math.max(-12,b.min.y)/cell);y<=Math.floor(Math.min(180,b.max.y)/cell);y++){
     const k=key(x,y,z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(id);}
 };
 const addGround=(geometry,matrix,natural=false)=>{
  const a=geometry.attributes.position,ix=geometry.index,n=ix?.count??a.count;
  const p=new T.Vector3(),q=new T.Vector3(),r=new T.Vector3();
  for(let i=0;i<n;i+=3){p.fromBufferAttribute(a,ix?ix.getX(i):i).applyMatrix4(matrix);q.fromBufferAttribute(a,ix?ix.getX(i+1):i+1).applyMatrix4(matrix);r.fromBufferAttribute(a,ix?ix.getX(i+2):i+2).applyMatrix4(matrix);
   const den=(q.z-r.z)*(p.x-r.x)+(r.x-q.x)*(p.z-r.z);if(Math.abs(den)<1e-6)continue;
   const minX=Math.max(bounds.minX,Math.min(p.x,q.x,r.x)),maxX=Math.min(bounds.maxX,Math.max(p.x,q.x,r.x)),
    minZ=Math.max(bounds.minZ,Math.min(p.z,q.z,r.z)),maxZ=Math.min(bounds.maxZ,Math.max(p.z,q.z,r.z));
   if(minX>maxX||minZ>maxZ||Math.min(p.y,q.y,r.y)>180)continue;
   const tri={a:p.clone(),b:q.clone(),c:r.clone(),den,natural};
   for(let x=Math.floor(minX/cell);x<=Math.floor(maxX/cell);x++)for(let z=Math.floor(minZ/cell);z<=Math.floor(maxZ/cell);z++){
    const k=gkey(x,z);if(!ground.has(k))ground.set(k,[]);ground.get(k).push(tri);}
  }
 };
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{
  if(!o.isMesh||!o.geometry?.attributes?.position)return;
  const materials=Array.isArray(o.material)?o.material:[o.material],names=materials.map(m=>m?.name||'').join(' ');
  if(vegetation.test(names)||o.userData.alpineBotany||o.userData.closedParkingPaving&&/Pflanz/.test(o.name))return;
  const terrain=/Wiesen|Talboden|Gelände|Landschaft|Asphalt|Gehweg|Pflaster|Boden|floor|Marmor|cobbles|meadow/i.test(names+' '+o.name);
  o.geometry.computeBoundingBox();
  if(o.isInstancedMesh){
   if(!structural.test(names)&&!terrain)return;
   for(let i=0;i<o.count;i++){o.getMatrixAt(i,tmp);tmp.premultiply(o.matrixWorld);box.copy(o.geometry.boundingBox).applyMatrix4(tmp);
    const size=box.getSize(new T.Vector3());
    if(size.y<.6){if(size.x>.5&&size.z>.5&&(terrain||structural.test(names)))addGround(o.geometry,tmp,/Wiesen|Talboden|Gelände|meadow/i.test(names+' '+o.name));continue;}
    if(Math.max(size.x,size.z)<.38)continue;
    addSolid({box:box.clone(),object:null});
   }
  }else{
   box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
   const size=box.getSize(new T.Vector3());
   if(terrain||size.y<.45&&size.x>1&&size.z>1)addGround(o.geometry,o.matrixWorld,/Wiesen|Talboden|Gelände|meadow/i.test(names+' '+o.name));
   if(structural.test(names)&&size.y>.45)addSolid({box:box.clone(),object:o});
  }
 });
 const ray=new T.Raycaster(),point=new T.Vector3(),normal=new T.Vector3();
 const doorway=p=>p.x>64.08&&p.x<65.32&&p.z>21.2&&p.z<21.75&&p.y>.3&&p.y<2.5;
 const nearby=(a,b,pad=.3)=>{const set=new Set();
  for(let x=Math.floor((Math.min(a.x,b.x)-pad)/cell);x<=Math.floor((Math.max(a.x,b.x)+pad)/cell);x++)
   for(let z=Math.floor((Math.min(a.z,b.z)-pad)/cell);z<=Math.floor((Math.max(a.z,b.z)+pad)/cell);z++)
    for(let y=Math.floor((Math.min(a.y,b.y)-pad)/cell);y<=Math.floor((Math.max(a.y,b.y)+pad)/cell);y++)
     for(const id of cells.get(key(x,y,z))||[])set.add(id);
  return [...set].map(i=>solids[i]);
 };
 const floorAt=(x,z,ceiling=Infinity)=>{
  let y=-Infinity;
  for(const t of ground.get(gkey(Math.floor(x/cell),Math.floor(z/cell)))||[]){const{a,b,c,den}=t,
   u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,w=1-u-v;
   if(u< -1e-5||v< -1e-5||w< -1e-5)continue;const h=u*a.y+v*b.y+w*c.y;
   if((t.natural||h<=ceiling)&&h>y)y=h;
  }return y;
 };
 function blocked(a,b){
  const delta=b.clone().sub(a),length=delta.length();if(length<1e-6)return false;
  ray.set(a,delta.normalize());ray.far=length+.22;
  for(const r of nearby(a,b)){
   if(r.object){const hit=ray.intersectObject(r.object,false).find(h=>h.distance>.035&&!doorway(h.point));
    if(hit&&hit.distance<length+.20)return true;
   }else{
    const padded=r.box.clone().expandByScalar(.20);
    if(padded.containsPoint(a)){
     if(r.box.containsPoint(a)){
      const depth=p=>Math.min(p.x-r.box.min.x,r.box.max.x-p.x,p.y-r.box.min.y,r.box.max.y-p.y,p.z-r.box.min.z,r.box.max.z-p.z);
      if(!r.box.containsPoint(b)||depth(b)<depth(a)-.0001)continue;
      return true;
     }
     if(padded.containsPoint(b)&&r.box.distanceToPoint(b)<r.box.distanceToPoint(a)-.0001)return true;
     continue;
    }
    const hit=ray.ray.intersectBox(padded,point);if(hit&&a.distanceTo(hit)>.035&&a.distanceTo(hit)<length+.20&&!doorway(hit))return true;
   }
  }
  return false;
 }
 function constrain(from,desired){
  const dest=desired.clone();
  // A distant preset may start outside the exploration envelope. Let it return
  // smoothly, while preventing any movement farther away from the property.
  const limit=(v,start,min,max)=>start<min?Math.max(start,v):start>max?Math.min(start,v):T.MathUtils.clamp(v,min,max);
  dest.x=limit(dest.x,from.x,bounds.minX,bounds.maxX);dest.z=limit(dest.z,from.z,bounds.minZ,bounds.maxZ);dest.y=limit(dest.y,from.y,bounds.minY,bounds.maxY);
  const groundY=floorAt(dest.x,dest.z,from.y+.10);
  if(Number.isFinite(groundY))dest.y=Math.max(dest.y,groundY+.38);
  const steps=Math.max(1,Math.ceil(from.distanceTo(dest)/.45)),safe=from.clone();
  for(let i=1;i<=steps;i++){const p=from.clone().lerp(dest,i/steps),h=floorAt(p.x,p.z,safe.y+.45);if(Number.isFinite(h))p.y=Math.max(p.y,h+.38);if(blocked(safe,p)){
    // Slide along walls, rather than trapping the camera at an oblique angle.
    for(const axis of ['x','z','y']){const q=safe.clone();q[axis]=p[axis];if(!blocked(safe,q))safe.copy(q);}break;
   }safe.copy(p);}
  return safe;
 }
 return {bounds,floorAt,constrain,
  precision(position){const floor=floorAt(position.x,position.z,position.y+.1);let d=Number.isFinite(floor)?Math.min(12,position.y-floor):12;for(const r of nearby(position,position,8))d=Math.min(d,r.box.distanceToPoint(position));return T.MathUtils.clamp(d/6,.045,1);},
  focus(origin,direction){ray.set(origin,direction);ray.far=250;let hit=null,distance=250;
   const end=origin.clone().addScaledVector(direction,250);
   for(const r of nearby(origin,end,0)){
    if(r.object){const h=ray.intersectObject(r.object,false)[0];if(h&&h.distance<distance){distance=h.distance;hit=h.point.clone();}}
    else {const p=ray.ray.intersectBox(r.box,point);if(p&&origin.distanceTo(p)<distance){distance=origin.distanceTo(p);hit=p.clone();}}
   }
   for(let t=.5;t<distance;t+=.7){point.copy(origin).addScaledVector(direction,t);const h=floorAt(point.x,point.z,point.y+.1);if(Number.isFinite(h)&&point.y<h+.10){hit=new T.Vector3(point.x,h,point.z);break;}}
   return hit;
  },report:{solidProxies:solids.length,groundCells:ground.size}};
}
