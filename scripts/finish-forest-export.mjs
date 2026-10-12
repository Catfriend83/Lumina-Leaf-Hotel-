import fs from 'node:fs';
// Closed botanical surfaces are visible from either side, including thin leaves.
for(const path of process.argv.slice(2)){
 const b=fs.readFileSync(path),length=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+length));let changed=false;
 for(const m of g.materials||[])if(m.name?.startsWith('Alpiner Mischwald')&&!m.doubleSided){m.doubleSided=true;changed=true;}
 if(!changed)continue;const json=Buffer.from(JSON.stringify(g)),pad=(4-json.length%4)%4,chunk=Buffer.concat([json,Buffer.alloc(pad,32)]),tail=b.subarray(20+length),head=Buffer.alloc(20);b.copy(head,0,0,20);head.writeUInt32LE(20+chunk.length+tail.length,8);head.writeUInt32LE(chunk.length,12);fs.writeFileSync(path,Buffer.concat([head,chunk,tail]));
}
