import * as T from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/addons/geometries/RoundedBoxGeometry.js';
export { T };
export const TAU=Math.PI*2;
export function rng(seed=731){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export const rand=rng();
export const noise=(x,z)=>Math.sin(x*1.17+Math.cos(z*.84))*Math.cos(z*1.29-Math.sin(x*.63));
const pavingGeometries=new Map();
const bevelGeometries=new Map();
function surfaceUV(geometry,w,h,d,unit){const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++){if(Math.abs(n.getY(i))>.5)uv.setXY(i,(p.getX(i)+.5)*w/unit,(p.getZ(i)+.5)*d/unit);else if(Math.abs(n.getX(i))>.5)uv.setXY(i,(p.getZ(i)+.5)*d/unit,(p.getY(i)+.5)*h/unit);else uv.setXY(i,(p.getX(i)+.5)*w/unit,(p.getY(i)+.5)*h/unit);}}
const SHARED_GEOMETRIES={box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(1,20,12),cylinder:new T.CylinderGeometry(1,1,1,16),cone:new T.ConeGeometry(1,1,14),plane:new T.PlaneGeometry(1,1)};
export class Kit{
 constructor(root){this.root=root;this.batches=new Map();this.geos=SHARED_GEOMETRIES;this.obj=new T.Object3D();}
 put(geom,mat,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const g=typeof geom==='string'?this.geos[geom]:geom;const key=g.uuid+mat.uuid;let b=this.batches.get(key);if(!b){b={geom:g,mat,matrices:[]};this.batches.set(key,b);}this.obj.position.set(x,y,z);this.obj.rotation.set(rx,ry,rz);this.obj.scale.set(sx,sy,sz);this.obj.updateMatrix();b.matrices.push(this.obj.matrix.clone());}
 box(m,x,y,z,w,h,d,ry=0){let geom='box';if(['cobbles','stone','stoneDark','meadow'].includes(m.name)){const key=[m.name,w,h,d].join(',');geom=pavingGeometries.get(key);if(!geom){geom=this.geos.box.clone();surfaceUV(geom,w,h,d,['cobbles','meadow'].includes(m.name)?4:3);pavingGeometries.set(key,geom);}}this.put(geom,m,x,y,z,w,h,d,0,ry);}
 bevel(m,x,y,z,w,h,d,r=.04,ry=0){const key=[w,h,d,r].join(',');let geom=bevelGeometries.get(key);if(!geom){geom=new RoundedBoxGeometry(w,h,d,1,r);bevelGeometries.set(key,geom);}this.put(geom,m,x,y,z,1,1,1,0,ry);}
 ball(m,x,y,z,sx,sy=sx,sz=sx){this.put('ball',m,x,y,z,sx,sy,sz);}
 cyl(m,x,y,z,r,h,rx=0,rz=0){this.put('cylinder',m,x,y,z,r,h,r,rx,0,rz);}
 mesh(g,m,name){const o=new T.Mesh(g,m);o.name=name||m.name||'Detail';o.castShadow=true;o.receiveShadow=true;this.root.add(o);return o;}
 line(m,a,b,r=.03){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());const mat=new T.Matrix4().compose(av.add(bv).multiplyScalar(.5),q,new T.Vector3(r,d.length(),r));const g=this.geos.cylinder;const key=g.uuid+m.uuid;let batch=this.batches.get(key);if(!batch){batch={geom:g,mat:m,matrices:[]};this.batches.set(key,batch);}batch.matrices.push(mat);}
 finish(){for(const b of this.batches.values()){const o=new T.InstancedMesh(b.geom,b.mat,b.matrices.length);o.name=b.mat.name||'Details';b.matrices.forEach((m,i)=>o.setMatrixAt(i,m));o.castShadow=!b.mat.transparent;o.receiveShadow=true;o.computeBoundingSphere();this.root.add(o);}this.batches.clear();}
}
export async function makeMaterials({createCanvas,loadTexture,lite=false}){
 const materials={};
 const photo=await loadTexture('assets/photo-reference.jpg');photo.colorSpace=T.SRGBColorSpace;materials.referencePhoto=photo;materials.photoMaterial=new T.MeshBasicMaterial({name:'Originale Bilddetails auf 3D-Flächen',map:photo,side:T.DoubleSide,toneMapped:false});
 const mat=(name,color,other={})=>materials[name]=new T.MeshStandardMaterial({name,color,roughness:.7,...other});
 const tex=(canvas)=>{const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;return t;};
 const stone=await loadTexture('assets/alpine-stone.png');stone.wrapS=stone.wrapT=T.RepeatWrapping;stone.repeat.set(2,2);stone.colorSpace=T.SRGBColorSpace;
 mat('stone','#fff3db',{map:stone,bumpMap:stone,bumpScale:.065,roughness:.83});
 mat('stoneDark','#777a72',{map:stone,bumpMap:stone,bumpScale:.1});
 mat('ivory','#cfd0c4');mat('frame','#202b2b',{roughness:.36,metalness:.6});mat('black','#101517',{roughness:.3,metalness:.25});mat('gold','#dcb675',{metalness:.84,roughness:.26});mat('chrome','#c7d6d9',{metalness:1,roughness:.18});mat('soil','#222b1e',{roughness:1});mat('leaf','#123c23',{roughness:.86});mat('leaf2','#376e29');mat('pine','#193a2c');mat('pine2','#284a30');mat('trunk','#57422e');mat('snow','#dce6e8',{roughness:.87});mat('rubber','#11151a',{roughness:.96});mat('red','#901c2c');mat('velvet','#123d34');mat('skin','#d6a076',{roughness:.58});mat('hair','#43271d');mat('blonde','#cda450');mat('suit','#232634');mat('dress','#149867');mat('pink','#c76aa3');mat('white','#f0e8d8');mat('wood','#6f462c',{roughness:.67});mat('mountain','#ffffff',{roughness:.96,vertexColors:true});mat('terrain','#304131',{roughness:1,vertexColors:true});
 materials.glass=new T.MeshPhysicalMaterial({name:'Glas',color:'#90bdc3',roughness:.08,metalness:.1,transparent:true,opacity:.21,depthWrite:false,side:T.DoubleSide});
 materials.carGlass=new T.MeshPhysicalMaterial({name:'Getönte Scheiben',color:'#07131e',roughness:.055,metalness:.42,clearcoat:1});
 materials.paint=new T.MeshPhysicalMaterial({name:'Schwarzer Fahrzeuglack',color:'#080b0e',roughness:.095,metalness:.72,clearcoat:1,clearcoatRoughness:.035,envMapIntensity:1.55});
 mat('warm','#ffe8bc',{emissive:'#ffbe67',emissiveIntensity:3.8,roughness:.4});mat('greenLight','#6fffab',{emissive:'#13ff69',emissiveIntensity:3.2});mat('headlight','#e5f3fc',{emissive:'#d2eaff',emissiveIntensity:2.5});mat('tail','#ff2328',{emissive:'#ff0009',emissiveIntensity:2});
 mat('interior','#bf985f',{emissive:'#ffbd67',emissiveIntensity:.70,roughness:.85});
 mat('curtain','#eee0c7',{roughness:1,side:T.DoubleSide});
 mat('poolTile','#9bd7d5',{roughness:.36,metalness:.05});mat('tileGrout','#d7e4dd',{roughness:.75});
 materials.glow=new T.MeshBasicMaterial({name:'Lichtschein',color:'#ffcc77',transparent:true,opacity:.065,depthWrite:false,blending:T.AdditiveBlending});
 for(const [n,c] of Object.entries({flowerRed:'#c22237',flowerPink:'#dd51a2',flowerWhite:'#ebe4db',flowerGold:'#edae37',flowerPurple:'#8530a9'}))mat(n,c);
 mat('meadow','#faf7ed',{roughness:.98});
 const limestone=await loadTexture('assets/alpine-limestone.png');limestone.colorSpace=T.SRGBColorSpace;limestone.wrapS=limestone.wrapT=T.RepeatWrapping;
 mat('cliff','#e6e5e3',{vertexColors:true,map:limestone,bumpMap:limestone,bumpScale:.24,roughness:.96});
 mat('alpineSnow','#e0e6e8',{vertexColors:true,roughness:.96});
 mat('villageRoof','#5c6063',{map:limestone,bumpMap:limestone,bumpScale:.04,roughness:.87});
 mat('villageWindow','#b49567',{emissive:'#dba468',emissiveIntensity:.65,roughness:.38});
 mat('villagePlaster','#d6d1c3',{bumpMap:stone,bumpScale:.012,roughness:.94});
 // Subtle timber grain and overlapping roof tiles, scoped to the new houses.
 const timberCanvas=createCanvas(128,256),timberCtx=timberCanvas.getContext('2d');for(let x=0;x<128;x++){const v=Math.round((170+28*Math.sin(x*.35)+13*Math.sin(x*1.8))/12)*12;timberCtx.fillStyle=`rgb(${v},${v},${v})`;timberCtx.fillRect(x,0,1,256);}const timberTex=tex(timberCanvas);timberTex.wrapS=timberTex.wrapT=T.RepeatWrapping;mat('villageTimber','#79634e',{map:timberTex,bumpMap:timberTex,bumpScale:.013,roughness:.83});
 const tilesCanvas=createCanvas(256,256),tilesCtx=tilesCanvas.getContext('2d');tilesCtx.fillStyle='#d9d6ce';tilesCtx.fillRect(0,0,256,256);for(let row=0;row<8;row++)for(let col=-1;col<8;col++){const x=col*36+(row%2)*18,y=row*32;tilesCtx.fillStyle=row%3===0?'#c5c3bd':'#d4d1c9';tilesCtx.fillRect(x+1,y+1,34,30);tilesCtx.fillStyle='#a6a49e';tilesCtx.fillRect(x,y+29,36,3);tilesCtx.fillStyle='#ebe8df';tilesCtx.fillRect(x+2,y+1,1,26);}const tilesTex=tex(tilesCanvas);tilesTex.wrapS=tilesTex.wrapT=T.RepeatWrapping;tilesTex.repeat.set(5,5);mat('villageTiles','#716760',{map:tilesTex,bumpMap:tilesTex,bumpScale:.027,roughness:.91});
 mat('grassBlade','#727c40',{roughness:.98,side:T.DoubleSide});
 mat('boatWood','#8e6541',{roughness:.70,side:T.DoubleSide});mat('boatIvory','#c5c7bd',{roughness:.36,side:T.DoubleSide});
 mat('boatRed','#a45246',{roughness:.42,side:T.DoubleSide});mat('boatBlue','#396d78',{roughness:.40,side:T.DoubleSide});mat('boatYellow','#b89857',{roughness:.42,side:T.DoubleSide});mat('boatCloth','#414b52',{roughness:.92});
 const wakeSize=lite?1:256,wc=createCanvas(wakeSize,wakeSize),wx=wc.getContext('2d');
 if(!lite)for(let y=0;y<256;y++)for(let x=0;x<256;x++){const fade=(1-y/256)*(Math.abs(x-128)/128)**3*(.40+.30*Math.sin(y*.47+x*.08)**2);wx.fillStyle=`rgba(184,205,197,${fade*.40})`;wx.fillRect(x,y,1,1);}
 mat('wake','#a4c4c1',{map:tex(wc),transparent:true,opacity:.28,depthWrite:false,roughness:.24,side:T.DoubleSide});
 const cobbles=await loadTexture('assets/granite-cobblestone.png');cobbles.colorSpace=T.SRGBColorSpace;cobbles.wrapS=cobbles.wrapT=T.RepeatWrapping;cobbles.repeat.set(1,1);mat('cobbles','#dbdad4',{map:cobbles,bumpMap:cobbles,bumpScale:.16,roughness:.55});
 const tc=createCanvas(512,512),ctx=tc.getContext('2d');ctx.fillStyle='#a82633';ctx.fillRect(0,0,512,512);for(let i=0;i<(lite?7000:70000);i++){const v=rand()*50;ctx.fillStyle=`rgba(${130+v},${24+v*.25},${37+v*.25},.35)`;ctx.fillRect(rand()*512,rand()*512,1,2);}const carpet=tex(tc);carpet.wrapS=carpet.wrapT=T.RepeatWrapping;carpet.repeat.set(2,7);mat('carpet','#efc8be',{map:carpet,roughness:1});
 const waterSize=lite?192:1024,nc=createCanvas(waterSize,waterSize),nctx=nc.getContext('2d'),ndata=nctx.createImageData(waterSize,waterSize);for(let y=0;y<waterSize;y++)for(let x=0;x<waterSize;x++){const i=(y*waterSize+x)*4;ndata.data[i]=128+Math.sin((x+y*.15)/6)*18+Math.sin(y/9)*11;ndata.data[i+1]=128+Math.sin((y+x*.3)/7)*17;ndata.data[i+2]=246;ndata.data[i+3]=255;}nctx.putImageData(ndata,0,0);const normal=new T.CanvasTexture(nc);normal.wrapS=normal.wrapT=T.RepeatWrapping;normal.repeat.set(8,8);
 materials.water=new T.MeshPhysicalMaterial({name:'Poolwasser',color:'#2ac8d1',metalness:.35,roughness:.13,transparent:true,opacity:.86,normalMap:normal,normalScale:new T.Vector2(.19,.19),clearcoat:1,side:T.DoubleSide});
 // The lake is not constructed in the immediate mobile hotel view.
 // Avoid half a million trigonometric wave calculations on the UI thread.
 const lakeNormals=createCanvas(lite?1:512,lite?1:512),lc=lakeNormals.getContext('2d'),ld=lc.createImageData(lite?1:512,lite?1:512);
 if(lite){ld.data.set([128,128,255,255]);}
 else for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;let dx=0,dy=0;for(const [ax,ay,f,a] of [[.95,.3,.10,9],[-.5,.85,.17,6],[.3,.9,.30,3],[-.7,.65,.51,1.5]]){const v=Math.cos((x*ax+y*ay)*f)*a;dx+=v*ax;dy+=v*ay;}ld.data[i]=128+dx;ld.data[i+1]=128+dy;ld.data[i+2]=250;ld.data[i+3]=255;}
 lc.putImageData(ld,0,0);const ln=new T.CanvasTexture(lakeNormals);ln.wrapS=ln.wrapT=T.RepeatWrapping;ln.repeat.set(12,10);
 materials.lake=new T.MeshPhysicalMaterial({name:'Bergsee',color:'#45656c',metalness:.24,roughness:.16,normalMap:ln,normalScale:new T.Vector2(.065,.085),side:T.DoubleSide});
 materials.makeSign=(title,{subtitle='★★★★★',foreground='#23d991',background='#172b28',width=4096,height=1024,italic=true,fontScale=.39,fontFamily='Arial,sans-serif'}={})=>{const ca=createCanvas(width,height),ct=ca.getContext('2d');if(background){ct.fillStyle=background;ct.fillRect(0,0,width,height);}ct.textAlign='center';ct.textBaseline='middle';ct.fillStyle=foreground;ct.font=`${italic?'italic ':''}bold ${height*fontScale}px ${italic?'Georgia,serif':fontFamily}`;ct.fillText(title,width/2,height*(subtitle?.40:.5),width*.91);if(subtitle){ct.font=`${height*.22}px Arial,sans-serif`;ct.fillStyle='#edcf7c';ct.fillText(subtitle,width/2,height*.78,width*.7);}const t=tex(ca);const ma=new T.MeshStandardMaterial({name:title,map:t,transparent:!background,emissiveMap:t,emissive:'#ffffff',emissiveIntensity:.45,roughness:.5,side:T.DoubleSide});return ma;};
 const wrap=await loadTexture('assets/botanical-wrap.png');wrap.colorSpace=T.SRGBColorSpace;wrap.wrapS=T.RepeatWrapping;wrap.repeat.set(4,1);materials.wrap=new T.MeshPhysicalMaterial({name:'Botanische Fahrzeugfolie',map:wrap,roughness:.32,metalness:.12,clearcoat:1});
 const spruce=await loadTexture('assets/snowy-spruce.png');spruce.colorSpace=T.SRGBColorSpace;
 materials.spruce=new T.MeshStandardMaterial({name:'Fototextur Tannennadeln und Schnee',map:spruce,alphaTest:.35,side:T.DoubleSide,roughness:.97,color:'#c9d8bb'});
 const forestPine=await loadTexture('assets/alpine-forest-pine.png');forestPine.colorSpace=T.SRGBColorSpace;
 materials.forestPine=new T.MeshStandardMaterial({name:'Fotorealistische Tannensilhouette im entfernten Wald',map:forestPine,alphaTest:.38,side:T.DoubleSide,roughness:.98,color:'#d9ded2'});
 const shrub=await loadTexture('assets/festive-shrub.png');shrub.colorSpace=T.SRGBColorSpace;
 materials.shrub=new T.MeshStandardMaterial({name:'Fototextur Blätter und Blüten',map:shrub,alphaTest:.35,side:T.DoubleSide,roughness:.83,color:'#ffffff',emissiveMap:shrub,emissive:'#493827',emissiveIntensity:.35});
 for(const material of [materials.flowerRed,materials.flowerWhite]){material.map=shrub;material.color.set('#ffffff');material.side=T.DoubleSide;material.roughness=.8;}
 materials.leaf.side=T.DoubleSide;materials.leaf2.side=T.DoubleSide;
 return materials;
}
export function addLamp(k,m,x,y,z,height=1.9){k.cyl(m.frame,x,y+height*.43,z,.043,height*.86);k.box(m.gold,x,y+.09,z,.25,.16,.25);k.box(m.frame,x,y+height-.09,z,.31,.06,.31);k.box(m.warm,x,y+height-.31,z,.19,.38,.19);for(const dx of [-.115,.115])for(const dz of [-.115,.115])k.box(m.frame,x+dx,y+height-.31,z+dz,.024,.45,.024);k.put('cone',m.frame,x,y+height+.03,z,.27,.25,.27);k.ball(m.glow,x,y+height-.25,z,.45);}
export function person(k,m,x,y,z,{rot=0,scale=1,dress=false,color=m.suit,hair=m.hair,uniform=false,swim=false}={}){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rot;g.scale.setScalar(scale);g.name=uniform?'Hotelmitarbeiter':swim?'Badegast':'Hotelgast';k.root.add(g);const p=new Kit(g);if(!swim){if(dress){p.put('cone',color,0,.67,0,.30,.98,.22);p.ball(color,0,1.25,0,.22,.29,.14);}else{p.ball(color,0,1.20,0,.25,.38,.15);for(const dx of [-.11,.11]){p.line(color,[dx,.88,0],[dx,.25,.03],.082);p.ball(m.black,dx,.15,.075,.095,.08,.18);}}}else{p.ball(m.skin,0,.86,0,.23,.46,.14);}p.cyl(m.skin,0,1.55,0,.076,.12);p.ball(m.skin,0,1.73,.005,.13,.17,.13);p.ball(m.skin,0,1.72,.139,.027,.039,.035);for(const dx of [-.05,.05]){p.ball(m.white,dx,1.77,.123,.025,.013,.013);p.ball(m.black,dx,1.77,.136,.010,.010,.006);}for(const dx of [-.126,.126])p.ball(m.skin,dx,1.73,0,.025,.05,.02);p.ball(hair,0,1.81,-.03,.137,.125,.133);for(const dx of [-.235,.235]){p.line(swim?m.skin:color,[dx,1.4,0],[dx*1.1,1.01,.045],.064);p.line(swim?m.skin:color,[dx*1.1,1.01,.045],[dx*.9,.91,.13],.053);p.ball(uniform?m.white:m.skin,dx*.9,.89,.13,.066,.084,.054);}if(!dress&&!swim){p.box(m.white,0,1.36,.145,.10,.24,.017);p.box(uniform?m.gold:m.black,0,1.30,.163,.026,.22,.015);for(const dx of [-.08,.08])p.put('box',color,dx,1.33,.16,.075,.27,.02,0,0,dx>0?.24:-.24);}
 if(uniform){p.cyl(m.velvet,0,1.92,0,.15,.11);p.box(m.gold,0,1.19,.16,.024,.26,.02);p.ball(m.gold,-.13,1.39,.128,.027);}if(dress&&hair===m.blonde)p.ball(hair,0,1.67,-.096,.145,.24,.09);p.finish();return g;}

