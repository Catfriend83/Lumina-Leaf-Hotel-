import {insideRegion} from './village-traffic.js?v=75';
import {createBotanyController,flowerKinds,names} from './alpine-botany.js?v=78';
import { T, rng } from './core.js?v=75';
import { spaLakeShore } from './spa-shore.js?v=75';

// New botany replaces the old ground material and tufts on the existing meshes.
// No new terrain plane is created and no terrain vertex is moved.
const REGION = { x0: -1550, x1: 1550, z0: -1770, z1: 1330 };
const CELL = 20;
const isMeadow = (m, materials) => !!m && (m === materials.meadow || m.name === 'meadow' || (m.map && m.map === materials.meadow.map) || /Uferwiese/.test(m.name));
const oldGrass = m => /grassBlade/i.test(m?.name || '');
const vegetation = /leaf|leaves|foliage|flower|bloom|petal|grass|blossom|needle|trunk|bark|Blüte|Blatt|Wiesenbotanik/i;

function projectionIndex() {
  const cells = new Map();
  const key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  function add(a, b, c) {
    const den = (b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
    if (Math.abs(den) < 1e-8) return;
    const x0=Math.max(REGION.x0,Math.min(a.x,b.x,c.x)),x1=Math.min(REGION.x1,Math.max(a.x,b.x,c.x));
    const z0=Math.max(REGION.z0,Math.min(a.z,b.z,c.z)),z1=Math.min(REGION.z1,Math.max(a.z,b.z,c.z));
    if(x1<x0||z1<z0) return;
    const tri={a:a.clone(),b:b.clone(),c:c.clone(),den};
    for(let ix=Math.floor(x0/CELL);ix<=Math.floor(x1/CELL);ix++) for(let iz=Math.floor(z0/CELL);iz<=Math.floor(z1/CELL);iz++) {
      const k=`${ix},${iz}`; if(!cells.has(k))cells.set(k,[]);cells.get(k).push(tri);
    }
  }
  function at(x,z) {
    let top=null;
    for(const t of cells.get(key(x,z))||[]) {
      const {a,b,c,den}=t,u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,w=1-u-v;
      if(u>=-1e-7&&v>=-1e-7&&w>=-1e-7) {
        const y=u*a.y+v*b.y+w*c.y;
        if(top===null||y>top)top=y;
      }
    }
    return top;
  }
  return {add,at,cells};
}

function addGeometry(index,geometry,matrix) {
  const p=geometry.getAttribute('position'),ind=geometry.index;
  if(!p)return;
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=ind?.count||p.count;
  for(let i=0;i+2<n;i+=3) {
    a.fromBufferAttribute(p,ind?ind.getX(i):i).applyMatrix4(matrix);
    b.fromBufferAttribute(p,ind?ind.getX(i+1):i+1).applyMatrix4(matrix);
    c.fromBufferAttribute(p,ind?ind.getX(i+2):i+2).applyMatrix4(matrix);
    index.add(a,b,c);
  }
}

export function applyAlpineMeadows(scene,materials) {
  scene.updateMatrixWorld(true);
  const ground=projectionIndex(),obstacles=projectionIndex(),grounds=[],removed=[],boxes=[];
  const im=new T.Matrix4(),wm=new T.Matrix4();
  scene.traverse(o=>{
    if(!o.isMesh)return;
    const ms=Array.isArray(o.material)?o.material:[o.material];
    if(ms.some(oldGrass)){removed.push(o);return;}
    if(ms.some(m=>isMeadow(m,materials))){grounds.push(o);addGeometry(ground,o.geometry,o.matrixWorld);return;}
    if(o.isInstancedMesh){
      // Paving stones, planter soils, foundations and furniture are exclusions.
      if(!ms.some(m=>/cobble|stone|ivory|soil|Pflaster|Naturstein|Sockel/i.test(m?.name||'')))return;
      o.geometry.computeBoundingBox();
      for(let i=0;i<o.count;i++){
        o.getMatrixAt(i,im);wm.multiplyMatrices(o.matrixWorld,im);
        const box=o.geometry.boundingBox.clone().applyMatrix4(wm);
        if(box.max.x<REGION.x0||box.min.x>REGION.x1||box.max.z<REGION.z0||box.min.z>REGION.z1)continue;
        // Exclude their footprints independently of top-facing triangle winding.
        boxes.push(box);
      }
      return;
    }
    if(ms.every(m=>vegetation.test(m?.name||'')))return;
    if(/sky|himmel|dome/i.test(o.name||''))return;
    addGeometry(obstacles,o.geometry,o.matrixWorld);
  });
  removed.forEach(o=>o.removeFromParent());
  // Index the small obstacle footprints for cheap conservative edge clearance.
  const boxGrid=new Map();
  for(const b of boxes)for(let ix=Math.floor(b.min.x/CELL);ix<=Math.floor(b.max.x/CELL);ix++)for(let iz=Math.floor(b.min.z/CELL);iz<=Math.floor(b.max.z/CELL);iz++){
    const k=`${ix},${iz}`;if(!boxGrid.has(k))boxGrid.set(k,[]);boxGrid.get(k).push(b);
  }
  const shore=Array.from({length:180},(_,i)=>(()=>{const [x,z]=spaLakeShore(i*Math.PI*2/180);return {x,z};})());
  function shoreDistance(x,z){let d=Infinity;for(const p of shore)d=Math.min(d,Math.hypot(x-p.x,z-p.z));return d;}
  function zoneAt(x,z){
    const hotel=Math.hypot(x/90,(z+4)/100),village=Math.max(Math.abs((x+158)/83),Math.abs((z+159)/62));
    const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
    const hw=1-smooth(.82,1.22,hotel),vw=Math.max(1-smooth(.87,1.23,village),x>30&&x<78&&z<-35&&z>-215?1:0);
    const lake=shoreDistance(x,z),lw=1-smooth(22,38,lake),wild=.52+.12*(.5+.5*Math.sin(x*.029+z*.013));
    let height=wild*(1-lw)+.46*lw,flowers=.80*(1-lw)+.9*lw;
    height=height*(1-vw)+.33*vw;flowers=flowers*(1-vw)+.77*vw;
    height=height*(1-hw)+.23*hw;flowers=flowers*(1-hw)+.73*hw;
    return {name:hw>.5?'Hotel':vw>.5?'Dorf':lw>.5?'Seeufer':'Offene Landschaft',height,flowers};
  }
  const group=new T.Group();group.name='Neue artenreiche Alpenwiesen mit vier Pflegezonen';group.userData={alpineMeadows:true,revision:66,removedOldGrassBatches:removed.length,groundMeshes:grounds.length};
  const records=names.map(()=>[]),random=rng(661005),stats={},occupiedCells=new Set();
  function blocked(x,z,y){
    if(scene.forestFloorMask?.(x,z)>.66)return true;
    if(scene.userData.townhallFloorRepairPatch&&insideRegion(x,z,scene.userData.townhallFloorRepairPatch))return true;if(scene.userData.completePlazaRepairPatch&&insideRegion(x,z,scene.userData.completePlazaRepairPatch))return true;if(scene.userData.churchFloorRepairPatch&&insideRegion(x,z,scene.userData.churchFloorRepairPatch))return true;
    if(scene.userData.plazaRefinementPatch&&insideRegion(x,z,scene.userData.plazaRefinementPatch))return true;
    if(scene.userData.townhallGroundPatch&&insideRegion(x,z,scene.userData.townhallGroundPatch))return true;
    const h=obstacles.at(x,z);if(h!==null&&h>=y-.07)return true;
    for(const b of boxGrid.get(`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`)||[])if(x>=b.min.x-.10&&x<=b.max.x+.10&&z>=b.min.z-.10&&z<=b.max.z+.10&&b.max.y>=y-.07&&b.min.y<y+2)return true;
    // Keep the retained flower beds and the protected VIP parking bay clear.
    const lx=x+3.4,lz=z-8;
    if(lz>-17&&lz<19&&lx>15.55+Math.max(0,7-lz)*.5&&lx<22.25+Math.max(0,7-lz)*.27)return true;
    if(Math.abs(lx+25)<1.9&&Math.abs(lz-6)<11)return true;
    if(Math.abs(lx-16)<2.1&&Math.abs(lz-18.2)<1.9)return true;
    if(x>-3.4&&x<14.4&&z>28&&z<33)return true;
    return false;
  }
  function plant(x,z,required=false,output=records,tracked=true){
    const y=ground.at(x,z);if(y===null||blocked(x,z,y))return;
    const zone=zoneAt(x,z),patch=.55+.45*Math.sin(x*.37+Math.sin(z*.23)*2)*Math.cos(z*.31);
    if(!required&&random()>patch*.75+.18)return;
    const h=zone.height*(.75+random()*.5),radius=.30;
    for(const [dx,dz] of [[radius,0],[-radius,0],[0,radius],[0,-radius],[radius*.707,radius*.707],[-radius*.707,radius*.707],[radius*.707,-radius*.707],[-radius*.707,-radius*.707]]){
      const yy=ground.at(x+dx,z+dz);if(yy===null||Math.abs(yy-y)>.28||blocked(x+dx,z+dz,yy))return;
    }
    const yaw=random()*Math.PI*2,cellKey=`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`,coverageAnchor=tracked&&!occupiedCells.has(cellKey);
    const foreground=Math.hypot(x+35,z-18)<18||Math.hypot(x-40,z-22)<16;
    output[6].push({x,y:y+.003,z,h,yaw,radial:.80+random()*.28,rank:random(),foreground,coverageAnchor,zone:zone.name});
    if(coverageAnchor||required||random()<Math.min(.96,zone.flowers+.08)){
      // Broad species mixing with small organic patches of complementary forms.
      const patches=[[0,1,8,11],[2,7,9,12],[3,4,5,10]],patchId=((Math.floor(x/8)+Math.floor(z/9))%3+3)%3;
      const palette=random()<.40?patches[patchId]:flowerKinds,k=palette[Math.floor(random()*palette.length)];output[k].push({x,y:y+.005,z,h:h*(1.10+random()*.35),yaw:random()*Math.PI*2,radial:.66+random()*.28,rank:random(),foreground,coverageAnchor,zone:zone.name});}
    if(!tracked)return true;
    occupiedCells.add(cellKey);
    const s=stats[zone.name]||= {sites:0,minHeight:Infinity,maxHeight:0};s.sites++;s.minHeight=Math.min(s.minHeight,h);s.maxHeight=Math.max(s.maxHeight,h);return true;
  }
  // Irregular sites cover the whole meadow foreground, with finer local detail.
  // A stratified field spans the actual grass-bearing valley, not only four local zones.
  for(let x=-760;x<770;x+=6)for(let z=-850;z<690;z+=6)plant(x+(random()-.5)*4,z+(random()-.5)*4);
  for(let i=0;i<65000;i++)plant(-92+random()*184,-99+random()*198);
  for(let i=0;i<65000;i++)plant(-238+random()*164,-226+random()*138);
  for(let i=0;i<45000;i++){
    const p=shore[Math.floor(random()*shore.length)],a=random()*Math.PI*2,r=4+random()*31;plant(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r);
  }
  // Fine local plants plus real, sparse 3D vegetation throughout the far valley.

  for(let i=0;i<8000;i++)plant(-48+random()*26,4+random()*25);
  // Fill otherwise empty terrain-index cells. Each candidate is still checked
  // against the real meadow, roads, paving, buildings, water and tuft clearance.
  let completedCells=0;
  for(const key of ground.cells.keys()){
    if(occupiedCells.has(key))continue;
    const [ix,iz]=key.split(',').map(Number);
    for(let j=0;j<24;j++)if(plant((ix+random())*CELL,(iz+random())*CELL,true)){completedCells++;break;}
  }
  group.userData.coverage={grassMeshes:grounds.map(o=>o.name),occupiedTerrainCells:occupiedCells.size,completedEmptyCells:completedCells,cellSizeMeters:CELL};
  group.userData.flowerForms=flowerKinds.map(k=>names[k]);
  group.userData.zones=stats;group.userData.botanicalInstances=records.reduce((n,r)=>n+r.length,0);scene.add(group);
  const controller=createBotanyController(group,records);controller.prepareExport();
  const baseMaterial=materials.meadow;baseMaterial.map=null;baseMaterial.bumpMap=null;baseMaterial.color.set('#ffffff');baseMaterial.vertexColors=true;baseMaterial.roughness=.97;baseMaterial.name='Alpine Blumenwiese – vollständig ersetzte Bodenvegetation';
  const v=new T.Vector3(),c=new T.Color();
  grounds.forEach(o=>{
    const p=o.geometry.getAttribute('position'),colors=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
      const variation=.91+.06*Math.sin(v.x*.17+v.z*.11)+.03*Math.cos(v.x*.43-v.z*.23);
      c.set('#67834a').multiplyScalar(variation);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
    }
    o.geometry.setAttribute('color',new T.BufferAttribute(colors,3));o.material=baseMaterial;o.userData.alpineMeadowRevision=66;
  });
  group.userData.volumetricPlants=true;group.userData.cameraDependentDetail=true;group.userData.printedGroundFlowersRemoved=true;
  let localCenter=null,pendingCenter=null,patchJob=null;
  const liveController={...controller,update(camera,force=false){
    const x=camera.position.x,z=camera.position.z,y=ground.at(x,z),now=performance.now();
    if(y!==null&&camera.position.y-y<18){
      if(!localCenter||Math.hypot(x-localCenter.x,z-localCenter.z)>8){
        const cx=Math.round(x/8)*8,cz=Math.round(z/8)*8;
        if(!pendingCenter||pendingCenter.x!==cx||pendingCenter.z!==cz){pendingCenter={x:cx,z:cz,time:now};patchJob=null;}
        // Build fine plants after a camera flight settles, keeping movement responsive.
        if(force||now-pendingCenter.time>220){
        const radius=20;
        if(!patchJob){const rows=names.map(()=>[]);patchJob={rows,steps:(function*(){for(let dx=-19.8;dx<=19.8;dx+=.45)for(let dz=-19.8;dz<=19.8;dz+=.45){const xx=cx+dx+(random()-.5)*.32,zz=cz+dz+(random()-.5)*.32;if(Math.hypot(xx-cx,zz-cz)<radius)plant(xx,zz,false,rows,false);yield;}})()};}
        const deadline=force?Infinity:performance.now()+2;let step;
        do{step=patchJob.steps.next();}while(!step.done&&(force||performance.now()<deadline));
        if(step.done){const rows=patchJob.rows;
        // Replace the coarser population inside this camera-local patch.
        controller.setLocalRecords(rows,{x:cx,z:cz,radius});localCenter={x:cx,z:cz};pendingCenter=null;patchJob=null;
        }
        }
      }else pendingCenter=null;
    }else if(localCenter){controller.setLocalRecords(names.map(()=>[]),null);localCenter=null;pendingCenter=null;patchJob=null;}
    return controller.update(camera,force);
  }};
  return {report:group.userData,controller:liveController};
}
