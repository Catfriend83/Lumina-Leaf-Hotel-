import {gardenSpaJunctionHeight} from './spa-wing.js?v=75';
import {T,Kit,rng} from './core.js?v=75';
import {broadLeaf} from './vegetation.js?v=75';

export const SPA_PRIVACY={height:1.83,solidHeight:1.58,baseHeight:.40,doorway:[-5.705,-3.36]};
export const GARDEN_PATH={startZ:-49,endZ:18.3,worldEndZ:26.3,width:5.5};

export function makeSpaMaterials(m){
 m.spaStone=m.poolDeck.clone();m.spaStone.name='Helle ruhige Steinflächen des Spa-Sichtschutzes';m.spaStone.color.set('#d6d1c5');m.spaStone.bumpScale=.009;
 m.spaFrame=m.poolFrame.clone();m.spaFrame.name='Schmale dunkle Spa-Rahmen und Schattenfugen';
 m.spaGlass=new T.MeshPhysicalMaterial({name:'Satiniertes Lichtband über dem Spa-Sichtschutz',color:'#c9d0c6',roughness:.78,metalness:0,transparent:true,opacity:.77,side:T.DoubleSide});
 m.spaLeaf=m.leaf.clone();m.spaLeaf.name='Dezente Begrünung vor dem Spa-Sichtschutz';
 m.spaSoil=m.soil.clone();m.spaSoil.name='Substrat der integrierten Spa-Pflanzgefäße';
 m.spaEdge=m.ivory.clone();m.spaEdge.name='Durchgehende saubere Wegbegrenzung aus hellem Stein';
 m.spaChrome=m.chrome.clone();m.spaChrome.name='Gebürstete Einfassungen der Poolwandleuchten';m.spaChrome.roughness=.36;
 m.signalHousing=new T.MeshStandardMaterial({name:'Anthrazitfarbenes Gehäuse der Garagenampel',color:'#1f2827',metalness:.45,roughness:.38});
 m.signalRed=new T.MeshPhysicalMaterial({name:'Aktives rotes Einfahrtsignal',color:'#a02024',emissive:'#ef1e29',emissiveIntensity:1.4,roughness:.2,clearcoat:1});
 m.signalGreen=new T.MeshPhysicalMaterial({name:'Inaktives grünes Einfahrtsignal',color:'#092117',roughness:.25,clearcoat:1});
}

export function buildSpaPrivacy(pool,m,deck){
 const group=new T.Group();group.name='Moderner Spa-Sichtschutz rund um die Poolterrasse';group.userData={spaPrivacy:true,style:'modern-spa',heightMeters:SPA_PRIVACY.height,doorwayMeters:SPA_PRIVACY.doorway[1]-SPA_PRIVACY.doorway[0]};pool.add(group);const k=new Kit(group);
 function side(start,end){const a=new T.Vector3(...start),b=new T.Vector3(...end),length=a.distanceTo(b),mid=a.clone().lerp(b,.5),angle=-Math.atan2(b.z-a.z,b.x-a.x),count=Math.ceil(length/3.5),panel=length/count;
  k.box(m.spaStone,mid.x,.20,mid.z,length,.40,.14,angle);
  k.box(m.spaFrame,mid.x,.42,mid.z,length,.035,.15,angle);
  for(let i=0;i<count;i++){const p=a.clone().lerp(b,(i+.5)/count);k.box(m.spaStone,p.x,1.01,p.z,panel-.035,1.14,.08,angle);}
  k.box(m.spaGlass,mid.x,1.705,mid.z,length,.25,.035,angle);k.box(m.spaFrame,mid.x,1.84,mid.z,length,.025,.065,angle);
  for(let i=0;i<=count;i++){const p=a.clone().lerp(b,i/count);k.box(m.spaFrame,p.x,1.115,p.z,.026,1.43,.085,angle);}
  // Recessed warm strips point into the terrace, underneath the stone ledge.
  const inward=new T.Vector3(-mid.x,0,0);if(Math.abs(a.z-b.z)<1e-5)inward.set(0,0,a.z<0?1:-1);inward.normalize();k.box(m.poolWarm,mid.x+inward.x*.078,.382,mid.z+inward.z*.078,length-.08,.018,.009,angle);
  const marker=new T.Object3D();marker.name='Geschlossener Spa-Sichtschutzabschnitt';marker.userData={privacySection:true,start,end,heightMeters:1.83};group.add(marker);
 }
 side([deck.left,0,deck.back],[deck.right,0,deck.back]);side([deck.left,0,deck.front],[deck.right,0,deck.front]);side([deck.left,0,deck.back],[deck.left,0,deck.front]);
 for(const [a,b] of [[deck.back,SPA_PRIVACY.doorway[0]],[SPA_PRIVACY.doorway[1],deck.front]])side([deck.right,0,a],[deck.right,0,b]);
 const random=rng(280928);for(const [x,z] of [[deck.left+.42,-3.5],[deck.left+.42,3.2],[deck.left+.42,9.4],[deck.right-.34,.2],[deck.right-.34,6.6],[deck.right-.34,10.7]]){
  k.box(m.spaFrame,x,.24,z,.43,.48,1.00);k.box(m.spaSoil,x,.48,z,.37,.03,.92);
  for(let i=0;i<13;i++){const pz=z-.39+i*.065,px=x+(random()-.5)*.16,y=.70+random()*.22;k.line(m.trunk,[px,.48,pz],[px,y,pz],.009);k.put(broadLeaf,m.spaLeaf,px,y,pz,.23,.42,.30,-.35,i*2.4,.15);}
 }
 k.finish();return group;
}

