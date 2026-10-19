import {T,Kit} from './core.js?v=75';
import {gardenPathShift} from './meadow-grade.js?v=75';
import {subtractGarageFootprint} from './garage-site.js?v=104';

// V108: translate the entire compound 16 m east, preserving the garden path.
// Both approaches reconnect to the existing road without extending that road.
export const PARKING_SHIFT_X=14; // local x32 becomes world x46 (V107: x30).
export const LIMO_PARK={minX:32,maxX:68,minZ:42,maxZ:79,asphaltY:-.07,
 entrances:[{x:41.0,label:'Einfahrt'},{x:60.5,label:'Ausfahrt'}],
 bays:[38.8,50,61.2],bayWidth:7.5,carZ:65.9,guardX:50.7};
export const LIMO_PARK_WORLD={
 minX:46,maxX:82,minZ:-18,maxZ:19,
 roadZ:28.4
};
export function inLimousineParking(x,z,padding=0){
 const p=LIMO_PARK_WORLD;
 if(x>=p.minX-padding&&x<=p.maxX+padding&&
        z>=p.minZ-padding&&z<=p.maxZ+padding)return true;
 if(z<19-padding||z>28.4+padding)return false;
 return PARKING_ACCESS.some((_,i)=>{const s=parkingAccessSection(i,z);
  return x>=s.left-padding&&x<=s.right+padding;});
}

export const PARKING_ACCESS=[{roadX:53,gateX:55},{roadX:62.8,gateX:74.5}];
// A horizontal section of each 6.64–7.2 m wide, smoothly curving driveway.
// Widen the x span with the tangent so the actual lane never becomes narrow.
export function parkingAccessSection(index,z){
 const a=PARKING_ACCESS[index],t=Math.max(0,Math.min(1,(28.4-z)/9.4));
 const smooth=t*t*(3-2*t),slope=(a.gateX-a.roadX)*6*t*(1-t)/9.4;
 const center=a.roadX+(a.gateX-a.roadX)*smooth;
 const half=(7.2+(6.64-7.2)*smooth)*Math.sqrt(1+slope*slope)/2;
 return {left:center-half,right:center+half,center};
}

// Watertight indexed paving solid: one top, one underside, closed skirts.
export function closedParkingSurface(contour,height,material,name){
 const points=contour.map(([x,z])=>new T.Vector2(x,z));
 if(T.ShapeUtils.isClockWise(points))points.reverse();
 const triangles=T.ShapeUtils.triangulateShape(points,[]),positions=[],uv=[],indices=[];
 for(const p of points){const y=height(p.x,p.y);positions.push(p.x,y,p.y,p.x,y-.20,p.y);
  uv.push(p.x/2,p.y/2,p.x/2,p.y/2);}
 for(const [a,b,c]of triangles)indices.push(2*a,2*c,2*b,2*a+1,2*b+1,2*c+1);
 for(let a=0;a<points.length;a++){const b=(a+1)%points.length;
  indices.push(2*a,2*b,2*b+1,2*a,2*b+1,2*a+1);}
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const mesh=new T.Mesh(geometry,material);mesh.name=name;
 mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData={closedParkingPaving:true};return mesh;
}

