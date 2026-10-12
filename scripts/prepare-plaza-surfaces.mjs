import fs from 'node:fs';
import {TRAFFIC,pavingHeight} from '../dist/village-traffic.js';
import {VILLAGE_GROUND} from '../dist/village-ground-data.js';
import {landHeight,renderedGroundHeight} from '../dist/landscape.js';
// The same Float32 positions as the runtime, without rendering/exporting textures.
const points=(vertices,height)=>vertices.map(([x,z],i)=>Array.from(new Float32Array([x,height(x,z,i),z])));
const walk={positions:points(TRAFFIC.walk.vertices,(x,z)=>pavingHeight(x,z,landHeight)),indices:TRAFFIC.walk.indices};
const ground={positions:points(VILLAGE_GROUND.vertices,(x,z,i)=>renderedGroundHeight(x,z,VILLAGE_GROUND.borderDistances[i])),indices:VILLAGE_GROUND.indices};
fs.writeFileSync('.sites-runtime/plaza-source-surfaces.json',JSON.stringify({walk,ground}));console.log({walkVertices:walk.positions.length,groundVertices:ground.positions.length});
