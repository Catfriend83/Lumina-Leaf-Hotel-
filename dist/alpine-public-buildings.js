import {buildChurchRefinement,CHURCH_PLAN} from './church-refinement.js?v=75';
import {T,Kit} from './core.js?v=75';
import {FOUNDATION_LEVELS} from './foundation-data.js?v=75';
import {buildingPoint,nearestRoadAccess} from './village-layout.js?v=75';
import {woodTexture,flowerBox,panel,window,balcony,timberWall} from './alpine-houses.js?v=75';
import {finishRegionalMaterials} from './regional-materials.js?v=75';

const PUBLIC_STYLES={
 townhall:{name:'Bayerisches Rathaus mit Putzerdgeschoss und Holzoberbau',color:'#eee7da',wood:'#644730',tile:'#80624e',slope:.32,eaves:.95,window:[1.10,1.48],shutters:'all',shutter:'#435849',foldedShutters:true,cladding:true,stone:true,flowers:'rich',railing:'carved'},
 inn:{name:'Bayerisches Landgasthaus mit geschnitzter Holzgalerie',color:'#eee3d1',wood:'#644730',tile:'#79574b',slope:.34,eaves:1.00,window:[1.10,1.44],shutters:'all',shutter:'#435849',cladding:true,stone:true,flowers:'rich',railing:'carved'},
 chapel:{name:'Bayerische Dorfkirche mit eingezogenem Chor, Zwiebelturm und Bleiglas',color:'#f3eee1',wood:'#725039',tile:'#626269',slope:.52,eaves:.58,window:[1.05,2.15],shutters:null,cladding:false,stone:true,flowers:null}
};
function sidesOf(b){const sides=[];
 for(const sign of [1,-1])sides.push({axis:'front',sign,angle:sign===1?0:Math.PI,point:x=>[sign*x,sign*b.d/2],windows:[]});
 for(const sign of [1,-1])sides.push({axis:'side',sign,angle:sign*Math.PI/2,point:x=>[sign*b.w/2,-sign*x],windows:[]});return sides;
}
function archPath(path,x,bottom,w,h){const r=w/2,shoulder=bottom+h-r;
 path.moveTo(x-r,bottom);path.lineTo(x+r,bottom);path.lineTo(x+r,shoulder);
 path.absarc(x,shoulder,r,0,Math.PI,false);path.lineTo(x-r,bottom);return path;
}
function archedWall(k,m,b,side,openings){
 const len=side.axis==='front'?b.w:b.d,shape=new T.Shape();shape.moveTo(-len/2,0);shape.lineTo(len/2,0);shape.lineTo(len/2,b.h);shape.lineTo(-len/2,b.h);shape.closePath();
 for(const o of openings){const hole=archPath(new T.Path(),o.x,o.y-o.h/2,o.w,o.h);shape.holes.push(hole);}
 const geo=new T.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:false,curveSegments:24});geo.translate(0,0,-.12);
 const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/2,p.getY(i)/2);
 const mesh=k.mesh(geo,m.plaster,'Verputzte Kapellenwand mit echten Rundbogenöffnungen');const [x,z]=side.point(0);mesh.position.set(x,0,z);mesh.rotation.y=side.angle;
}
function archDetail(k,m,o,side,door=false){
 const [x,z]=side.point(o.x),bottom=o.y-o.h/2,r=o.w/2,shoulder=bottom+o.h-r,c=Math.cos(side.angle),s=Math.sin(side.angle);
 const p=(dx,y,dz)=>[x+c*dx+s*dz,y,z-s*dx+c*dz],box=(mat,dx,y,dz,w,h,d)=>{const q=p(dx,y,dz);k.box(mat,...q,w,h,d,side.angle);};
 const shape=archPath(new T.Shape(),0,bottom,o.w-.045,o.h-.025),geo=new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false,curveSegments:24});
 geo.translate(0,0,-.0275);const mesh=k.mesh(geo,door?m.wood:m.stainedGlass,door?'Rundbogentür aus Eichenholz':'Bleiverglastes Buntglasfenster der Alpenkirche');mesh.position.set(x+s*.025,0,z+c*.025);mesh.rotation.y=side.angle;if(!door){const uv=geo.attributes.uv,pos=geo.attributes.position;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+o.w/2)/o.w,(pos.getY(i)-bottom)/o.h);mesh.userData={stainedGlass:true,windowWidth:o.w,windowHeight:o.h};}
 for(const sign of [-1,1])box(m.archStone,sign*(r+.045),(bottom+shoulder)/2,.08,.105,shoulder-bottom,.19);
 for(let i=0;i<24;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24;k.line(m.archStone,p((r+.045)*Math.cos(a),shoulder+(r+.045)*Math.sin(a),.08),p((r+.045)*Math.cos(b),shoulder+(r+.045)*Math.sin(b),.08),.053);}
 if(door){box(m.wood,0,(bottom+shoulder)/2,.07,.05,shoulder-bottom,.045);for(const sx of [-1,1])for(const y of [.46,1.91])box(m.frame,sx*o.w*.26,y,.083,o.w*.37,.055,.02);box(m.gold,.36,1.18,.11,.024,.19,.035);}
 else{box(m.archStone,0,bottom-.085,.04,o.w+.25,.09,.29);}
}
function stoneBase(k,m,b,doorW){
 for(const sign of [-1,1]){k.box(m.archStone,sign*(b.w/2-.04),.35,0,.20,.38,b.d);const w=(b.w-doorW)/2;k.box(m.archStone,sign*(doorW/2+w/2),.35,b.d/2+.015,w,.38,.27);}
 k.box(m.archStone,0,.35,-b.d/2-.015,b.w,.38,.27);
}
function cornices(k,m,b,s){
 for(const side of [-1,1]){k.box(m.wood,side*(b.w/2+.035),b.h-.12,0,.12,.16,b.d+.10);const angle=Math.atan2(b.w*s.slope,b.w/2),x=side*(b.w/2+s.eaves*.57),y=b.h-s.eaves*.57*Math.tan(angle)-.14;
  for(let z=-b.d/2-.12;z<b.d/2+.13;z+=.61)k.box(m.wood,x,y,z,s.eaves*.94,.11,.11);
 }
}
function makeStainedGlass(){
 const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#b6bdb5';ctx.fillRect(0,0,256,512);
 const colors=['#4a6587','#975650','#b39a61','#657966','#81718c','#b9ae8a'];
 const diamond=(x,y,r,col)=>{ctx.beginPath();ctx.moveTo(x,y-r*1.2);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r*1.2);ctx.lineTo(x-r,y);ctx.closePath();const gr=ctx.createLinearGradient(x-r,y-r,x+r,y+r);gr.addColorStop(0,col);gr.addColorStop(1,col+'c9');ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle='#353b3a';ctx.lineWidth=1.35;ctx.stroke();};
 for(let row=-1;row<14;row++)for(let col=-1;col<10;col++)diamond(col*32+(row%2)*16,row*38.4,16,colors[((row+2)*3+col+12)%colors.length]);
 ctx.strokeStyle='#bfa77a';ctx.lineWidth=6;ctx.strokeRect(10,10,236,492);ctx.strokeStyle='#373c3a';ctx.lineWidth=1.8;ctx.strokeRect(14,14,228,484);
 ctx.beginPath();ctx.arc(128,228,66,0,Math.PI*2);ctx.fillStyle='#c6b389';ctx.fill();ctx.stroke();
 for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.ellipse(128+Math.cos(a)*31,228+Math.sin(a)*31,15,29,a+Math.PI/2,0,Math.PI*2);ctx.fillStyle=colors[i%6];ctx.fill();ctx.stroke();}
 ctx.beginPath();ctx.arc(128,228,16,0,Math.PI*2);ctx.fillStyle='#d6bd82';ctx.fill();ctx.stroke();
 // The small gilded cross remains a quiet sacred motif within the glazing.
 ctx.strokeStyle='#7e6850';ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(128,218);ctx.lineTo(128,239);ctx.moveTo(120,226);ctx.lineTo(136,226);ctx.stroke();
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return new T.MeshPhysicalMaterial({name:'Traditionelles ornamentales Bleiglas kapelle',map:t,emissiveMap:t,emissive:'#e9cf9f',emissiveIntensity:.26,roughness:.20,metalness:0,clearcoat:.20,clearcoatRoughness:.15,side:T.DoubleSide});
}
function churchOrnament(k,m,b,s,sides){
 for(const side of sides){const len=side.axis==='front'?b.w:b.d;
  const box=(x,y,w,h,depth=.11)=>{const p=side.point(x);k.box(m.ochre,p[0]+Math.sin(side.angle)*.16,y,p[1]+Math.cos(side.angle)*.16,w,h,depth,side.angle);};
  for(const x of [-len/2+.20,len/2-.20]){box(x,b.h/2,.32,b.h);box(x,b.h-.32,.50,.16);box(x,.65,.50,.16);}
  box(0,b.h-.38,len,.18);box(0,b.h-.10,len+.10,.12);
  if(side.axis==='side'&&!s.clearChoirWindowAxis)box(0,b.h/2,.24,b.h-.55);
  for(const o of side.windows){const p=side.point(o.x);const ring=k.mesh(new T.RingGeometry(.20,.27,32),m.ochre,'Dezente ockerfarbene Fassadenkartusche');ring.position.set(p[0]+Math.sin(side.angle)*.145,b.h-.86,p[1]+Math.cos(side.angle)*.145);ring.scale.x=1.45;ring.rotation.y=side.angle;}
 }
}
function churchTower(k,m,b){
 const z=4.30,tb={w:2.7,d:2.7,h:13.15},tk=new Kit(k.root),towerSides=sidesOf(tb);
 for(const side of towerSides){const old=side.point;side.point=x=>{const p=old(x);return[p[0],p[1]+z];};
  const opening={x:0,y:11.04,w:1.18,h:1.73};archedWall(tk,m,tb,side,[opening]);
  const p=side.point(0),a=side.angle,c=Math.cos(a),ss=Math.sin(a),box=(mat,dx,y,dz,w,h,d)=>tk.box(mat,p[0]+c*dx+ss*dz,y,p[1]-ss*dx+c*dz,w,h,d,a);
  box(m.bellShadow,0,11.0,-.12,1.14,1.68,.04);for(let y=10.35;y<11.5;y+=.13)box(m.wood,0,y,.035,1.05,.045,.10);
  for(const dx of [-1.22,1.22])box(m.ochre,dx,6.57,.16,.22,13.15,.13);
  for(const y of [8.55,12.96,13.12])box(m.ochre,0,y,.18,2.86,.12,.17);
  const clock=tk.mesh(new T.CircleGeometry(.39,48),m.ivory,'Turmuhr der Alpenkirche');clock.position.set(p[0]+ss*.151,12.35,p[1]+c*.151);clock.rotation.y=a;
  for(let i=0;i<12;i++){const ang=i*Math.PI/6;box(m.frame,Math.sin(ang)*.31,12.35+Math.cos(ang)*.31,.166,.023,.052,.017);}
  tk.line(m.frame,[p[0]+ss*.18,12.35,p[1]+c*.18],[p[0]-c*.15+ss*.18,12.51,p[1]+ss*.15+c*.18],.015);
  tk.line(m.frame,[p[0]+ss*.18,12.35,p[1]+c*.18],[p[0]+c*.18+ss*.18,12.45,p[1]-ss*.18+c*.18],.019);
 }
 // Rounded onion profile: narrow neck, swelling belly, curved taper and finial.
 const controls=[[1.48,0],[1.50,.10],[1.08,.27],[1.28,.48],[1.59,.88],[1.72,1.24],[1.66,1.62],[1.43,1.98],[1.08,2.31],[.69,2.57],[.37,2.86],[.16,3.12],[.025,3.35]];
 const curve=new T.SplineCurve(controls.map(p=>new T.Vector2(...p))),profile=curve.getPoints(70);const roof=tk.mesh(new T.LatheGeometry(profile,48),m.towerRoof,'Geschwungene patinierte Zwiebelhaube');roof.position.set(0,13.22,z);
 for(let i=0;i<16;i++){const a=i*Math.PI/8;for(let j=0;j<profile.length-1;j++){const p=profile[j],q=profile[j+1];tk.line(m.copperSeam,[Math.cos(a)*(p.x+.009),13.22+p.y,z+Math.sin(a)*(p.x+.009)],[Math.cos(a)*(q.x+.009),13.22+q.y,z+Math.sin(a)*(q.x+.009)],.012);}}
 tk.ball(m.gold,0,16.60,z,.085);tk.box(m.gold,0,17.08,z,.057,.96,.057);tk.box(m.gold,0,17.22,z,.53,.057,.057);tk.finish();
 const mark=new T.Object3D();mark.name='Kirchturm und sakraler Charakter';mark.userData={sacredBuilding:true,archedWindows:CHURCH_PLAN.windows,stainedGlassWindows:CHURCH_PLAN.windows,clockFaces:4,cross:true,towerRoof:'rounded copper onion',towerPosition:[0,z],referenceStyleVersion:54};k.root.add(mark);
}
export function buildAlpinePublicBuilding(root,materials,b,height,buildRoof){
 const baseStyle=PUBLIC_STYLES[b.kind],s=b.kind==='townhall'?{...baseStyle,timberStart:b.h/2}:baseStyle;if(!s)throw new Error('Missing public building style '+b.id);
 const floor=FOUNDATION_LEVELS[b.id],g=new T.Group();g.name=b.kind==='townhall'?'Rathaus Seealm':b.kind==='inn'?'Gasthaus am Dorfplatz':'Dorfkapelle Seealm';g.position.set(b.x,floor,b.z);g.rotation.y=b.rot;
 g.userData={villageBuilding:true,referenceAlpinePublic:true,referenceStyleVersion:b.kind==='chapel'?54:b.kind==='townhall'?62:52,buildingId:b.id,kind:b.kind,footprint:{width:b.w,depth:b.d},floorY:floor,roofHeight:b.kind==='chapel'?17.56:b.h+b.w*s.slope,roofType:'gable',architecture:s.name,publicBuilding:true,storeys:b.kind==='chapel'?1:2,shutters:s.shutters,upperTimber:b.kind==='inn'||b.kind==='townhall',stoneBase:true};root.add(g);
 const clone=(source,name,color)=>{const mat=source.clone();mat.name=name+' '+b.id;mat.color.set(color);return mat;};
 const plaster=clone(materials.villagePlaster,'Dorfputz',s.color),wood=clone(materials.villageTimber,'Dorfholz',s.wood),roof=clone(materials.villageTiles,'Dorfziegel',s.tile),shutter=clone(materials.velvet,'Fensterläden',s.shutter||'#586554');
 wood.map=woodTexture();wood.bumpMap=wood.map;wood.bumpScale=.009;wood.roughness=.87;
 const archStone=clone(materials.stoneDark,'Regionaler Natursteinsockel','#b4aa97'),bellShadow=clone(materials.black,'Schatten der Schallöffnungen','#29251f'),towerRoof=clone(materials.villageRoof,'Patiniertes Kupfer der Kapellenhaube','#665c4b');towerRoof.map=null;towerRoof.bumpMap=null;towerRoof.metalness=.38;towerRoof.roughness=.65;
 const floral=(source,name,color)=>{const mat=clone(source,name,color);mat.map=null;mat.transparent=false;mat.alphaTest=0;mat.roughness=.86;return mat;};
 const flowerRed=floral(materials.flowerRed,'Landgasthausblüten rot','#bc3945'),flowerWhite=floral(materials.flowerWhite,'Landblüten creme','#efe7d6'),flowerPurple=floral(materials.flowerPurple,'Landblüten violett','#886c99');
 const townhallPink=b.kind==='townhall'?floral(materials.flowerRed,'Rathausblüten rosa','#c47a91'):null;
 const ochre=b.kind==='chapel'?clone(materials.villagePlaster,'Traditionelle ockerfarbene Putzgliederung','#cfbb89'):null,stainedGlass=b.kind==='chapel'?makeStainedGlass():null,copperSeam=b.kind==='chapel'?clone(towerRoof,'Kupferne Stehfalze','#4f514d'):null;
 const gutter=b.kind==='chapel'?clone(materials.frame,'Patinierte Kirchenentwässerung','#5c6460'):null,portalMetal=b.kind==='chapel'?clone(materials.frame,'Traditionelles Schmiedeeisen am Portal','#343c37'):null,portalLight=b.kind==='chapel'?clone(materials.warm,'Warmweißes Glas der Kirchenlaternen','#ffdcaa'):null;if(portalLight){portalLight.emissive.set('#efbb7c');portalLight.emissiveIntensity=.42;}
 const m=finishRegionalMaterials({...materials,plaster,wood,roof,shutter,archStone,bellShadow,towerRoof,ochre,stainedGlass,copperSeam,gutter,portalMetal,portalLight,flowerRed,flowerWhite,flowerPurple},b,s),k=new Kit(g),sides=sidesOf(b),doorW=b.kind==='inn'?1.52:1.30;
 // The established foundation and doorstep remain at precisely the old datum.
 k.box(m.stoneDark,0,-.12,0,b.w+.36,.24,b.d+.36);if(b.kind==='townhall'){
  // Continuous 45 cm plinth stays outside the wall skin and clear of the doorway.
  for(const sign of [-1,1])k.box(m.archStone,sign*(b.w/2+.135),.225,0,.10,.45,b.d+.38);
  k.box(m.archStone,0,.225,-b.d/2-.135,b.w+.38,.45,.10);
  const gap=doorW+.26,len=(b.w+.38-gap)/2;for(const sign of [-1,1])k.box(m.archStone,sign*(gap/2+len/2),.225,b.d/2+.135,len,.45,.10);
  g.userData.facadeDivision={ground:'warm plaster',upper:'vertical timber',gable:'timber',timberStart:s.timberStart,stonePlinthHeight:.45,woodReference:'gasthaus',foldingShutters:true};
 }else if(b.kind!=='chapel'){k.box(m.stoneDark,0,.16,0,b.w+.05,.32,b.d+.05);stoneBase(k,m,b,doorW);}
 if(b.kind==='chapel'){buildChurchRefinement(k,m,b,s,archedWall,archDetail,churchOrnament); }else{
  const inn=b.kind==='inn',upper=inn?5.18:4.85;
  for(const side of sides){const length=side.axis==='front'?b.w:b.d,n=side.axis==='front'?4:3;
   for(const [level,y]of[1.63,upper].entries())for(let i=0;i<n;i++){
    let x=(i-(n-1)/2)*(length*.65/(n-1));if(level===0&&side.axis==='front'&&side.sign===1&&Math.abs(x)<1.50)x=x<0?-1.91:1.91;
    side.windows.push({x,y,w:s.window[0],h:s.window[1],level});
   }
   if(inn&&side.axis==='front'&&side.sign===1)side.windows.push({x:0,y:5.195,w:1.02,h:2.22,level:1,balconyDoor:true});
   const openings=[...side.windows];if(side.axis==='front'&&side.sign===1)openings.push({x:0,y:1.28,w:doorW,h:2.56});panel(k,m,b,side,openings);
   const raisedFace={...side,point:x=>{const [px,pz]=side.point(x);return [px+Math.sin(side.angle)*.15,pz+Math.cos(side.angle)*.15];}};
   side.windows.forEach((o,i)=>window(k,m,o,inn||o.level===1?raisedFace:side,{...s,flowers:null,shutters:o.balconyDoor?null:s.shutters},o.level,520100+i));
   if(!inn)side.windows.filter(o=>o.level===1).forEach((o,i)=>{const [x,z]=side.point(o.x);flowerBox(k,i%3===1?{...m,flowerRed:townhallPink}:m,x+Math.sin(side.angle)*.30,o.y-o.h/2-.24,z+Math.cos(side.angle)*.30,o.w+.10,side.angle,side.axis==='front'&&side.sign===1,620300+i);});
  }
  k.box(m.wood,0,1.17,b.d/2+.04,doorW-.14,2.34,.10);k.box(m.villageWindow,0,2.43,b.d/2+.04,doorW-.14,.16,.025);k.box(m.wood,0,2.345,b.d/2+.065,doorW-.14,.035,.04);
  for(const sign of [-1,1])k.box(m.archStone,sign*(doorW/2+.03),1.28,b.d/2+.055,.11,2.56,.19);k.box(m.archStone,0,2.58,b.d/2+.055,doorW+.18,.13,.20);k.box(m.gold,.42,1.2,b.d/2+.11,.026,.20,.03);
  if(b.kind==='townhall'){timberWall(k,m,b,s,sides);for(const side of sides){const p=side.point(0),len=side.axis==='front'?b.w:b.d;k.box(m.wood,p[0]+Math.sin(side.angle)*.145,s.timberStart,p[1]+Math.cos(side.angle)*.145,len,.09,.08,side.angle);}}
  if(inn){timberWall(k,m,b,s,sides);g.userData.balconyGeometry=balcony(k,m,b,s,4.05,b.w*.84,0,false,520800);g.userData.balcony='wide';
   const marker=new T.Object3D();marker.name='Zugänglicher Holzbalkon des Gasthauses';marker.userData={publicBalcony:true,doorBottom:4.085,deckTop:4.085,width:b.w*.84,carvedRailing:true};g.add(marker);
  }
 }
 k.box(m.stoneDark,0,-.08,b.d/2+.67,1.8,.16,1.1);const step=new T.Object3D();step.name='Eingangsstufe '+b.id;step.userData={villageDoorstep:true,buildingId:b.id};g.add(step);
 if(b.kind!=='chapel'){buildRoof(k,{...m,plaster:wood},b,{...s,cladding:true,hip:false});cornices(k,m,b,s);}
 if(b.kind==='chapel')churchTower(k,m,b);
 if(b.kind!=='chapel'){
  const townhall=b.kind==='townhall',label=m.makeSign(townhall?'Rathaus':'Gasthaus Seealm',{subtitle:townhall?'':'LANDGASTHAUS',width:1536,height:300,fontScale:townhall?.60:.44,fontFamily:'"DejaVu Sans", Arial, sans-serif',italic:true,foreground:'#eadcc0',background:'#29362d'});
  label.name='Dorfbeschriftung '+b.id;label.emissiveIntensity=.13;const sign=k.mesh(new T.PlaneGeometry(townhall?3.5:7,townhall?.54:1.25),label,'Fassadenschild '+b.id);sign.position.set(0,townhall?3.015:3.08,b.d/2+.23);
  if(townhall){sign.userData={townhallSign:true,text:'Rathaus',width:3.5,height:.54,styleReference:'Gasthaus Seealm',centeredAboveDoor:true};for(const sign of [-1,1]){k.box(m.wood,sign*1.785,3.015,b.d/2+.23,.065,.67,.08);k.box(m.wood,0,3.015+sign*.305,b.d/2+.23,3.635,.065,.08);}k.box(m.stoneDark,0,.04,b.d/2+.8,3.0,.08,1.35);}
 }
 k.finish();const corners=[[-b.w/2,-b.d/2],[b.w/2,-b.d/2],[b.w/2,b.d/2],[-b.w/2,b.d/2]].map(p=>buildingPoint(b,...p)),[dx,dz]=buildingPoint(b,0,b.d/2+.70);
 return {group:g,building:b,floor,door:{x:dx,z:dz,y:floor},access:nearestRoadAccess(dx,dz),corners};
}
