import fs from 'node:fs';
import {T} from '../dist/core.js';
const planes={};
for(const [key,params,translation]of[['global',[3100,3100,360,360],[0,0,-220]],['detail',[270,205,90,68],[-88,0,-78]]]){const g=new T.PlaneGeometry(...params);g.rotateX(-Math.PI/2);g.translate(...translation);const p=g.attributes.position;planes[key]={vertices:Array.from({length:p.count},(_,i)=>[p.getX(i),p.getZ(i)]),indices:Array.from(g.index.array)};}
fs.mkdirSync('.sites-runtime',{recursive:true});fs.writeFileSync('.sites-runtime/terrain-grids.json',JSON.stringify(planes));
