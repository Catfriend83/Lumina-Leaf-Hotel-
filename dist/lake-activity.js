import {T,Kit,rng,TAU} from './core.js?v=75';

function hullGeometry(width,length,depth=.55){
 const p=[],uv=[],idx=[],rings=16,steps=12;
 for(let j=0;j<=rings;j++){
  const f=j/rings,z=(f-.5)*length,beam=width*.5*(.07+.93*Math.sin(Math.PI*f)**.65);
  for(let i=0;i<=steps;i++){const a=-Math.PI/2+i/steps*Math.PI,x=Math.sin(a)*beam,y=.20-Math.cos(a)*depth;p.push(x,y,z);uv.push(i/steps,f);}
 }
 for(let j=0;j<rings;j++)for(let i=0;i<steps;i++){const a=j*(steps+1)+i,b=a+1,c=a+steps+1,d=c+1;idx.push(a,c,b,b,c,d);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function seated(k,m,x,z,{vest=m.boatRed,angle=0,scale=.86}={}){
 const g=new T.Group();g.position.set(x,.29,z);g.rotation.y=angle;g.scale.setScalar(scale);g.name='Freizeitgast mit Schwimmweste';k.root.add(g);const p=new Kit(g);
 p.ball(m.boatCloth,0,.47,0,.22,.32,.13);p.ball(vest,0,.51,.07,.24,.27,.12);p.box(m.gold,0,.54,.19,.025,.32,.018);
 p.cyl(m.skin,0,.78,0,.06,.13);p.ball(m.skin,0,.94,.02,.12,.15,.12);p.ball(m.hair,0,1.04,-.01,.122,.08,.12);
 for(const dx of [-.115,.115]){p.line(m.boatCloth,[dx,.30,0],[dx,.18,.37],.076);p.line(m.boatCloth,[dx,.18,.37],[dx,-.11,.51],.062);p.ball(m.rubber,dx,-.12,.60,.08,.06,.16);}
 for(const dx of [-.22,.22]){p.line(m.boatCloth,[dx,.69,0],[dx*1.22,.46,.25],.053);p.line(m.skin,[dx*1.22,.46,.25],[dx*.60,.50,.53],.038);p.ball(m.skin,dx*.60,.50,.53,.048,.047,.065);}
 p.finish();return g;
}
function paddle(parent,m,side,z,double=false){const g=new T.Group();g.name=double?'Kajak-Doppelpaddel':'Ruder mit Blatt';g.position.set(side*.56,.62,z);g.rotation.z=side*.10;parent.add(g);const k=new Kit(g);
 k.line(m.wood,[0,0,0],[side*1.40,-.62,.18],.026);k.bevel(m.boatWood,side*1.49,-.67,.20,.24,.038,.60,.025,side*.24);
 if(double){k.line(m.wood,[0,0,0],[-side*1.16,.23,-.12],.026);k.bevel(m.boatWood,-side*1.28,.25,-.13,.24,.038,.54,.025,-side*.24);}
 k.finish();return g;}
function wake(root,m,width,length){const p=[],uv=[],idx=[];
 for(let i=0;i<20;i++){const f=i/19,z=-length/2-f*3.7;for(const side of [-1,1]){p.push(side*(width*.50+f*.72),-.065,z);uv.push(side<0?0:1,f);}}
 for(let i=0;i<19;i++){const a=i*2;idx.push(a,a+1,a+3,a,a+3,a+2);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mesh=new T.Mesh(g,m.wake);mesh.name='Feine Kielwasser-Spur';root.add(mesh);
}
export function buildLakeActivity(root,m){const group=new T.Group();group.name='Aktivitäten auf dem Bergsee';group.userData={movingLakeActivity:true};root.add(group);const actors=[];
 const plans=[['Ruderboot',-61,-24,.75],['Ruderboot',-112,-58,2.6],['Tretboot',-83,-31,-.3],['Tretboot',-129,-74,1.0],['Kajak',-47,-43,1.4],['Kajak',-99,-44,-.7],['Stand-up-Paddle',-73,-61,.5],['Stand-up-Paddle',-137,-46,2.4]];
 for(let i=0;i<plans.length;i++){
  const [type,x,z,angle]=plans[i],boat=new T.Group();boat.name=type;boat.userData={watercraft:type};boat.position.set(x,-.10,z);boat.rotation.y=angle;group.add(boat);const k=new Kit(boat);let length=3.7,width=1.38,paddles=[];
  if(type==='Ruderboot'){
   const g=hullGeometry(width,length);k.mesh(g,m.boatWood,'Holz-Ruderboot Rumpf');const inside=g.clone();inside.scale(.91,.85,.96);inside.translate(0,.055,0);k.mesh(inside,m.boatIvory,'Innenrumpf');
   for(const zz of [-.75,.25])k.bevel(m.boatWood,0,.26,zz,1.18,.08,.29,.02);
   for(let zz=-1.65;zz<1.65;zz+=.18)for(const side of [-1,1])k.box(m.boatWood,side*width*.5*(.07+.93*Math.sin(Math.PI*(zz/length+.5))**.65),.21,zz,.045,.06,.22);
   seated(k,m,0,.18);seated(k,m,0,-.95,{vest:m.boatBlue,angle:Math.PI});paddles=[paddle(boat,m,-1,.25),paddle(boat,m,1,.25)];
  }else if(type==='Tretboot'){
   length=3.30;width=1.98;
   for(const side of [-1,1]){const h=k.mesh(hullGeometry(.60,length,.47),m.boatIvory,'Tretboot Schwimmkörper');h.position.x=side*.72;}
   k.bevel(m.boatBlue,0,.15,0,1.71,.16,2.27,.055);
   for(const xx of [-.48,.48]){k.bevel(m.boatBlue,xx,.40,.18,.62,.18,.60,.04);k.bevel(m.boatBlue,xx,.72,-.13,.62,.66,.12,.035);seated(k,m,xx,.12,{vest:xx<0?m.boatRed:m.boatYellow});}
   k.cyl(m.chrome,0,-.19,.5,.25,1.55,0,Math.PI/2);for(let j=0;j<8;j++)k.put('box',m.frame,0,-.19+Math.cos(j*TAU/8)*.27,.5+Math.sin(j*TAU/8)*.27,1.35,.055,.22,j*TAU/8);
  }else if(type==='Kajak'){
   length=4.10;width=.69;k.mesh(hullGeometry(width,length,.35),i%2?m.boatYellow:m.boatRed,'Kajak Rumpf');k.ball(i%2?m.boatYellow:m.boatRed,0,.10,0,.35,.12,1.87);k.ball(m.rubber,0,.20,.12,.27,.04,.46);seated(k,m,0,.04,{vest:m.boatBlue,scale:.80});paddles=[paddle(boat,m,-1,.28,true)];
  }else{
   length=3.40;width=.83;k.ball(m.boatIvory,0,.03,0,.43,.085,1.72);k.box(m.boatBlue,0,.116,0,.49,.01,1.48);
   const person=new T.Group();person.position.set(0,.19,0);boat.add(person);const p=new Kit(person);p.ball(m.boatCloth,0,.91,0,.20,.28,.12);p.ball(m.boatRed,0,1.03,.02,.22,.22,.14);for(const dx of [-.11,.11])p.line(m.boatCloth,[dx,.72,0],[dx,.05,.05],.075);p.ball(m.skin,0,1.45,0,.12,.15,.12);p.ball(m.hair,0,1.54,-.02,.124,.07,.122);p.line(m.skin,[-.20,1.17,0],[-.40,.79,.25],.05);p.line(m.skin,[.20,1.17,0],[-.35,1.39,.18],.05);p.line(m.wood,[-.35,1.40,.18],[-.90,-.14,.62],.025);p.bevel(m.boatWood,-.95,-.18,.65,.24,.035,.57,.02,.2);p.finish();
  }
  wake(boat,m,width,length);k.finish();actors.push({object:boat,base:boat.position.clone(),yaw:angle,phase:i*.89,paddles});
 }
 return {group,actors,update(t){for(const a of actors){a.object.position.x=a.base.x+Math.sin(t*.032+a.phase)*.85;a.object.position.z=a.base.z+Math.cos(t*.025+a.phase)*.60;a.object.position.y=a.base.y+Math.sin(t*.65+a.phase)*.027;a.object.rotation.y=a.yaw+Math.sin(t*.035+a.phase)*.025;a.object.rotation.z=Math.sin(t*.54+a.phase)*.010;for(let i=0;i<a.paddles.length;i++)a.paddles[i].rotation.y=Math.sin(t*.85+a.phase)*.22;}}};
}
