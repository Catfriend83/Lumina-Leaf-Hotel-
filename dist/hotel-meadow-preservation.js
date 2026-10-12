import {remove as r88,restore as s88} from './hotel-meadow-preservation-data.js?v=88';
import {remove as r91,restore as s91} from './hotel-meadow-v91-data.js?v=91';
import {GARAGE_CUT} from './garage-site.js?v=91';
import {T} from './core.js?v=75';
const remove=[...r88,...r91],restore=[...s88,...s91];
// Changing the building collision mask must not scatter remote meadow plants.
// Keep the exact retained v86 placements outside the edited hotel/forecourt zone.
export function preserveHotelSurroundings(controller,scene){
 const key=(x,y,z)=>[x,y,z].map(v=>Math.fround(v)).join(','),gone=new Set(remove.map(p=>key(...p)));let removed=0,restored=0;
 controller.records.forEach(rows=>{for(let i=rows.length-1;i>=0;i--){const r=rows[i];if(gone.has(key(r.x,r.y,r.z))){rows.splice(i,1);removed++;}}});
 const indices=controller.records.map(rows=>new Map(rows.map((r,i)=>[key(r.x,r.y,r.z),i])));
 for(const p of restore){const e=p.matrix,x=e[12],y=e[13],z=e[14],rows=controller.records[p.kind],id=key(x,y,z),duplicate=indices[p.kind].get(id),h=e[5],radial=Math.hypot(e[0],e[2]),yaw=Math.atan2(e[8],e[0]);
  const record={x,y,z,h,radial,yaw,rank:0,foreground:p.near,coverageAnchor:true,zone:'Erhaltener Wiesenbestand',matrixElements:new Float32Array(e)};
  if(duplicate!==undefined)rows[duplicate]=record;else{indices[p.kind].set(id,rows.length);rows.push(record);}restored++;
 }
 const inverse=scene.getObjectByName('Lumina Leaf Hotel und Außenanlage').matrixWorld.clone().invert(),p=new T.Vector3();
 const apron=scene.getObjectByName('Großzügiger Vorplatz vor der erweiterten Lobby').geometry.attributes.position,poly=Array.from({length:apron.count},(_,i)=>[apron.getX(i),apron.getZ(i)]);
 const onApron=(x,z)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[c,d]=poly[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)yes=!yes;}return yes;};
 controller.records.forEach(rows=>{for(let i=rows.length-1;i>=0;i--){const r=rows[i];p.set(r.x,r.y,r.z).applyMatrix4(inverse);if((r.x>GARAGE_CUT.minX&&r.x<GARAGE_CUT.maxX+3&&r.z>GARAGE_CUT.minZ&&r.z<GARAGE_CUT.maxZ)||(p.x>-6.1&&p.x<22.1&&p.z>1.7&&p.z<13.8)||onApron(r.x,r.z))rows.splice(i,1);}});
 controller.prepareExport();return {baselineVersion:90,restored,removedIncidentalAdditions:removed};
}
