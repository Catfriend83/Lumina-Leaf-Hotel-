import {T,Kit,rng} from './core.js?v=75';
import {bench,tree} from './village.js?v=91';
import {createGroundContact} from './ground-contact.js?v=75';
import {PLAZA_ORDER} from './plaza-order-data.js?v=75';
export {PLAZA_ORDER};
// A solid plinth follows the real paving below and has a level upper rim.
export function groundedRound(root,material,x,z,radius,surface,topLift=.05,name='Bodenangepasster Sockel',count=64){
 const contacts=Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count;return [x+Math.cos(a)*radius,surface(x+Math.cos(a)*radius,z+Math.sin(a)*radius),z+Math.sin(a)*radius];}),top=Math.max(...contacts.map(p=>p[1]))+topLift,p=[],ix=[];
 for(const v of contacts)p.push(v[0]-x,v[1]-top,v[2]-z);for(const v of contacts)p.push(v[0]-x,0,v[2]-z);p.push(0,0,0);
 for(let i=0;i<count;i++){const j=(i+1)%count;ix.push(i,j,count+j,i,count+j,count+i,count*2,count+j,count+i);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:p.length/3},(_,i)=>[(p[i*3]+x)/2,(p[i*3+2]+z)/2]).flat(),2));g.setIndex(ix);g.computeVertexNormals();const mesh=new T.Mesh(g,material);mesh.name=name;mesh.position.set(x,top,z);mesh.receiveShadow=true;root.add(mesh);return {mesh,top,contacts};
}
export function buildOrderedPlaza(scene,m,surfaces){
 const surface=createGroundContact(surfaces),cfg=PLAZA_ORDER,[cx,cz]=cfg.center;
 for(const [i,[x,z]]of cfg.trees.entries()){
  const base=groundedRound(scene,m.stoneDark,x,z,cfg.treeBedRadius,surface,.04,'Eingefasstes symmetrisches Baumbeet '+i),group=new T.Group();group.name='Symmetrischer Platzbaum '+(i+1);group.position.set(x,base.top+.045,z);group.scale.set(.7,1,.7);group.userData={plazaTree:true,index:i,species:'Kompakte Feldlinde',height:cfg.treeHeight,contactY:base.top+.045,bedRadius:cfg.treeBedRadius};scene.add(group);
  const soil=new T.Mesh(new T.CylinderGeometry(cfg.treeBedRadius-.06,cfg.treeBedRadius-.06,.045,64),m.soil);soil.position.set(x,base.top+.0225,z);soil.name='Geplante Baumscheibe '+i;scene.add(soil);
  const k=new Kit(group);tree(k,m,0,0,0,rng(460101),cfg.treeHeight);k.finish();
 }
 const k=new Kit(scene);for(const [i,[x,z,angle]]of cfg.benches.entries()){const b=bench(k,m,x,surface(x,z)-.025,z,angle,surface);Object.assign(b.userData,{plazaBench:true,index:i,axisGroup:true,axisRadius:cfg.benchAxisRadius,frontClearance:cfg.benchFrontClearance,facesCenter:true});}
 const mat=m.stone.clone();mat.name='Feiner warmer Kalkstein des neuen Dorfbrunnens';mat.color.set('#d3c7b4');mat.bumpScale=.016;mat.roughness=.80;
 const base=groundedRound(scene,mat,cx,cz,2.20,surface,.06,'Geländeangepasstes Fundament des zentralen Dorfbrunnens'),f=new T.Group();f.name='Zentraler Natursteinbrunnen Seealm';f.position.set(cx,base.top,cz);f.userData={villageFountain:true,seatingGroupCentered:true,center:cfg.center,offset:cfg.fountainOffset,radius:2.2,contacts:base.contacts};scene.add(f);const q=new Kit(f);
 const profile=[[0,0],[2.13,0],[2.13,.15],[2.05,.18],[2.05,.50],[2.16,.51],[2.16,.62],[1.91,.62],[1.91,.51],[1.93,.48],[1.93,.22],[0,.22]].map(v=>new T.Vector2(...v));q.mesh(new T.LatheGeometry(profile,96),mat,'Klassisches Natursteinbecken mit geschlossenem Rand');
 const water=m.water.clone();water.name='Wasseroberfläche des zentralen Dorfbrunnens';water.color.set('#76a8ad');water.roughness=.16;water.opacity=.76;const disk=q.mesh(new T.CircleGeometry(1.92,96),water,'Ruhige Wasserfläche im Dorfbrunnen');disk.rotation.x=-Math.PI/2;disk.position.y=.47;
 q.cyl(mat,0,.70,0,.26,.96);q.cyl(mat,0,1.20,0,.44,.11);q.cyl(mat,0,1.35,0,.18,.22);
 const jetMat=new T.MeshPhysicalMaterial({name:'Klare Wasserstrahlen des Dorfbrunnens',color:'#b4d9dc',roughness:.09,transmission:.65,transparent:true,opacity:.66,depthWrite:false});
 for(let i=0;i<6;i++){const a=i*Math.PI/3,points=Array.from({length:25},(_,j)=>{const t=j/24,r=.16+t*1.18;return new T.Vector3(Math.cos(a)*r,1.43+.85*Math.sin(t*Math.PI)-.97*t,Math.sin(a)*r);});q.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.018,6,false),jetMat,'Bogenförmiger Wasserstrahl '+i);q.mesh(new T.TorusGeometry(.14,.008,4,32),water,'Feiner Wasserring '+i).position.set(Math.cos(a)*1.34,.478,Math.sin(a)*1.34);const ring=f.children.at(-1);ring.rotation.x=-Math.PI/2;}
 q.finish();const marker=new T.Object3D();marker.name='Geometrische Ordnung des vollständigen inneren Dorfplatzes';marker.position.set(cx,base.top,cz);marker.userData={plazaSymmetry:true,...cfg};scene.add(marker);
}
