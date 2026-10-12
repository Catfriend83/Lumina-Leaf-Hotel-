import {T,Kit} from './core.js?v=75';
// A distinct nave and recessed choir stay within the established church parcel.
export const CHURCH_PLAN={nave:{w:8,d:9.7,h:5.7,z:1.15},choir:{w:6,d:2.3,h:5.15,z:-4.85},windows:9};
function faces(b){const out=[];for(const sign of [1,-1])out.push({axis:'front',sign,angle:sign===1?0:Math.PI,point:x=>[sign*x,sign*b.d/2],windows:[]});for(const sign of [1,-1])out.push({axis:'side',sign,angle:sign*Math.PI/2,point:x=>[sign*b.w/2,-sign*x],windows:[]});return out;}
function roof(k,m,b,s,label){
 const rise=b.w*s.slope,over=s.eaves,half=b.w/2+over,angle=Math.atan2(rise,b.w/2),edge=b.h-over*Math.tan(angle),ridge=b.h+rise;
 const mat=m.roof.clone();mat.name='Dunkles strukturiertes Kirchendach '+label+' kapelle';if(mat.map){mat.map=mat.map.clone();mat.map.repeat.set(Math.hypot(half,rise+over*Math.tan(angle))/(.22*4),(b.d+2*over)/(.32*5));mat.bumpMap=mat.map;}
 for(const side of [-1,1]){k.put('box',mat,side*half/2,(edge+ridge)/2,0,half/Math.cos(angle),.15,b.d+2*over,0,0,-side*angle);k.box(m.wood,side*half,edge-.025,0,.10,.16,b.d+2*over+.025);
  // Half-round gutters with an open trough and closed rounded ends.
  const curve=new T.Shape();const R=.075,r=.056;curve.moveTo(-R,0);curve.absarc(0,0,R,Math.PI,Math.PI*2,false);curve.lineTo(r,0);curve.absarc(0,0,r,0,-Math.PI,true);curve.closePath();
  const gutter=k.mesh(new T.ExtrudeGeometry(curve,{depth:b.d+2*over,bevelEnabled:false,curveSegments:12}),m.gutter,'Halbrunde Dachrinne '+label);gutter.position.set(side*half,edge-.12,-b.d/2-over);gutter.userData={churchGutter:true,section:label};
  for(const face of [-1,1]){k.line(m.wood,[0,ridge+.075,face*(b.d/2+over+.02)],[side*half,edge+.075,face*(b.d/2+over+.02)],.053);}
 }
 for(const face of [-1,1]){if(label==='choir'&&face===1)continue;const shape=new T.Shape();shape.moveTo(-b.w/2,b.h);shape.lineTo(b.w/2,b.h);shape.lineTo(0,ridge);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false});geo.translate(0,0,-.11);const mesh=k.mesh(geo,m.plaster,'Verputzter Kirchengiebel '+label);mesh.position.z=face*b.d/2;}
 k.box(mat,0,ridge+.10,0,.17,.12,b.d+2*over+.06);
 const yTop=edge-.12,yBottom=.18;
 for(const side of [-1,1]){const x=side*half,z=-b.d/2+.22;
  k.line(m.gutter,[x,yTop,z],[side*(b.w/2+.19),yTop-.32,z],.036);k.cyl(m.gutter,side*(b.w/2+.19),(yTop-.32+yBottom)/2,z,.036,yTop-.32-yBottom);
  for(const y of [.75,2.65,4.20].filter(y=>y<yTop-.35))k.box(m.gutter,side*(b.w/2+.16),y,z,.09,.04,.10);
  k.line(m.gutter,[side*(b.w/2+.19),yBottom,z],[side*(b.w/2+.26),.07,z-.12],.036);
 }
 const marker=new T.Object3D();marker.name='Kirchendach ohne Wohnhauskamin '+label;marker.userData={churchRoof:true,section:label,tiles:true,chimney:false,gutters:2,downpipes:2};k.root.add(marker);
}
function base(k,m,b,frontDoor){
 for(const side of [-1,1])k.box(m.archStone,side*(b.w/2-.04),.36,0,.20,.40,b.d);
 for(const face of [-1,1]){if(frontDoor){const gap=face===1?1.3:6,w=(b.w-gap)/2;for(const side of [-1,1])k.box(m.archStone,side*(gap/2+w/2),.36,face*(b.d/2+.015),w,.40,.27);}else k.box(m.archStone,0,.36,face*(b.d/2+.015),b.w,.40,.27);}
}
function exteriorLantern(k,m,x,z){
 k.box(m.portalMetal,x,2.65,z+.12,.09,.25,.085);k.line(m.portalMetal,[x,2.72,z+.14],[x,2.72,z+.38],.022);
 k.box(m.portalMetal,x,2.38,z+.38,.26,.06,.25);k.box(m.portalMetal,x,2.80,z+.38,.30,.06,.29);k.box(m.portalLight,x,2.59,z+.38,.18,.32,.17);
 for(const side of [-1,1])for(const face of [-1,1])k.box(m.portalMetal,x+side*.115,2.59,z+.38+face*.11,.021,.36,.021);
 const light=new T.PointLight('#ffd2a0',1.1,3.2,2);light.name='Dezentes warmweißes Kirchenportallicht';light.position.set(x,2.60,z+.50);light.userData={churchExteriorLight:true,temperature:2700};k.root.add(light);
}
export function buildChurchRefinement(k,m,b,s,archedWall,archDetail,ornament){
 const parts=[];
 for(const [label,p]of Object.entries(CHURCH_PLAN).filter(([key])=>key!=='windows')){
  const group=new T.Group();group.name=label==='nave'?'Rechteckiges Kirchenschiff':'Eingezogener Chor der Dorfkirche';group.position.z=p.z;group.userData={churchPart:label,width:p.w,depth:p.d,height:p.h};k.root.add(group);const kit=new Kit(group),sides=faces(p);base(kit,m,p,label==='nave');
  for(const side of sides){
   if(label==='choir'&&side.axis==='front'&&side.sign===1)continue;
   const rearConnection=label==='nave'&&side.axis==='front'&&side.sign===-1;
   if(!rearConnection){const xs=side.axis==='side'&&label==='nave'?[-p.d*.27,p.d*.27]:label==='nave'?[-p.w*.28,p.w*.28]:[0];for(const x of xs)side.windows.push({x,y:2.67,w:label==='choir'?.88:1.05,h:label==='choir'?2.12:2.3});}
   const openings=[...side.windows];if(rearConnection)openings.push({x:0,y:2.20,w:2.7,h:4.4});if(label==='nave'&&side.axis==='front'&&side.sign===1)openings.push({x:0,y:1.28,w:1.30,h:2.56});
   archedWall(kit,m,p,side,openings);side.windows.forEach(o=>archDetail(kit,m,o,side));if(label==='nave'&&side.axis==='front'&&side.sign===1)archDetail(kit,m,{x:0,y:1.28,w:1.30,h:2.56},side,true);
  }
  ornament(kit,m,p,{...s,clearChoirWindowAxis:label==='choir'},sides.filter(side=>!(label==='choir'&&side.axis==='front'&&side.sign===1)));
  roof(kit,m,p,{...s,eaves:label==='choir'?.42:s.eaves},label);kit.finish();parts.push(group);
 }
 // A continuous oak portal with genuine raised panels and understated ironwork.
 for(const sign of [-1,1]){k.box(m.wood,sign*.28,1.17,b.d/2+.085,.43,1.84,.035);for(const y of [.53,1.78]){k.box(m.wood,sign*.28,y,b.d/2+.112,.34,.46,.027);k.box(m.portalMetal,sign*.40,y-.15,b.d/2+.138,.27,.025,.018);}k.box(m.portalMetal,sign*.11,1.16,b.d/2+.153,.024,.21,.025);exteriorLantern(k,m,sign*1.02,b.d/2);}
 const portal=new T.Object3D();portal.name='Freies hochwertiges Kirchenportal';portal.userData={churchPortal:true,doorWidth:1.3,raisedOakPanels:4,lanterns:2,entranceClear:true,existingStepPreserved:true};k.root.add(portal);
 const plan=new T.Object3D();plan.name='Kirchenschiff und eingezogener Chor';plan.userData={churchPlan:true,...CHURCH_PLAN,originalParcel:true,positionUnchanged:true};k.root.add(plan);
 return parts;
}
