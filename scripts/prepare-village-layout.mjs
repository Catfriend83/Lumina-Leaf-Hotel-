import {FOUNDATION_LEVELS} from '../dist/foundation-data.js?v=41';
import fs from 'node:fs';
import {ROADS,WALKS,VILLAGE,BUILDINGS,buildingPoint,nearestRoadAccess,route,LAKE_POLYGON,LAKE_RESTS} from '../dist/village-layout.js';
import {landHeight} from '../dist/landscape.js';
const footprints=[],accesses=[];
for(const b of BUILDINGS){
 const corners=[[-b.w/2,-b.d/2],[b.w/2,-b.d/2],[b.w/2,b.d/2],[-b.w/2,b.d/2]].map(p=>buildingPoint(b,...p));
 const floor=FOUNDATION_LEVELS[b.id],[x,z]=buildingPoint(b,0,b.d/2+.70),access=nearestRoadAccess(x,z);
 const points=b.kind==='chapel'?[[x,z,floor],[-166,-150,floor],[-161,-145,4.45],[-155,-142,4.4]]:b.kind==='townhall'?[[x,z,floor],[-164.5,-156,4.31],[-164.5,-150,4.35]]:b.kind==='inn'?[[x,z,floor],[-145,-159,floor],[-148,-145,4.4],[-151,-138,4.4]]:b.kind==='shop'?[[x,z,floor],[-141,-154.9,4.45]]:[[x,z,floor],[access.x,access.z,access.y+.025]];
 footprints.push({id:b.id,corners,floor});accesses.push({id:b.id,points,path:route('zugang-'+b.id,points,1.65)});
}
fs.writeFileSync('scripts/village-traffic-layout.json',JSON.stringify({roads:ROADS,walks:WALKS,rests:LAKE_RESTS,lake:LAKE_POLYGON,square:VILLAGE.square,footprints,accesses}));
