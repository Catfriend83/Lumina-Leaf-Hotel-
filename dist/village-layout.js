import {FOUNDATION_LEVELS} from './foundation-data.js?v=75';
import {T} from './core.js?v=75';
import {originalLakeShore,spaLakeShore,createSpaLakeGeometry,SPA_SHORE} from './spa-shore.js?v=75';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const JUNCTION={x:-166,z:-129};
// Historical validators import this alias; no roundabout geometry is built.
export const ROUNDABOUT={...JUNCTION,outer:0,inner:0};
export function roundaboutHeight(x,z,y){return y;}
export const VILLAGE={name:'Seealm',square:{x:-157,z:-154,width:34,depth:24},bounds:{minX:-220,maxX:-97,minZ:-205,maxZ:-110},roadJoin:[-58.5,-.005,33.9]};
export const villageGrade=(x,z)=>4.3+.005*(z+155)+.009*(x+155);
export function lakeOffset(a,d){const [x,z]=originalLakeShore(a),nx=Math.cos(a)/86,nz=Math.sin(a)/65,l=Math.hypot(nx,nz);return [x+nx/l*d,z+nz/l*d];}
export function route(id,points,width,closed=false){const curve=new T.CatmullRomCurve3(points.map(([x,z,y])=>new T.Vector3(x,y,z)),closed,'centripetal'),p=curve.getSpacedPoints(Math.ceil(curve.getLength()/1.1));let s=0;const rows=p.map((v,i)=>{if(i)s+=v.distanceTo(p[i-1]);const a=p[closed?(i===0?p.length-2:i-1):Math.max(0,i-1)],b=p[closed?(i===p.length-1?1:i+1):Math.min(p.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);return {x:v.x,y:v.y,z:v.z,nx:-dz/l,nz:dx/l,s,width:typeof width==='function'?width(s):width};});return {id,rows,length:s,closed};}
const coast=[[1.8,.65],[2.15,1.25],[2.5,1.7],[2.9,2.1],[3.25,2.5],[3.6,3],[3.93,3.95]].map(([a,y])=>[...lakeOffset(a,20),y]);
export const MAIN_ROAD=route('uferstrasse',[[-58.5,33.9,-.005],[-80,33.9,.15],...coast,...[[-166,-129],[-151,-137],[-123,-140],[-104,-155],[-104,-174]].map(([x,z])=>[x,z,villageGrade(x,z)])],s=>11.6+(6.5-11.6)*smooth(0,42,s));
// Preserve every upstream station; remove only the unused terminal spur.
const terminalCut=MAIN_ROAD.rows.findIndex(r=>r.s>320&&r.z< -150);MAIN_ROAD.rows.splice(terminalCut);MAIN_ROAD.length=MAIN_ROAD.rows.at(-1).s;
export const VILLAGE_LANE=route('dorfgasse',[[-166,-129],[-190,-145],[-187,-166],[-172,-172],[-153,-178],[-134,-183],[-117,-166],[-121,-140]].map(([x,z])=>[x,z,villageGrade(x,z)]),4.2);
export function shoreLoopPoint(a){const [x,z]=spaLakeShore(a),lo=spaLakeShore(a-.003),hi=spaLakeShore(a+.003),dx=hi[0]-lo[0],dz=hi[1]-lo[1],l=Math.hypot(dx,dz);return [x+dz/l*6.3,z-dx/l*6.3];}
export function shoreLoopHeight(a){a=(a+Math.PI*2)%(Math.PI*2);return .58+.12*smooth(2.5,3.4,a)+.10*smooth(3.4,4.55,a)-.22*smooth(4.55,5.8,a);}
export const PROMENADE=route('promenade',Array.from({length:144},(_,i)=>{const a=i*Math.PI*2/144;return [...shoreLoopPoint(a),shoreLoopHeight(a)];}),2.5,true);
export const LAKE_BENCH_FRACTIONS=[.025,.07,.155,.235,.325,.445,.545,.66,.755,.835,.915,.985];
export const LAKE_RESTS=LAKE_BENCH_FRACTIONS.map((fraction,i)=>{const row=PROMENADE.rows[Math.round(fraction*(PROMENADE.rows.length-1))];return {id:'see-bank-'+i,fraction,row,x:row.x+row.nx*2.2,z:row.z+row.nz*2.2,y:row.y};});
export function loopSurfaceHeight(x,z){return closestRoute(x,z,[PROMENADE],13)?.y??1.5;}
export function restSurfaceHeight(x,z){let best=LAKE_RESTS.reduce((a,b)=>Math.hypot(a.x-x,a.z-z)<Math.hypot(b.x-x,b.z-z)?a:b),along=(x-best.row.x)*best.row.nx+(z-best.row.z)*best.row.nz,w=smooth(1.25,1.9,along);return loopSurfaceHeight(x,z)*(1-w)+best.y*w;}
const end=shoreLoopPoint(4);
// The new crossing is east of the former one, beyond the roundabout approach.
export const CROSSING=MAIN_ROAD.rows.reduce((a,b)=>Math.hypot(a.x+143,a.z+139)<Math.hypot(b.x+143,b.z+139)?a:b);
const crossingPoint=(offset)=>[CROSSING.x+CROSSING.nx*offset,CROSSING.z+CROSSING.nz*offset,CROSSING.y];
export const SQUARE_LINK=route('platz-ufer-weg',[[-147,-143,villageGrade(-147,-143)],crossingPoint(-5.3),crossingPoint(0),crossingPoint(5.3),[-149,-131,4.15],[-151,-125,3.2],[-160,-118,1.9],[-160,-113,1.2],[...end,shoreLoopHeight(4)]],2.2);
export const ROADS=[MAIN_ROAD,VILLAGE_LANE],WALKS=[PROMENADE,SQUARE_LINK];
const dwellings=[[-202,-157,9,9,6.2],[-178,-184,9,11,6.5],[-160,-190,11,10,7.1],[-138,-195,8.5,9,5.8],[-211,-170,9,10,6.1],[-123,-190,10,9,6.8],[-183,-124,8,9,5.8],[-196,-120,8.5,10,6.3],[-211,-138,8,9,5.9],[-203,-180,8,9,6.2]];
export const BUILDINGS=[{id:'kapelle',kind:'chapel',x:-176,z:-150,w:8,d:12,h:5.7,rot:Math.PI/2,variant:0},{id:'gasthaus',kind:'inn',x:-145,z:-167.5,w:15,d:11,h:7.2,rot:0,variant:1},{id:'rathaus',kind:'townhall',x:-164.5,z:-165,w:11.5,d:8,h:6.8,rot:0,variant:0},...dwellings.map(([x,z,w,d,h],i)=>({id:'haus-'+(i+1),kind:[2,5].includes(i)?'pension':'house',x,z,w,d,h,variant:i,rot:0}))];
export function buildingPoint(b,x,z){const c=Math.cos(b.rot),s=Math.sin(b.rot);return [b.x+c*x+s*z,b.z-s*x+c*z];}
export function inBuildingParcel(x,z,margin=2.2){return BUILDINGS.some(b=>{const c=Math.cos(b.rot),s=Math.sin(b.rot),dx=x-b.x,dz=z-b.z;return Math.abs(c*dx-s*dz)<b.w/2+margin&&Math.abs(s*dx+c*dz)<b.d/2+margin;});}
const grid=new Map(),cell=12;
for(const path of [...ROADS,...WALKS])for(let i=0;i<path.rows.length-1;i++){const a=path.rows[i],b=path.rows[i+1],pad=Math.max(a.width,b.width)/2+15;for(let gx=Math.floor((Math.min(a.x,b.x)-pad)/cell);gx<=Math.floor((Math.max(a.x,b.x)+pad)/cell);gx++)for(let gz=Math.floor((Math.min(a.z,b.z)-pad)/cell);gz<=Math.floor((Math.max(a.z,b.z)+pad)/cell);gz++){const key=gx+','+gz;if(!grid.has(key))grid.set(key,[]);grid.get(key).push({path,i,a,b});}}
export function closestRoute(x,z,paths=[...ROADS,...WALKS],padding=0){let best=null;const segments=new Set(),gx=Math.floor(x/cell),gz=Math.floor(z/cell),r=Math.ceil(padding/cell);for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)for(const s of grid.get((gx+dx)+','+(gz+dz))||[])segments.add(s);for(const s of segments){if(!paths.includes(s.path))continue;const {a,b}=s,dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),px=a.x+t*dx,pz=a.z+t*dz,distance=Math.hypot(x-px,z-pz);if(!best||distance<best.distance)best={distance,x:px,z:pz,y:a.y+(b.y-a.y)*t,width:a.width+(b.width-a.width)*t,path:s.path,i:s.i,t};}return best;}
export function nearestRoadAccess(x,z){let best=null;for(const path of ROADS)for(let i=0;i<path.rows.length-1;i++){const a=path.rows[i],b=path.rows[i+1],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),px=a.x+t*dx,pz=a.z+t*dz,distance=Math.hypot(x-px,z-pz);if(!best||distance<best.distance)best={x:px,z:pz,y:a.y+(b.y-a.y)*t,width:a.width+(b.width-a.width)*t,distance,path};}return best;}
for(const b of BUILDINGS)if(!['chapel','inn','townhall'].includes(b.kind)){const n=nearestRoadAccess(b.x,b.z);b.rot=Math.atan2(n.x-b.x,n.z-b.z);}
// The shop occupies the former house-6 parcel, with its front facing the plaza.
BUILDINGS.push({id:'dorfladen',kind:'shop',x:-131,z:-154,w:10,d:9,h:4.15,rot:Math.atan2(-152.76857196541155+131,-155.98609902793066+154),variant:0});
// Keep the established plaza grading at the former parcel; add only the new
// residential stand surface. The rest of the existing terrain stays unchanged.
const GRADING_BUILDINGS=BUILDINGS.filter(b=>b.kind!=='shop').map(b=>b.id==='haus-6'?{...b,x:-131,z:-154,rot:1.298273935284271,foundationY:4.733629948801895}:b);
GRADING_BUILDINGS.push(BUILDINGS.find(b=>b.id==='haus-6'));
const lg=createSpaLakeGeometry(),lp=lg.attributes.position;export const LAKE_POLYGON=Array.from({length:SPA_SHORE.segments},(_,i)=>[-94+86*lp.getX(i+1),-55-65*lp.getY(i+1)]);lg.dispose();
export function lakeContains(x,z){let inside=false;for(let i=0,j=LAKE_POLYGON.length-1;i<LAKE_POLYGON.length;j=i++){const a=LAKE_POLYGON[i],b=LAKE_POLYGON[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function shorelineDistance(x,z){let d=Infinity;for(let i=0;i<LAKE_POLYGON.length;i++){const a=LAKE_POLYGON[i],b=LAKE_POLYGON[(i+1)%LAKE_POLYGON.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return d;}
export function constructionInfluence(x,z,margin=0){if(x<-270-margin||x>110+margin||z<-260-margin||z>100+margin)return false;if(x>-70-margin&&x<105+margin&&z>-130-margin&&z<25+margin)return true;const loop=closestRoute(x,z,[PROMENADE],13+margin);if(loop&&loop.distance<13+margin)return true;const b=VILLAGE.bounds;if(x>b.minX-margin&&x<b.maxX+margin&&z>b.minZ-margin&&z<b.maxZ+margin)return true;const n=closestRoute(x,z,ROADS,43+margin);return x<-58.5+margin&&!!n&&n.distance<n.width/2+43+margin;}
export function villageGroundHeight(x,z,base){const shore=closestRoute(x,z,[PROMENADE],13);let tie=smooth(-72,-66,x)*(1-smooth(-49,-44,x))*smooth(14,20,z)*(1-smooth(47,56,z));if(shore)tie*=smooth(5,10,shore.distance);if(lakeContains(x,z)&&shorelineDistance(x,z)>.06)return base*(1-tie)-.18*tie;if(x>-38&&z>-56&&(!shore||shore.distance>7))return base*(1-tie)-.18*tie;let y=base;
 const e=Math.sqrt(((x+160)/79)**2+((z+159)/66)**2),vw=1-smooth(.63,1.14,e),wave=.15*Math.sin(x*.071+z*.047)+.10*Math.cos(z*.096-x*.033);y=y*(1-vw)+(villageGrade(x,z)+wave)*vw;
 const n=closestRoute(x,z,ROADS,43);if(n){const w=1-smooth(n.width/2+2,n.width/2+32,n.distance);y=y*(1-w)+(roundaboutHeight(x,z,n.y)-.09)*w;}
 const link=closestRoute(x,z,[SQUARE_LINK],13);if(link){const w=1-smooth(link.width/2+1.3,link.width/2+7,link.distance);y=y*(1-w)+(link.y-.09)*w;}
 if(shore){const w=1-smooth(1.45,7,shore.distance);y=y*(1-w)+shore.y*w;}
 for(const house of GRADING_BUILDINGS){const c=Math.cos(house.rot),s=Math.sin(house.rot),dx=x-house.x,dz=z-house.z,edge=Math.hypot(Math.max(0,Math.abs(c*dx-s*dz)-house.w/2),Math.max(0,Math.abs(s*dx+c*dz)-house.d/2)),w=1-smooth(.65,8,edge);y=y*(1-w)+((house.foundationY??FOUNDATION_LEVELS[house.id])-.16)*w;}
 const sq=VILLAGE.square,sd=Math.hypot(Math.max(0,Math.abs(x-sq.x)-sq.width/2),Math.max(0,Math.abs(z-sq.z)-sq.depth/2)),sw=1-smooth(0,3,sd);y=y*(1-sw)+villageGrade(x,z)*sw;
 for(const house of GRADING_BUILDINGS){const c=Math.cos(house.rot),s=Math.sin(house.rot),dx=x-house.x,dz=z-house.z,edge=Math.hypot(Math.max(0,Math.abs(c*dx-s*dz)-house.w/2),Math.max(0,Math.abs(s*dx+c*dz)-house.d/2)),w=1-smooth(.45,1.7,edge);y=y*(1-w)+((house.foundationY??FOUNDATION_LEVELS[house.id])-.16)*w;}
 if(shore&&shore.distance<14){const d=shorelineDistance(x,z),bank=smooth(0,4.35,d);if(d<4.35)y=-.24*(1-bank)+shore.y*bank;}
 y=y*(1-tie)-.18*tie;
 if(shore&&shore.distance<1.55)y=loopSurfaceHeight(x,z);
 for(const rest of LAKE_RESTS){const dx=x-rest.x,dz=z-rest.z,u=Math.abs(dx*rest.row.nz-dz*rest.row.nx),v=Math.abs(dx*rest.row.nx+dz*rest.row.nz),edge=Math.hypot(Math.max(0,u-1.65),Math.max(0,v-1.2)),w=1-smooth(0,1.5,edge);if(w)y=y*(1-w)+restSurfaceHeight(x,z)*w;}
 return y;
}
// Coarse terrain vertices conservatively support the finer road/shore ribbons.
export function villageMeshGroundHeight(x,z,base,cellRadius=8.6){if(!constructionInfluence(x,z,cellRadius)||lakeContains(x,z))return base;let y=base;for(const path of [...ROADS,...WALKS]){const n=closestRoute(x,z,[path],cellRadius);if(!n)continue;const w=1-smooth(n.width/2+cellRadius,n.width/2+cellRadius+5,n.distance);if(w>0)y=Math.min(y,base*(1-w)+(n.y-.22)*w);}return y;}
