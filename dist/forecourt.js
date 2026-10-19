import {parkingAccessSection,closedParkingSurface,cutParkingAccesses} from './limousine-parking.js?v=112';
import {buildGardenCurb} from './garden-curb.js?v=112';
import {T,Kit,rng} from './core.js?v=75';
import {GARAGE_CROSSING} from './pool-connection.js?v=91';
import {buildHotelDrive,hotelDriveOverlaps} from './hotel-drive.js?v=112';

export const ROAD_BOUNDS={minX:-58.5,maxX:66.5,minZ:28.1,maxZ:39.7};
export const FORECOURT={curbFaceZ:28.4,roadY:-.005,carPosition:[5.09,.04,30.2],bay:{minX:-3.053,maxX:13.922,minZ:28.4,maxZ:32.5},laneDividerZ:(ROAD_BOUNDS.minZ+ROAD_BOUNDS.maxZ)/2,farCurbZ:39.7};

// Behind the curb, just outside the rear/right marked bay corner. The 76 cm
// board remains wholly outside the bay and clear of the entrance ramp.
export const VIP_SIGN_LOCATION={x:FORECOURT.bay.maxX+.43,z:FORECOURT.curbFaceZ-.36};

export function roadOverlapsBox(box){return (box.max.x>ROAD_BOUNDS.minX&&box.min.x<ROAD_BOUNDS.maxX&&box.max.z>ROAD_BOUNDS.minZ&&box.min.z<ROAD_BOUNDS.maxZ)||hotelDriveOverlaps(box);}
export function discardTreeOnRoad(kit,build){
 // Build first, preserving every random draw and the positions of all later planting.
 const previous=new Map([...kit.batches].map(([key,batch])=>[key,batch.matrices.length]));build();
 let overlaps=false;
 for(const [key,batch] of kit.batches){batch.geom.computeBoundingBox();for(let i=previous.get(key)||0;i<batch.matrices.length;i++)if(roadOverlapsBox(batch.geom.boundingBox.clone().applyMatrix4(batch.matrices[i]))){overlaps=true;break;}if(overlaps)break;}
 if(overlaps)for(const [key,batch] of kit.batches){batch.matrices.length=previous.get(key)||0;if(!batch.matrices.length)kit.batches.delete(key);}
 return overlaps;
}
export function removeVegetationOnRoad(scene,materials){
 const vegetation=new Set(['spruce','forestPine','trunk','pine','pine2','leaf','leaf2','grassBlade','shrub','flowerRed','flowerWhite'].map(name=>materials[name]));
 scene.updateMatrixWorld(true);let removed=0;
 scene.traverse(mesh=>{if(!mesh.isInstancedMesh||!vegetation.has(mesh.material))return;mesh.geometry.computeBoundingBox();const matrix=new T.Matrix4(),kept=[];
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld));if(roadOverlapsBox(box))removed++;else kept.push(matrix.clone());}
  if(kept.length===mesh.count)return;mesh.count=kept.length;kept.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
 });return removed;
}

export function makeRoadMaterials(m,createCanvas){
 const random=rng(240024),size=256,canvas=createCanvas(size,size),ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);
 // Fine, isotropic aggregate with a separate seed; existing scene randomness is preserved.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,grain=random(),value=grain>.97?90+random()*20:40+random()*25;
  image.data[i]=value;image.data[i+1]=value+2;image.data[i+2]=value+3;image.data[i+3]=255;
 }
 ctx.putImageData(image,0,0);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=16;texture.userData.mimeType='image/jpeg';
 m.asphalt=new T.MeshStandardMaterial({name:'Feinkörniger Asphalt der Hotelvorfahrt',color:'#b7b6b2',map:texture,bumpMap:texture,bumpScale:.003,roughness:.91});
 m.roadPaint=new T.MeshStandardMaterial({name:'Weiße Straßenmarkierung',color:'#e1dfd5',roughness:.87});
 m.roadDrain=new T.MeshStandardMaterial({name:'Entwässerung der Hotelvorfahrt',color:'#252b2d',metalness:.45,roughness:.74});
 const label=m.makeSign('VIP',{subtitle:'',foreground:'#e1dfd5',background:null,width:128,height:128,italic:false});label.name='VIP Bodenmarkierung';label.emissiveIntensity=1;label.emissive.set(0);label.emissiveMap=null;label.roughness=.9;m.vipRoadLabel=label;
 const sign=m.makeSign('P',{subtitle:'VIP · HOTEL',foreground:'#ffffff',background:'#1550a0',width:128,height:128,italic:false});sign.name='Parkhinweis Hotelgäste';sign.emissiveIntensity=1;sign.emissive.set(0);sign.emissiveMap=null;m.vipParkingSign=sign;
}

