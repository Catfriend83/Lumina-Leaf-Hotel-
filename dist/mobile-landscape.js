import {T,Kit,rng} from './core.js?v=75';
import {landHeight} from './landscape.js?v=91';
import {mountainHeight} from './mountains.js?v=75';
import {spaLakeShore} from './spa-shore.js?v=75';
import {spruce} from './vegetation.js?v=75';
import {BUILDINGS,MAIN_ROAD,PROMENADE,lakeContains} from './village-layout.js?v=75';
import {buildVillageBuilding} from './village-buildings.js?v=75';

// V96: mobile LOD of the existing Alpine setting, NOT an empty hotel studio.
// Coordinates and building definitions come from the unchanged full model.
// All high-detail geometry is still available with ?full=1.
export function buildMobileLandscape(scene,m){
 const group=new T.Group();group.name='Alpenlandschaft – ressourcenschonende mobile Ansicht';
 group.userData={mobileLandscape:true,fullModelPreserved:true};
 scene.add(group);
 const smooth=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);};
 const lawn=m.meadow.clone();lawn.name='Natürlich schattierte Wiesen im mobilen Modus';
 lawn.map=null;lawn.bumpMap=null;lawn.color.set('#91a874');lawn.vertexColors=true;lawn.roughness=1;
 const mountainGrass=lawn.clone();mountainGrass.color.set('#697e5b');
 // Lower-resolution distant terrain retains the same mountain-height algorithm,
 // but avoids the original 130,000-vertex landscape and expensive cut processing.
 const far=new T.PlaneGeometry(3100,3100,90,90);
 far.rotateX(-Math.PI/2);far.translate(0,0,-220);
 const fp=far.getAttribute('position'),farColors=new Float32Array(fp.count*3);
 for(let i=0;i<fp.count;i++){
  const x=fp.getX(i),z=fp.getZ(i),d=Math.hypot(x,z+80);
  const base=-.9+smooth(250,780,d)*(5+3*Math.sin(x*.006)*Math.cos(z*.008));
  const h=mountainHeight(x,z,base);
  fp.setY(i,h-.15);
  const v=.78+.13*Math.sin(x*.008+z*.012)+.08*Math.cos(x*.021-z*.014);
  const snow=smooth(90,140,h),rock=smooth(48,90,h)*(1-snow);
  farColors[i*3]=v*(1-rock-snow)+rock*.85+snow*1.15;
  farColors[i*3+1]=v*(1-rock-snow)+rock*.82+snow*1.22;
  farColors[i*3+2]=v*(1-rock-snow)+rock*.78+snow*1.28;
 }
 far.setAttribute('color',new T.BufferAttribute(farColors,3));far.computeVertexNormals();
 const peaks=new T.Mesh(far,mountainGrass);peaks.name='Alpenberge mit Felsgraten und schneebedeckten Gipfeln';peaks.receiveShadow=false;group.add(peaks);
 // More detailed terrain close to the hotel, see and Seealm village. Lake
 // triangles are omitted rather than covered by an opaque green floor.
 const near=new T.PlaneGeometry(540,490,100,92);
 near.rotateX(-Math.PI/2);near.translate(-92,0,-94);
 const np=near.getAttribute('position'),nearUV=near.getAttribute('uv'),colors=new Float32Array(np.count*3);
 for(let i=0;i<np.count;i++){
  const x=np.getX(i),z=np.getZ(i),h=landHeight(x,z);
  np.setY(i,h-.037);nearUV.setXY(i,x/5,z/5);
  const t=.85+.10*Math.sin(x*.21+z*.13)+.05*Math.cos(x*.34-z*.26);
  colors[i*3]=t*.93;colors[i*3+1]=t;colors[i*3+2]=t*.81;
 }
 near.setAttribute('color',new T.BufferAttribute(colors,3));
 const old=near.index,kept=[];
 for(let i=0;i<old.count;i+=3){
  const a=old.getX(i),b=old.getX(i+1),c=old.getX(i+2);
  const x=(np.getX(a)+np.getX(b)+np.getX(c))/3,z=(np.getZ(a)+np.getZ(b)+np.getZ(c))/3;
  if(lakeContains(x,z))continue;
  kept.push(a,b,c);
 }
 near.setIndex(kept);near.computeVertexNormals();
 const valley=new T.Mesh(near,lawn);valley.name='Wiesen und natürlicher Talboden';
 valley.receiveShadow=false;group.add(valley);
 // Original shoreline coordinates and lake position; simple water shader only.
 const lakeVertices=[-94,-.2,-55],lakeIndices=[];
 const shoreline=176;
 for(let i=0;i<=shoreline;i++){
  const [x,z]=spaLakeShore(i*2*Math.PI/shoreline);
  lakeVertices.push(x,-.2,z);
  if(i>0)lakeIndices.push(0,i,i+1);
 }
 const lakeGeometry=new T.BufferGeometry();
 lakeGeometry.setAttribute('position',new T.Float32BufferAttribute(lakeVertices,3));
 lakeGeometry.setIndex(lakeIndices);lakeGeometry.computeVertexNormals();
 const lakeMaterial=m.lake.clone();lakeMaterial.side=T.DoubleSide;
 const lake=new T.Mesh(lakeGeometry,lakeMaterial);
 lake.name='Spiegelnder Bergsee';lake.userData={mobileLake:true,localSpaShore:true};
 group.add(lake);
 // Existing village road geometry and actual building definitions, without
 // the expensive terrain-cut/road-grading and entire valley rebuilding passes.
 function road(path,mat,name){
  if(!path?.rows?.length)return;
  const vertices=[],uv=[],indices=[];
  for(const r of path.rows){
   for(const side of [-1,1]){
    vertices.push(r.x+side*r.nx*r.width*.5,r.y+.04,r.z+side*r.nz*r.width*.5);
    uv.push(r.s/4,side*.5+.5);
   }
  }
  for(let i=0;i<path.rows.length-1;i++){
   const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new T.Mesh(g,mat);mesh.name=name;mesh.material.side=T.DoubleSide;group.add(mesh);
 }
 road(MAIN_ROAD,m.asphalt,'Asphaltstraße zur Seealm');
 road(PROMENADE,m.cobbles,'Weg rund um den Bergsee');
 for(const b of BUILDINGS){
  buildVillageBuilding(group,m,b,landHeight);
 }
 // Photographic crossed spruce silhouettes with volumetric trunks. All trees
 // are GPU-instanced per material, without thousands of separate draw calls.
 const forest=new T.Group();forest.name='Alpenwald – mobile Instanzgruppen';group.add(forest);
 const k=new Kit(forest),random=rng(741005);
 const place=(x,z,height)=>{
  if(lakeContains(x,z)||Math.hypot((x+155)/70,(z+150)/55)<.60)return;
  if(x>-74&&x<77&&z>-72&&z<91)return;
  if(x>-50&&x<73&&z>-80&&z<-10)return;
  spruce(k,m,x,landHeight(x,z),z,height,random,false);
 };
 for(let i=0;i<930;i++){
  const x=-470+random()*1000,z=-630+random()*850;
  if(random()<.24&&Math.hypot(x+94,z+55)<160)continue;
  place(x,z,6+random()*18);
 }
 for(const [x,z,h] of [[-30,-17,14],[-22,-20,12],[-16.8,-40.21,11],[-9,-28,12],[0,-31,16],[13,-31,15],[22,-28,13],[35,16,11],[35,4,14],[37,-10,15],[36,-24,15]]){
  // Retain planted trees near the hotel without the remote forest burden.
  spruce(k,m,x,landHeight(x,z),z,h,random,false);
 }
 k.finish();
 group.userData.treeCandidates=930;
 group.userData.actualVillageBuildings=BUILDINGS.length;
 return group;
}
