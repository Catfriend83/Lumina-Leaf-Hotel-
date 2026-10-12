import {T} from './core.js?v=75';
import {PLAZA_REFINEMENT as cfg} from './plaza-refinement-data.js?v=75';
import {insideRegion} from './village-traffic.js?v=75';
import {groundedRound} from './plaza-order.js?v=91';
import {createGroundContact} from './ground-contact.js?v=75';

export function refineTownhallPlaza(scene,m,meadowController){
 for(const part of cfg.surfaces){
  const mesh=scene.getObjectByName(part.name),base=mesh?.geometry;
  if(!base||base.attributes.position.count!==part.sourceVertices||base.index.count!==part.sourceIndices)throw new Error('Plaza source surface differs: '+part.name);
  const cuts=new Map(part.cuts.map(c=>[c.triangle,c]));
  const arrays=Object.fromEntries(Object.entries(base.attributes).map(([key,a])=>[key,Array.from(a.array)])),indices={keep:[],walk:[],stone:[],soil:[]};let count=base.attributes.position.count;
  for(let i=0;i<base.index.count;i+=3){
   const cut=cuts.get(i/3);
   if(!cut){indices.keep.push(base.index.getX(i),base.index.getX(i+1),base.index.getX(i+2));continue;}
   for(const [kind,triangles]of Object.entries(cut.outputs))for(const tri of triangles)for(const weights of tri){
    for(const [key,a]of Object.entries(base.attributes))for(let k=0;k<a.itemSize;k++)arrays[key].push(weights.reduce((s,w,j)=>s+w*a.array[cut.source[j]*a.itemSize+k],0));
    indices[kind].push(count++);
   }
  }
  function geometry(ix,kind){
   const remap=new Map(),source=[];for(const i of ix)if(!remap.has(i)){remap.set(i,source.length);source.push(i);}
   const g=new T.BufferGeometry();for(const [key,a]of Object.entries(base.attributes))g.setAttribute(key,new T.Float32BufferAttribute(source.flatMap(i=>arrays[key].slice(i*a.itemSize,(i+1)*a.itemSize)),a.itemSize,a.normalized));g.setIndex(ix.map(i=>remap.get(i)));
   if(kind!=='keep'){const p=g.attributes.position,scale=kind==='stone'?1.2:2;g.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:p.count},(_,i)=>[p.getX(i)/scale,p.getZ(i)/scale]).flat(),2));g.deleteAttribute('color');g.computeVertexNormals();}return g;
  }
  mesh.geometry=geometry(indices.keep,'keep');
  for(const kind of ['walk','stone','soil'])if(indices[kind].length){const replacement=new T.Mesh(geometry(indices[kind],kind),kind==='walk'?m.cobbles:kind==='stone'?m.plazaStone:m.soil);replacement.name='Präziser Rathaus-Platzabschluss '+kind+' – '+part.name;replacement.receiveShadow=true;replacement.userData={plazaRefinement:true,revision:69,kind,sourceSurface:part.name};replacement.position.copy(mesh.position);replacement.quaternion.copy(mesh.quaternion);replacement.scale.copy(mesh.scale);mesh.parent.add(replacement);}
 }
 scene.updateMatrixWorld(true);const surfaces=[];
 scene.traverse(o=>{if(o.isMesh&&(o.userData.villageGround||o.userData.villagePlazaFinish||o.userData.townhallGroundConnection||o.userData.plazaRefinement||o.userData.villageTrafficSurface==='walk'))surfaces.push(o);});
 const surface=createGroundContact(surfaces),treeReport=[];
 for(let i=0;i<cfg.treeIndices.length;i++){
  const index=cfg.treeIndices[i],tree=scene.getObjectByName('Symmetrischer Platzbaum '+(index+1)),oldBed=scene.getObjectByName('Eingefasstes symmetrisches Baumbeet '+index),soil=scene.getObjectByName('Geplante Baumscheibe '+index),[x,z]=cfg.newTrees[i];
  if(!tree||!oldBed||!soil)throw new Error('Original Rathaus tree assembly missing');
  const prior=tree.position.toArray();oldBed.removeFromParent();
  const base=groundedRound(scene,m.stoneDark,x,z,cfg.bedRadius,surface,.04,'Eingefasstes symmetrisches Baumbeet '+index);
  base.mesh.userData={townhallTreeBed:true,index,revision:69,contacts:base.contacts};
  tree.position.set(x,base.top+.045,z);Object.assign(tree.userData,{contactY:base.top+.045,townhallFrontTree:true,revision:69,previousPosition:prior,facadeDistance:cfg.frontZ-z});
  soil.position.set(x,base.top+.0225,z);soil.userData={townhallTreeSoil:true,index,revision:69};treeReport.push({index,position:tree.position.toArray(),contacts:base.contacts});
 }
 scene.userData.plazaRefinementPatch=cfg.patch;
 let removedPlants=0;for(const rows of meadowController.records)for(let i=rows.length-1;i>=0;i--)if(insideRegion(rows[i].x,rows[i].z,cfg.patch)){rows.splice(i,1);removedPlants++;}
 meadowController.prepareExport();scene.userData.plazaRefinement={...cfg.report,trees:treeReport,removedPlants,rathausUnchanged:true};scene.updateMatrixWorld(true);
 return scene.userData.plazaRefinement;
}