// Subtract the same approach footprints from the existing roadside curb.
// Interpolate every original vertex attribute; all distant curb geometry stays.
export function cutParkingAccesses(source,{minZ=27.98,maxZ=28.4,steps=16}={}){
 const names=Object.keys(source.attributes),output=Object.fromEntries(names.map(n=>[n,[]]));
 const position=source.attributes.position,index=source.index;
 const vertex=i=>Object.fromEntries(names.map(n=>{const a=source.attributes[n];
  return [n,Array.from({length:a.itemSize},(_,j)=>a.array[i*a.itemSize+j])];}));
 const clip=(poly,f,sign)=>{const out=[];for(let j=0;j<poly.length;j++){
  const a=poly[j],b=poly[(j+1)%poly.length],da=f(a.position)*sign,db=f(b.position)*sign;
  if(da>=-1e-10)out.push(a);
  if((da>0&&db<0)||(da<0&&db>0)){const t=da/(da-db);
   out.push(Object.fromEntries(names.map(n=>[n,a[n].map((v,k)=>v+(b[n][k]-v)*t)])));}
 }return out;};
 const cutters=[];
 for(let gate=0;gate<2;gate++)for(let j=0;j<steps;j++){
  const z0=minZ+(maxZ-minZ)*j/steps,z1=minZ+(maxZ-minZ)*(j+1)/steps;
  const a=parkingAccessSection(gate,z0),b=parkingAccessSection(gate,z1);
  const left=z=>a.left+(b.left-a.left)*(z-z0)/(z1-z0);
  const right=z=>a.right+(b.right-a.right)*(z-z0)/(z1-z0);
  cutters.push([v=>v[2]-z0,v=>z1-v[2],v=>v[0]-left(v[2]),v=>right(v[2])-v[0]]);
 }
 const count=index?.count??position.count;
 for(let i=0;i<count;i+=3){let polygons=[[0,1,2].map(j=>vertex(index?index.getX(i+j):i+j))];
  const initial=polygons[0];
  if(initial.some(v=>v.position[0]>49)&&initial.some(v=>v.position[2]>minZ-.001)&&initial.some(v=>v.position[2]<maxZ+.001)){
   for(const cutter of cutters){const kept=[];
    for(const polygon of polygons){let inside=polygon;
     for(const plane of cutter){if(inside.length<3)break;
      const outside=clip(inside,plane,-1);if(outside.length>=3)kept.push(outside);
      inside=clip(inside,plane,1);
     }
    }polygons=kept;
   }
  }
  for(const poly of polygons)for(let j=1;j<poly.length-1;j++){
   const tri=[poly[0],poly[j],poly[j+1]],a=new T.Vector3(...tri[0].position),
    b=new T.Vector3(...tri[1].position),c=new T.Vector3(...tri[2].position);
   if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-18)continue;
   for(const v of tri)for(const n of names)output[n].push(...v[n]);
  }
 }
 const result=new T.BufferGeometry();
 for(const n of names)result.setAttribute(n,new T.Float32BufferAttribute(output[n],source.attributes[n].itemSize));
 result.computeVertexNormals();return result;
}

// Move precisely the two complete original left-side lanterns, including all
// batched frame, glass, base and glow parts. Other garden furnishings stay put.
export function relocateLimousineParkingLamps(scene,m){
 const garden=scene.getObjectByName('Blumengarten und ansteigender Weg');
 if(!garden)return;
 const moves=[{from:[32,-2],to:[47.3,-6]},{from:[30.4,6],to:[47.3,7]}];
 const materials=new Set([m.frame,m.gold,m.warm,m.glow]);
 garden.updateWorldMatrix(true,true);
 for(const move of moves){
  let baseY=null;
  garden.traverse(o=>{if(!o.isInstancedMesh||o.material!==m.gold)return;
   const matrix=new T.Matrix4(),v=new T.Vector3();
   for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);v.setFromMatrixPosition(matrix.premultiply(o.matrixWorld));
    if(Math.abs(v.x-move.from[0])<.01&&Math.abs(v.z-move.from[1])<.01)baseY=v.y-.09;}
  });
  if(baseY===null)throw new Error('Original parking lantern not found');
  let parts=0;
  garden.traverse(o=>{if(!o.isInstancedMesh||!materials.has(o.material))return;
   const inverse=o.matrixWorld.clone().invert(),matrix=new T.Matrix4(),v=new T.Vector3();
   for(let i=0;i<o.count;i++){
    o.getMatrixAt(i,matrix);const world=matrix.clone().premultiply(o.matrixWorld);v.setFromMatrixPosition(world);
    if(Math.abs(v.x-move.from[0])>.16||Math.abs(v.z-move.from[1])>.16)continue;
    world.elements[12]+=move.to[0]-move.from[0];world.elements[14]+=move.to[1]-move.from[1];
    world.elements[13]+=LIMO_PARK.asphaltY-baseY;
    o.setMatrixAt(i,world.premultiply(inverse));parts++;
   }
   o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();
  });
  move.parts=parts;
 }
 scene.userData.parkingLamps={moves,wallClearance:1.3,spacing:13,baseY:LIMO_PARK.asphaltY};
 return scene.userData.parkingLamps;
}

