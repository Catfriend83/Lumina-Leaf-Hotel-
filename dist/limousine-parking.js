import {T,Kit,addLamp} from './core.js?v=75';
import {HOTEL_DRIVE as ROAD} from './hotel-drive-data.js?v=112';
import {gardenPathShift} from './meadow-grade.js?v=75';
import {subtractGarageFootprint} from './garage-site.js?v=104';

// V108: translate the entire compound 16 m east, preserving the garden path.
// Both approaches reconnect to the existing road without extending that road.
export const PARKING_SHIFT_X=14; // local x32 becomes world x46 (V107: x30).
export const LIMO_PARK={minX:32,maxX:74,minZ:42,maxZ:92,asphaltY:-.07,
 entrances:[{x:41.0,label:'Ausfahrt'},{x:60.5,label:'Einfahrt'}],
 bays:[60,64.5,69],bayWidth:4.3,carZ:81.4,guardX:50.7,
 bayRearZ:91.2,bayFrontZ:71.2,
 poses:[60,64.5,69].map(x=>({x,z:81.4,heading:Math.PI/2}))};
export const LIMO_PARK_WORLD={
 minX:46,maxX:88,minZ:-31,maxZ:19,
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

export const PARKING_ACCESS=[{roadX:55,gateX:55},{roadX:74.5,gateX:74.5}];
export const PARKING_ROAD_EXTENSION={minX:66.3,maxX:102,minZ:28.4,maxZ:39.7};
export const PARKING_CORNERS=[[31.15,41.15],[74.85,41.15],[31.15,92.85],[74.85,92.85]];
// Straight gate connections; a tapered 9.5 m exit flare clears the long vehicle nose.
// Widen the x span with the tangent so the actual lane never becomes narrow.
export function parkingAccessSection(index,z){
 const a=PARKING_ACCESS[index],t=Math.max(0,Math.min(1,(28.4-z)/9.4));
 const smooth=t*t*(3-2*t),slope=(a.gateX-a.roadX)*6*t*(1-t)/9.4;
 const center=a.roadX+(a.gateX-a.roadX)*smooth;
 const half=(7.2+((index===0?9.5:6.64)-7.2)*smooth)*Math.sqrt(1+slope*slope)/2;
 return {left:center-half,right:center+half,center};
}

// Watertight indexed paving solid: one top, one underside, closed skirts.
export function closedParkingSurface(contour,height,material,name,depth=.20){
 const points=contour.map(([x,z])=>new T.Vector2(x,z));
 if(T.ShapeUtils.isClockWise(points))points.reverse();
 const triangles=T.ShapeUtils.triangulateShape(points,[]),positions=[],uv=[],indices=[];
 for(const p of points){const y=height(p.x,p.y);positions.push(p.x,y,p.y,p.x,y-depth,p.y);
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
 const moves=[{from:[32,-2],to:[45.15,-10]},{from:[30.4,6],to:[45.15,6]},
  {from:[44.7,-18],to:[45.15,-31.85],baseY:-.18}];
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
    world.elements[13]+=(move.baseY??LIMO_PARK.asphaltY)-baseY;
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
export function parkingGradedArea(x,z){
 if(x<31||x>118||z< -44||z>57)return false;
 const dx=Math.max(43-x,0,x-106),dz=Math.max(-32-z,0,z-45);
 const pathOuter=27+gardenPathShift(z-8)+2.75+.18-3.4;
 return Math.hypot(dx,dz)<12&&x>pathOuter+.50;
}
export function prepareLimousineParkingTerrain(scene,m,meadowController=null){
 // Camera-dependent botany must not regenerate at the old hillside height.
 meadowController?.excludeArea?.(parkingGradedArea);
 const p=LIMO_PARK_WORLD,buffer=12;
 const grade={minX:43,maxX:106,minZ:-32,maxZ:45};
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
  if(bounds.max.x<grade.minX-buffer||bounds.min.x>grade.maxX+buffer||
     bounds.max.z<grade.minZ-buffer||bounds.min.z>grade.maxZ+buffer)return;
  const g=o.geometry.clone(),attr=g.attributes.position;
  const inverse=o.matrixWorld.clone().invert();let changed=0;
  for(let i=0;i<attr.count;i++){
   q.fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld);
   const dx=Math.max(grade.minX-q.x,0,q.x-grade.maxX);
   const dz=Math.max(grade.minZ-q.z,0,q.z-grade.maxZ);
   const distance=Math.hypot(dx,dz);
   const influence=distance<buffer?1-smooth(distance/buffer):0;
   if(!influence)continue;
   // A common lawn level also prevents coarse terrain triangles from
   // sagging at bed corners. Exact cuts below remove all paving footprints.
   const gradeTarget=-.18;
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
  const roadCut=subtractGarageFootprint(accessCut,{minX:66.3,maxX:102,minZ:26.3,maxZ:42.2});
  accessCut.dispose();o.geometry=roadCut.applyMatrix4(inverse);
  o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();
  meshes++;adjusted+=changed;
 });
 scene.userData.limousineParkingGrade={gradedMeshes:meshes,vertices:adjusted,
  newFootprint:{...p},flatSurroundings:grade,smoothBuffer:buffer};
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
  if(!o.isInstancedMesh||(!plantMats.has(o.material)&&!/Alpiner Mischwald/.test(o.material?.name||''))||!o.count)return;
  const survivors=[],colors=[],wasColored=!!o.instanceColor;
  for(let i=0;i<o.count;i++){
   o.getMatrixAt(i,keptMatrix);instWorld.multiplyMatrices(o.matrixWorld,keptMatrix);
   const x=instWorld.elements[12],z=instWorld.elements[14];
   if(inLimousineParking(x,z,2.5)||parkingGradedArea(x,z)){removed++;continue;}
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
 const inverse=source.matrixWorld.clone().invert();
 const place=positions.map(pose=>new T.Matrix4().compose(
  new T.Vector3(pose.x,LIMO_PARK.asphaltY+.045,pose.z),
  new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),pose.heading-Math.PI),new T.Vector3(1,1,1)));
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
 group.userData={privateParking:true,luxuryParking:true,version:114,
  relocatedFromWrongSide:true,eastwardShiftMeters:16,southernGardenPathPreserved:true,
  spaceCount:3,gateCount:2,asphaltY:p.asphaltY,
  placedOnExistingLevelHotelMeadow:true,noAdditionalSceneLights:false};
 scene.add(group);
 const k=new Kit(group),y=p.asphaltY,wallHeight=1.42;
 const stone=m.stone.clone(),metal=m.frame.clone(),mark=m.roadPaint;
 stone.name='Warmer Kalkstein – Limousinenhof';stone.color.set('#b9b3a5');
 metal.name='Dunkle Bronze – Limousinenhof';metal.color.set('#202625');
 metal.metalness=.65;metal.roughness=.4;
 const stoneBoxes=new Map(),stoneBox=(x,yy,z,w,h,d)=>{
  const key=[w,h,d].join(','),geo=stoneBoxes.get(key)||new T.BoxGeometry(w,h,d);
  if(!stoneBoxes.has(key)){const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
   for(let i=0;i<p.count;i++){const a=Math.abs(n.getY(i))>.5?[p.getX(i),p.getZ(i)]:Math.abs(n.getX(i))>.5?[p.getZ(i),p.getY(i)]:[p.getX(i),p.getY(i)];uv.setXY(i,a[0]/1.5,a[1]/1.5);}stoneBoxes.set(key,geo);}
  k.put(geo,stone,x,yy,z);
 };

 // One asphalt footprint only: no overlapping top-plane or duplicated road.
 k.box(m.asphalt,(p.minX+p.maxX)/2,y-.075,(p.minZ+p.maxZ)/2,
  p.maxX-p.minX,.15,p.maxZ-p.minZ);
 // Closed, independently graded approaches, tangent to both gate and road.
 // Their road mouths are x55/x74.5; the second joins the extended road.
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
 const ink=new T.MeshBasicMaterial({name:'Durchgezogene weiße Limousinen-Stellplatzlinien',color:'#f3f1e7',transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
 // Derivative-smoothed paint keeps a thin continuous line visible on phones,
 // rather than letting a subpixel-width box break into isolated white dots.
 ink.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 vPaintUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vPaintUV=uv;');
  shader.fragmentShader='varying vec2 vPaintUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float paintPixel=max(fwidth(vPaintUV.x),0.0001);
   float paintHalf=max(0.1,0.65*paintPixel);
   diffuseColor.a*=1.0-smoothstep(paintHalf-0.55*paintPixel,paintHalf+0.55*paintPixel,abs(vPaintUV.x-0.5));
   #include <opaque_fragment>`);
 };
 ink.customProgramCacheKey=()=> 'continuous-limousine-paint-v114';
 const paintPlane=new T.PlaneGeometry(1,1);paintPlane.rotateX(-Math.PI/2);
 const stripe=(x,z,length,angle=0)=>k.put(paintPlane,ink,x,y+.022,z,.45,1,length,0,angle);
 // A single calm row along the rear edge, with continuous 9 cm paint.
 // No corner dots, dashed bays or decorative inlays remain.
 for(const pose of p.poses){
  const width=p.bayWidth,length=p.bayRearZ-p.bayFrontZ,z=(p.bayRearZ+p.bayFrontZ)/2;
  stripe(pose.x-width/2,z,length);
  stripe(pose.x+width/2,z,length);
  stripe(pose.x,p.bayRearZ,width,Math.PI/2);
  stripe(pose.x,p.bayFrontZ,width,Math.PI/2);
 }
 group.userData.markings={solid:true,style:'continuous rectangular bays',physicalWidth:.09,parts:12,subpixelAntialiasing:true};
 // One shared 1024px sign material for all three asphalt inscriptions.
 const canvas=createCanvas(1024,256),ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,1024,256);ctx.fillStyle='#f7f6ef';
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 122px Arial, Helvetica, sans-serif';
 ctx.fillText('LIMOUSINE',512,130,990);
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 tex.minFilter=T.LinearMipmapLinearFilter;tex.anisotropy=4;
 const words=new T.MeshBasicMaterial({name:'Weiße Bodenaufschrift Limousine',
  map:tex,transparent:true,depthWrite:false,polygonOffset:true,
  polygonOffsetFactor:-2,polygonOffsetUnits:-3,side:T.DoubleSide});
 const wordGeo=new T.PlaneGeometry(3.5,.875);wordGeo.rotateX(-Math.PI/2);
 const labels=new T.InstancedMesh(wordGeo,words,p.bays.length);
 const dummy=new T.Object3D();
 // Cancel the parent reflection: world text-right is +X; text-top is -Z.
 // Thus L is on the left for a reader at the road/guardhouse facing the bays.
 dummy.scale.z=-1;
 p.poses.forEach((pose,i)=>{dummy.rotation.y=pose.heading-Math.PI/2;
  dummy.position.set(pose.x-Math.cos(pose.heading)*9.9,y+.023,p.bayFrontZ+.65);
  dummy.updateMatrix();labels.setMatrixAt(i,dummy.matrix);});
 labels.instanceMatrix.needsUpdate=true;labels.computeBoundingSphere();
 labels.castShadow=false;labels.userData={text:'LIMOUSINE',oppositeSideReadable:true,unmirrored:true,rotationDegrees:0,readFrom:'open front of every berth'};labels.name='Drei gut lesbare Limousine-Bodenaufschriften';
 group.add(labels);

 // Wall and safety fence follow the same exact segments, but stop at both gates.
 const walls=[
  {x:(p.minX+p.maxX)/2,z:p.maxZ,w:p.maxX-p.minX,d:.38,axis:'x',a:p.minX,b:p.maxX},
  {x:p.minX,z:(p.minZ+p.maxZ)/2,w:.38,d:p.maxZ-p.minZ,axis:'z',a:p.minZ,b:p.maxZ},
  {x:p.maxX,z:(p.minZ+p.maxZ)/2,w:.38,d:p.maxZ-p.minZ,axis:'z',a:p.minZ,b:p.maxZ},
  ...[[p.minX,36.25],[45.75,48.1],[53.3,57.18],[63.82,p.maxX]]
   .map(([a,b])=>({x:(a+b)/2,z:p.minZ,w:b-a,d:.38,axis:'x',a,b}))
 ];
 for(const w of walls){
  stoneBox(w.x,y+wallHeight/2,w.z,w.w,wallHeight,w.d);
  stoneBox(w.x,y+wallHeight+.045,w.z,w.w+.10,.09,w.d+.10);
  const fenceH=1.20,top=y+wallHeight;
  for(const t of [0.31,1.05]){
   if(w.axis==='x')k.box(metal,w.x,top+t,w.z,w.w,.055,.075);
   else k.box(metal,w.x,top+t,w.z,.075,.055,w.d);
  }
  const count=Math.max(1,Math.ceil((w.b-w.a)/2.4));
  for(let j=0;j<=count;j++){
   const v=w.a+(w.b-w.a)*j/count;
   if(j%3===0||j===count){const xx=w.axis==='x'?v:w.x,zz=w.axis==='x'?w.z:v;
    stoneBox(xx,y+.86,zz,.48,1.72,.48);k.box(metal,xx,y+1.75,zz,.54,.07,.54);}
   if(w.axis==='x')k.box(metal,v,top+fenceH/2,w.z,.075,fenceH,.075);
   else k.box(metal,w.x,top+fenceH/2,v,.075,fenceH,.075);
  }
 }

 // Preserve gate centres; flare the exit inside the court for the long vehicle nose.
 // The gates are the only openings in the perimeter enclosure.
 for(const [index,entry]of p.entrances.entries()){
  const gx=entry.x,front=p.minZ+.75,side=index===0?-1:1;
  const hinge=gx+side*(index===0?4.75:2.98);
  stoneBox(hinge,y+.58,front,.42,1.16,.45);
  const armMat=m.ivory.clone();armMat.name='Geschlossene Schrankenarme';
  armMat.roughness=.58;
  k.box(armMat,gx,y+1.05,front,index===0?9.5:5.9,.09,.12);
  for(let a=0;a<4;a++)k.box(m.red,gx+(index===0?-3.7+a*2.4:-2.3+a*1.45),y+1.105,front+.067,.64,.045,.018);
 }

 // Substantial stone-and-glass guardhouse between the two separate gates.
 const hx=p.guardX,hz=42.0;
 const glass=m.glass.clone();glass.name='Wärterhäuschen – echtes Sicherheitsglas';
 glass.opacity=.18;glass.depthWrite=false;glass.color.set('#e5ddd0');glass.roughness=.12;glass.envMapIntensity=.4;
 stoneBox(hx,y+.16,hz,5.2,.32,5.1);
 k.box(metal,hx,y+3.3,hz,6.3,.24,6.2);
 k.box(metal,hx,y+3.45,hz,6.4,.06,6.3);
 stoneBox(hx,y+.48,hz+2.39,4.5,.32,.09);
 for(const dx of [-1.5,1.5])stoneBox(hx+dx,y+.48,hz-2.39,1.55,.32,.09);
 for(const xx of [hx-2.39,hx+2.39])stoneBox(xx,y+.48,hz,.09,.32,4.5);
 for(const xx of [hx-2.4,hx+2.4])for(const zz of [hz-2.4,hz+2.4])
  k.box(metal,xx,y+1.85,zz,.44,2.85,.44);
 for(const xx of [hx-2.4,hx+2.4]){
  for(const zz of [hz-2.4,hz+2.4])stoneBox(xx,y+1.83,zz,.42,3.25,.42);
 }
 // Front glazing leaves a genuine door opening; no glass or timber crosses it.
 for(const dx of [-1.5,1.5])k.box(glass,hx+dx,y+1.66,hz-2.36,1.55,2.05,.065);
 for(const dx of [-1.1,1.1])k.box(glass,hx+dx,y+1.81,hz+2.36,2.20,2.65,.065);
 for(const xx of [hx-2.36,hx+2.36])for(const zz of [hz-1.1,hz+1.1])
  k.box(glass,xx,y+1.81,zz,.065,2.65,2.20);
 // Continuous mullions and sill/head rails seal each pane to its neighbours.
 for(const side of [-1,1]){
  k.box(metal,hx+side*2.36,y+1.81,hz,.14,2.7,.16);
  for(const yy of [y+.46,y+3.145])k.box(metal,hx+side*2.36,yy,hz,.14,.10,4.8);
  k.box(metal,hx+side*.66,y+1.66,hz-2.36,.16,2.15,.14);
  stoneBox(hx+side*2.60,y+1.40,hz,.42,2.80,.50);
  k.box(metal,hx+side*2.36,y+1.95,hz,.14,1.7,.18);
 }
 k.box(metal,hx,y+1.81,hz+2.36,.14,2.7,.14);
 for(const yy of [y+.46,y+3.145])k.box(metal,hx,yy,hz+2.36,4.8,.10,.14);
 group.userData.glazing={sealedSides:2,paneGap:0,fenceFrameConnection:'stone pier with overlapping metal flange',functionalDoor:true};
 k.box(metal,hx,y+2.90,hz-2.36,4.80,.70,.14);
 const floor=y+.32,doorZ=hz-2.405;
 for(const dx of [-.55,.55])k.box(metal,hx+dx,floor+1.1,doorZ,.085,2.2,.08);
 k.box(metal,hx,floor+2.23,doorZ,1.18,.08,.08);
 k.box(glass,hx,floor+1.08,doorZ-.043,.98,2.12,.025);
 k.ball(m.gold,hx+.37,floor+1.08,doorZ-.065,.035);
 // A smaller counterpart of the hotel's actual marble reception counter.
 const office=new T.Group();office.name='Limousinenservice – Empfangstresen';office.userData={guardhouseOffice:true,
  receptionCounter:true,furniture:['Empfangstresen','Servicestuhl','Monitor','Tastatur','Arbeitsleuchte'],entranceAisle:1.3};group.add(office);
 const ok=new Kit(office),deskZ=hz+.65;
 const marble=(scene.getObjectByName('Empfang')?.material||m.stone).clone();
 marble.name='Dunkler Rezeptionsmarmor – Limousinenservice';marble.color.set('#142d24');
 ok.box(marble,hx,floor+.59,deskZ,2.5,1.02,.90);
 ok.box(m.gold,hx,floor+.105,deskZ,2.52,.08,.92);
 ok.box(m.ivory,hx,floor+1.14,deskZ,2.65,.08,1.05);
 for(const dx of [-1.21,1.21])ok.box(m.gold,hx+dx,floor+.62,deskZ-.46,.025,.88,.025);
 ok.box(m.black,hx,floor+1.205,deskZ-.18,.60,.035,.22);
 ok.box(metal,hx,floor+1.20,deskZ+.13,.38,.05,.22);
 ok.box(metal,hx,floor+1.37,deskZ+.13,.07,.32,.06);
 ok.box(m.black,hx,floor+1.65,deskZ+.13,.90,.52,.075);
 const screen=new T.MeshStandardMaterial({name:'Servicemonitor – ruhige Anzeige',color:'#416374',emissive:'#29434e',emissiveIntensity:.35});
 ok.box(screen,hx,floor+1.65,deskZ+.174,.82,.44,.008);
 ok.box(m.black,hx+.89,floor+1.24,deskZ+.14,.23,.12,.28);
 ok.cyl(m.gold,hx-.88,floor+1.35,deskZ+.10,.024,.34);
 ok.box(m.gold,hx-.88,floor+1.54,deskZ+.04,.34,.06,.20);
 const plate=createCanvas(1536,768),pc=plate.getContext('2d');
 pc.fillStyle='#10251f';pc.fillRect(0,0,1536,768);pc.fillStyle='#d8b873';pc.textAlign='center';pc.textBaseline='middle';
 for(const [text,size,yy]of [['Lumina Leaf Hotel',116,200],['★★★★★',130,390],['Limousinenservice',96,575]]){
  pc.font=`${size}px Georgia, serif`;pc.fillText(text,768,yy,1410);
 }
 const brandingTex=new T.CanvasTexture(plate);brandingTex.colorSpace=T.SRGBColorSpace;brandingTex.anisotropy=4;
 const branding=new T.Mesh(new T.PlaneGeometry(2.10,.77),new T.MeshBasicMaterial({map:brandingTex}));
 branding.name='Empfangstresen – goldene dreizeilige Hotelbeschriftung';branding.position.set(hx,floor+.62,deskZ-.461);
 branding.rotation.y=Math.PI;branding.scale.x=-1;branding.userData={lines:['Lumina Leaf Hotel','★★★★★','Limousinenservice'],centered:true,stars:5};office.add(branding);
 const chairZ=hz+1.65;
 ok.box(m.black,hx,floor+.48,chairZ,.65,.12,.63);
 ok.box(m.black,hx,floor+.88,chairZ+.28,.65,.70,.10);
 ok.cyl(metal,hx,floor+.23,chairZ,.055,.40);
 for(let j=0;j<5;j++){const a=j*Math.PI*2/5;
  ok.line(metal,[hx,floor+.08,chairZ],[hx+Math.cos(a)*.37,floor+.08,chairZ+Math.sin(a)*.37],.025);
  ok.ball(m.black,hx+Math.cos(a)*.37,floor+.045,chairZ+Math.sin(a)*.37,.055,.045,.055);
 }
 ok.finish();
 const camera=new T.Group();camera.name='Security-Kamera oben rechts am Eingang';
 camera.position.set(hx+1.9,y+2.98,hz-1.85);
 camera.lookAt(new T.Vector3(hx,y+1.15,hz-3.5));
 camera.userData={guardhouseSecurityCamera:true,position:'ceiling-upper-right-at-entry'};
 const ck=new Kit(camera);ck.box(metal,0,.10,0,.12,.20,.12);
 ck.box(m.ivory,0,0,.14,.24,.16,.38);ck.cyl(m.black,0,0,.35,.055,.04,Math.PI/2);
 ck.finish();group.add(camera);
 // Security camera housings are solid, with no live feeds or render targets.
 const cameras=[
  {x:p.maxX-1.2,z:p.maxZ-1.0,tx:p.bays[0],tz:63},
  {x:p.maxX-1.2,z:p.maxZ-1.0,tx:p.bays[2],tz:63},
  {x:p.maxX-1.2,z:p.maxZ-1.0,tx:41,tz:42},
  {x:p.maxX-1.2,z:p.maxZ-1.0,tx:60.5,tz:42}
 ];
 const mastX=p.maxX-1.2,mastZ=p.maxZ-1.0;
 k.cyl(metal,mastX,y+1.8,mastZ,.07,3.6);
 k.box(metal,mastX,y+3.6,mastZ,1.2,.08,.10);
 for(const cam of cameras){
  const rig=new T.Group();rig.position.set(cam.x,y+3.25,cam.z);
  rig.lookAt(new T.Vector3(cam.tx,y+.65,cam.tz));
  const ck=new Kit(rig);
  ck.box(metal,0,0,.35,.20,.14,.70);
  ck.box(m.black,0,0,.74,.31,.23,.42);
  ck.cyl(m.chrome,0,0,.99,.073,.11,Math.PI/2);
  ck.finish();group.add(rig);
 }
 k.finish();

 // Do this after building the static car once; geometry and artwork are shared.
 buildParkingRoadExtension(scene,m);
 buildLuxuryParkingLandscape(scene,group,m,createCanvas,stone,metal);
 const cars=copyParkedLimousines(group,originalCar,p.poses);
 group.userData.parkedCarDrawGroups=cars.drawGroups;
 group.userData.maneuvering={rearAxleRadius:13,wheelbase:11.2,vehicleLength:16.9,oneWay:true,parallelRearRow:true,headingDegrees:90,clearAisle:{minX:46.3,maxX:87.7,minZ:-10.2,maxZ:15.7},bayDimensions:[4.3,20]};
 group.userData.security={fence:true,guardhouse:true,cameras:5,floodlightOn:false,
  barrierCount:2,privateSigns:2};
 return group;
}

