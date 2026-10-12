import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {assemble8K,EXPORT_8K,exportTiles} from '../dist/export-8k.js';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const outputPath=process.argv[2];
if(!outputPath)throw new Error('Supply a scratch PNG path for this diagnostic.');
const seen=new Set(),progress=[];
// Simulated bottom-up GPU readback: deliberately unique global pixel pattern.
// This checks assembly and PNG encoding, not browser shaders or scene quality.
const pixel=(x,y)=>[x%251,y%253,(x+y)%249,255];
const canvas=await assemble8K({createCanvas,yieldFrame:async()=>{},progress:v=>progress.push(v),renderTile(area,data){
 assert(!seen.has(`${area.x},${area.y}`));seen.add(`${area.x},${area.y}`);
 for(let y=0;y<area.height;y++)for(let x=0;x<area.width;x++)data.set(pixel(area.x+x,area.y+area.height-1-y),(y*area.width+x)*4);
}});
assert.equal(seen.size,64);assert.equal(progress.at(-1),100);
await fs.writeFile(outputPath,await canvas.encode('png'));canvas.width=1;canvas.height=1;
const bytes=await fs.readFile(outputPath);assert.equal(bytes.readUInt32BE(16),7680);assert.equal(bytes.readUInt32BE(20),4320);
const image=await loadImage(bytes),decoded=createCanvas(image.width,image.height),ctx=decoded.getContext('2d');ctx.drawImage(image,0,0);
// Check the corners and both sides of every row/column boundary, plus interiors.
const xs=[0,7679,...Array.from({length:7},(_,i)=>(i+1)*960).flatMap(x=>[x-1,x]),137,5221];
const ys=[0,4319,...Array.from({length:7},(_,i)=>(i+1)*540).flatMap(y=>[y-1,y]),211,3101];
for(const x of xs)for(const y of ys)assert.deepEqual([...ctx.getImageData(x,y,1,1).data],pixel(x,y),`pixel ${x},${y}`);
const {width,height}=EXPORT_8K;
assert.equal(exportTiles().reduce((n,t)=>n+t.width*t.height,0),width*height);
const allocated=[];await assert.rejects(assemble8K({createCanvas:(w,h)=>{const c=createCanvas(w,h);allocated.push(c);return c;},renderTile(){throw new Error('GPU interrupted');},yieldFrame:async()=>{}}),/GPU interrupted/);
assert(allocated.every(c=>c.width===1&&c.height===1),'Free both canvases after failure');
console.log(JSON.stringify({width,height,pixels:width*height,tiles:seen.size,boundaryPixels:xs.length*ys.length,pngBytes:bytes.length,readbackOrientation:'passed',interruptedExportCleanup:'passed',scope:'PNG assembly; browser rendering untested'}));