// Grade only actual meadow terrain under the moved compound. Preserve the
// complete continuous terrain mesh; pull its existing vertices below the
// asphalt and ease the surrounding grass back to its original height.
export function prepareLimousineParkingTerrain(scene,m){
 const p=LIMO_PARK_WORLD,buffer=10,target=LIMO_PARK.asphaltY-.23;
 const smooth=t=>t*t*(3-2*t),q=new T.Vector3(),local=new T.Vector3();
 let adjusted=0,meshes=0;
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||!o.geometry?.attributes?.position)return;
  if(!(o.material===m.meadow||
      o.name==='Wiesen und natürlicher Talboden'))return;
  // Never grade pavement, structures, planters or car geometry. Skip all
  // unrelated meadow chunks BEFORE cloning or iterating their vertices.
  o.geometry.computeBoundingBox();
  const bounds=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
  if(bounds.max.x<p.minX-buffer||bounds.min.x>p.maxX+buffer||
     bounds.max.z<p.minZ-buffer||bounds.min.z>p.maxZ+buffer)return;
  const g=o.geometry.clone(),attr=g.attributes.position;
  const inverse=o.matrixWorld.clone().invert();let changed=0;
  for(let i=0;i<attr.count;i++){
   q.fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld);
   const dx=Math.max(p.minX-q.x,0,q.x-p.maxX);
   const dz=Math.max(p.minZ-q.z,0,q.z-p.maxZ);
   const distance=Math.hypot(dx,dz);
   let influence=distance<buffer?1-smooth(distance/buffer):0,gradeTarget=target;
   if(q.z>=19&&q.z<=28.4){
    for(let gate=0;gate<2;gate++){
     const s=parkingAccessSection(gate,q.z),d=Math.max(s.left-q.x,0,q.x-s.right);
     const accessInfluence=1-smooth(Math.min(1,d/2));
     if(accessInfluence>influence){influence=accessInfluence;
      gradeTarget=LIMO_PARK.asphaltY+(-.005-LIMO_PARK.asphaltY)*(q.z-19)/9.4-.23;}
    }
   }
   if(!influence||q.y<=gradeTarget)continue;
   // Protect the unchanged path AND its original supporting bank.
   const pathOuter=27+gardenPathShift(q.z-8)+2.75+.18-3.4;
   if(q.x<=pathOuter+.50)continue;
   const newY=q.y+(gradeTarget-q.y)*influence;
   local.set(q.x,newY,q.z).applyMatrix4(inverse);
   attr.setY(i,local.y);changed++;
  }
  // Exact excavation prevents coarse mobile terrain triangles from poking
  // through the asphalt between graded vertices. Closed paving covers the cut.
  const world=g.applyMatrix4(o.matrixWorld);
  const compoundCut=subtractGarageFootprint(world,{minX:p.minX-.19,maxX:p.maxX+.19,
   minZ:p.minZ-.19,maxZ:p.maxZ+.19});
  const accessCut=cutParkingAccesses(compoundCut,{minZ:19,maxZ:28.4,steps:64});
  world.dispose();compoundCut.dispose();
  o.geometry=accessCut.applyMatrix4(inverse);
  o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();
  meshes++;adjusted+=changed;
 });
 scene.userData.limousineParkingGrade={gradedMeshes:meshes,vertices:adjusted,
  newFootprint:{...p},oldMeadowPreserved:true,smoothBuffer:buffer};
 return scene.userData.limousineParkingGrade;
}

// Remove only vegetation at the NEW location. Regrowth at the old V106
// site is automatic because its coordinate exclusion has been discarded.
export function clearLimousineParkingVegetation(scene,m){
 const plantMats=new Set(['spruce','forestPine','trunk','pine','pine2',
 'leaf','leaf2','grassBlade','shrub','flowerRed','flowerWhite',
 'flowerGold','flowerPurple','grass','soil'].map(n=>m[n]).filter(Boolean));
 const keptMatrix=new T.Matrix4(),instWorld=new T.Matrix4();
 let removed=0;
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{
  if(!o.isInstancedMesh||!plantMats.has(o.material)||!o.count)return;
  const survivors=[],colors=[],wasColored=!!o.instanceColor;
  for(let i=0;i<o.count;i++){
   o.getMatrixAt(i,keptMatrix);instWorld.multiplyMatrices(o.matrixWorld,keptMatrix);
   const x=instWorld.elements[12],z=instWorld.elements[14];
   if(inLimousineParking(x,z,2.5)){removed++;continue;}
   survivors.push(keptMatrix.clone());
   if(wasColored){const col=new T.Color();o.getColorAt(i,col);colors.push(col);}
  }
  if(survivors.length===o.count)return;
  o.count=survivors.length;
  for(let j=0;j<survivors.length;j++){
   o.setMatrixAt(j,survivors[j]);if(wasColored)o.setColorAt(j,colors[j]);
  }
  o.instanceMatrix.needsUpdate=true;
  if(wasColored)o.instanceColor.needsUpdate=true;
  o.computeBoundingSphere();
 });
 return removed;
}