// V110: all additions use compound-local coordinates. Existing vehicles,
// path, terrain repairs and the two gate/road mouths remain unchanged.
function buildLuxuryParkingLandscape(scene,root,m,createCanvas,stone,bronze){
 const g=new T.Group();g.name='Alpiner Limousinenhof – Pflanzung und Ausstattung';root.add(g);
 const k=new Kit(g),y=LIMO_PARK.asphaltY,hx=LIMO_PARK.guardX,hz=42.0;
 const terrain=[];scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&
  (o.material===m.meadow||o.name==='Wiesen und natürlicher Talboden'))terrain.push(o);});
 const ray=new T.Raycaster();
 const ground=(x,z)=>{ray.set(new T.Vector3(x+PARKING_SHIFT_X,50,61-z),new T.Vector3(0,-1,0));
  return ray.intersectObjects(terrain,false)[0]?.point.y??-.18;};
 const leaf=m.leaf2.clone();leaf.name='Salbeigrüne Sträucher – Limousinenhof';leaf.color.set('#5b7042');
 const mulch=m.soil.clone();mulch.name='Pflanzbeete – Limousinenhof';mulch.color.set('#42382a');
 const lightMat=new T.MeshStandardMaterial({name:'Warmweiße Hofleuchten',color:'#ffdfac',
  emissive:'#ffc477',emissiveIntensity:1.1,roughness:.45});
 const features={beds:0,shrubs:0,grasses:0,trees:0,bollards:0};
 const shrub=(x,z)=>{const h=-.155;k.ball(leaf,x,h+.40,z,.48,.42,.43);features.shrubs++;};
 const bed=(contour,name)=>{const o=closedParkingSurface(contour,()=>-.155,mulch,name);
  o.userData.landscapeBed=true;g.add(o);features.beds++;};
 const rectangle=(x0,x1,z0,z1,horizontal=false)=>{
  bed([[x0,z0],[x1,z0],[x1,z1],[x0,z1]],'Geordnetes Pflanzbeet mit freier Lampenecke');
  const length=horizontal?x1-x0:z1-z0,count=Math.max(1,Math.floor(length/1.7));
  for(let i=0;i<count;i++){
   const t=(i+.5)/count,x=horizontal?x0+t*length:(x0+x1)/2,
    z=horizontal?(z0+z1)/2:z0+t*length;
   shrub(x,z);
   for(const offset of [-.40,.40]){const xx=x+(horizontal?0:offset),zz=z+(horizontal?offset:0);
    k.ball(leaf,xx,-.155+.16,zz,.22,.17,.22);
    for(let f=0;f<3;f++){const a=f*Math.PI*2/3;
     k.ball(f%2?m.flowerWhite:m.flowerPurple,xx+Math.cos(a)*.12,.12,zz+Math.sin(a)*.12,.105,.075,.105);}
   }
  }
 };
 // Identical 1.2 m beds terminate 0.95 m short of each lamp centre.
 rectangle(30.55,31.75,42.1,91.9);rectangle(74.25,75.45,42.1,91.9);
 rectangle(32.1,73.9,92.25,93.45,true);
 for(const [a,b]of [[32.1,35.9],[46.1,47.7],[53.7,56.5],[65.0,73.9]])
  rectangle(a,b,40.55,41.75,true);
 // Reuse the original west/rear lantern; add the same fixture in the other
 // three corners. All four centres have exactly 0.85 m offsets from the wall.
 PARKING_CORNERS.forEach(([x,z],i)=>{
  const h=-.18;
  k.box(stone,x,h-.11,z,.42,.22,.42);
  if(i!==2)addLamp(k,m,x,h,z,2.05);
  const marker=new T.Object3D();marker.name='Mittige Ecklaterne '+(i+1);
  marker.position.set(x,h,z);marker.userData={parkingCornerLamp:true,corner:i,wallOffset:.85};g.add(marker);
 });
 features.cornerLamps=4;
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
 // Two planted strips frame an unobstructed, straight guardhouse approach.
 const carpetHalf=.75,clearance=.22;
 const insetAt=wz=>{const t=Math.max(0,Math.min(1,(wz-21.8)/.8));
  return 3+(carpetHalf+clearance-3)*t*t*(3-2*t);};
 for(const side of [-1,1]){
  const inner=[],outer=[];
  for(let j=0;j<=24;j++){
   const wz=20.7+4.8*j/24,a=parkingAccessSection(0,wz),b=parkingAccessSection(1,wz);
   const inset=insetAt(wz);
   inner.push([hx+side*inset,61-wz]);
   outer.push([(side<0?a.right+.35:b.left-.35)-PARKING_SHIFT_X,61-wz]);
  }
  bed([...inner,...outer.reverse()],'Seitliches Beet am roten Teppich');
  for(let wz=21;wz<25.4;wz+=1.7){const a=parkingAccessSection(0,wz),b=parkingAccessSection(1,wz);
   const edge=(side<0?a.right+.35:b.left-.35)-PARKING_SHIFT_X;
   shrub((hx+side*insetAt(wz)+edge)/2,61-wz);
  }
 }
 const z0=32.9,z1=hz-2.55,approachTop=(x,z)=>{
  const wz=61-z,t=Math.max(0,Math.min(1,(wz-(61-z1))/(26.3-(61-z1))));
  return (y+.323)*(1-t)+.108*t;
 };
 const carpetGroup=new T.Group();carpetGroup.name='Roter Teppich direkt zum Wärterbüro';
 carpetGroup.userData={guardhouseCarpet:true,width:1.5,clearApproach:true};g.add(carpetGroup);
 for(const [a,b]of [[z0,34.7],[34.7,z1]]){
  const contour=[[hx-carpetHalf,a],[hx+carpetHalf,a],[hx+carpetHalf,b],[hx-carpetHalf,b]];
  const base=closedParkingSurface(contour,(x,z)=>approachTop(x,z)-.012,stone,
   'Geschlossene Rampe direkt zum Wärterhäuschen',.65);g.add(base);
  carpetGroup.add(closedParkingSurface(contour,approachTop,m.carpet,'Roter Teppich – bündiger Abschnitt',.012));
 }
 // Two compact conifers on the outer eastern flank; no trees at road mouths.
 for(const z of [57,75]){const x=75.35,h=ground(x,z);
  k.cyl(m.trunk,x,h+1.4,z,.12,2.8);
  for(let i=0;i<3;i++)k.put('cone',m.pine2,x,h+2.1+i*.72,z,1.1-i*.22,2.1,1.1-i*.22);
  features.trees++;}
 const bollard=(x,z,h=y)=>{k.box(bronze,x,h+.38,z,.18,.76,.18);
  k.box(lightMat,x,h+.68,z,.185,.10,.185);features.bollards++;};
 for(const x of [35.95,46.05,56.85,64.15])bollard(x,43.5);

 for(const x of [hx-2.0,hx+2.0])k.box(lightMat,x,y+3.15,hz-1.8,.65,.035,.12);
 for(const x of [hx-1,hx+1])k.box(lightMat,x,y+3.14,hz,.60,.03,1.0);
 // Use proper, unmirrored text despite the parent z reflection.
 const sign=(title,subtitle,w,h,x,yy,z)=>{
  const c=createCanvas(2048,512),ctx=c.getContext('2d');ctx.fillStyle='#111615';ctx.fillRect(0,0,2048,512);
  ctx.strokeStyle='#ba9b61';ctx.lineWidth=7;ctx.strokeRect(24,24,2000,464);ctx.fillStyle='#dfc28a';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 150px Georgia, serif';ctx.fillText(title,1024,195,1880);
  ctx.font='94px Arial, sans-serif';ctx.fillText(subtitle,1024,375,1880);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;
  const mat=new T.MeshBasicMaterial({map:t});
  const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);
  mesh.position.set(x,yy,z);mesh.rotation.y=Math.PI;mesh.scale.x=-1;
  mesh.name=title+' – Hofbeschilderung';mesh.castShadow=false;g.add(mesh);};
 sign('Lumina Leaf Hotel','Limousinenservice',4.8,.70,hx,y+2.90,hz-2.46);
 for(const [i,entry]of LIMO_PARK.entrances.entries()){
  sign(entry.label,'Privatgelände',3.75,.85,i===0?34.125:65.91,y+.90,41.78);
  const wz=24.2,s=parkingAccessSection(i,wz),a=PARKING_ACCESS[i];
  const t=(28.4-wz)/9.4,slope=(a.gateX-a.roadX)*6*t*(1-t)/9.4;
  const ar=new T.Group();ar.position.set(s.center-PARKING_SHIFT_X,y+.08,61-wz);
  ar.rotation.y=Math.atan(slope)+(i===1?0:Math.PI);
  ar.name=entry.label+' – Fahrtrichtung';ar.userData={parkingDirection:entry.label,index:i};
  const ak=new Kit(ar);ak.box(m.roadPaint,0,0,-.25,.13,.008,1.3);
  ak.line(m.roadPaint,[0,0,.65],[-.42,0,.1],.065);
  ak.line(m.roadPaint,[0,0,.65],[.42,0,.1],.065);ak.finish();g.add(ar);
 }
 k.finish();
 // Small unshadowed pools of warm light, bounded to the new compound only.
 for(const [x,z]of [[hx,43.1],[38,44],[64,44]]){const l=new T.PointLight('#ffd098',x===hx?6:2.0,5.5,2);
  l.position.set(x,y+2.5,z);l.name='Warmes Licht am Limousinenhof';l.castShadow=false;g.add(l);}
 g.userData={luxuryParkingLandscape:true,...features,existingPathPreserved:true,
  straightRoadConnections:true,additionalShadowMaps:0};
}

