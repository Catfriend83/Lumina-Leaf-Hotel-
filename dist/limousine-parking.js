import {T,Kit} from './core.js?v=75';

// V107: Shift the already complete V106 parking lot to the HOTEL SIDE where
// the three documented pines stand: (35,16), (35,4), (37,-10).
// Keep all of its parts/materials/vehicle meshes unchanged. The old V106
// position (x32..68,z42..79) becomes ordinary original meadow again.
// The original builder below uses local V106 parking coordinates; a single
// group transform reuses the same architecture, with its frontage now facing
// the hotel's existing road at z≈28.4. The world footprint is authoritative
// for all vegetation removal and terrain grading.
export const LIMO_PARK={minX:32,maxX:68,minZ:42,maxZ:79,asphaltY:-.07,
 entrances:[{x:41.0,label:'Einfahrt'},{x:60.5,label:'Ausfahrt'}],
 bays:[38.8,50,61.2],carZ:65.9,guardX:50.7};
export const LIMO_PARK_WORLD={
 minX:30,maxX:66,minZ:-18,maxZ:19,
 roadZ:28.4,trees:[[35,16],[35,4],[37,-10]]
};
export function inLimousineParking(x,z,padding=0){
 const p=LIMO_PARK_WORLD;
 return x>=p.minX-padding&&x<=p.maxX+padding&&
        z>=p.minZ-padding&&z<=p.maxZ+padding;
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
 // Old x=[32,68],z=[42,79] -> new x=[30,66],z=[19,-18].
 group.position.set(-2,0,61);
 group.scale.z=-1;
 group.userData={privateParking:true,luxuryParking:true,version:107,
  relocatedFromWrongSide:true,threeOriginalTreesCleared:true,
  spaceCount:3,gateCount:2,asphaltY:p.asphaltY,
  placedOnExistingLevelHotelMeadow:true,noAdditionalSceneLights:true};
 scene.add(group);
 const k=new Kit(group),y=p.asphaltY,wallHeight=1.42;
 const stone=m.stone,metal=m.frame,mark=m.roadPaint;

 // One asphalt footprint only: no overlapping top-plane or duplicated road.
 k.box(m.asphalt,(p.minX+p.maxX)/2,y-.075,(p.minZ+p.maxZ)/2,
  p.maxX-p.minX,.15,p.maxZ-p.minZ);
 // Two sloped, non-overlapping road joins (main road ends at z=39.7).
 for(const entry of p.entrances){
  // Mirrored into road world z=28.3, directly joining the existing
  // road at z≈28.4 without traversing an unrelated hotel surface.
  const x0=entry.x-3.32,x1=entry.x+3.32,z0=32.7,z1=p.minZ;
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute([
   x0,-.005,z0,x1,-.005,z0,x0,y,z1,x1,y,z1],3));
  geo.setAttribute('uv',new T.Float32BufferAttribute([
   x0/2,z0/2,x1/2,z0/2,x0/2,z1/2,x1/2,z1/2],2));
  geo.setIndex([0,2,1,1,2,3]);geo.computeVertexNormals();
  const ramp=k.mesh(geo,m.asphalt,entry.label+' – sauberer Asphaltanschluss zur Hauptstraße');
  ramp.castShadow=false;ramp.userData={parkingAccess:true,grade:.065/9.3};
 }

 // Neat three-bay white road markings. Top is 16mm above the asphalt,
 // with a matching polygon bias for low-precision smartphone depth buffers.
 const ink=mark.clone();ink.name='Parkplatzmarkierung – Limousinen';
 ink.polygonOffset=true;ink.polygonOffsetFactor=-1;ink.polygonOffsetUnits=-2;
 const stripe=(x,z,w,d)=>k.box(ink,x,y+.018,z,w,.008,d);
 for(const bx of p.bays){
  const width=9.0,z0=55.5,z1=75.7;
  stripe(bx-width/2,z0+(z1-z0)/2,.11,z1-z0);
  stripe(bx+width/2,z0+(z1-z0)/2,.11,z1-z0);
  stripe(bx,z1,width,.11);
 }
 // One shared 512px sign material for all three asphalt inscriptions.
 const canvas=createCanvas(512,128),ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,512,128);ctx.fillStyle='#f7f6ef';
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 61px Arial, Helvetica, sans-serif';
 ctx.fillText('Limousine',256,65,495);
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 tex.minFilter=T.LinearMipmapLinearFilter;tex.anisotropy=4;
 const words=new T.MeshBasicMaterial({name:'Weiße Bodenaufschrift Limousine',
  map:tex,transparent:true,depthWrite:false,polygonOffset:true,
  polygonOffsetFactor:-2,polygonOffsetUnits:-3,side:T.DoubleSide});
 const wordGeo=new T.PlaneGeometry(6.6,1.65);wordGeo.rotateX(-Math.PI/2);
 const labels=new T.InstancedMesh(wordGeo,words,p.bays.length);
 const dummy=new T.Object3D();
 p.bays.forEach((x,i)=>{dummy.position.set(x,y+.023,52.8);
  dummy.updateMatrix();labels.setMatrixAt(i,dummy.matrix);});
 labels.instanceMatrix.needsUpdate=true;labels.computeBoundingSphere();
 labels.castShadow=false;labels.name='Drei gut lesbare Limousine-Bodenaufschriften';
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
 k.box(stone,hx,y+3.3,hz,5.6,.24,5.5);
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
 k.box(metal,hx,y+1.36,hz+2.405,.95,2.55,.06);
 k.box(glass,hx,y+1.40,hz+2.448,.80,2.33,.025);
 k.ball(m.gold,hx+.33,y+1.35,hz+2.48,.043);
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
 const cars=copyParkedLimousines(group,originalCar,p.bays);
 group.userData.parkedCarDrawGroups=cars.drawGroups;
 group.userData.security={fence:true,guardhouse:true,cameras:4,floodlightOn:false,
  barrierCount:2,privateSigns:2};
 return group;
}