// Preserve the exact existing limousine mesh/texture, but batch its parts
// across all three cars. The original arrival limousine is not modified.
function copyParkedLimousines(root,source,positions){
 source.updateWorldMatrix(true,true);
 const inverse=source.matrixWorld.clone().invert(),yaw=new T.Quaternion()
  .setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2);
 const place=positions.map(x=>new T.Matrix4().compose(
  new T.Vector3(x,LIMO_PARK.asphaltY+.045,LIMO_PARK.carZ),
  yaw,new T.Vector3(1,1,1)));
 const groups=new Map(),unlit=new Map();
 source.traverse(o=>{
  if(!o.isMesh||!o.visible||!o.geometry||Array.isArray(o.material))return;
  let material=o.material;
  // Keep the original lamp glass and colors, remove ALL powered emissions.
  if(/Frontleuchten|Rückfahrleuchten|Bremsleuchten|Blinker/.test(material.name||'')){
   if(!unlit.has(material)){
    const off=material.clone();off.name='Ausgeschaltete '+material.name;
    if(off.emissive)off.emissive.set('#000000');
    off.emissiveIntensity=0;unlit.set(material,off);
   }
   material=unlit.get(material);
  }
  const key=o.geometry.uuid+'|'+material.uuid+'|'+o.castShadow+'|'+o.receiveShadow+'|'+o.renderOrder;
  let batch=groups.get(key);
  if(!batch){batch={geometry:o.geometry,material,matrices:[],colors:[],
   shadow:o.castShadow,receive:o.receiveShadow,order:o.renderOrder};
   groups.set(key,batch);}
  const local=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld);
  if(o.isInstancedMesh){
   const im=new T.Matrix4(),color=new T.Color();
   for(let i=0;i<o.count;i++){
    o.getMatrixAt(i,im);
    const part=new T.Matrix4().multiplyMatrices(local,im);
    for(const placement of place){
     batch.matrices.push(new T.Matrix4().multiplyMatrices(placement,part));
     batch.colors.push(o.instanceColor?(o.getColorAt(i,color),color.clone()):null);
    }
   }
  }else for(const placement of place){
   batch.matrices.push(new T.Matrix4().multiplyMatrices(placement,local));
   batch.colors.push(null);
  }
 });
 const group=new T.Group();
 group.name='Drei identische geparkte Lumina Leaf Limousinen';
 group.userData={privateLimousines:3,lightsOff:true,
  source:'Schwarze Lumina Leaf Stretchlimousine',sharedOriginalGeometry:true};
 root.add(group);
 let drawGroups=0;
 for(const batch of groups.values()){
  if(!batch.matrices.length)continue;
  const mesh=new T.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);
  mesh.name='Original-Limousinendetail – dreifach instanziert';
  mesh.userData={parkingVehicle:true,headlightsOff:true,sharedGeometry:true};
  batch.matrices.forEach((matrix,i)=>{
   mesh.setMatrixAt(i,matrix);
   if(batch.colors[i])mesh.setColorAt(i,batch.colors[i]);
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.castShadow=batch.shadow;mesh.receiveShadow=batch.receive;
  mesh.renderOrder=batch.order;
  mesh.computeBoundingSphere();
  group.add(mesh);drawGroups++;
 }
 return {group,drawGroups};
}