// Extend the road at its existing tangent; replace only the last 20 cm of
// the old surface so the new top has a butt joint, without coplanar overlap.
function buildParkingRoadExtension(scene,m){
 const e=PARKING_ROAD_EXTENSION;
 const cut={minX:e.minX,maxX:102.01,minZ:28.4,maxZ:42.21};
 const replacements=[];scene.updateMatrixWorld(true);
 scene.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||!o.geometry?.attributes?.position)return;
  if(!(o.userData.hotelRoad||o.userData.hotelDriveCurb||o.userData.hotelDriveWalk||
    o.name==='Geschlossene Straßenrandanschlüsse bis ins Gelände'))return;
  const world=o.geometry.clone().applyMatrix4(o.matrixWorld);
  let trimmed=subtractGarageFootprint(world,cut);world.dispose();
  if(!o.userData.hotelRoad){
   const opened=subtractGarageFootprint(trimmed,{minX:51.4,maxX:58.6,minZ:28.4,maxZ:34});
   trimmed.dispose();trimmed=opened;
  }
  replacements.push([o,trimmed.applyMatrix4(o.matrixWorld.clone().invert())]);
 });
 for(const [o,g]of replacements){o.geometry=g;g.computeVertexNormals();g.computeBoundingSphere();}
 const root=new T.Group();root.name='Östliche Hauptstraßenverlängerung am Limousinenhof';scene.add(root);
 const k=new Kit(root),rect=(x0,x1,z0,z1,h,mat,name)=>{
  const o=closedParkingSurface([[x0,z0],[x1,z0],[x1,z1],[x0,z1]],()=>h,mat,name,h>0?.50:.20);
  o.userData.parkingRoadExtension=true;root.add(o);return o;
 };
 // The existing main road curves away here: its true north edge is near
 // z30, not z28.4. Fill only the missing apron up to that exact polygon edge.
 const northAt=x=>{const zs=[];for(const poly of ROAD.road.polygons){const r=poly.outer;
  for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];
   if((a[0]<=x&&b[0]>=x)||(b[0]<=x&&a[0]>=x)){
    if(Math.abs(a[0]-b[0])>1e-9)zs.push(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));
   }
  }}return Math.min(...zs);};
 const edge=[[51.4,northAt(51.4)],...ROAD.road.polygons.flatMap(p=>p.outer)
  .filter(v=>v[0]>51.4&&v[0]<58.6&&v[1]<34),[58.6,northAt(58.6)]]
  .sort((a,b)=>b[0]-a[0]);
 const apron=closedParkingSurface([[51.4,28.4],[58.6,28.4],...edge],()=>-.005,m.asphalt,
  'Bündiger Einfahrtsanschluss bis an die echte Hauptstraßenkante');
 apron.userData.parkingRoadExtension=true;root.add(apron);
 rect(e.minX,e.maxX,28.4,39.7,-.005,m.asphalt,'Nahtlose gerade Verlängerung der Hauptstraße');
 rect(e.minX,e.maxX,39.7,40,.12,m.ivory,'Fortgeführter äußerer Straßenbordstein');
 rect(e.minX,e.maxX,40,42.2,.12,m.cobbles,'Fortgeführter Gehweg an der Hauptstraße');
 // North curb continues the existing garden curb, but stops at the exit.
 const exit=parkingAccessSection(1,28.4);
 for(const [a,b]of [[66.5,exit.left],[exit.right,e.maxX]])
  rect(a,b,28.1,28.4,.12,m.ivory,'Bordstein mit freier Ausfahrt');
 for(let x=69;x<100;x+=6)k.box(m.roadPaint,x,.003,33.9,3,.006,.12);
 k.finish();root.userData={parkingRoadExtension:true,length:35.5,endX:102,
  straightAccesses:2,roadY:-.005,roadWidth:11.3};
}
