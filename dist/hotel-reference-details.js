import {T,Kit} from './core.js?v=75';

// Real stars and lettering on the building; the reference stays an unedited atlas.
export function fiveStars(parent,material,x,y,z,width,starRadius=width/11){
 const row=new T.Group();row.name='Genau fünf goldene Hotelsterne';row.position.set(x,y,z);
 row.userData={hotelStars:true,count:5};parent.add(row);const k=new Kit(row);
 const shape=new T.Shape(),radius=starRadius;
 for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?radius*.43:radius;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?shape.lineTo(px,py):shape.moveTo(px,py);}shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.006,bevelThickness:.005});
 for(let i=0;i<5;i++)k.put(geo,material,(i-2)*width/5,0,0);k.finish();return row;
}
export function hotelLettering(parent,{x,y,z,width,height,color='#e8d391',exterior=false,referenceScript=null}){
 if(exterior&&referenceScript){
  const map=referenceScript.clone();
  // Crop only the decal's empty vertical margin through UVs, never the artwork.
  map.repeat.set(1,.58);map.offset.set(0,.21);map.needsUpdate=true;
  const material=new T.MeshStandardMaterial({name:'Grüner Hotel-Schriftzug nach Referenz 5',map,emissiveMap:map,emissive:'#ffffff',emissiveIntensity:.28,color:'#adcfba',transparent:true,roughness:.94,metalness:0,envMapIntensity:.10,depthWrite:false});
  const sign=new T.Mesh(new T.PlaneGeometry(width,height),material);sign.position.set(x,y,z);sign.name='Lumina Leaf Hotel';sign.userData={hotelLettering:true,title:'Lumina Leaf Hotel',exterior:true,reference:5};parent.add(sign);return sign;
 }
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=384;
 const ctx=canvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
 ctx.font='270px "Lumina Script", "Z003", cursive';ctx.fillText('Lumina Leaf Hotel',1024,205,1950);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshStandardMaterial({name:exterior?'Grüner Hotel-Schriftzug':'Goldener Rezeptions-Schriftzug',map,emissiveMap:map,emissive:'#ffffff',emissiveIntensity:exterior?.65:.20,transparent:true,roughness:.65,metalness:.05,depthWrite:false});
 const sign=new T.Mesh(new T.PlaneGeometry(width,height),material);sign.position.set(x,y,z);sign.name='Lumina Leaf Hotel';sign.userData={hotelLettering:true,title:'Lumina Leaf Hotel',exterior};parent.add(sign);return sign;
}
function faceMaterial(m,box,name){
 const texture=m.entranceReference.clone();texture.repeat.set((box[2]-box[0])/1536,(box[3]-box[1])/1536);texture.offset.set(box[0]/1536,1-box[3]/1536);texture.needsUpdate=true;
 return new T.MeshStandardMaterial({name,map:texture,roughness:.90,metalness:0,envMapIntensity:.2});
}
export function buildReferenceStaff(parent,m,x,y,z,{index=0,reception=false}={}){
 const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(reception?1:1.7);
 g.name=reception?(index?'Rezeption rechts':'Rezeption links'):(index?'Portier rechts – älter, Bart':'Portier links – jünger, glatt rasiert');
 g.userData={referenceStaff:true,receptionist:reception,doorman:!reception,identity:index,uniform:'dunkelgrün',handsFolded:true};parent.add(g);const k=new Kit(g);
 const skin=new T.MeshStandardMaterial({name:g.name+' Haut',color:index?'#bc937b':'#d4aa90',roughness:.95});
 const fabric=new T.MeshStandardMaterial({name:g.name+' Uniform',color:reception?'#192420':'#0c2921',roughness:.97});
 const hair=new T.MeshStandardMaterial({name:g.name+' Haar',color:reception?'#3a2418':index?'#423e39':'#32251c',roughness:1});
 for(const side of [-1,1]){
  k.bevel(fabric,side*.102,.49,0,.155,.83,.19,.04);
  k.bevel(m.black,side*.105,.054,.070,.17,.105,.31,.025);
 }
 k.bevel(fabric,0,1.11,0,.45,.71,.28,.08);k.bevel(fabric,0,.80,0,.39,.23,.25,.035);
 k.box(m.white,0,1.32,.149,.12,.23,.022);k.box(m.black,0,1.29,.168,.035,.19,.012);
 for(const side of [-1,1]){
  k.line(m.gold,[side*.15,1.45,.155],[side*.065,1.23,.165],.006);
  k.line(fabric,[side*.235,1.36,0],[side*.275,1.00,.035],.065);
  k.line(fabric,[side*.275,1.00,.035],[side*.045,.91,.18],.055);
  k.line(m.gold,[side*.11,.93,.145],[side*.065,.91,.19],.008);
  k.ball(reception?skin:m.white,side*.042,.91,.184,.062,.047,.047);
  k.box(m.gold,side*.145,1.26,.148,.074,.014,.012);
  k.box(fabric,side*.145,1.23,.148,.09,.05,.018);
 }
 for(let i=0;i<5;i++)k.ball(m.gold,0,.92+i*.078,.158,.011);
 k.cyl(skin,0,1.52,0,.058,.12);
 k.ball(skin,0,1.68,0,index?.128:.119,.166,.120);
 k.ball(hair,0,1.77,-.04,.122,.095,.105);
 if(reception)k.ball(hair,0,1.65,-.12,.087,.075,.062);
 for(const side of [-1,1])k.ball(skin,side*.121,1.67,0,.023,.043,.025);
 // The two photographed faces wrap a curved frontal head surface, not a flat person cutout.
 const crops=reception?[[944,714,980,749],[1117,714,1151,749]]:[[410,688,458,745],[1310,700,1356,760]];
 const mat=faceMaterial(m,crops[index],g.name+' Referenzgesicht');
 const face=new T.SphereGeometry(1,28,20,Math.PI*.23,Math.PI*.54,Math.PI*.16,Math.PI*.72);
 const pos=face.attributes.position,uv=face.attributes.uv;
 for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+1)/2,(pos.getY(i)+1)/2);
 const mesh=k.mesh(face,mat,'Individuelles Referenzgesicht');mesh.position.set(0,1.68,.009);mesh.scale.set(index?.129:.120,.167,.123);
 if(!reception){
  k.cyl(fabric,0,1.89,0,.15,.12);k.cyl(m.gold,0,1.845,0,.152,.018);
  k.bevel(m.black,0,1.834,.105,.23,.023,.18,.025);
  k.ball(m.gold,0,1.897,.147,.022,.030,.009);
 }
 k.finish();return g;
}
