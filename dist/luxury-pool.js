import {T,Kit,rng,person} from './core.js?v=75';
import {buildSpaPrivacy,buildPoolWallLighting} from './spa-details.js?v=75';
import {broadLeaf} from './vegetation.js?v=75';

export const POOL_LAYOUT={deck:{left:-7.0584,right:6.8854,back:-11.55,front:16.33},basin:{left:-4.65,right:4.65,back:-4.75,front:5.65},depth:1.15,chairXs:[-5.25,-3.15,-1.05,1.05,3.15,5.25],chairRows:[-8.55,13.0]};

export function clearGarageVegetation(scene,m){
 const vegetation=new Set(['spruce','forestPine','trunk','pine','pine2','leaf','leaf2','grassBlade','shrub','flowerRed','flowerWhite','flowerGold','warm'].map(key=>m[key]));
 const terrace=scene.getObjectByName('Eigenständige Hotel-Tiefgarage');scene.updateMatrixWorld(true);const inverse=terrace.matrixWorld.clone().invert(),corridor=new T.Box3(new T.Vector3(-21.88,-.2,13.41),new T.Vector3(-4.27,1.90,16.15));
 scene.traverse(mesh=>{if(!mesh.isInstancedMesh||!vegetation.has(mesh.material))return;mesh.geometry.computeBoundingBox();const kept=[],matrix=new T.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld).premultiply(inverse));if(!box.intersectsBox(corridor))kept.push(matrix.clone());}if(kept.length===mesh.count)return;mesh.count=kept.length;kept.forEach((a,i)=>mesh.setMatrixAt(i,a));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();});
}

export function makePoolMaterials(m,createCanvas){
 const random=rng(270527),c=createCanvas(128,128),ctx=c.getContext('2d'),pixels=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=170+random()*35+(x%4===0?-18:0)+(y%4===0?-12:0);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}
 ctx.putImageData(pixels,0,0);const weave=new T.CanvasTexture(c);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(20,20);
 m.poolCushion=new T.MeshStandardMaterial({name:'Dicke Polster aus hellem Resortgewebe',color:'#d7ccba',bumpMap:weave,bumpScale:.0015,roughness:.96});
 m.poolTowel=new T.MeshStandardMaterial({name:'Smaragdgrünes gefaltetes Hotelhandtuch',color:'#12563d',bumpMap:weave,bumpScale:.002,roughness:1});
 m.poolStitch=new T.MeshStandardMaterial({name:'Feine grüne Handtuchnaht',color:'#247050',roughness:1});
 m.poolFrame=new T.MeshStandardMaterial({name:'Pulverbeschichteter anthrazitfarbener Liegenrahmen',color:'#26312e',roughness:.45,metalness:.48});
 m.poolDeck=m.stone.clone();m.poolDeck.name='Heller großformatiger Naturstein der Poolterrasse';m.poolDeck.color.set('#ece7db');m.poolDeck.bumpScale=.014;
 m.poolCeramic=new T.MeshStandardMaterial({name:'Feine türkisgraue Poolkeramik',color:'#8ca9a2',roughness:.38});
 m.poolGrout=new T.MeshStandardMaterial({name:'Feine Fugen der Poolplatten',color:'#a4a79e',roughness:.88});
 m.poolGreen=new T.MeshStandardMaterial({name:'Dezente smaragdgrüne Unterwasserleuchte',color:'#9edac0',emissive:'#2b9e60',emissiveIntensity:.65,roughness:.25});
 m.poolWarm=new T.MeshStandardMaterial({name:'Indirekte warme Poolbodenbeleuchtung',color:'#e3cfac',emissive:'#ffd293',emissiveIntensity:.9,roughness:.4});
 // The transparent thread mask is an exact, readable wordmark, with no glow.
 const embroidery=createCanvas(1024,192),ec=embroidery.getContext('2d');ec.textAlign='center';ec.textBaseline='middle';ec.font='italic bold 92px Georgia,serif';
 ec.shadowColor='#183c2c';ec.shadowBlur=0;ec.shadowOffsetX=2;ec.shadowOffsetY=3;ec.fillStyle='#e1d9ba';ec.fillText('Lumina Leaf Hotel',512,96,970);ec.shadowOffsetX=ec.shadowOffsetY=0;
 ec.globalCompositeOperation='source-atop';ec.strokeStyle='rgba(255,248,213,.45)';ec.lineWidth=1;for(let x=-192;x<1024;x+=4){ec.beginPath();ec.moveTo(x,192);ec.lineTo(x+192,0);ec.stroke();}
 const thread=new T.CanvasTexture(embroidery);thread.colorSpace=T.SRGBColorSpace;thread.anisotropy=16;
 m.poolEmbroidery=new T.MeshStandardMaterial({name:'Gestickter Schriftzug Lumina Leaf Hotel auf jedem Handtuch',map:thread,transparent:true,alphaTest:.03,roughness:.96,bumpMap:thread,bumpScale:.0006,side:T.DoubleSide,depthWrite:false});
 // Portable PBR water; the website adds animated planar reflections to this basin.
 m.resortWater=new T.MeshPhysicalMaterial({name:'Klares natürliches Resort-Poolwasser',color:'#80aaa4',roughness:.12,metalness:0,transparent:true,opacity:.55,normalMap:m.water.normalMap,normalScale:new T.Vector2(.04,.04),clearcoat:1,ior:1.333,side:T.DoubleSide,depthWrite:false});
}

