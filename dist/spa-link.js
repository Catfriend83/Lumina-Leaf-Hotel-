import {T,Kit} from './core.js?v=75';

// The facades share the same orientation. The passage follows their normal,
// with a constant longitudinal coordinate in spa space, rather than a diagonal.
export const SPA_LINK={hotelZ:-6.20,spaZ:14.83790186353782,spaX:7.1654,hotelX:-3.01,rotation:-.448,outerWidth:2.32,clearWidth:1.90,doorHeight:2.9412,ceiling:3.04};

function door(root,m,x,label,end){
 const g=new T.Group();g.name=label;g.position.x=x;g.userData={spaLinkDoor:true,end,clearWidth:1.90,clearHeight:2.92,automaticSliding:true};root.add(g);const k=new Kit(g);
 for(const z of [-.995,.995])k.box(m.frame,0,1.52,z,.15,3.04,.09);
 k.box(m.frame,0,3.0,0,.17,.08,2.08);
 k.box(m.chrome,0,.008,0,.19,.016,2.08);
 for(const z of [-.475,.475]){k.box(m.glass,0,1.473,z,.043,2.92,.94);for(const edge of [-.465,.465])k.box(m.frame,-.025,1.473,z+edge,.045,2.92,.018);k.box(m.frame,-.025,.023,z,.045,.03,.94);k.box(m.frame,-.025,2.93,z,.045,.026,.94);k.box(m.chrome,-.04,1.16,z,.017,.30,.024);}
 for(const side of [-1,1])k.box(m.stone,0,1.52,side*1.10,.21,3.04,.12);
 // Narrow flush seals close the structural ends without a solid wall across
 // the useful opening. Each door is fully contained in its facade opening.
 k.box(m.frame,0,3.03,0,.21,.02,2.32);k.finish();return g;
}

export function buildStraightSpaLink(root,m,tower,spa){
 tower.updateMatrixWorld(true);spa.updateMatrixWorld(true);
 const a=tower.localToWorld(new T.Vector3(SPA_LINK.hotelX,.24,SPA_LINK.hotelZ)),b=spa.localToWorld(new T.Vector3(SPA_LINK.spaX,0,SPA_LINK.spaZ));
 const length=a.distanceTo(b),g=new T.Group();g.name='Gerader geschlossener Naturstein-Glas-Verbindungsgang';g.position.copy(a.clone().lerp(b,.5));g.rotation.y=SPA_LINK.rotation;g.userData={spaGallery:true,straightSpaLink:true,start:a.toArray(),end:b.toArray(),length,outerWidth:2.32,clearWidth:1.90,ceiling:3.04,behindGarage:true};root.add(g);const k=new Kit(g);
 k.box(m.stone,0,-.18,0,length+.24,.36,2.32);k.box(m.poolDeck,0,-.025,0,length+.24,.05,2.12);
 k.box(m.stone,0,3.15,0,length+.24,.22,2.32);k.box(m.frame,0,3.285,0,length+.26,.05,2.36);
 // A short threshold ramp continues behind the hotel door to its existing
 // slightly higher interior floor; the passage itself remains straight.
 const threshold=new T.BoxGeometry(.355,.06,1.90);threshold.translate(length/2+.2775,0,0);const p=threshold.attributes.position;
 for(let i=0;i<p.count;i++){const t=(p.getX(i)-(length/2+.10))/.355;p.setY(i,p.getY(i)>0?t*.10062:-.06);}threshold.computeVertexNormals();k.mesh(threshold,m.poolDeck,'Bündiger innerer Hotel-Türanschluss');
 const bays=4,pitch=length/bays;
 for(const z of [-1.06,1.06]){
  k.box(m.stone,0,.16,z,length+.20,.32,.20);
  k.box(m.frame,0,3.0,z,length+.20,.08,.20);
  for(let i=0;i<=bays;i++){const x=-length/2+i*pitch;k.box(m.stone,x,1.52,z,.36,3.04,.20);}
  for(let i=0;i<bays;i++){const x=-length/2+(i+.5)*pitch,w=pitch-.36;k.box(m.glass,x,1.67,z,w,2.70,.035);for(const edge of [-w/2,w/2])k.box(m.frame,x+edge,1.67,z,.035,2.70,.05);for(const y of [.32,3.02])k.box(m.frame,x,y,z,w,.035,.05);}
  k.box(m.poolWarm,0,2.925,z*.89,length-.40,.033,.025);
 }
 for(const x of [-length/3,0,length/3]){k.box(m.poolWarm,x,3.025,0,.66,.025,.12);const light=new T.PointLight('#ffdcad',2.3,3.3,2);light.name='Indirektes Licht im geraden Spa-Verbindungsgang';light.position.set(x,2.76,0);g.add(light);}
 k.finish();door(g,m,-length/2,'Breite Schiebetür am Spa-Anschluss','spa');door(g,m,length/2,'Breite Schiebetür am Hotel-Anschluss','hotel');return g;
}
