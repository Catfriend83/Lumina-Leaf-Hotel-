import assert from 'node:assert/strict';
import {PARKING_MANEUVERS as P} from '../dist/parking-maneuvers-data.js';
import {LIMO_PARK,parkingAccessSection} from '../dist/limousine-parking.js';
const h=P.heading;
const body=(x,z,h,front=14.12,back=2.98,w=1.85)=>{const c=Math.cos(h),s=Math.sin(h);return[[-back,-w],[front,-w],[front,w],[-back,w]].map(([u,v])=>[x+u*c-v*s,z+u*s+v*c]);};
const intersects=(a,b)=>{for(const poly of[a,b])for(let i=0;i<4;i++){const p=poly[i],q=poly[(i+1)%4],nx=p[1]-q[1],nz=q[0]-p[0],aa=a.map(p=>p[0]*nx+p[1]*nz),bb=b.map(p=>p[0]*nx+p[1]*nz);if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false;}return true;};
const allowed=(x,z)=>{if(x>=46.25&&x<=87.75&&z>=-30.75&&z<=18.75)return true;if(z>=18.75&&z<=28.4)for(let i=0;i<2;i++){const s=parkingAccessSection(i,z);if(x>=s.left+.05&&x<=s.right-.05)return true;}return x>=46&&x<=102&&z>=28.4&&z<=39.7;};
const booth=[[62,16.3],[67.4,16.3],[67.4,21.65],[62,21.65]],cars=P.centers.map(([x,z])=>body(x-5.6*Math.cos(h),z-5.6*Math.sin(h),h,14.02,2.86,1.65));
for(let i=0;i<3;i++){assert(Math.abs(LIMO_PARK.poses[i].x+14-P.centers[i][0])<1e-7);assert(Math.abs(61-LIMO_PARK.poses[i].z-P.centers[i][1])<1e-7);}
let samples=0;
const check=(pose,obstacles)=>{const poly=body(...pose);assert(!obstacles.some(o=>intersects(poly,o)),'Swept limousine clears other cars and reception');for(let i=0;i<4;i++){const a=poly[i],b=poly[(i+1)%4],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.20);for(let j=0;j<=n;j++)assert(allowed(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n),'Whole vehicle stays on connected asphalt');}samples++;};
for(const row of P.routes)for(const key of ['entry','exit']){assert(row[key]?.length>100);if(key==='exit')assert(row[key].every(p=>p[3]>=0),'Forward departure from all bays');const piers=[50.25,59.75].map(x=>[[x-.25,18.75],[x+.25,18.75],[x+.25,19.25],[x-.25,19.25]]);const obs=[booth,...piers,...cars.filter((_,i)=>i!==row.bay)];for(const pose of row[key])check(pose.slice(0,3),obs);}
assert(Math.abs(P.heading-Math.PI/2)<1e-8);
for(const row of P.routes){const end=row.entry.at(-1),start=row.exit[0];assert(Math.hypot(end[0]-start[0],end[1]-start[1])<1e-7);assert(Math.abs(end[2]-start[2])<1e-7);for(const p of row.entry.filter(p=>p[3]<0))for(const [x,z]of body(...p.slice(0,3)))assert(x>46&&x<88&&z<19&&z>-31,'Reverse parking remains entirely inside the court');}
console.log(JSON.stringify({validatedLimousineRoutes:6,parallelStalls:true,forwardDepartures:true,reverseOnlyInsideCourt:true,vehicleLength:16.9,wheelbase:11.2,minimumRearAxleRadius:13,vehicleBodySweepSamples:samples}));
