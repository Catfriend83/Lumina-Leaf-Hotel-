import {T} from './core.js?v=75';
import {CHURCH_FLOOR as cfg} from './church-floor-data.js?v=75';
import {insideRegion} from './village-traffic.js?v=75';

export function repairChurchFloor(scene,m,meadowController){
 for(const part of cfg.surfaces){
  const mesh=scene.getObjectByName(part.name),base=mesh?.geometry;
  if(!base||base.attributes.position.count!==part.sourceVertices||base.index.count!==part.sourceIndices)throw new Error('Original church paving differs: '+part.name);
  const cuts=new Map(part.cuts.map(c=>[c.triangle,c])),arrays=Object.fromEntries(Object.entries(base.attributes).map(([key,a])=>[key,Array.from(a.array)]));let count=base.attributes.position.count;const ix=[];
  for(let i=0;i<base.index.count;i+=3){const cut=cuts.get(i/3);if(!cut){ix.push(base.index.getX(i),base.index.getX(i+1),base.index.getX(i+2));continue;}
   for(const tri of cut.outside)for(const v of tri){for(const [key,a]of Object.entries(base.attributes))for(let k=0;k<a.itemSize;k++)arrays[key].push(key==='position'?v.point[k]:v.weights.reduce((s,w,j)=>s+w*a.array[cut.source[j]*a.itemSize+k],0));ix.push(count++);}
  }
  const remap=new Map(),source=[];for(const i of ix)if(!remap.has(i)){remap.set(i,source.length);source.push(i);}
  const g=new T.BufferGeometry();for(const [key,a]of Object.entries(base.attributes))g.setAttribute(key,new T.Float32BufferAttribute(source.flatMap(i=>arrays[key].slice(i*a.itemSize,(i+1)*a.itemSize)),a.itemSize,a.normalized));g.setIndex(ix.map(i=>remap.get(i)));mesh.geometry=g;
 }
 for(const kind of ['stone','walk']){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(cfg.positions.flat(),3));const scale=kind==='stone'?1.2:2;g.setAttribute('uv',new T.Float32BufferAttribute(cfg.positions.flatMap(([x,y,z])=>[x/scale,z/scale]),2));g.setIndex(cfg.indices[kind]);g.computeVertexNormals();
  const floor=new T.Mesh(g,kind==='stone'?m.plazaStone:m.cobbles);floor.name=kind==='stone'?'Durchgehender reparierter Natursteinboden an der Kirche':'Nahtloser dunkler Weganschluss unterhalb der Kirche';floor.receiveShadow=true;floor.userData={churchFloorRepair:true,kind,revision:71,worldAlignedPavingUV:true};scene.add(floor);
 }
 for(const part of cfg.edges){
  const mesh=scene.getObjectByName(part.name);if(!mesh||mesh.geometry.index.count!==part.sourceIndices)throw new Error('Original church edge differs: '+part.name);const gone=new Set(part.remove),ix=mesh.geometry.index,keep=[];for(let i=0;i<ix.count;i+=3)if(!gone.has(i/3))keep.push(ix.getX(i),ix.getX(i+1),ix.getX(i+2));mesh.geometry.setIndex(keep);
 }
 scene.userData.churchFloorRepairPatch=cfg.patch;
 let removedPlants=0;for(const rows of meadowController.records)for(let i=rows.length-1;i>=0;i--)if(insideRegion(rows[i].x,rows[i].z,cfg.patch)){rows.splice(i,1);removedPlants++;}meadowController.prepareExport();
 scene.userData.churchFloorRepair={...cfg.report,removedPlants,identicalStoneMaterial:true};scene.updateMatrixWorld(true);return scene.userData.churchFloorRepair;
}