export function buildLuxuryPool(terrace,m,{position=[-12.3,2.63,2.65]}={}){
 const g=new T.Group();g.name='Luxuriöser Lumina Leaf Resort-Poolbereich';g.position.fromArray(position);g.scale.set(1/terrace.scale.x,1/terrace.scale.y,1/terrace.scale.z);g.userData={resortPool:true,chairs:12,depthMeters:POOL_LAYOUT.depth};terrace.add(g);
 const k=new Kit(g),d=POOL_LAYOUT.deck,b=POOL_LAYOUT.basin,random=rng(270527);
 const box=(material,x,y,z,w,h,l)=>k.box(material,x,y,z,w,h,l);
 const deckRect=(x0,x1,z0,z1)=>{const geometry=new T.BoxGeometry(x1-x0,.25,z1-z0);const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++)if(Math.abs(n.getY(i))>.5)uv.setXY(i,(p.getX(i)+(x0+x1)/2)/2,(p.getZ(i)+(z0+z1)/2)/2);const mesh=k.mesh(geometry,m.poolDeck,'Großformatiger Naturstein am Pool');mesh.position.set((x0+x1)/2,-.125,(z0+z1)/2);};
 deckRect(d.left,b.left-.22,d.back,d.front);deckRect(b.right+.22,d.right,d.back,d.front);deckRect(b.left-.22,b.right+.22,d.back,b.back-.22);deckRect(b.left-.22,b.right+.22,b.front+.22,d.front);
 // A real recessed basin replaces the old almost flat tile sheet. Its underside
 // is supported by the dedicated spa bearing plate after relocation.
 box(m.poolCeramic,0,-POOL_LAYOUT.depth-.09,.45,9.66,.18,10.76);
 for(const x of [b.left-.09,b.right+.09])box(m.poolCeramic,x,-.575,.45,.18,1.15,10.76);
 for(const z of [b.back-.09,b.front+.09])box(m.poolCeramic,0,-.575,z,9.3,1.15,.18);
 for(const x of [b.left-.16,b.right+.16])k.bevel(m.poolDeck,x,.025,.45,.34,.05,11.06,.015);
 for(const z of [b.back-.16,b.front+.16])k.bevel(m.poolDeck,0,.025,z,9.3,.05,.34,.015);
 // Flush overflow/drain slots inside the stone coping.
 for(const x of [b.left-.24,b.right+.24])box(m.poolFrame,x,.052,.45,.025,.006,10.6);
 for(const z of [b.back-.24,b.front+.24])box(m.poolFrame,0,.052,z,9.3,.006,.025);
 for(let x=b.left+.6;x<b.right;x+=.6)box(m.poolGrout,x,-1.145,.45,.006,.003,10.38);
 for(let z=b.back+.6;z<b.front;z+=.6)box(m.poolGrout,0,-1.145,z,9.28,.003,.006);
 // Quiet large-slab joints on the usable terrace; none crosses into the basin.
 for(let z=d.back+1.2;z<d.front;z+=1.2)for(const [a,c] of [[d.left,b.left-.34],[b.right+.34,d.right]])box(m.poolGrout,(a+c)/2,.002,z,c-a,.003,.008);
 for(const [a,c] of [[d.back,b.back-.34],[b.front+.34,d.front]])for(let x=-6;x<6.4;x+=1.2)box(m.poolGrout,x,.002,(a+c)/2,.008,.003,c-a);
 const water=k.mesh(new T.PlaneGeometry(9.28,10.38,32,32),m.resortWater,'Pool Wasseroberfläche');water.rotation.x=-Math.PI/2;water.position.set(0,-.055,.45);water.castShadow=false;water.userData={resortWater:true,depthMeters:1.095};
 // Shallow submerged steps occupy only one corner, with continuous handrails.
 for(let i=0;i<4;i++)box(m.poolCeramic,3.65,-.17-i*.26,b.back+.30+i*.35,1.62,.26,.72);
 for(const x of [3.0,4.25]){k.line(m.chrome,[x,.85,b.back-.50],[x,.85,b.back+.85],.026);k.line(m.chrome,[x,.85,b.back-.50],[x,.05,b.back-.50],.026);k.line(m.chrome,[x,.85,b.back+.85],[x,-.66,b.back+.85],.026);}
 buildPoolWallLighting(g,m,b);
 for(const x of [-4.3,4.3]){const light=new T.PointLight('#4cba87',1.1,3.3,2);light.name='Gedämpftes grünes Licht im Pool';light.position.set(x,-.43,1);g.add(light);}
 function chaise(x,z,angle,index){const chair=new T.Group();chair.name=`Poolliege ${String(index).padStart(2,'0')} mit grünem Hotelhandtuch`;chair.position.set(x,0,z);chair.rotation.y=angle;chair.userData={poolLounger:true,towel:true,hotelName:'Lumina Leaf Hotel',widthMeters:.90,lengthMeters:2.20};g.add(chair);const q=new Kit(chair);
  q.bevel(m.poolFrame,0,.33,0,.96,.12,2.2,.035);q.bevel(m.poolCushion,0,.465,.27,.89,.16,1.50,.035);
  q.put(new T.BoxGeometry(.96,.075,1.13),m.poolFrame,0,.665,-.73,1,1,1,-.68,0,0);
  q.put(new T.BoxGeometry(.90,.17,1.10),m.poolCushion,0,.74,-.78,1,1,1,-.68,0,0);
  for(const xx of [-.38,.38])for(const zz of [-.84,.84])q.box(m.poolFrame,xx,.135,zz,.045,.27,.055);
  q.bevel(m.poolCushion,0,.99,-1.04,.68,.13,.28,.04);
  // Three visible folded layers, stitched border and a textured thread wordmark.
  for(let layer=0;layer<3;layer++)q.bevel(m.poolTowel,0,.558+layer*.024,.55,.70,.023,.48,.009);
  for(const xx of [-.329,.329])q.box(m.poolStitch,xx,.618,.55,.005,.002,.43);for(const zz of [.34,.76])q.box(m.poolStitch,0,.618,zz,.66,.002,.005);
  const label=q.mesh(new T.PlaneGeometry(.63,.118),m.poolEmbroidery,'Gestickter Hotelname auf grünem Handtuch');label.rotation.x=-Math.PI/2;label.position.set(0,.618,.55);label.castShadow=false;label.userData={embroideredHotelName:'Lumina Leaf Hotel'};q.finish();
 }
 let index=0;for(const [row,z] of POOL_LAYOUT.chairRows.entries())for(const x of POOL_LAYOUT.chairXs)chaise(x,z,row?Math.PI:0,++index);
 for(const z of POOL_LAYOUT.chairRows)for(const x of [-4.2,0,4.2]){k.cyl(m.poolFrame,x,.27,z,.025,.54);k.cyl(m.poolFrame,x,.025,z,.22,.05);k.cyl(m.poolDeck,x,.57,z,.31,.055);k.cyl(m.glass,x-.08,.69,z,.045,.18);k.cyl(m.glass,x+.08,.75,z,.043,.30);k.cyl(m.chrome,x+.08,.91,z,.03,.02);}
 // Planned perimeter planting stays outside circulation routes and chair footprints.
 function planter(x,z,h=.55){k.box(m.poolFrame,x,h/2,z,.64,h,.64);k.box(m.soil,x,h+.01,z,.55,.035,.55);for(let i=0;i<11;i++){const a=i*2.4,l=.35+random()*.23;const tip=[x+Math.cos(a)*l,h+.25+random()*.30,z+Math.sin(a)*l];k.line(m.trunk,[x,h,z],tip,.009);k.put(broadLeaf,i%2?m.leaf:m.leaf2,...tip,.34,.47,.38,-.3,a,Math.sin(a)*.4);}k.box(m.poolWarm,x,.08,z+.326,.32,.027,.008);}
 for(const x of [-5.9,5.9])planter(x,15.7,.72);
 for(const x of [-3.9,-1.3,1.3,3.9])planter(x,15.95,.32);
 for(const x of [-6.0,6.0]){const z=-10.6;k.cyl(m.poolFrame,x,.38,z,.34,.76);for(let i=0;i<7;i++){const a=i*2.4,tip=[x+Math.cos(a)*.46,1.6+random()*.65,z+Math.sin(a)*.46];k.line(m.trunk,[x,.7,z],tip,.018);k.put(broadLeaf,m.leaf,...tip,.50,.95,.48,-.35,a,Math.sin(a)*.25);}const light=new T.PointLight('#ffd7a2',1.8,3,2);light.name='Indirektes Pflanzenlicht der Poolterrasse';light.position.set(x,.15,z+.4);g.add(light);}
 // Spa walls preserve the existing open connection to the hotel.
 buildSpaPrivacy(g,m,d);
 for(const x of [d.left+.10,d.right-.10])for(const z of [-10.5,-5.6,.3,6.2,11.1,15.7]){box(m.poolFrame,x,.07,z,.12,.14,.12);box(m.poolWarm,x,.145,z,.075,.008,.075);}
 person(k,m,-1.3,-1.15,.5,{swim:true,rot:1.6});person(k,m,.7,-1.15,1,{swim:true,hair:m.blonde,rot:-1.3});
 k.finish();return g;
}
