import {T} from './core.js?v=75';
import {TOWNHALL_FLOOR as cfg} from './townhall-floor-data.js?v=75';
import {insideRegion} from './village-traffic.js?v=75';

export function repairTownhallFloor(scene,m,meadowController){
 for(const part of cfg.surfaces){
  const mesh=scene.getObjectByName(part.name),base=mesh?.geometry;
  if(!base||base.attributes.position.count!==part.sourceVertices||base.index.count!==part.sourceIndices)throw new Error('Original Rathaus paving differs: '+part.name);
  const cuts=new Map(part.cuts.map(c=>[c.triangle,c])),arrays=Object.fromEntries(Object.entries(base.attributes).map(([key,a])=>[key,Array.from(a.array)]));let count=base.attributes.position.count;const ix=[];
  for(let i=0;i<base.index.count;i+=3){const cut=cuts.get(i/3);if(!cut){ix.push(base.index.getX(i),base.index.getX(i+1),base.index.getX(i+2));continue;}
   for(const tri of cut.outside)for(const v of tri){for(const [key,a]of Object.entries(base.attributes))for(let k=0;k<a.itemSize;k++)arrays[key].push(key==='position'?v.point[k]:v.weights.reduce((s,w,j)=>s+w*a.array[cut.source[j]*a.itemSize+k],0));ix.push(count++);}
  }
  const remap=new Map(),source=[];for(const i of ix)if(!remap.has(i)){remap.set(i,source.length);source.push(i);}
  const g=new T.BufferGeometry();for(const [key,a]of Object.entries(base.attributes))g.setAttribute(key,new T.Float32BufferAttribute(source.flatMap(i=>arrays[key].slice(i*a.itemSize,(i+1)*a.itemSize)),a.itemSize,a.normalized));g.setIndex(ix.map(i=>remap.get(i)));mesh.geometry=g;
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(cfg.positions.flat(),3));g.setAttribute('uv',new T.Float32BufferAttribute(cfg.positions.flatMap(([x,y,z])=>[x/1.2,z/1.2]),2));g.setIndex(cfg.indices);g.computeVertexNormals();
 const floor=new T.Mesh(g,m.plazaStone);floor.name='Nahtloser Natursteinboden links neben dem Rathaus';floor.receiveShadow=true;floor.userData={townhallFloorRepair:true,revision:70,worldAlignedStoneUV:true};scene.add(floor);
 // Remove only the now-internal rims of the former Rathaus footprint. They
 // remain unrelated to the retained road/sidewalk edges and architecture.
 let removedEdgeTriangles=0;
 scene.traverse(o=>{if(!o.userData.villagePavingEdge||!o.isMesh)return;const p=o.geometry.attributes.position,ix=o.geometry.index,keep=[];for(let i=0;i<ix.count;i+=3){const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],xs=ids.map(j=>p.getX(j)),zs=ids.map(j=>p.getZ(j)),left=xs.every(x=>Math.abs(x+170.25)<.001)&&Math.min(...zs)>=-169.001&&Math.max(...zs)<=-160.999,front=zs.every(z=>Math.abs(z+161)<.001)&&Math.min(...xs)>=-170.251&&Math.max(...xs)<=-158.749;
  if(left||front){removedEdgeTriangles++;continue;}keep.push(...ids);
 }if(keep.length!==ix.count)o.geometry.setIndex(keep);});
 scene.userData.townhallFloorRepairPatch=cfg.patch;
 let removedPlants=0;for(const rows of meadowController.records)for(let i=rows.length-1;i>=0;i--)if(insideRegion(rows[i].x,rows[i].z,cfg.patch)){rows.splice(i,1);removedPlants++;}meadowController.prepareExport();
 scene.userData.townhallFloorRepair={...cfg.report,removedEdgeTriangles,removedPlants,identicalStoneMaterial:true};scene.updateMatrixWorld(true);return scene.userData.townhallFloorRepair;
}