// One fixture design follows the outward normal on every facade.
export function facadeLamp(k,m,x,y,z,rise,orientation=0){
 const angle=orientation===true?Math.PI:orientation,s=Math.sin(angle),c=Math.cos(angle);
 const box=(material,dy,dz,w,h,d)=>k.box(material,x+s*dz,y+dy,z+c*dz,w,h,d,angle);
 box(m.gold,1.78,0,.22,.83,.23);
 box(m.greenLight,1.78,.16,.12,.56,.065);
 box(m.warm,2.32,.07,.33,.075,.25);
 box(m.warm,1.25,.07,.33,.075,.25);
 k.ball(m.glow,x+s*.26,y+2.25,z+c*.26,.36);
 const marker=new T.Object3D();marker.name='Grüne Fassadenleuchte';marker.position.set(x,y+1.78,z);marker.rotation.y=angle;marker.userData={facadeFixture:true};k.root.add(marker);
}
// Bounded, low-intensity lights preserve stone detail and the warm room lighting.
export function facadeWash(root,x,y,z,{orientation=0,range=8,intensity=3.2}={}){
 const light=new T.PointLight('#13ff69',intensity,range,2);
 light.name='Dezentes grünes Fassadenlicht';light.position.set(x+Math.sin(orientation)*.50,y,z+Math.cos(orientation)*.50);
 root.add(light);return light;
}
