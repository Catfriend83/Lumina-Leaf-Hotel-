import {T} from './core.js?v=75';
import {gardenPathShift,gardenWalkHeight} from './meadow-grade.js?v=75';

export const GARDEN_CURB={width:.30,top:.12,roadBase:-.005,turnRadius:1.5,join:[17.4,28.25],removedLamps:[[-31.4,30],[28.6,30]]};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));};
// This is the existing bed boundary, with its small change of direction rounded.
export function bedCurbX(z){const q=7-z,rounded=q<=-1?0:q>=1?q:(q+1)*(q+1)/4;return 22.15+.27*rounded-3.4+.15;}
export function gardenCurbCenter(z){const localZ=z-8,old=27+gardenPathShift(localZ)-2.75-.15-3.4,t=smooth((localZ+20)/6);return old*(1-t)+bedCurbX(localZ)*t;}
const curbTop=z=>gardenWalkHeight(z-8)+.15-.03*smooth((z-5)/10);

export function buildGardenCurb(root,m){
 const half=GARDEN_CURB.width/2,left=[],right=[];
 for(let z=-41;z<=26.75+.0001;z+=.125){const x=gardenCurbCenter(z),dx=(gardenCurbCenter(z+.001)-gardenCurbCenter(z-.001))/.002,n=Math.hypot(dx,1);left.push([x-half/n,z+half*dx/n]);right.push([x+half/n,z-half*dx/n]);}
 // A tangential quarter-circle joins the existing VIP curb, rather than ending
 // in a separate butt joint. The right arm of that curb is part of this mesh.
 const straightCount=left.length,c=[17.4,26.75],r=GARDEN_CURB.turnRadius;
 for(let i=1;i<=64;i++){const a=i*Math.PI/128;left.push([c[0]+(r-half)*Math.cos(a),c[1]+(r-half)*Math.sin(a)]);}
 const limit=Math.asin((28.1-c[1])/(r+half));for(let i=1;i<=48;i++){const a=i*limit/48;right.push([c[0]+(r+half)*Math.cos(a),c[1]+(r+half)*Math.sin(a)]);}
 const contour=[[6.3,28.1],...left.toReversed(),...right,[66.5,28.1],[66.5,28.4],[6.3,28.4]],faces=[],positions=[],indices=[],rightOffset=1+left.length;
 // Paired cross-sections retain the hillside grade without degenerate cap fans
 // along long straight sections. Only the flat joined head is triangulated.
 for(let i=0;i<straightCount-1;i++){const a=left.length-i,b=a-1,c=rightOffset+i,d=c+1;faces.push([a,b,d],[a,d,c]);}
 const patch=[0,...Array.from({length:left.length-straightCount+1},(_,i)=>i+1),...Array.from({length:right.length-straightCount+1},(_,i)=>rightOffset+straightCount-1+i),contour.length-3,contour.length-2,contour.length-1];
 for(const face of T.ShapeUtils.triangulateShape(patch.map(i=>new T.Vector2(...contour[i])),[]))faces.push(face.map(i=>patch[i]));
 // Closed sides extend below the unchanged soil; there is no open underside.
 for(const [x,z] of contour){const top=curbTop(z),bottom=z>=28.1?-.005:Math.min(top-.125,gardenWalkHeight(z-8)*.7-.13);positions.push(x,top,z,x,bottom,z);}
 for(const [a,b,c] of faces){const p=contour[a],q=contour[b],s=contour[c],positive=(q[1]-p[1])*(s[0]-p[0])-(q[0]-p[0])*(s[1]-p[1])>0;const ids=positive?[a,b,c]:[a,c,b];indices.push(...ids.map(i=>i*2),...ids.toReversed().map(i=>i*2+1));}
 // Outward walls account for x/z's orientation relative to the vertical axis.
 let area=0;for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length];area+=a[0]*b[1]-b[0]*a[1];}
 for(let i=0;i<contour.length;i++){const j=(i+1)%contour.length,a=2*i,b=2*j;const face=[a,a+1,b+1,a,b+1,b];indices.push(...(area>0?face.toReversed():face));}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const mesh=new T.Mesh(g,m.ivory);mesh.name='Einziger geschlossener weißer Bordstein vom Blumenbeet zum VIP-Stellplatz';mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={gardenCurb:true,continuousVipJoin:true,width:.30,frontTopY:.12,join:GARDEN_CURB.join,bedUnchanged:true,closedSolid:true};root.add(mesh);return mesh;
}