export function buildLimousineParking(scene,m,originalCar,createCanvas){
 const p=LIMO_PARK;
 const group=new T.Group();group.name='Privater Limousinenparkplatz – Lumina Leaf Hotel';
 // World translation + road-facing reflection relocate ALL original parts
 // together: three limousines, paving, labels, walls, guardhouse, gates and CCTV.
 // Local x=[32,68],z=[42,79] -> world x=[46,82],z=[19,-18].
 group.position.set(PARKING_SHIFT_X,0,61);
 group.scale.z=-1;
 group.userData={privateParking:true,luxuryParking:true,version:110,
  relocatedFromWrongSide:true,eastwardShiftMeters:16,gardenPathPreserved:true,
  spaceCount:3,gateCount:2,asphaltY:p.asphaltY,
  placedOnExistingLevelHotelMeadow:true,noAdditionalSceneLights:false};
 scene.add(group);
 const k=new Kit(group),y=p.asphaltY,wallHeight=1.42;
 const stone=m.stone.clone(),metal=m.frame.clone(),mark=m.roadPaint;
 stone.name='Warmer Kalkstein – Limousinenhof';stone.color.set('#e7dfcc');
 metal.name='Dunkle Bronze – Limousinenhof';metal.color.set('#40392f');
 metal.metalness=.65;metal.roughness=.4;

 // One asphalt footprint only: no overlapping top-plane or duplicated road.
 k.box(m.asphalt,(p.minX+p.maxX)/2,y-.075,(p.minZ+p.maxZ)/2,
  p.maxX-p.minX,.15,p.maxZ-p.minZ);
 // Closed, independently graded approaches, tangent to both gate and road.
 // Their road mouths stay at x53/x63, within the existing road's east end.
 for(const [index,entry] of p.entrances.entries()){
  const left=[],right=[];
  for(let j=0;j<=64;j++){
   const z=19+(28.4-19)*j/64,section=parkingAccessSection(index,z);
   left.push([section.left-PARKING_SHIFT_X,61-z]);
   right.push([section.right-PARKING_SHIFT_X,61-z]);
  }
  const contour=[...left,...right.reverse()];
  const ramp=closedParkingSurface(contour,(x,z)=>y+(-.005-y)*(42-z)/(42-32.6),m.asphalt,
   entry.label+' – geschlossener Asphaltanschluss zur bestehenden Straße');
  ramp.userData={parkingAccess:true,index,roadMouthX:PARKING_ACCESS[index].roadX,
   gateWorldX:entry.x+PARKING_SHIFT_X,closed:true};
  group.add(ramp);
 }

 // Neat three-bay white road markings. Top is 16mm above the asphalt,
 // with a matching polygon bias for low-precision smartphone depth buffers.
 const ink=mark.clone();ink.name='Parkplatzmarkierung – Limousinen';
 ink.polygonOffset=true;ink.polygonOffsetFactor=-1;ink.polygonOffsetUnits=-2;
 const stripe=(x,z,w,d)=>k.box(ink,x,y+.018,z,w,.008,d);
 for(const bx of p.bays){
  const width=p.bayWidth,z0=55.5,z1=75.7;
  stripe(bx-width/2,z0+(z1-z0)/2,.11,z1-z0);
  stripe(bx+width/2,z0+(z1-z0)/2,.11,z1-z0);
  stripe(bx,z1,width,.11);
 }
 // One shared 1024px sign material for all three asphalt inscriptions.
 const canvas=createCanvas(1024,256),ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,1024,256);ctx.fillStyle='#f7f6ef';
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 122px Arial, Helvetica, sans-serif';
 ctx.fillText('Limousine',512,130,990);
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 tex.minFilter=T.LinearMipmapLinearFilter;tex.anisotropy=4;
 const words=new T.MeshBasicMaterial({name:'Weiße Bodenaufschrift Limousine',
  map:tex,transparent:true,depthWrite:false,polygonOffset:true,
  polygonOffsetFactor:-2,polygonOffsetUnits:-3,side:T.DoubleSide});
 const wordGeo=new T.PlaneGeometry(6.6,1.65);wordGeo.rotateX(-Math.PI/2);
 const labels=new T.InstancedMesh(wordGeo,words,p.bays.length);
 const dummy=new T.Object3D();
 // Cancel the compound's reflection for undistorted glyphs, then turn 180°.
 dummy.scale.z=-1;dummy.rotation.y=Math.PI;
 p.bays.forEach((x,i)=>{dummy.position.set(x,y+.023,52.8);
  dummy.updateMatrix();labels.setMatrixAt(i,dummy.matrix);});
 labels.instanceMatrix.needsUpdate=true;labels.computeBoundingSphere();
 labels.castShadow=false;labels.userData={oppositeSideReadable:true,unmirrored:true,rotationDegrees:180};labels.name='Drei gut lesbare Limousine-Bodenaufschriften';
 group.add(labels);

 // Wall and safety fence follow the same exact segments, but stop at both gates.
 const walls=[
  {x:(p.minX+p.maxX)/2,z:p.maxZ,w:p.maxX-p.minX,d:.38,axis:'x',a:p.minX,b:p.maxX},
  {x:p.minX,z:(p.minZ+p.maxZ)/2,w:.38,d:p.maxZ-p.minZ,axis:'z',a:p.minZ,b:p.maxZ},
  {x:p.maxX,z:(p.minZ+p.maxZ)/2,w:.38,d:p.maxZ-p.minZ,axis:'z',a:p.minZ,b:p.maxZ},
  ...[[p.minX,37.68],[44.32,48.1],[53.3,57.18],[63.82,p.maxX]]
   .map(([a,b])=>({x:(a+b)/2,z:p.minZ,w:b-a,d:.38,axis:'x',a,b}))
 ];
 for(const w of walls){
  k.box(stone,w.x,y+wallHeight/2,w.z,w.w,wallHeight,w.d);
  k.box(stone,w.x,y+wallHeight+.045,w.z,w.w+.10,.09,w.d+.10);
  const fenceH=1.20,top=y+wallHeight;
  for(const t of [0.31,1.05]){
   if(w.axis==='x')k.box(metal,w.x,top+t,w.z,w.w,.055,.075);
   else k.box(metal,w.x,top+t,w.z,.075,.055,w.d);
  }
  const count=Math.max(1,Math.ceil((w.b-w.a)/2.4));
  for(let j=0;j<=count;j++){
   const v=w.a+(w.b-w.a)*j/count;
   if(w.axis==='x')k.box(metal,v,top+fenceH/2,w.z,.075,fenceH,.075);
   else k.box(metal,w.x,top+fenceH/2,v,.075,fenceH,.075);
  }
 }

 // Separate 6.64m-wide drive-in and drive-out with individual barriers.
 // The gates are the only openings in the perimeter enclosure.
 for(const [index,entry]of p.entrances.entries()){
  const gx=entry.x,front=p.minZ+.75,side=index===0?-1:1;
  const hinge=gx+side*2.98;
  k.box(stone,hinge,y+.58,front,.42,1.16,.45);
  const armMat=m.ivory.clone();armMat.name='Geschlossene Schrankenarme';
  armMat.roughness=.58;
  k.box(armMat,gx,y+1.05,front,5.9,.09,.12);
  for(let a=0;a<4;a++)k.box(m.red,gx-2.3+a*1.45,y+1.105,front+.067,.64,.045,.018);
 }

 // Substantial stone-and-glass guardhouse between the two separate gates.
 const hx=p.guardX,hz=46.2;
 const glass=m.glass.clone();glass.name='Wärterhäuschen – echtes Sicherheitsglas';
 glass.opacity=.30;glass.depthWrite=false;
 k.box(stone,hx,y+.16,hz,5.1,.32,5.1);
 k.box(m.wood,hx,y+3.3,hz,6.3,.24,6.2);
 k.box(metal,hx,y+3.45,hz,6.4,.06,6.3);
 for(const zz of [hz-2.39,hz+2.39])k.box(m.wood,hx,y+.48,zz,4.5,.32,.09);
 for(const xx of [hx-2.39,hx+2.39])k.box(m.wood,xx,y+.48,hz,.09,.32,4.5);
 for(const xx of [hx-2.4,hx+2.4])for(const zz of [hz-2.4,hz+2.4])
  k.box(m.wood,xx,y+1.85,zz,.44,2.85,.44);
 for(const xx of [hx-2.4,hx+2.4]){
  for(const zz of [hz-2.4,hz+2.4])k.box(stone,xx,y+1.83,zz,.42,3.25,.42);
 }
 for(const zz of [hz-2.36,hz+2.36]){
  for(const xx of [hx-1.1,hx+1.1])k.box(glass,xx,y+1.81,zz,1.85,2.65,.065);
 }
 for(const xx of [hx-2.36,hx+2.36]){
  for(const zz of [hz-1.1,hz+1.1])k.box(glass,xx,y+1.81,zz,.065,2.65,1.85);
 }
 // Stone-framed central entrance door, opening toward the gate lanes.
 k.box(metal,hx,y+1.36,hz-2.405,.95,2.55,.06);
 k.box(glass,hx,y+1.40,hz-2.448,.80,2.33,.025);
 k.ball(m.gold,hx+.33,y+1.35,hz-2.48,.043);
 // Security camera housings are solid, with no live feeds or render targets.
 const cameras=[
  {x:p.maxX-1.2,z:p.maxZ-1.0,tx:p.bays[0],tz:63},
  {x:p.maxX-1.2,z:p.maxZ-1.0,tx:p.bays[2],tz:63},
  {x:p.maxX-1.2,z:p.maxZ-1.0,tx:41,tz:42},
  {x:p.maxX-1.2,z:p.maxZ-1.0,tx:60.5,tz:42}
 ];
 const mastX=p.maxX-1.2,mastZ=p.maxZ-1.0;
 k.cyl(metal,mastX,y+4.1,mastZ,.16,8.2);
 k.box(metal,mastX,y+8.2,mastZ,2.3,.13,.16);
 const darkFlood=new T.MeshStandardMaterial({name:'Ausgeschaltetes Flutlicht',
  color:'#30383a',emissive:'#000000',roughness:.46});
 for(const dx of [-.70,.70])k.box(darkFlood,mastX+dx,y+8.17,mastZ+.17,.76,.38,.12);
 for(const cam of cameras){
  const rig=new T.Group();rig.position.set(cam.x,y+7.30,cam.z);
  rig.lookAt(new T.Vector3(cam.tx,y+.65,cam.tz));
  const ck=new Kit(rig);
  ck.box(metal,0,0,.35,.20,.14,.70);
  ck.box(m.black,0,0,.74,.31,.23,.42);
  ck.cyl(m.chrome,0,0,.99,.073,.11,Math.PI/2);
  ck.finish();group.add(rig);
 }
 // Both dark signs share a single material and precise typography.
 const signCanvas=createCanvas(512,128),sc=signCanvas.getContext('2d');
 sc.fillStyle='#182223';sc.fillRect(0,0,512,128);
 sc.fillStyle='#f4f0e7';sc.font='bold 55px Arial, Helvetica, sans-serif';
 sc.textAlign='center';sc.textBaseline='middle';sc.fillText('Privatgelände',256,66,486);
 const signTex=new T.CanvasTexture(signCanvas);signTex.colorSpace=T.SRGBColorSpace;
 signTex.minFilter=T.LinearMipmapLinearFilter;signTex.anisotropy=4;
 const signMat=new T.MeshBasicMaterial({name:'Privatgelände-Schilder',
  map:signTex,side:T.DoubleSide});
 for(const x of [34.95,66.1]){
  const mesh=k.mesh(new T.PlaneGeometry(3.05,.76),signMat,
   'Privatgelände – gut lesbares Hinweisschild');
  mesh.position.set(x,y+1.15,p.minZ-.217);mesh.castShadow=false;
 }
 k.finish();

 // Do this after building the static car once; geometry and artwork are shared.
 buildLuxuryParkingLandscape(scene,group,m,createCanvas,stone,metal);
 const cars=copyParkedLimousines(group,originalCar,p.bays);
 group.userData.parkedCarDrawGroups=cars.drawGroups;
 group.userData.security={fence:true,guardhouse:true,cameras:4,floodlightOn:false,
  barrierCount:2,privateSigns:2};
 return group;
}

