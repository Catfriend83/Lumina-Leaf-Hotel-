import {T,TAU} from './core.js?v=75';
// Curved branch surfaces keep their depth when viewed from another direction.
export function bentCard(width=1,height=.5,bend=.16,segments=5){const p=[],uv=[],idx=[];for(let j=0;j<=1;j++)for(let i=0;i<=segments;i++){const u=i/segments,v=j,x=(u-.5)*width,y=(v-.5)*height,z=Math.sin(u*Math.PI)*bend+(v-.5)*(v-.5)*bend;p.push(x,y,z);uv.push(u,v);}for(let i=0;i<segments;i++){const a=i,b=i+1,c=i+segments+1,d=c+1;idx.push(a,b,d,a,d,c);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
const branch=bentCard(1,.5,.045,3),shrub=bentCard(1,1,.13,3),foliage=new T.IcosahedronGeometry(1,0);
const forestCard=new T.PlaneGeometry(1,1);
export function spruce(k,m,x,y,z,height,rng,detailed=false){const yaw=rng()*TAU;
 if(!detailed&&m.forestPine){
  // Preserve the established random sequence and hence hotel planting placement.
  for(let i=0;i<12*6*4;i++)rng();
  k.cyl(m.trunk,x,y+height*.25,z,height*.008,height*.5);
  for(let card=0;card<3;card++)k.put(forestCard,m.forestPine,x,y+height*.49,z,height*.72,height*1.03,1,0,yaw+card*Math.PI/3);
  return;
 }
 k.cyl(m.trunk,x,y+height*.44,z,height*.009,height*.87);const levels=detailed?20:12,arms=detailed?10:6;for(let layer=0;layer<levels;layer++){const f=layer/(levels-1),py=y+height*(.10+f*.86),radius=height*(.23*(1-f)**.8+.016),rotation=yaw+layer*1.9;
 // Solid green cores give the textured branches a dense evergreen silhouette.
 if(layer%2===0)k.put('cone',m.pine,x,py+height*.018,z,radius*.18,height*.09,radius*.18,0,rotation,0);
 for(let arm=0;arm<arms;arm++){const a=rotation+arm*TAU/arms+(rng()-.5)*.3,len=radius*(.94+rng()*.17),cx=x+Math.cos(a)*len*.48,cz=z+Math.sin(a)*len*.48;const h=len*.90;const pitch=.12+(rng()-.5)*.16;
 k.put(branch,m.spruce,cx,py,cz,len*1.18,h,len*.08,pitch,-a,(rng()-.5)*.12);
 if(detailed){k.put(branch,m.spruce,cx,py+.020*height,cz,len*1.13,h*.90,len*.07,pitch+Math.PI/2,-a,.05);k.line(m.trunk,[x,py-.06*height,z],[cx+Math.cos(a)*len*.38,py-.06*height,cz+Math.sin(a)*len*.38],height*.003);}
 }}
}
export function shrubCluster(k,m,x,y,z,size,rng){const yaw=rng()*TAU;k.put(foliage,m.leaf,x,y+size*.23,z,size*.29,size*.23,size*.29,0,yaw,0);for(let arm=0;arm<3;arm++)k.put(shrub,m.shrub,x,y+size*.36,z,size,size*.76,size,0,yaw+arm*Math.PI/3,(rng()-.5)*.09);}
export function broadLeafGeometry(){const p=[],uv=[],idx=[];for(let i=0;i<=12;i++){const t=i/12,half=Math.sin(t*Math.PI)**.75*.25;for(const side of [-1,1]){p.push(side*half,t,Math.sin(t*Math.PI)*.14+side*side*half*.15);uv.push(side<0?0:1,t);}}for(let i=0;i<12;i++){const a=i*2;idx.push(a,a+1,a+3,a,a+3,a+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
export const broadLeaf=broadLeafGeometry();

// Individual petals sample vein detail from the existing photographic atlas.
// Their silhouettes and curved surfaces remain geometry when the scene rotates.
function atlasPetal(root,tip,halfWidth){
 const g=broadLeaf.clone();g.scale(.60,1,2.2);const uv=g.attributes.uv;
 for(let i=0;i<uv.count;i++){
  const u=uv.getX(i),v=uv.getY(i),width=Math.sin(v*Math.PI)*halfWidth;
  uv.setXY(i,(root[0]+(tip[0]-root[0])*v+(u*2-1)*width)/1254,1-(root[1]+(tip[1]-root[1])*v)/1254);
 }
 g.computeVertexNormals();return g;
}
export const redPetal=atlasPetal([663,178],[591,91],20);
export const whitePetal=atlasPetal([619,339],[617,310],8);
