import {preserveHotelSurroundings} from './hotel-meadow-preservation.js?v=91';
import {rebuildReferencePlaza} from './reference-plaza.js?v=83';
import {applyVillageDetails} from './village-details.js?v=84';
import {replaceAlpineForest} from './alpine-forest.js?v=98';
import {rebuildCompletePlaza} from './complete-plaza.js?v=75';
import {repairChurchFloor} from './church-floor.js?v=75';
import {repairTownhallFloor} from './townhall-floor.js?v=75';
import {refineTownhallPlaza} from './plaza-refinement.js?v=91';
import {placeTownhallOnPlaza} from './townhall-placement.js?v=75';
import {applyAlpineMeadows} from './alpine-meadows.js?v=105';
import {clearGarageSite,finishLobbyGarage} from './garage-site.js?v=104';
import {reconstructHotelVerge,closeHotelPavingSeams} from './hotel-drive.js?v=102';
import {closeEntryPavingSeam} from './entry-seam.js?v=75';
import {makePlazaMaterials,applyVillagePlazaFinish} from './plaza-finish.js?v=91';
import {buildLakePathFurnishing,thinLakePathFurnishing} from './lake-path-furnishing.js?v=91';
import {clearVillageConstruction} from './village.js?v=91';
import {T,makeMaterials} from './core.js?v=75';
import {buildHotel} from './hotel.js?v=104';
import {makePoolMaterials} from './luxury-pool.js?v=75';
import {makeSpaMaterials} from './spa-details.js?v=75';
import {buildCar} from './car.js?v=91';
import {buildLandscape} from './landscape.js?v=102';
import {buildLakeActivity} from './lake-activity.js?v=75';
import {makeRoadMaterials,removeVegetationOnRoad,buildForecourt} from './forecourt.js?v=102';
import {buildMobileLandscape} from './mobile-landscape.js?v=100';
import {SPA_WING} from './spa-wing.js?v=98';
export async function createScene({createCanvas,loadTexture,onProgress=()=>{},mobile=false,fastHotel=false}){
 // Allow the browser to paint the loading state between long scene build steps.
 // Geometry and build order within each step remain unchanged.
 const phase=async(percent,message)=>{onProgress(percent,message);await new Promise(resolve=>setTimeout(resolve,0));};
 await phase(8,'Materialien und Texturen laden …');
 const scene=new T.Scene();scene.name='Lumina Leaf Hotel – Rekonstruktion nach Bildvorlage';scene.userData={title:'Lumina Leaf Hotel',description:'Räumliche Annäherung an die vom Nutzer bereitgestellte Bildvorlage. Verdeckte Ansichten wurden gestalterisch ergänzt.',units:'meters',version:'91.0',guestRooms:40};
 const materials=await makeMaterials({createCanvas,loadTexture,lite:fastHotel});
 for(const [key,file] of [['lobbyDamask','lobby-damask-v90.png'],['lobbyRug','lobby-rug-v90.png']]){materials[key]=await loadTexture('assets/'+file);materials[key].colorSpace=T.SRGBColorSpace;materials[key].anisotropy=8;}
 materials.exteriorScript=await loadTexture('assets/hotel-sign-script-v89.png');materials.exteriorScript.colorSpace=T.SRGBColorSpace;materials.exteriorScript.anisotropy=8;
 materials.entranceReference=await loadTexture('assets/entrance-reference-v82.png');materials.entranceReference.colorSpace=T.SRGBColorSpace;
 materials.receptionTextures=await Promise.all([0,1].map(async i=>{const t=await loadTexture('assets/reception-person-'+i+'-v86.png');t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}));
 makeRoadMaterials(materials,createCanvas);makePoolMaterials(materials,createCanvas);makeSpaMaterials(materials);makePlazaMaterials(materials,createCanvas);
 const carWrap=await loadTexture('assets/limousine-side-wrap-v12.png');carWrap.colorSpace=T.SRGBColorSpace;carWrap.anisotropy=16;
 const sky=await loadTexture('assets/sunset-sky.png');sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;scene.background=sky;scene.environment=sky;scene.environmentIntensity=.78;scene.backgroundRotation.set(0,.46,0);scene.environmentRotation.set(0,.46,0);
 const domeMat=new T.MeshBasicMaterial({name:'360 Grad Sonnenuntergang',map:sky,side:T.BackSide,depthWrite:false,fog:false,toneMapped:false});const dome=new T.Mesh(new T.SphereGeometry(2400,64,32),domeMat);dome.name='Himmelspanorama 360°';dome.rotation.y=.46;dome.renderOrder=-100;dome.visible=false;scene.add(dome);
 scene.fog=new T.FogExp2('#c9b6a6',.00065);
 scene.add(new T.HemisphereLight('#b6caff','#665038',.9));const sun=new T.DirectionalLight('#ffcd91',2.1);sun.position.set(-90,75,-55);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-58;sun.shadow.camera.right=58;sun.shadow.camera.top=50;sun.shadow.camera.bottom=-46;sun.shadow.camera.near=1;sun.shadow.camera.far=240;sun.shadow.bias=-.00035;sun.shadow.normalBias=.065;scene.add(sun,sun.target);
 const fill=new T.DirectionalLight('#c5ddf2',.7);fill.position.set(45,50,75);scene.add(fill);
 if(fastHotel){
  // Fast mobile preview: reuse the actual hotel, pool, SPA and forecourt
  // builders. Only the costly valley, village and botanical reconstructions
  // are omitted. The full landscape remains available via ?full=1.
  await phase(22,'Alpenlandschaft, See, Wiesen und Wald aufbauen …');
  buildMobileLandscape(scene,materials);
  await phase(55,'Hotel mit Lobby, Gästetrakt und Pool aufbauen …');
  buildHotel(scene,materials);
  await phase(83,'Hotelvorfahrt und Limousine ergänzen …');
  buildForecourt(scene,materials);
  // Remove any remaining street/paving overlays at the real garage entry.
  // Garage walls, ramp, roof and asphalt are protected by garageMember().
  clearGarageSite(scene,materials);
  const car=buildCar(scene,materials,carWrap);
  sun.castShadow=false;
  scene.userData.fastMobileHotel=true;
  scene.userData.alpineSurroundingsOmitted=false;
  scene.updateMatrixWorld(true);
  onProgress(96,'Schnellansicht darstellen …');
  const meadowController={update(){return null;},prepareExport(){}};
  return {scene,materials,car,dome,sky,sun,activity:null,meadowController,referencePlaza:null};
 }
 await phase(22,'Alpenlandschaft und Umgebung aufbauen …');
 buildLandscape(scene,materials);
 await phase(39,'Hotel, Pool und Limousine aufbauen …');
 buildHotel(scene,materials);const car=buildCar(scene,materials,carWrap);const activity=buildLakeActivity(scene,materials);
 await phase(52,'Straßen, Dorf und Außenanlagen vorbereiten …');
 removeVegetationOnRoad(scene,materials);clearVillageConstruction(scene,materials);applyVillagePlazaFinish(scene,materials);closeEntryPavingSeam(scene,materials);reconstructHotelVerge(scene,materials);closeHotelPavingSeams(scene,materials);clearGarageSite(scene,materials);buildLakePathFurnishing(scene,materials);
 scene.updateMatrixWorld(true);
 await phase(66,'Alpenwiesen und Pflanzen berechnen …');
 const meadow=applyAlpineMeadows(scene,materials,{mobile});scene.userData.alpineMeadows=meadow.report;placeTownhallOnPlaza(scene,materials,meadow.controller);refineTownhallPlaza(scene,materials,meadow.controller);thinLakePathFurnishing(scene);repairTownhallFloor(scene,materials,meadow.controller);repairChurchFloor(scene,materials,meadow.controller);rebuildCompletePlaza(scene,materials,meadow.controller);replaceAlpineForest(scene,materials,meadow.controller,{mobile});
 await phase(83,'Landschaft, Dorfplatz und Hotellobby fertigstellen …');
 const referencePlaza=rebuildReferencePlaza(scene,materials);
 applyVillageDetails(scene,materials,referencePlaza,meadow.controller);finishLobbyGarage(scene,materials,meadow.controller);scene.userData.hotelMeadowPreservation=preserveHotelSurroundings(meadow.controller,scene);
 await phase(92,'3D-Geometrie für die Darstellung optimieren …');
 // Batch repeated static geometry across the entire scene for mobile GPUs.
 const batches=new Map(),old=[];
 scene.traverse(o=>{if(!o.isInstancedMesh||o.userData.alpineBotany)return;for(let ancestor=o;ancestor;ancestor=ancestor.parent)if(ancestor===car||ancestor===activity.group)return;old.push(o);const key=o.geometry.uuid+o.material.uuid;let batch=batches.get(key);if(!batch){batch={geometry:o.geometry,material:o.material,matrices:[],cast:o.castShadow};batches.set(key,batch);}for(let i=0;i<o.count;i++){const matrix=new T.Matrix4();o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);batch.matrices.push(matrix);}});
 for(const o of old)o.removeFromParent();
 for(const b of batches.values()){if(!b.matrices.length)continue;const mesh=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);mesh.name=b.material.name;mesh.castShadow=b.cast;mesh.receiveShadow=true;b.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();scene.add(mesh);}
 scene.updateMatrixWorld(true);
 onProgress(96,'3D-Ansicht initialisieren …');
 return {scene,materials,car,dome,sky,sun,activity,meadowController:meadow.controller,referencePlaza};
}
const spaCamera=(x,y,z)=>{const c=Math.cos(SPA_WING.rotation),s=Math.sin(SPA_WING.rotation);return [SPA_WING.x+c*x+s*z,SPA_WING.floor+y,SPA_WING.z-s*x+c*z];};
export const cameraViews={meadow:{position:[-35,1.3,25],target:[-33,.27,17],fov:58},vorfahrt:{position:[5,55,96],target:[4,0,28],fov:55},tiefgarage:{position:[-27,8,42],target:[-15.615,-.5,13],fov:49},rampe:{position:[-12.7,2.6,27.2],target:[-12.7,-2.3,3.4],fov:62},kirchenchor:{position:[-199,16,-135],target:[-178,10,-150],fov:49},dorfeinfahrt:{position:[-166,18,-95],target:[-190,8,-124],fov:53},rathaus:{position:[-156.9,13.18,-142.2],target:[-160.4,8.98,-163.2],fov:48},gasthaus:{position:[-137,13,-145],target:[-145,9,-167.5],fov:48},kapelle:{position:[-154,15,-137],target:[-176,10,-150],fov:48},seehaeuser:{position:[86,23,-132],target:[51,10,-146],fov:60},landhaeuser:{position:[-151,25,-158],target:[-161,8,-188],fov:62},dorfladen:{position:[-154,6.6,-156],target:[-131,8.4,-154],fov:48},rundweg:{position:[-87,208,108],target:[-94,0,-55],fov:52},village:{position:[-132,37,-96],target:[-157,5,-153],fov:52},cinematic:{position:[7,26,112],target:[6,3.5,-10]},original:{position:[8.609,13.839,74.081],target:[.503,1.350,-3]},pool:{position:[-35,22,9],target:[-7,4.2,-27]},car:{position:[-8,5,42.37],target:[5.09,1.3,30.2]},back:{position:[72,32,-73],target:[22,6,-15]},aerial:{position:[-50,80,65],target:[5,0,-12]},lake:{position:[-12,24,39],target:[-96,8,-71]},fitness:{position:spaCamera(.1,2.15,15.7),target:spaCamera(0,1.1,0),fov:58,interior:true}};

// Cameras use the entrance's actual transformed building coordinates.
const entrancePoint=(x,y,z)=>{const c=Math.cos(-.448),a=Math.sin(-.448),dx=(x-8)*.944,dz=(z-1.91)*.75;return [7.223+c*dx+a*dz,y*1.032,1.91-a*dx+c*dz];};
cameraViews.eingang={position:entrancePoint(8,3.5,31),target:entrancePoint(8,3.4,-1.6),fov:55};
cameraViews.rezeption={position:entrancePoint(8,2.7,11.2),target:entrancePoint(8,3.0,-5.0),fov:70,interior:true};