// V110: all additions use compound-local coordinates. Existing vehicles,
// path, terrain repairs and the two gate/road mouths remain unchanged.
function buildLuxuryParkingLandscape(scene,root,m,createCanvas,stone,bronze){
 const g=new T.Group();g.name='Alpiner Limousinenhof – Pflanzung und Ausstattung';root.add(g);
 const k=new Kit(g),y=LIMO_PARK.asphaltY,hx=LIMO_PARK.guardX,hz=46.2;
 const terrain=[];scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&
  (o.material===m.meadow||o.name==='Wiesen und natürlicher Talboden'))terrain.push(o);});
 const ray=new T.Raycaster();
 const ground=(x,z)=>{ray.set(new T.Vector3(x+PARKING_SHIFT_X,50,61-z),new T.Vector3(0,-1,0));
  return ray.intersectObjects(terrain,false)[0]?.point.y??y-.1;};
 const leaf=m.leaf2.clone();leaf.name='Salbeigrüne Sträucher – Limousinenhof';leaf.color.set('#5b7042');
 const grass=m.grassBlade.clone();grass.name='Ziergras – Limousinenhof';grass.color.set('#a09962');
 const mulch=m.soil.clone();mulch.name='Pflanzbeete – Limousinenhof';mulch.color.set('#42382a');
 const lightMat=new T.MeshStandardMaterial({name:'Warmweiße Hofleuchten',color:'#ffdfac',
  emissive:'#ffc477',emissiveIntensity:1.1,roughness:.45});
 const features={beds:0,shrubs:0,grasses:0,trees:0,bollards:0};
 const shrub=(x,z)=>{const h=ground(x,z);k.ball(leaf,x,h+.40,z,.48,.42,.43);features.shrubs++;};
 const tuft=(x,z)=>{const h=ground(x,z);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;
   k.line(grass,[x,h,z],[x+Math.cos(a)*.22,h+.45+(i%2)*.12,z+Math.sin(a)*.22],.022);}
  features.grasses++;};
 const rock=(x,z)=>{const h=ground(x,z);k.ball(stone,x,h+.13,z,.35,.23,.29);};
 const bed=(contour,name)=>{const o=closedParkingSurface(contour,(x,z)=>ground(x,z)+.025,mulch,name);
  o.userData.landscapeBed=true;g.add(o);features.beds++;};
 const strip=(x0,x1,z0,z1)=>{
  bed([[x0,z0],[x1,z0],[x1,z1],[x0,z1]],'Natursteinbegleitetes Pflanzbeet');
  for(let z=z0+.6;z<z1-.3;z+=1.6){shrub((x0+x1)/2,z);tuft(x0+.22,z+.65);}
  for(let z=z0+.4;z<z1;z+=4.8)rock(x1-.16,z);
 };
 // West strip stays clear of the garden path, including its supporting bank.
 strip(30.65,31.55,46,78.5);strip(68.5,70.1,45,79.4);
 bed([[31.6,79.6],[70.1,79.6],[70.1,81.1],[31.6,81.1]],'Rückwärtiger grüner Abschluss');
 for(let x=32.3;x<70;x+=1.8){shrub(x,80.3);tuft(x+.6,80.7);}
 // Continuous raised stone edges follow the unchanged driveway contours.
 for(let lane=0;lane<2;lane++)for(const side of ['left','right']){
  const inner=[],outer=[];
  for(let j=0;j<=64;j++){const wz=19.1+8.7*j/64,section=parkingAccessSection(lane,wz);
   const x=section[side]-PARKING_SHIFT_X,sign=side==='left'?-1:1;
   inner.push([x+sign*.025,61-wz]);outer.push([x+sign*.18,61-wz]);}
  const edge=closedParkingSurface([...inner,...outer.reverse()],
   (x,z)=>y+(-.005-y)*(42-z)/9.4+.06,stone,'Natursteinrand an der Hofzufahrt');
  edge.userData.parkingDrivewayEdging=true;g.add(edge);
 }
 // Low planting in the actual free space BETWEEN the existing curved lanes.
 const left=[],right=[];
 for(let j=0;j<=24;j++){const wz=20.1+7.0*j/24,a=parkingAccessSection(0,wz),b=parkingAccessSection(1,wz);
  left.push([a.right+.35-PARKING_SHIFT_X,61-wz]);
  right.push([b.left-.35-PARKING_SHIFT_X,61-wz]);}
 bed([...left,...right.reverse()],'Niedrige Pflanzinsel zwischen Einfahrt und Ausfahrt');
 for(let wz=20.7;wz<27;wz+=1.2){const a=parkingAccessSection(0,wz),b=parkingAccessSection(1,wz);
  const x=(a.right+b.left)/2-PARKING_SHIFT_X;tuft(x,61-wz);rock(x+.18,61-wz+.38);}
 // Two compact conifers on the outer eastern flank; no trees at road mouths.
 for(const z of [56,73]){const x=69.35,h=ground(x,z);
  k.cyl(m.trunk,x,h+1.4,z,.12,2.8);
  for(let i=0;i<3;i++)k.put('cone',m.pine2,x,h+2.1+i*.72,z,1.1-i*.22,2.1,1.1-i*.22);
  features.trees++;}
 // Flush inlays remain beyond the bay edges and clear of all tyres.
 for(const x of [43.75,54.95])k.box(stone,x,y+.003,65.6,.22,.006,22);
 k.box(stone,50,y+.003,77.5,34,.006,.24);
 const bollard=(x,z,h=y)=>{k.box(bronze,x,h+.38,z,.18,.76,.18);
  k.box(lightMat,x,h+.68,z,.185,.10,.185);features.bollards++;};
 for(const x of [37.35,44.65,56.85,64.15])bollard(x,43.5);
 for(const z of [49,61,76])bollard(69.5,z,ground(69.5,z));
 for(const x of [hx-2.0,hx+2.0])k.box(lightMat,x,y+3.15,hz-1.8,.65,.035,.12);
 // Use proper, unmirrored text despite the parent z reflection.
 const sign=(title,subtitle,w,h,x,yy,z)=>{
  const mat=m.makeSign(title,{subtitle,foreground:'#d7b77d',background:'#202c28',
   width:2048,height:512,italic:false,fontScale:.33});
  const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);
  mesh.position.set(x,yy,z);mesh.rotation.y=Math.PI;mesh.scale.x=-1;
  mesh.name=title+' – Hofbeschilderung';mesh.castShadow=false;g.add(mesh);};
 sign('Lumina Leaf','LIMOUSINENSERVICE',4.8,.85,hx,y+2.75,hz-2.46);
 for(const [i,entry]of LIMO_PARK.entrances.entries()){
  sign(entry.label,'PRIVAT',2.2,.65,entry.x+(i===0?-4.15:4.15),y+1.15,41.78);
  const wz=24.2,s=parkingAccessSection(i,wz),a=PARKING_ACCESS[i];
  const t=(28.4-wz)/9.4,slope=(a.gateX-a.roadX)*6*t*(1-t)/9.4;
  const ar=new T.Group();ar.position.set(s.center-PARKING_SHIFT_X,y+.08,61-wz);
  ar.rotation.y=Math.atan(slope)+(i===0?0:Math.PI);
  const ak=new Kit(ar);ak.box(m.roadPaint,0,0,-.25,.13,.008,1.3);
  ak.line(m.roadPaint,[0,0,.65],[-.42,0,.1],.065);
  ak.line(m.roadPaint,[0,0,.65],[.42,0,.1],.065);ak.finish();g.add(ar);
 }
 k.finish();
 // Small unshadowed pools of warm light, bounded to the new compound only.
 for(const [x,z]of [[hx,43.1],[38,44],[64,44]]){const l=new T.PointLight('#ffd098',2.0,5.5,2);
  l.position.set(x,y+2.5,z);l.name='Warmes Licht am Limousinenhof';l.castShadow=false;g.add(l);}
 g.userData={luxuryParkingLandscape:true,...features,existingPathPreserved:true,
  existingGateMouthsPreserved:true,additionalShadowMaps:0};
}