export function buildForecourt(root,m){
 const group=new T.Group();group.name='Asphaltstraße und VIP-Hotelvorfahrt';group.userData={hotelForecourt:true};root.add(group);const k=new Kit(group),f=FORECOURT;
 const flat=(name,material,x0,x1,z0,z1,y)=>{const g=new T.PlaneGeometry(x1-x0,z1-z0);g.rotateX(-Math.PI/2);g.translate((x0+x1)/2,y,(z0+z1)/2);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/2,p.getZ(i)/2);const mesh=k.mesh(g,material,name);mesh.castShadow=false;return mesh;};
 buildHotelDrive(group,m);
 // Reconnect the exit lane to the existing asphalt. The road polygon begins at
 // x=-18.715 alongside the portal, while the actual garage wall starts near
 // x=-21.715; that left strip was mistakenly left as exposed terrain.
 // A single textured quad fills only that forecourt gap, without rebuilding
 // either ramp or the road beyond the garage approach.
 const garageExitLeft=GARAGE_CROSSING.minX,joinRoadX=-18.60,frontZ=28.4,mergeZ=33.82;
 const fillGeometry=new T.BufferGeometry();
 fillGeometry.setAttribute('position',new T.Float32BufferAttribute([
  garageExitLeft,-.0035,frontZ,
  garageExitLeft,-.0035,mergeZ,
  joinRoadX,-.0035,mergeZ,
  joinRoadX,-.0035,frontZ
 ],3));
 fillGeometry.setAttribute('uv',new T.Float32BufferAttribute([
  garageExitLeft/2,frontZ/2,garageExitLeft/2,mergeZ/2,
  joinRoadX/2,mergeZ/2,joinRoadX/2,frontZ/2
 ],2));
 fillGeometry.setIndex([0,1,2,0,2,3]);fillGeometry.computeVertexNormals();
 const exitFill=k.mesh(fillGeometry,m.asphalt,'Durchgehend reparierter Asphalt vor der Garagenausfahrt');
 exitFill.castShadow=false;
 exitFill.userData={garageExitRoadRepair:true,flushAsphalt:true,joinsMainRoad:true,geometryTriangles:2};
 // Keep the existing open garage crossing; the north pavement never bridges it.
 for(const [left,right,endZ] of [[-58.5,GARAGE_CROSSING.minX,28.1],[GARAGE_CROSSING.maxX,1.0,28.1],[1.0,6.3,27.9]]){
  const walk=flat('Gehweg am Hotel mit freier Garagenquerung',m.cobbles,left,right,26.3,endZ,.105);walk.userData={hotelSidewalk:true};
 }
 // Same sidewalk extent, with openings following the relocated driveways.
 // No vertex of the separate garden path is changed.
 for(let strip=0;strip<3;strip++){
  const left=[],right=[];
  for(let i=0;i<=24;i++){
   const z=26.3+1.8*i/24,a=parkingAccessSection(0,z),b=parkingAccessSection(1,z);
   const x0=strip===0?6.3:strip===1?a.right:b.right;
   const x1=strip===0?a.left:strip===1?b.left:102;
   if(x0>=x1)continue;
   left.push([x0,z]);right.push([x1,z]);
  }
  if(left.length<2)continue;
  const walk=closedParkingSurface([...left,...right.reverse()],()=>.105,m.cobbles,
   'Gehweg am Hotel mit freier Parkplatzquerung');
  walk.userData={hotelSidewalk:true,parkingCrossing:true,closed:true};group.add(walk);
 }
 // Exactly the two existing sidewalk curbs END at the garage portals.
 // Rounded edge profiles soften mobile aliasing, without adding a new curb
 // between the exit ramp and asphalt. The V100 white longitudinal divider
 // on the exit carriageway is deliberately removed in V101.
 const curbFinish=m.ivory.clone();
 curbFinish.name='Fein abgerundeter Bordstein am Garagenvorfeld';
 curbFinish.roughness=.94;
 curbFinish.color.multiplyScalar(.92);
 const curb=(left,right,z,height=.125)=>{
  const radius=.022;
  k.bevel(curbFinish,(left+right)/2,height/2-.005,z,
   right-left,height,.27,radius);
 };
 // No curb crosses either opening and none protrudes into the exit lane.
 for(const [left,right] of [[-58.5,GARAGE_CROSSING.minX],[GARAGE_CROSSING.maxX,1.0]])curb(left,right,28.25);
 // Restore the STRAIGHT roadside boundary mistakenly removed in V101.
 // It follows the grass edge OUTSIDE the left portal (x=-21.80).
 // The separate L-shaped curb was removed in hotel-drive.js instead.
 const restoredZ0=28.31,restoredZ1=33.42,restoredWidth=.23;
 k.bevel(curbFinish,GARAGE_CROSSING.minX-restoredWidth/2,.0575,
  (restoredZ0+restoredZ1)/2,restoredWidth,.125,restoredZ1-restoredZ0,.022);
 group.userData.garageExitStraightCurbRestored=true;
 // Preserve the garden curb's path, cutting only the two actual accesses.
 const gardenCurb=buildGardenCurb(group,m),oldCurb=gardenCurb.geometry;
 gardenCurb.geometry=cutParkingAccesses(oldCurb);oldCurb.dispose();
 gardenCurb.userData.limousineGatesCleared=true;
 // Close the exposed roadside curb ends at the new openings.
 for(let gate=0;gate<2;gate++)for(const side of ['left','right']){
  const positions=[],indices=[];
  for(let j=0;j<=16;j++){
   const z=28.1+.3*j/16,x=parkingAccessSection(gate,z)[side];
   positions.push(x,-.005,z,x,.12,z);
   if(j){const n=2*(j-1);indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setIndex(indices);g.computeVertexNormals();
  const capMat=m.ivory.clone();capMat.side=T.DoubleSide;
  k.mesh(g,capMat,'Geschlossener Bordsteinabschluss an Parkplatzquerung');
 }
 const ramp=new T.BufferGeometry();ramp.setAttribute('position',new T.Float32BufferAttribute([1,.105,27.9,1,-.005,28.4,6.3,-.005,28.4,6.3,.105,27.9],3));ramp.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,.25,2.65,.25,2.65,0],2));ramp.setIndex([0,1,2,0,2,3]);ramp.computeVertexNormals();const rampMesh=k.mesh(ramp,m.cobbles,'Abgesenkter Bordstein am roten Teppich');rampMesh.userData={entranceCurbRamp:true};rampMesh.castShadow=false;
 // Thin, matte thermoplastic lines sit on the asphalt, rather than glowing.
 const paint=(x,z,w,d)=>k.box(m.roadPaint,x,.0005,z,w,.003,d);
 const bay=f.bay;paint((bay.minX+bay.maxX)/2,bay.maxZ,bay.maxX-bay.minX,.12);
 for(const x of [bay.minX,bay.maxX])paint(x,(bay.minZ+bay.maxZ)/2,.12,bay.maxZ-bay.minZ);
 const marker=new T.Object3D();marker.name='Reservierter Limousinen-Stellplatz direkt am Eingang';marker.userData={vipDropOff:true,bounds:bay,curbFaceZ:f.curbFaceZ,carBodyGapMeters:.20};group.add(marker);
 const label=k.mesh(new T.PlaneGeometry(1.3,1.3),m.vipRoadLabel,'VIP HOTEL auf der Fahrbahn');label.rotation.x=-Math.PI/2;label.position.set(14.85,.002,30.35);label.castShadow=false;
 // Flush linear drainage and small inset slots leave the boarding route clear.
 for(const [left,right] of [[-58.5,GARAGE_CROSSING.minX],[GARAGE_CROSSING.maxX,.9],[6.4,66.5]]){k.box(m.roadDrain,(left+right)/2,-.002,28.47,right-left,.004,.08);}
 const poleX=VIP_SIGN_LOCATION.x,poleZ=VIP_SIGN_LOCATION.z;k.cyl(m.chrome,poleX,.95,poleZ,.025,1.7);k.box(m.frame,poleX,1.87,poleZ,.76,.92,.04);
 const sign=k.mesh(new T.PlaneGeometry(.69,.85),m.vipParkingSign,'Reservierter VIP-Parkplatz');sign.position.set(poleX,1.87,poleZ+.026);sign.castShadow=false;sign.userData={vipParkingSign:true,positionedAt:'rear-right bay corner'};
 k.finish();return group;
}
