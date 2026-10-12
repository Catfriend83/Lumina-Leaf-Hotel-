import {T,Kit,TAU} from './core.js?v=75';
let materials;
function lampMaterials(){
 if(materials)return materials;
 const standard=(name,color,props)=>new T.MeshStandardMaterial({name,color,...props});
 return materials={
  brass:standard('Referenz-Tischlampe – gebürstetes Gold','#d3ad56',{metalness:.82,roughness:.30,envMapIntensity:.35}),
  underside:standard('Referenz-Tischlampe – rutschfester Fuß','#171713',{roughness:1}),
  crystal:new T.MeshPhysicalMaterial({name:'Referenz-Tischlampe – konischer Kristallschirm',color:'#fff1ce',metalness:0,roughness:.24,transparent:true,opacity:.76,transmission:.18,thickness:.0025,ior:1.49,clearcoat:.6,envMapIntensity:.3}),
  diffuser:standard('Referenz-Tischlampe – warmes diffuses Licht','#f6dfb2',{roughness:.9,emissive:'#ffd69a',emissiveIntensity:.32}),
  facet:standard('Referenz-Tischlampe – floraler Kristallschliff','#eddcb9',{roughness:.3,metalness:.02,emissive:'#efc78c',emissiveIntensity:.10})
 };
}
export function referenceTableLamp(parent,x,y,z,index){
 const m=lampMaterials(),g=new T.Group();g.name='Goldene Kristall-Tischlampe – '+index;g.position.set(x,y,z);g.scale.set(1/.944,1/1.032,1/.75);
 g.userData={referenceTableLamp:true,reference:[2,3],height:.315,shadeHeight:.12,shadeTopDiameter:.070,shadeBottomDiameter:.110,tableTop:y,brassBase:true,flutedCrystalShade:true,revision:92};parent.add(g);const k=new Kit(g);
 const profile=[[0,.003],[.057,.003],[.061,.005],[.062,.009],[.058,.015],[.048,.023],[.033,.033],[.017,.042],[.006,.044]].map(p=>new T.Vector2(...p));
 k.cyl(m.underside,0,.002,0,.058,.004);k.put(new T.LatheGeometry(profile,64),m.brass,0,0,0);
 k.cyl(m.brass,0,.119,0,.0035,.160);k.cyl(m.brass,0,.188,0,.009,.019);k.cyl(m.brass,0,.021,.041,.0045,.004);
 k.put(new T.CylinderGeometry(.035,.055,.12,64,1,true),m.crystal,0,.248,0);
 k.put(new T.CylinderGeometry(.025,.039,.10,48),m.diffuser,0,.247,0);
 for(const [r,yy]of [[.035,.308],[.055,.188]])k.put(new T.TorusGeometry(r,.0015,6,64),m.brass,0,yy,0,1,1,1,Math.PI/2);
 const gem=new T.IcosahedronGeometry(1,1);
 for(let i=0;i<36;i++){const a=i*TAU/36,s=Math.sin(a),c=Math.cos(a);k.line(m.crystal,[s*.054,.190,c*.054],[s*.035,.306,c*.035],.0017);
  for(let row=0;row<5;row++){const t=(row+.5)/5,r=.055-.020*t;k.put(gem,m.facet,s*r,.190+.116*t,c*r,.0017,.004,.0017);}
 }
 k.cyl(m.brass,0,.3085,0,.035,.002);k.cyl(m.brass,0,.312,0,.005,.006);k.finish();
 const light=new T.PointLight('#ffd7a0',.30,1.8,2);light.name='Dezentes warmes Tischlampenlicht '+index;light.position.set(0,.24,0);g.add(light);return g;
}
