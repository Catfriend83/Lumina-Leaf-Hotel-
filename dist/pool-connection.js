import {T,Kit} from './core.js?v=75';

export const POOL_SHIFT_X=-6;
export const GARAGE_CROSSING={minX:-21.80,maxX:-9.43};

export function connectPoolToForecourt(root,m,terrace,tower){
 terrace.updateMatrixWorld(true);tower.updateMatrixWorld(true);
 const group=new T.Group();group.name='Verbindungsterrasse und Zugang zum verschobenen Pool';group.userData={poolConnection:true};root.add(group);const k=new Kit(group);
 const a=terrace.localToWorld(new T.Vector3(-2.35,2.63,-4.75)),b=terrace.localToWorld(new T.Vector3(-2.35,2.63,.5));
 const d=tower.localToWorld(new T.Vector3(-2.6,0,1.5));d.y=a.y;const c=new T.Vector3(-1,a.y,b.z),height=a.y;
 const meshFaces=(faces,material,name)=>{const p=[],uv=[],indices=[];for(const points of faces){const start=p.length/3;points.forEach(point=>{p.push(...point.toArray());uv.push(point.x/3,point.z/3+point.y/3);});indices.push(start,start+1,start+2,start,start+2,start+3);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const mesh=k.mesh(geo,material,name);mesh.userData={poolConnection:true};return mesh;};
 const corners=[a,b,c,d],bottom=corners.map(p=>p.clone().add(new T.Vector3(0,-.20,0))),slabFaces=[corners,[...bottom].reverse()];for(let i=0;i<4;i++){const j=(i+1)%4;slabFaces.push([corners[i],bottom[i],bottom[j],corners[j]]);}meshFaces(slabFaces,m.ivory,'Nahtloser Terrassenanschluss an das Hotel');
 const rearMid=a.clone().add(d).multiplyScalar(.5),rearLength=a.distanceTo(d);k.box(m.stone,rearMid.x,(height-.2)/2,rearMid.z,rearLength,height-.2,.30,-Math.atan2(d.z-a.z,d.x-a.x));
 // A real stair connects the moved deck to the unchanged entrance forecourt.
 const steps=22,tread=.30,base=.12,rise=(height-base)/steps,startZ=b.z,endZ=startZ+steps*tread,left=-3.29,right=-1.09,faces=[];
 for(let i=0;i<steps;i++){const y=height-i*rise,z=startZ+i*tread,nextY=y-rise;faces.push([new T.Vector3(left,y,z),new T.Vector3(left,y,z+tread),new T.Vector3(right,y,z+tread),new T.Vector3(right,y,z)]);faces.push([new T.Vector3(left,y,z+tread),new T.Vector3(left,nextY,z+tread),new T.Vector3(right,nextY,z+tread),new T.Vector3(right,y,z+tread)]);for(const x of [left,right]){const side=[new T.Vector3(x,-.02,z),new T.Vector3(x,-.02,z+tread),new T.Vector3(x,y,z+tread),new T.Vector3(x,y,z)];faces.push(x===left?side:side.reverse());}}
 meshFaces(faces,m.stone,'Natursteintreppe vom Pool zum Eingangsvorplatz');
 k.box(m.cobbles,(left+right)/2,.05,endZ+.35,right-left+.3,.14,.70);
 for(const x of [left-.08,right+.08]){k.line(m.chrome,[x,height+1.04,startZ],[x,base+1.04,endZ],.027);for(const i of [0,steps]){const y=height-i*rise,z=startZ+i*tread;k.line(m.chrome,[x,y,z],[x,y+1.04,z],.018);}}
 k.line(m.chrome,[d.x,height+1.04,d.z],[c.x,height+1.04,c.z],.023);for(let i=0;i<=1;i++){const p=d.clone().lerp(c,i);k.line(m.chrome,[p.x,height,p.z],[p.x,height+1.04,p.z],.016);}
 const stairGlass=[];for(const x of [left-.08,right+.08])stairGlass.push([new T.Vector3(x,height+.03,startZ),new T.Vector3(x,base+.03,endZ),new T.Vector3(x,base+1.01,endZ),new T.Vector3(x,height+1.01,startZ)]);stairGlass.push([new T.Vector3(d.x,height+.03,d.z),new T.Vector3(c.x,height+.03,c.z),new T.Vector3(c.x,height+1.01,c.z),new T.Vector3(d.x,height+1.01,d.z)]);meshFaces(stairGlass,m.glass,'Glasbrüstungen am neuen Poolzugang');
 k.finish();return group;
}
