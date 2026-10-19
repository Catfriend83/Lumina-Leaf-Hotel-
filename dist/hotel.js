import {buildLobbyExtension,buildGroundStructure,HOTEL_EXPANSION} from './hotel-expansion.js?v=99';
import {makeLobbyMaterials,buildReferenceLobby} from './hotel-lobby.js?v=99';
import {buildMainEntrance,entranceBayFloor} from './hotel-entrance.js?v=91';
import {hotelLettering,fiveStars,buildReferenceStaff} from './hotel-reference-details.js?v=89';
import {makeHotelExteriorMaterials,makeHotelSideLighting,softenHotelFacadeLights} from './hotel-lighting.js?v=99';
import {buildUndergroundGarage} from './underground-garage.js?v=104';
import {gardenWalkHeight,gardenPathShift,gardenMeadowHeight} from './meadow-grade.js?v=75';
import {T,Kit,rand,rng,TAU,addLamp,person,facadeLamp,facadeWash} from './core.js?v=75';
import {photoPlane} from './photo-surfaces.js?v=75';
import {shrubCluster,broadLeaf,redPetal,whitePetal} from './vegetation.js?v=75';
import {sideElevation,rearDetails} from './architecture.js?v=92';
import {buildGuestWing,inGuestWing} from './guest-wing.js?v=89';
import {buildGardenPath,buildGardenBedEdges} from './spa-details.js?v=75';
import {buildIndependentSpa,clearSpaSiteGardens,spaSiteGroundHeight} from './spa-wing.js?v=98';
import {POOL_SHIFT_X} from './pool-connection.js?v=91';
function plant(k,m,x,y,z,s=1,random=rand){k.cyl(m.frame,x,y+.32*s,z,.35*s,.64*s);k.cyl(m.gold,x,y+.6*s,z,.36*s,.045*s);for(let i=0;i<9;i++){const a=i*2.4,tip=[x+Math.cos(a)*s*.65,y+(1.2+random()*.6)*s,z+Math.sin(a)*s*.65];k.line(m.trunk,[x,y+.54*s,z],tip,.015*s);k.put(broadLeaf,i%2?m.leaf:m.leaf2,...tip,.7*s,.85*s,.85*s,Math.sin(a)*.55,a,-Math.cos(a)*.55);}}
function railing(k,m,x1,x2,y,z){k.box(m.glass,(x1+x2)/2,y+.52,z,x2-x1,1.04,.055);k.box(m.chrome,(x1+x2)/2,y+1.04,z,x2-x1,.047,.05);for(let x=x1;x<=x2+.1;x+=1.7)k.box(m.chrome,x,y+.52,z,.035,1.06,.045);}
const gardenBulb=new T.IcosahedronGeometry(1,0);
function flowerbed(k,m,x,z,w,d,y=.12,{surface=null,warpX=null,sizeScale=null,random=rand}={}){
 if(!surface){k.box(m.stone,x,y,z,w+.3,.25,d+.3);k.box(m.soil,x,y+.15,z,w,.16,d);}
 const nx=Math.max(1,Math.ceil(w/.85)),nz=Math.max(1,Math.ceil(d/.80)),narrow=d<1.5;
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
  let px=x-w/2+(ix+.5)*w/nx+(random()-.5)*.22;const pz=z-d/2+(iz+.5)*d/nz+(random()-.5)*.20;
  if(warpX)px=warpX(px,pz);
  const size=((narrow?.75:1.18)+random()*(narrow?.22:.42))*(sizeScale?sizeScale(px,pz):1);
  const ground=surface?surface(px,pz):y;
  shrubCluster(k,m,px,ground+.13,pz,size,random);
  if((ix+iz)%3===0){
   const flower=(ix+iz)%2===0?m.flowerWhite:m.flowerRed,fx=px+(random()-.5)*.25,fz=pz+(random()-.5)*.25,fy=ground+.13+size*.91;
   const petalGeometry=flower===m.flowerWhite?whitePetal:redPetal;
   for(let petal=0;petal<7;petal++)k.put(petalGeometry,flower,fx,fy,fz,narrow?.46:.72,narrow?.27:.43,.35,-.48+(random()-.5)*.18,0,petal*TAU/7);
   k.put(gardenBulb,m.flowerGold,fx,fy+.025,fz,.067,.026,.067);
  }
  if((ix+iz)%3===0){const fy=ground+size*.46;k.put(gardenBulb,m.warm,px,fy,pz,.075,.075,.075);}
 }
 // Fine gold wiring with evenly spaced warm bulbs around the planting.
 const edges=[[[x-w/2,y+.40,z+d/2],[x+w/2,y+.40,z+d/2]],[[x+w/2,y+.40,z-d/2],[x+w/2,y+.40,z+d/2]]];
 for(const [a,b] of edges){const distance=Math.hypot(b[0]-a[0],b[2]-a[2]),count=Math.ceil(distance/1.05);let previous=null;for(let i=0;i<=count;i++){const t=i/count,pz=a[2]+(b[2]-a[2])*t,rawX=a[0]+(b[0]-a[0])*t,px=warpX?warpX(rawX,pz):rawX,py=(surface?surface(px,pz)+.4:a[1])-.055*Math.sin(t*Math.PI),point=[px,py,pz];if(previous)k.line(m.gold,previous,point,.010);previous=point;k.put(gardenBulb,m.warm,px,py,pz,.083,.083,.083);}}
}
export function buildHotel(root,m){const f=makeHotelExteriorMaterials(m),sideLight=makeHotelSideLighting(f),lobbyMaterials=makeLobbyMaterials(m);const group=new T.Group();group.name='Lumina Leaf Hotel und Außenanlage';root.add(group);group.userData={hotelExpansion:HOTEL_EXPANSION,upperFloors:3};let k=new Kit(group);const extraPlantRandom=rng(880088);
 // Retained tall lobby, three upper storeys and a continuous raised roof.
 k.box(f.stone,8,-.1,-7,22,.55,19);
 for(let level=0;level<5;level++){const y=[.24,7.14,9.99,12.84,15.69][level],rise=level===0?6.9:2.85;if(level===0)buildGroundStructure(group,f);else k.bevel(f.frame,8,y,-7,21.5,.29,18,.035);k.box(f.ivory,8,y-.13,-7,20.8,.07,17.4);if(level===4)continue;const frontShift=level===0?3.4:0;
  for(let i=0;i<6;i++){const x=-1.15+i*3.5,entranceBay=level===0&&(i===2||i===3);const floorMaterial=level===0?lobbyMaterials.floor:m.wood;if(level>0)k.box(floorMaterial,x,y+.07,-6.8,3.45,.055,17.4);if(level>0)k.box(f.stone,level===0&&i===2?4.85:x-1.70,y+rise*.5,1.82+frontShift,.37,rise,.7);k.box(f.stone,x-1.7,y+rise*.5,-15.6,.35,rise,.8);
   if(level>0)k.box(f.glass,x,y+rise*.52,1.75+frontShift,3.13,rise-.35,.038);
   if(level>0)k.box(f.frame,x,y+rise*.52,1.74+frontShift,.038,rise-.35,.055);if(i!==2&&i!==3){k.box(f.frame,x,y+rise*.52,-15.86,.05,rise-.4,.05);k.box(f.glass,x,y+rise*.5,-15.85,3.1,rise-.42,.045);}
   // Readable interior: lamps, beds, chairs and room dividers.
   if(level>0){k.box(m.white,x,y+.63,-10,2.10,.27,2.75);k.box(m.velvet,x,y+.81,-10.25,2.1,.12,2.1);k.box(m.wood,x,y+.85,-11.4,2.2,1.35,.14);k.box(m.white,x-.52,y+.87,-11.07,.66,.17,.4);k.box(m.white,x+.45,y+.87,-11.07,.66,.17,.4);
   k.cyl(m.gold,x+1.26,y+1.28,-11,.025,.85);k.put('cone',m.warm,x+1.26,y+1.73,-11,.21,.26,.21);
   k.box(m.interior,x,y+rise-.25,-2.8,1.2,.04,.07);}
   if(i%2===0)plant(level===0?new Kit(new T.Group()):k,m,x+.8,y,-.6,.72,level===3?extraPlantRandom:rand);
   if(level>0){k.cyl(m.gold,x-.4,y+.54,-.55,.028,1);k.cyl(m.wood,x-.4,y+1.03,-.55,.55,.06);for(const dx of [-1,1]){k.box(m.velvet,x-.4+dx*.7,y+.57,-.45,.48,.17,.5);k.box(m.velvet,x-.4+dx*.7,y+.98,-.68,.48,.69,.11);for(const dz of [-.16,.16])k.line(m.gold,[x-.4+dx*.7-.17,y+.5,-.45+dz],[x-.4+dx*.7-.17,y,-.45+dz],.023);}}
  }
  for(const side of [-2.6,18.6])sideElevation(k,m,group,side,y,rise,level,f,sideLight);
  rearDetails(k,m,level,y,rise,f);
  for(const x of [-2.72,.62,4.12,7.55,11.12,14.55,18.52]){if(level===0)continue;facadeLamp(k,f,x,y,2.24+frontShift,rise);}
  if(level>0)for(const x of [2.37,12.87])facadeWash(group,x,y+1.78,2.28+frontShift,{range:7,intensity:2.8});
 }
 // Balcony and flat rooftop.
 k.bevel(f.frame,8,7.13,2.30,20.8,.24,2.02,.025);k.bevel(f.frame,8,9.98,2.15,20.8,.22,1.7,.025);k.bevel(f.frame,8,12.83,2.15,20.8,.22,1.7,.025);railing(k,f,-2.5,18.5,7.30,3.3);railing(k,f,-2.5,18.5,10.15,2.99);railing(k,f,-2.5,18.5,13.00,2.99);
 for(let x=-2.2;x<18.6;x+=1.1){k.put(gardenBulb,f.warm,x,7.36,3.33,.047,.047,.047);k.put(gardenBulb,f.warm,x,10.21,3.02,.042,.042,.042);k.put(gardenBulb,f.warm,x,13.06,3.02,.042,.042,.042);}
 for(const z of [-15.9,1.91])k.box(f.frame,8,15.65,z,21.9,.6,.25);for(const x of [-2.8,18.8])k.box(f.frame,x,15.65,-7,.25,.6,18.1);
 for(const x of [1,7,14]){k.box(f.frame,x,15.82,-10,2.4,.65,1.7);for(let i=0;i<9;i++)k.box(m.chrome,x-1+i*.25,16.17,-10,.09,.04,1.5);k.cyl(m.black,x,16.40,-12,.29,.6);}
 // Entrance glass doors, canopy and illuminated sign.
 k.bevel(f.frame,8,6.83,14.5,23.0,1.10,3.6,.055);
 const signPanel=new T.Group();signPanel.name='Vergrößerte dunkle Schildplatte am Haupteingang';signPanel.userData={exteriorSignPanel:true,width:23.4,height:1.62,depth:.075};group.add(signPanel);const signKit=new Kit(signPanel);signKit.bevel(f.frame,8,6.92,16.310,23.4,1.62,.075,.025);signKit.finish();
 hotelLettering(group,{x:8,y:7.01,z:16.351,width:17.8,height:.96,color:'#35d995',exterior:true,referenceScript:m.exteriorScript});
 const exteriorStars=lobbyMaterials.gold.clone();exteriorStars.name='Warm leuchtende fünf Außensterne';exteriorStars.color.set('#e8d391');exteriorStars.emissive.set('#edc779');exteriorStars.emissiveIntensity=.85;fiveStars(group,exteriorStars,8,6.48,16.361,5.4,.30);
 for(const x of [1.5,4.7,8,11.3,14.5])k.cyl(lobbyMaterials.diffuser,x,6.273,14.85,.10,.035);
 const entranceMaterials={...f,wood:lobbyMaterials.floor,glass:f.glass.clone(),warm:f.warm.clone(),glow:f.glow.clone()};
 Object.assign(entranceMaterials.glass,{roughness:.18,metalness:0,envMapIntensity:.18,specularIntensity:.30,opacity:.115});
 Object.assign(entranceMaterials.warm,{emissiveIntensity:.62,roughness:.86});entranceMaterials.glow.opacity=.008;
 buildMainEntrance(group,entranceMaterials);
 buildReferenceLobby(group,m,lobbyMaterials);buildLobbyExtension(group,entranceMaterials,lobbyMaterials,sideLight);

 for(const x of [.2,15.8]){plant(k,m,x,0,17.6,1.2);plant(k,m,x,.1,14.9,1.04);for(const z of [17.6,14.9]){const marker=new T.Object3D();marker.position.set(x,0,z);marker.userData={entrancePlanter:true};group.add(marker);}}


 photoPlane(group,f.photoMaterial,{name:'Bildgetreue obere Glasfassade',x:8,y:10.00,z:1.72,width:20.8,height:5.72,corners:[[711,309],[1106,309],[1106,149],[701,163]]});
 photoPlane(group,f.photoMaterial,{name:'Bildgetreue Glasfassade der zusätzlichen Etage',x:8,y:14.265,z:1.72,width:20.8,height:2.85,corners:[[706,233],[1106,231],[1106,149],[701,163]]});
 // Clear real glass reveals the reference-built three-dimensional reception.
 // The high lobby gives the entrance the proportions seen in the reference.

 k.finish();const guestWing=buildGuestWing(group,m,f,sideLight);
 const tower=group;const pivot=new T.Vector3(8,0,1.91);tower.scale.set(.944,1.032,.75);tower.rotation.y=-.448;const rotated=pivot.clone().multiply(tower.scale).applyEuler(tower.rotation);tower.position.copy(pivot.clone().sub(rotated));tower.position.x-=.777;
 const courtyard=new T.Group();courtyard.name='Eingangsvorplatz und gerader roter Teppich';courtyard.rotation.y=-.14;const cp=new T.Vector3(8,0,2);courtyard.position.copy(cp.clone().sub(cp.clone().applyEuler(courtyard.rotation)));courtyard.position.x-=.777;root.add(courtyard);k=new Kit(courtyard);
 // A single continuous surface joins the rotated doorway to the forecourt.
 tower.updateMatrix();courtyard.updateMatrix();
 const entry=tower.localToWorld(new T.Vector3(8,0,13.53)),end=courtyard.localToWorld(new T.Vector3(8,0,27.9));
 const entryAcross=new T.Vector3(1,0,0).transformDirection(tower.matrixWorld),endAcross=new T.Vector3(1,0,0).transformDirection(courtyard.matrixWorld);
 const carpetCorners=[entry.clone().addScaledVector(entryAcross,-2.90),end.clone().addScaledVector(endAcross,-2.42),end.clone().addScaledVector(endAcross,2.42),entry.clone().addScaledVector(entryAcross,2.90)];
 const floorMesh=(points,material,y,name)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap((p,i)=>[p.x,Array.isArray(y)?y[i]:y,p.z]),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,1,0,0,1,0,1,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const o=new T.Mesh(g,material);o.name=name;o.receiveShadow=true;root.add(o);return o;};
 const apronCorners=[entry.clone().addScaledVector(entryAcross,-11.8),end.clone().addScaledVector(endAcross,-6.4),end.clone().addScaledVector(endAcross,6.4),entry.clone().addScaledVector(entryAcross,11.8)];
 const apron=floorMesh(apronCorners,m.cobbles,[.113,.110,.110,.113],'Großzügiger Vorplatz vor der erweiterten Lobby');apron.userData={expandedEntranceApron:true};const apronUV=apron.geometry.attributes.uv;apronCorners.forEach((p,i)=>apronUV.setXY(i,p.x/2,p.z/2));
 const borderCorners=carpetCorners.map((p,i)=>p.clone().addScaledVector(i===0||i===3?entryAcross:endAcross,i<2?-.14:.14));
 floorMesh(borderCorners,m.gold,[.178,.115,.115,.178],'Goldkante unter dem durchgehenden Teppich');
 const carpet=floorMesh(carpetCorners,m.carpet,[.194,.134,.134,.194],'Einziger durchgehender roter Eingangsteppich');carpet.userData={continuousCarpet:true,entry:entry.toArray(),end:end.toArray()};
 const pathObjects=new T.Group();pathObjects.name='Neu ausgerichtete Pflanzen und Teppichleuchten';pathObjects.userData={forecourtFixtures:true};courtyard.add(pathObjects);const pk=new Kit(pathObjects);
 for(const side of [-1,1])for(const t of [.16,.34,.52,.70]){
  const across=entryAcross.clone().lerp(endAcross,t).normalize(),world=entry.clone().lerp(end,t).addScaledVector(across,side*3.8),p=courtyard.worldToLocal(world);
  pk.box(m.frame,p.x,.36,p.z,.53,.72,.53);plant(pk,m,p.x,.72,p.z,.65);pk.box(m.warm,p.x,.22,p.z+.29,.20,.21,.03);
  const marker=new T.Object3D();marker.position.set(p.x,0,p.z);marker.userData={carpetFixture:true,pathFraction:t,side,clearance:3.8};pathObjects.add(marker);
 }pk.finish();
 k.finish();const terrace=buildUndergroundGarage(root,m);k=new Kit(terrace);
 // Consume the original planting draws before replacing this bounded pool zone.
 const oldPoolPlanting=new Kit(new T.Group());for(const x of [-21,-3.1])plant(oldPoolPlanting,m,x,2.76,-2.5,.95);
 flowerbed(oldPoolPlanting,m,-12.4,10.0,19.3,1.0,2.70);flowerbed(oldPoolPlanting,m,-12.4,-4.1,19.3,1.1,2.72);
 k.finish();const spa=buildIndependentSpa(root,m,tower);const gardens=new T.Group();gardens.name='Blumengarten und ansteigender Weg';gardens.position.set(-3.4,0,8);root.add(gardens);k=new Kit(gardens);
 // Dense colorful gardens, right walkway and complete rear landscaping.

 const walkHeight=gardenWalkHeight;
 const pathShift=gardenPathShift,bankHeight=(x,z)=>spaSiteGroundHeight(x-3.4,z+8,inGuestWing(x-3.4,z+8)?-.22:gardenMeadowHeight(x,z));
 const innerEdge=z=>15.65+Math.max(0,7-z)*.50,outerEdge=z=>22.15+Math.max(0,7-z)*.27;
 const warpX=(x,z)=>innerEdge(z)+(x-15.65)/6.5*(outerEdge(z)-innerEdge(z));
 buildGardenPath(gardens,m,pathShift,walkHeight);
 const meadowMarker=new T.Object3D();meadowMarker.name='Weich abgeflachte Wiese hinter dem Hotel';meadowMarker.userData={hotelRearMeadow:true};gardens.add(meadowMarker);

 for(let z=-14;z<=18;z+=5.5){flowerbed(k,m,18.9,z,6.5,5.35,0,{surface:bankHeight,warpX,sizeScale:(x,pz)=>Math.max(.62,Math.min(1,(outerEdge(pz)-innerEdge(pz))/6.5))});addLamp(k,m,23.2+pathShift(z),bankHeight(23.2+pathShift(z),z),z,1.7);}
 buildGardenBedEdges(gardens,m,[innerEdge,outerEdge],bankHeight);
 flowerbed(k,m,-25,6,3.3,21,.02);
 // Consume the former bed's random draws so every retained garden stays in place.
 flowerbed(new Kit(new T.Group()),m,-3.1,17.5,4,3.1,.05);
 flowerbed(new Kit(new T.Group()),m,16,18.2,3.7,3.1,.04);
 flowerbed(k,m,18.9,18.2,6.5,3.1,.04,{random:rng(1120182)});
 // Remove the six seaward lawn lanterns; the opposite garden row is retained.
 for(const x of [32])for(let z=-26;z<23;z+=8)if(z!==22)addLamp(k,m,x+(x>0?pathShift(z):0),bankHeight(x+(x>0?pathShift(z):0),z),z,2.05);
 // Rear landscaping follows the enlarged hotel's rotated footprint.
 const rearGarden=new T.Group();rearGarden.name='Gästetrakt Garten und rückwärtige Terrasse';group.add(rearGarden);const rk=new Kit(rearGarden);
 for(const x of [-1,5,11,17]){flowerbed(rk,m,x,-47.5,5.0,1.9,.08);addLamp(rk,m,x,.10,-49.2,2.0);}
 rk.box(m.cobbles,8,-.025,-48.4,25,.13,4.5);rk.box(m.stone,8,.42,-50.5,26,.80,.45);railing(rk,m,-5,21,.82,-50.5);rk.finish();
 const light1=new T.PointLight('#ffd59a',24,12,2);light1.name='Weiches Licht über der Referenz-Rezeption';light1.position.set(8,4.65,-2.8);group.add(light1);const light2=new T.PointLight('#eaa24c',28,18,2);light2.position.set(8,7.8,0);group.add(light2);const light3=new T.PointLight('#ffe3a6',25,16,2);light3.position.set(8,11.3,-3);group.add(light3);const light4=light3.clone();light4.position.y+=2.85;group.add(light4);

 const gardenGlow=new T.PointLight('#ffc277',100,28,2);gardenGlow.position.set(17,2.8,13);root.add(gardenGlow);const entranceGlow=new T.PointLight('#ffcf8d',70,24,2);entranceGlow.name='Kontrolliertes warmes Eingangsvorlicht';entranceGlow.position.set(8,5.5,20);root.add(entranceGlow);
 k.finish();softenHotelFacadeLights(group);clearSpaSiteGardens(root);return {group,tower,courtyard,terrace,gardens,guestWing,spa};
}