export function buildPoolWallLighting(pool,m,basin){
 const k=new Kit(pool),positions=[];
 for(const x of [basin.left+.01,basin.right-.01])for(const z of [-2.70,.45,3.60])positions.push({x,z,angle:x<0?Math.PI/2:-Math.PI/2});
 for(const z of [basin.back+.01,basin.front-.01])for(const x of [-3.10,0,3.10])positions.push({x,z,angle:z<0?0:Math.PI});
 for(const [index,p] of positions.entries()){
  const ring=k.mesh(new T.RingGeometry(.066,.09,16),m.spaChrome,'Eingelassene Einfassung der Poolwandleuchte');ring.position.set(p.x,-.52,p.z);ring.rotation.y=p.angle;
  const lens=k.mesh(new T.CircleGeometry(.064,16),m.poolGreen,'Beleuchtung an der inneren Poolwand');lens.position.set(p.x+Math.sin(p.angle)*.002,-.52,p.z+Math.cos(p.angle)*.002);lens.rotation.y=p.angle;lens.userData={poolWallFixture:true,index:index+1,recessed:true};
 }
 for(const z of [basin.back+.25,basin.front-.25]){const light=new T.PointLight('#4cba87',.75,3,2);light.name='Dezentes Licht an der kurzen Poolwand';light.position.set(0,-.43,z);pool.add(light);}
 k.finish();return positions.length;
}

export function buildGarageSignal(terrace,m){
 const group=new T.Group();group.name='Direkt an der Garagenfassade montierte Ampel';group.position.set(-4.0,1.65,13.47);group.scale.set(1/terrace.scale.x,1/terrace.scale.y,1/terrace.scale.z);group.userData={garageSignal:true,controls:'entry',state:'red',outsideDrivingLane:true,wallMounted:true,mountingLocal:[-4.0,1.65,13.40],noPole:true};terrace.add(group);const k=new Kit(group);
 k.bevel(m.signalHousing,0,0,0,.255,.57,.15,.03);for(const y of [-.20,.20])k.box(m.signalHousing,0,y,-.095,.14,.05,.04);
 for(const [y,material] of [[.12,m.signalRed],[-.12,m.signalGreen]]){k.cyl(m.spaChrome,0,y,.083,.072,.018,Math.PI/2);k.cyl(material,0,y,.098,.060,.014,Math.PI/2);k.box(m.signalHousing,0,y+.09,.124,.18,.016,.11);}
 k.finish();
 // The entry-only stop stripe follows the actual two-triangle asphalt grade.
 const join=x=>(28.4-terrace.position.z+Math.sin(terrace.rotation.y)*x*terrace.scale.x)/(Math.cos(terrace.rotation.y)*terrace.scale.z),left=-21.79,right=-4.36,back=13.43,endY=-.005/terrace.scale.y;
 const a=[left,back,.024],b=[right,back,.024],c=[left,join(left),endY],d=[right,join(right),endY];
 function grade(x,z){for(const [u,v,w] of [[a,c,d],[a,d,b]]){const den=(v[1]-w[1])*(u[0]-w[0])+(w[0]-v[0])*(u[1]-w[1]),s=((v[1]-w[1])*(x-w[0])+(w[0]-v[0])*(z-w[1]))/den,t=((w[1]-u[1])*(x-w[0])+(u[0]-w[0])*(z-w[1]))/den;if(s>=-1e-7&&t>=-1e-7&&s+t<=1+1e-7)return s*u[2]+t*v[2]+(1-s-t)*w[2];}throw new Error('Stop stripe leaves garage approach');}
 const points=[[-12.4375,14.39],[-12.4375,14.51],[-4.6375,14.51],[-4.6375,14.39]],geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(([x,z])=>[x,grade(x,z)+.0015,z]),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();const stop=new T.Mesh(geometry,m.roadPaint);stop.name='Haltelinie nur vor der Tiefgarageneinfahrt';stop.userData={garageStopLine:true};stop.receiveShadow=true;terrace.add(stop);return group;
}

