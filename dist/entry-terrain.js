import {TRAFFIC} from './village-traffic-data.js?v=75';
import {pavingHeight} from './village-traffic.js?v=75';
import {BUILDINGS} from './village-layout.js?v=75';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*t*(t*(6*t-15)+10);};
export const ENTRY_REPAIR={minX:-212,maxX:-168,minZ:-134,maxZ:-98,blend:3.4};
let edges;
// Use the actual triangulated walkway perimeter, including its small subdivisions.
// The meadow meets those elevations, rather than an unrelated ideal road profile.
function perimeter(height){
 if(edges)return edges;const counts=new Map(),v=TRAFFIC.walk.vertices,ix=TRAFFIC.walk.indices;
 for(let i=0;i<ix.length;i+=3)for(const [a,b]of [[ix[i],ix[i+1]],[ix[i+1],ix[i+2]],[ix[i+2],ix[i]]]){const key=Math.min(a,b)+','+Math.max(a,b),e=counts.get(key);if(e)e.count++;else counts.set(key,{a,b,count:1});}
 edges=[];for(const e of counts.values()){if(e.count!==1)continue;const a=v[e.a],b=v[e.b];if(Math.max(a[0],b[0])<ENTRY_REPAIR.minX-4||Math.min(a[0],b[0])>ENTRY_REPAIR.maxX+4||Math.max(a[1],b[1])<ENTRY_REPAIR.minZ-4||Math.min(a[1],b[1])>ENTRY_REPAIR.maxZ+4)continue;const dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz;if(length2<1e-12)continue;edges.push({a,b,dx,dz,length2,ay:pavingHeight(...a,height),by:pavingHeight(...b,height)});}
 return edges;
}
export function entryTerrainHeight(x,z,original,height){
 const b=ENTRY_REPAIR;if(x<=b.minX||x>=b.maxX||z<=b.minZ||z>=b.maxZ)return original;
 let weight=smooth(b.minX,b.minX+3,x)*(1-smooth(b.maxX-3,b.maxX,x))*smooth(b.minZ,b.minZ+3,z)*(1-smooth(b.maxZ-3,b.maxZ,z));
 // Preserve the established house stand surfaces and all measured foundations.
 for(const house of BUILDINGS){const c=Math.cos(house.rot),s=Math.sin(house.rot),dx=x-house.x,dz=z-house.z,edge=Math.hypot(Math.max(0,Math.abs(c*dx-s*dz)-house.w/2),Math.max(0,Math.abs(s*dx+c*dz)-house.d/2));weight*=smooth(.85,1.9,edge);}
 if(!weight)return original;let nearest=null;
 for(const e of perimeter(height)){const t=Math.max(0,Math.min(1,((x-e.a[0])*e.dx+(z-e.a[1])*e.dz)/e.length2)),distance=Math.hypot(x-e.a[0]-t*e.dx,z-e.a[1]-t*e.dz);if(!nearest||distance<nearest.distance)nearest={distance,y:e.ay+(e.by-e.ay)*t};}
 if(!nearest||nearest.distance>=b.blend)return original;
 const target=nearest.y-.045,blend=(1-smooth(.12,b.blend,nearest.distance))*weight;
 return original+(Math.max(original,target)-original)*blend;
}
