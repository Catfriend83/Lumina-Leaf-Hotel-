import {T} from './core.js?v=75';
import {insideRegion} from './village-traffic.js?v=75';
import {TOWNHALL_PLACEMENT as cfg} from './townhall-placement-data.js?v=75';

// Move the complete original assembly before static batching. The local building
// meshes, sign, windows, roof and flower arrangements are never regenerated.
export function placeTownhallOnPlaza(scene,materials,meadowController){
 const hall=scene.getObjectByName('Rathaus Seealm');
 if(!hall?.userData.villageBuilding)throw new Error('Original Rathaus assembly missing');
 const prior=hall.position.toArray();
 for(const part of cfg.surfaces){
  const mesh=scene.getObjectByName(part.name),base=mesh?.geometry;
  if(!base||base.attributes.position.count!==part.sourceVertices||base.index.count!==part.sourceIndices)throw new Error('Rathaus contact surface differs: '+part.name);
  const cut=new Map(part.cuts.map(c=>[c.triangle,c])),arrays=Object.fromEntries(Object.entries(base.attributes).map(([key,a])=>[key,Array.from(a.array)])),kept=[],filled=[];
  let count=base.attributes.position.count;
  function append(triangle,source,destination){
   for(const v of triangle){
    for(const [key,a] of Object.entries(base.attributes))for(let k=0;k<a.itemSize;k++)arrays[key].push(key==='position'?v.point[k]:v.weights.reduce((s,w,j)=>s+w*a.array[source[j]*a.itemSize+k],0));
    destination.push(count++);
   }
  }
  for(let i=0;i<base.index.count;i+=3){const c=cut.get(i/3);if(!c){kept.push(base.index.getX(i),base.index.getX(i+1),base.index.getX(i+2));continue;}
   for(const tri of c.outside)append(tri,c.source,kept);
   for(const tri of c.inside)append(tri,c.source,filled);
  }
  const geometry=(indices,stone=false)=>{
   const remap=new Map(),source=[];for(const i of indices)if(!remap.has(i)){remap.set(i,source.length);source.push(i);}
   const g=new T.BufferGeometry();for(const [key,a]of Object.entries(base.attributes))g.setAttribute(key,new T.Float32BufferAttribute(source.flatMap(i=>arrays[key].slice(i*a.itemSize,(i+1)*a.itemSize)),a.itemSize,a.normalized));
   g.setIndex(indices.map(i=>remap.get(i)));if(stone){const p=g.attributes.position;g.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:p.count},(_,i)=>[p.getX(i)/1.2,p.getZ(i)/1.2]).flat(),2));g.deleteAttribute('color');g.computeVertexNormals();}return g;
  };
  mesh.geometry=geometry(kept);
  const paving=new T.Mesh(geometry(filled,true),materials.plazaStone);paving.name='Bündiger Rathaus-Bodenanschluss – '+part.name;paving.receiveShadow=true;paving.userData={townhallGroundConnection:true,revision:68,sourceSurface:part.name};paving.position.copy(mesh.position);paving.quaternion.copy(mesh.quaternion);paving.scale.copy(mesh.scale);mesh.parent.add(paving);
 }
 hall.position.fromArray(cfg.position);hall.rotation.set(...cfg.rotation);hall.userData.floorY=cfg.position[1];hall.userData.plazaPlacement={revision:68,previousPosition:prior,position:cfg.position,rotation:cfg.rotation,frontFacesPositiveZ:true,originalArchitecturePreserved:true};
 // Only metadata for the Rathaus approach changes; every physical road and
 // pedestrian route keeps its exact original geometry.
 scene.traverse(o=>{if(o.userData.villageBuildingAccess&&o.userData.buildingId==='rathaus')o.userData.points=[[cfg.position[0],cfg.position[2]+4.7,cfg.position[1]],[cfg.position[0],-156,4.31],[-164.5,-150,4.35]];});
 scene.userData.townhallGroundPatch=cfg.patch;
 let removedPlants=0;
 for(const rows of meadowController.records){for(let i=rows.length-1;i>=0;i--)if(insideRegion(rows[i].x,rows[i].z,cfg.patch)){rows.splice(i,1);removedPlants++;}}
 meadowController.prepareExport();
 scene.userData.townhallPlacement={...cfg.report,position:cfg.position,rotation:cfg.rotation,removedPlants,roadsAndPathsUnchanged:true,architectureUnchanged:true};scene.updateMatrixWorld(true);
 return scene.userData.townhallPlacement;
}
