import {T,Kit,rng} from './core.js?v=75';
import {broadLeaf} from './vegetation.js?v=75';

export const SPA_SHORE={center:[-94,-55],radius:[86,65],waterY:-.22,segments:768,start:-.50,end:1.05};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const oldScale=a=>1+.030*Math.cos(a*5)+.021*Math.sin(a*3);
// The existing meadow base ends at X=-37.5. Retreating the water slightly
// beyond that visible edge removes the rectangular cut without changing it,
// the distant terrain, or any buildings. A broad eased shoulder joins the
// unchanged northern shore; the southern join eases naturally to zero.
function rawRetreat(angle,z,oldX){
 if(angle<=SPA_SHORE.start||angle>=SPA_SHORE.end)return 0;
 const target=-40.0-1.2*smooth(-42,-10,z)+.90*Math.sin((z+45)*.11),delta=oldX-target;
 if(delta<=0)return 0;
 const t=Math.min(1,delta/4),rounded=delta*(2*t-t*t);
 return rounded*smooth(SPA_SHORE.start,-.13,angle);
}
export function spaShoreRetreat(angle,z,oldX){
 angle=Math.atan2(Math.sin(angle),Math.cos(angle));
 if(angle<=SPA_SHORE.start||angle>=SPA_SHORE.end)return 0;
 // A compact symmetric filter softens the shoulder without changing the
 // untouched shoreline or introducing angular water projections.
 const step=Math.PI*2/192;let sum=0,weight=0;
 for(let i=-4;i<=4;i++){const a=angle+i*step,[x,zz]=originalLakeShore(a),w=5-Math.abs(i);sum+=rawRetreat(a,zz,x)*w;weight+=w;}
 return sum/weight*smooth(SPA_SHORE.start,SPA_SHORE.start+.10,angle)*(1-smooth(SPA_SHORE.end-.10,SPA_SHORE.end,angle));
}
export function originalLakeShore(angle){
 // CircleGeometry is rotated by -PI/2: positive XY angles face negative Z.
 const a=-angle,px=Math.fround(Math.cos(a)),py=Math.fround(Math.sin(a)),scale=oldScale(Math.atan2(py,px));
 return [SPA_SHORE.center[0]+SPA_SHORE.radius[0]*Math.fround(px*scale),SPA_SHORE.center[1]-SPA_SHORE.radius[1]*Math.fround(py*scale)];
}
export function spaLakeShore(angle){const [x,z]=originalLakeShore(angle);return [x-spaShoreRetreat(angle,z,x),z];}
export function createSpaLakeGeometry(){
 const g=new T.CircleGeometry(1,SPA_SHORE.segments),p=g.attributes.position;
 for(let i=1;i<p.count;i++){const a=Math.atan2(p.getY(i),p.getX(i)),f=oldScale(a);p.setXY(i,p.getX(i)*f,p.getY(i)*f);const oldX=SPA_SHORE.center[0]+p.getX(i)*SPA_SHORE.radius[0],z=SPA_SHORE.center[1]-p.getY(i)*SPA_SHORE.radius[1],retreat=spaShoreRetreat(-a,z,oldX);if(retreat>0)p.setX(i,p.getX(i)-retreat/SPA_SHORE.radius[0]);}
 g.computeVertexNormals();return g;
}
function shoreSamples(geometry){
 const step=Math.PI*2/SPA_SHORE.segments,p=geometry.attributes.position,out=[];
 const old=angle=>originalLakeShore(angle),point=i=>{const index=(((-i)%SPA_SHORE.segments)+SPA_SHORE.segments)%SPA_SHORE.segments+1;return [SPA_SHORE.center[0]+p.getX(index)*SPA_SHORE.radius[0],SPA_SHORE.center[1]-p.getY(index)*SPA_SHORE.radius[1]];};
 for(let i=Math.floor(SPA_SHORE.start/step);i<Math.ceil(SPA_SHORE.end/step);i++){const a=point(i),b=point(i+1),oa=old(i*step),ob=old((i+1)*step);for(let j=0;j<2;j++){const t=j/2;out.push({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,oldX:oa[0]+(ob[0]-oa[0])*t});}}
 const last=Math.ceil(SPA_SHORE.end/step),p1=point(last);out.push({x:p1[0],z:p1[1],oldX:old(last*step)[0]});return out;
}
function stripGeometry(samples,fractions,surface){
 const p=[],uv=[],colors=[],ix=[],columns=fractions.length;
 for(const s of samples)for(const f of fractions){const v=surface(s,f);p.push(v.x,v.y,s.z);uv.push(v.x/4,s.z/4);const c=.95+.025*Math.sin(v.x*.65+s.z*.41);colors.push(c,c,c);}
 for(let row=0;row<samples.length-1;row++)for(let col=0;col<columns-1;col++){const a=row*columns+col,b=a+1,c=a+columns,d=c+1;ix.push(a,c,b,b,c,d);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function buildSpaShoreLand(root,m,lakeGeometry,landHeight,rockGeometry){
 const g=new T.Group();g.name='Natürliches Spa-Ufer mit zurückgesetzter Wasserlinie';g.userData={spaShoreLandscape:true,localLakeRetreat:true};root.add(g);
 const k=new Kit(g),samples=shoreSamples(lakeGeometry),grass=m.meadow.clone(),gravel=m.cliff.clone(),twig=m.trunk.clone();twig.name='Zweige der neuen Ufersträucher';grass.name='Natürliche Uferwiese neben dem Spa';grass.vertexColors=true;gravel.name='Kies und Geröll am natürlichen Spa-Ufer';gravel.color.set('#b7b1a2');gravel.vertexColors=true;
 // The lip shares the water polygon's exact sampled boundary. Its top is at
 // water level, then rises onto dry land. Nothing covers water under the spa.
 const width=s=>Math.max(1.4,s.oldX-s.x+1.4),outerY=s=>Math.max(-.11,landHeight(s.oldX+1.4,s.z)+.012),fade=s=>smooth(.0,4.0,s.oldX-s.x);
 const bank=k.mesh(stripGeometry(samples,[0,.35,.7],(s,w)=>({x:s.x+w,y:SPA_SHORE.waterY+(.145*w/.7)})),gravel,'Sanfter Kiesrand am zurückgesetzten See');bank.userData={spaShoreBank:true};
 const lawn=k.mesh(stripGeometry(samples,[0,.15,.35,.65,1],(s,t)=>{const w=.7+(width(s)-.7)*t,f=fade(s),rise=-.075+smooth(.7,2.5,w)*.13,existing=outerY(s),mix=Math.max(smooth(.5,1,t),(1-f)*smooth(0,1,t));return {x:s.x+w,y:rise*(1-mix)+existing*mix};}),grass,'Organische Uferwiese zwischen See und Spa');lawn.userData={spaShoreLawn:true};
 g.updateMatrixWorld(true);const ray=new T.Raycaster();const groundAt=(x,z)=>{ray.set(new T.Vector3(x,20,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(lawn,false)[0];if(!hit)throw new Error('Uferbepflanzung außerhalb der trockenen Uferfläche');return hit.point.y;};
 // Natural, low vegetation uses a local generator only; existing trees, boats
 // and all other landscape random sequences remain unchanged.
 const random=rng(361002),grassBlade=new T.BufferGeometry();grassBlade.setAttribute('position',new T.Float32BufferAttribute([-.04,0,0,0,.22,.01,.04,0,0,0,0,-.04,.012,.18,0,0,0,.04],3));grassBlade.setIndex([0,1,2,3,4,5]);grassBlade.computeVertexNormals();
 for(let i=0;i<140;i++){const s=samples[6+Math.floor(random()*(samples.length-16))];if(s.oldX-s.x<5)continue;const x=s.x+1.2+random()*Math.min(7,s.oldX-s.x-2),z=s.z+(random()-.5)*.50,y=groundAt(x,z)+.005;const scale=.6+random()*.65;k.put(grassBlade,m.grassBlade,x,y,z,scale,scale,scale,0,random()*Math.PI*2);}
 for(const angle of [.14,.26,.39,.53,.66,.78]){const [x,z]=spaLakeShore(angle),cx=x+3.3,cz=z,y=groundAt(cx,cz),scale=.50+random()*.2;for(let j=0;j<10;j++){const a=j*2.4,tip=[cx+Math.cos(a)*scale*.6,y+.28+random()*.32,cz+Math.sin(a)*scale*.6];k.line(twig,[cx,y,cz],tip,.010);k.put(broadLeaf,j%2?m.leaf:m.leaf2,...tip,.30,.44,.30,-.3,a,.2);}for(let j=0;j<2;j++){const rx=cx-1+j*.9,rz=cz+.5;k.put(rockGeometry,gravel,rx,groundAt(rx,rz)+.06,rz,.27+random()*.15,.12,.21+random()*.1,0,random()*6.28,0);}}
 k.finish();return g;
}