function samples(start,end,knots=[]){const list=[start,end,...knots.filter(z=>z>start&&z<end)];for(let z=start+.75;z<end;z+=.75)list.push(z);return [...new Set(list)].sort((a,b)=>a-b);}
function ribbon(root,m,name,stations,inner,outer,base,top,extras){
 const positions=[],indices=[];for(const z of stations){const a=inner(z),b=outer(z),low=base(z),high=top(z);positions.push(a,low,z,b,low,z,b,high,z,a,high,z);}
 for(let i=0;i<stations.length-1;i++)for(let face=0;face<4;face++){const a=i*4+face,b=i*4+(face+1)%4,c=(i+1)*4+(face+1)%4,d=(i+1)*4+face;indices.push(a,b,c,a,c,d);}
 indices.push(0,3,2,0,2,1);const last=(stations.length-1)*4;indices.push(last,last+1,last+2,last,last+2,last+3);
 if(inner(stations[0])>outer(stations[0]))for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new T.Mesh(geo,m);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData=extras;root.add(mesh);return mesh;
}

export function buildGardenPath(root,m,pathShift,walkHeight){
 const cfg=GARDEN_PATH,stations=samples(cfg.startZ,cfg.endZ,[-16,-3,7,17.1]),height=z=>gardenSpaJunctionHeight(z,walkHeight(z)+.03+Math.max(0,(z-17.1)/1.2)*.075);
 const positions=[],uv=[],indices=[];for(const z of stations)for(const side of [-1,1]){const x=27+pathShift(z)+side*cfg.width/2;positions.push(x,height(z),z);uv.push(x/4,z/4);}
 for(let i=0;i<stations.length-1;i++){const j=i*2;indices.push(j,j+2,j+3,j,j+3,j+1);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const path=new T.Mesh(geo,m.cobbles);path.name='Sauber angebundener Gartenweg rechts neben dem Hotel';path.userData={gardenPath:true,endsBeforeRoad:true,worldEndZ:cfg.worldEndZ};path.receiveShadow=true;root.add(path);
 for(const side of [1]){const inner=z=>27+pathShift(z)+side*cfg.width/2,outer=z=>inner(z)+side*.18,taper=z=>Math.min(1,Math.max(0,(cfg.endZ-z)/.60));ribbon(root,m.spaEdge,'Durchgehender seitlicher Rand des Gartenwegs',stations,inner,outer,z=>height(z)-.03,z=>height(z)+.12*taper(z),{gardenPathEdge:true,worldEndZ:cfg.worldEndZ,side});}
 return path;
}

export function buildGardenBedEdges(root,m,edges,bankHeight){
 const stations=samples(-16.7,GARDEN_PATH.endZ,[-3,7]);for(const [i,edge] of edges.entries())if(i===0)ribbon(root,m.spaEdge,'Saubere Begrenzung des angrenzenden Gartenbeets',stations,z=>edge(z)-.115,z=>edge(z)+.115,z=>bankHeight(edge(z),z)-.02,z=>{const fade=Math.min(1,Math.max(0,(GARDEN_PATH.endZ-z)/.60));return .105+(bankHeight(edge(z),z)+.15-.105)*fade;},{gardenBedEdge:true,side:i,worldEndZ:GARDEN_PATH.worldEndZ});
}
