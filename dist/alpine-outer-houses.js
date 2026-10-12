import {T,Kit} from './core.js?v=75';
import {buildReferenceAlpineHouse,ALPINE_HOUSE_STYLES} from './alpine-houses.js?v=75';
import {buildBavarianRoof} from './bavarian-houses.js?v=75';

export function buildOuterAlpineHouse(root,materials,x,z,index,surface){
 const variant=[6,0,4,3,8,7,1][index],base=ALPINE_HOUSE_STYLES[variant],b={id:'randhaus-'+(index+1),kind:'house',x,z,rot:.3,w:6.29,d:6.12,h:[5.40,5.65,5.70,5.90,5.82,5.55,5.75][index],variant,outerVillageHouse:true};
 b.style={...base,name:['Schlichtes Landhaus am Waldrand','Gartenhaus am östlichen Seeufer','Balkonhaus im Voralpenstil','Kleines Fachwerkhaus am Dorfrand','Holzbetontes Bauernhaus am Hang','Landhaus mit Fachwerkgiebel','Alpenhaus mit Seitengalerie'][index],columns:2,balcony:index===2?'short':base.balcony,atticBalcony:false,eaves:[.70,.76,.81,.67,.85,.74,.88][index]};
 const c=Math.cos(b.rot),s=Math.sin(b.rot),point=(u,v)=>[x+c*u+s*v,z-s*u+c*v];
 const samples=[];for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){const [px,pz]=point((i/8-.5)*(b.w+.36),(j/8-.5)*(b.d+.36));samples.push(surface(px,pz));}
 b.floorY=Math.max(...samples)+.08;b.standSurface=(u,v)=>{const [px,pz]=point(u,v);return surface(px,pz)-b.floorY;};
 const result=buildReferenceAlpineHouse(root,materials,b,surface,buildBavarianRoof),g=result.group,k=new Kit(g),w=1.65,front=b.d/2+.70,end=front+1.55;
 // A short, sloping entrance apron meets the retained terrain, not an invented road.
 const vertices=[[-w/2,0,front],[w/2,0,front],[-w/2,b.standSurface(-w/2,end)+.035,end],[w/2,b.standSurface(w/2,end)+.035,end]];
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices.flat(),3));geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));geometry.setIndex([0,2,1,1,2,3]);geometry.computeVertexNormals();
 const apron=k.mesh(geometry,materials.stoneDark,'Bodenangepasster kurzer Hauszugang '+b.id);apron.userData={outerHouseAccess:true,buildingId:b.id};
 k.finish();return result;
}
