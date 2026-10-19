import {T} from './core.js?v=75';
import {gardenPathShift,gardenWalkHeight} from './meadow-grade.js?v=75';

export const GARDEN_CURB={width:.30,top:.12,roadBase:-.005,turnRadius:1.5,join:[17.4,28.25],removedLamps:[[-31.4,30],[28.6,30]]};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));};
// This is the existing bed boundary, with its small change of direction rounded.
export function bedCurbX(z){const q=7-z,rounded=q<=-1?0:q>=1?q:(q+1)*(q+1)/4;return 22.15+.27*rounded-3.4+.15;}
export function gardenCurbCenter(z){const localZ=z-8,old=27+gardenPathShift(localZ)-2.75-.15-3.4,t=smooth((localZ+20)/6);return old*(1-t)+bedCurbX(localZ)*t;}
const curbTop=z=>gardenWalkHeight(z-8)+.15-.03*smooth((z-5)/10);

// V112: retain the side boundary, but remove its ornamental curved return
// toward the flowerbed. The roadside curb is a separate, capped straight solid.
export function buildGardenCurb(root,m){
 const left=[],right=[],half=GARDEN_CURB.width/2;
 const section=z=>{const x=gardenCurbCenter(z),dx=(gardenCurbCenter(z+.001)-gardenCurbCenter(z-.001))/.002,n=Math.hypot(dx,1);
  left.push([x-half/n,z+half*dx/n]);right.push([x+half/n,z-half*dx/n]);};
 for(let z=-41;z<24.35;z+=.125)section(z);section(24.35);
 const positions=[],indices=[];
 const append=(contour,faces,top,bottom)=>{
  const offset=positions.length/3;
  for(const [x,z]of contour)positions.push(x,top(z),z,x,bottom(z),z);
  for(const [a,b,c]of faces){const p=contour[a],q=contour[b],r=contour[c];
   const up=(q[1]-p[1])*(r[0]-p[0])-(q[0]-p[0])*(r[1]-p[1])>0;
   const ids=up?[a,b,c]:[a,c,b];indices.push(...ids.map(i=>offset+2*i),...ids.toReversed().map(i=>offset+2*i+1));
  }
  let area=0;for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length];area+=a[0]*b[1]-b[0]*a[1];}
  for(let i=0;i<contour.length;i++){const j=(i+1)%contour.length,a=offset+2*i,b=offset+2*j;
   const f=[a,a+1,b+1,a,b+1,b];indices.push(...(area>0?f.toReversed():f));}
 };
 const n=left.length,contour=[...left,...right.toReversed()],faces=[];
 for(let i=0;i<n-1;i++)faces.push([i,i+1,2*n-2-i],[i,2*n-2-i,2*n-1-i]);
 append(contour,faces,curbTop,z=>Math.min(curbTop(z)-.125,gardenWalkHeight(z-8)*.7-.13));
 append([[6.3,28.1],[66.5,28.1],[66.5,28.4],[6.3,28.4]],[[0,1,2],[0,2,3]],()=>.12,()=>-.28);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 const mesh=new T.Mesh(g,m.ivory);mesh.name='Gerade Garten- und Straßenränder ohne gebogenen Beetanschluss';mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData={gardenCurb:true,curvedBedReturnRemoved:true,closedSolid:true,width:.30};root.add(mesh);return mesh;
}
