import {T} from './core.js?v=75';

export const names=['Margeriten','Hahnenfuß','Violette Glockenblumen','Blaue Glockenblumen','Wiesenklee','Schafgarbe','Wildgräser','Wiesen-Salbei','Vergissmeinnicht','Alpenastern','Rote Lichtnelken','Wiesen-Pippau','Wiesen-Storchschnabel'];
export const flowerKinds=[0,1,2,3,4,5,7,8,9,10,11,12];
const green=new T.Color('#548044'),lightGreen=new T.Color('#91a85e');
const flowerColors=['#fff5df','#f4cd35','#9873cc','#88b8df','#df91b3','#efe6c6','#91a85e','#8062b8','#7cbee5','#c0a0dc','#d86c85','#f1c844','#d6a0ce'];

// Every blade, leaf, stem and petal is a capped solid. No facing cards or disks.
export function makeVolumetricPlant(kind,level=0){
  const positions=[],colors=[],indices=[];
  const bloom=new T.Color(flowerColors[kind]||'#eee1b9'),gold=new T.Color('#dcaf2d');
  function vertex(v,c){const i=positions.length/3;positions.push(v.x,v.y,v.z);colors.push(c.r,c.g,c.b);return i;}
  function tube(points,widths,thicknesses,color,sides=5){
    const base=positions.length/3,pts=points.map(p=>new T.Vector3(...p));
    pts.forEach((p,j)=>{
      const tangent=pts[Math.min(j+1,pts.length-1)].clone().sub(pts[Math.max(0,j-1)]).normalize();
      const u=new T.Vector3(Math.abs(tangent.y)>.8?1:0,Math.abs(tangent.y)>.8?0:1,0);u.addScaledVector(tangent,-u.dot(tangent)).normalize();
      const v=u.clone().cross(tangent).normalize();
      const col=color.clone().multiplyScalar(.70+.30*j/(pts.length-1));
      for(let i=0;i<sides;i++){const a=i*Math.PI*2/sides;vertex(p.clone().addScaledVector(u,Math.cos(a)*thicknesses[j]).addScaledVector(v,Math.sin(a)*widths[j]),col);}
    });
    for(let j=0;j<pts.length-1;j++)for(let i=0;i<sides;i++){
      const a=base+j*sides+i,b=base+j*sides+(i+1)%sides,c=a+sides,d=b+sides;indices.push(a,c,d,a,d,b);
    }
    const bottom=vertex(pts[0],color),top=vertex(pts.at(-1),color);
    for(let i=0;i<sides;i++){indices.push(bottom,base+i,base+(i+1)%sides);const ring=base+(pts.length-1)*sides;indices.push(top,ring+(i+1)%sides,ring+i);}
  }
  function seed(x,y,z,rx,ry,rz,color){
    const base=positions.length/3;
    for(const p of [[rx,0,0],[-rx,0,0],[0,ry,0],[0,-ry,0],[0,0,rz],[0,0,-rz]])vertex(new T.Vector3(x+p[0],y+p[1],z+p[2]),color);
    for(const f of [[2,4,0],[2,1,4],[2,5,1],[2,0,5],[3,0,4],[3,4,1],[3,1,5],[3,5,0]])indices.push(...f.map(i=>base+i));
  }
  function stem(x,z,h){
    if(level===0)tube([[x,-.03,z],[x+.007,h*.45,z-.009],[x,h,z]],[.005,.004,.003],[.005,.004,.003],green,5);
    else tube([[x,-.03,z],[x,h,z]],[.005,.003],[.005,.003],green,level===1?4:3);
    if(level<2)for(let j=0;j<(level===0?3:2);j++){
      const yy=h*(.25+j*.20),a=j*2.5,dx=Math.cos(a),dz=Math.sin(a);
      tube([[x,yy,z],[x+dx*.07,yy+.065,z+dz*.07],[x+dx*.105,yy+.09,z+dz*.105]], [.003,.022,.0015],[.002,.004,.001],green,3);
    }
  }
  function head(x,y,z,count,r,cupped=false){
    for(let i=0;i<count;i++){
      const a=i*2*Math.PI/count,dx=Math.cos(a),dz=Math.sin(a);
      const pts=[[x+dx*.014,y,z+dz*.014],[x+dx*r*.60,y+(cupped?.028:.010),z+dz*r*.60],[x+dx*r,y+(cupped?.066:.015),z+dz*r]];
      tube(pts,[.004,r*.17,.002],[.002,.0035,.0015],bloom,level===0?4:3);
    }
    seed(x,y+.013,z,.019,.017,.019,gold);
  }
  if(kind===6){
    const count=level===0?9:level===1?5:3;
    for(let i=0;i<count;i++){
      const a=i*2.3999,dx=Math.cos(a),dz=Math.sin(a),x=dx*.025,z=dz*.025,h=.66+(i%4)*.12;
      tube([[x,-.075,z],[x+dx*.045,h*.55,z+dz*.045],[x+dx*.15,h,z+dz*.15]], [.005,.014,.0012],[.004,.003,.001],i%3?green:lightGreen,level===0?4:3);
      if(level===0&&i%4===0)for(let j=0;j<3;j++)seed(x+dx*.15,h-j*.025,z+dz*.15,.009,.012,.008,lightGreen);
    }
  }else if(kind<2){
    stem(0,0,.95);head(0,.95,0,kind===0?(level===0?11:level===1?8:5):5,kind===0?.073:.061,kind===1);
  }else if(kind<4){
    stem(0,0,1.03);const count=level===0?3:level===1?2:1;
    for(let j=0;j<count;j++){
      const a=j*2.35,x=Math.cos(a)*.04,z=Math.sin(a)*.04,y=.72+j*.13;
      tube([[0,y+.075,0],[x,y+.065,z]],[.003,.0025],[.003,.0025],green,3);
      tube([[x,y+.07,z],[x,y+.035,z],[x,y,z]], [.013,.026,.037],[.013,.026,.037],bloom,level===0?7:level===1?5:4);
      seed(x,y-.004,z,.015,.009,.015,bloom.clone().multiplyScalar(.48));
    }
  }else if(kind===4){
    stem(0,0,.83);const count=level===0?13:level===1?8:4;
    for(let i=0;i<count;i++){const a=i*2.3999,rr=.040*Math.sqrt(i/count);seed(Math.cos(a)*rr,.83+.034*(1-i/count),Math.sin(a)*rr,.019,.025,.019,bloom);}
  }else if(kind===5){
    stem(0,0,1.02);const count=level===0?5:level===1?3:2;
    for(let i=0;i<count;i++){
      const a=i*2.3999,x=Math.cos(a)*.052,z=Math.sin(a)*.052,y=1.02+(i%2)*.026;
      tube([[0,.86,0],[x,y,z]],[.003,.002],[.003,.002],green,3);
      for(let j=0;j<(level===0?4:3);j++){const aa=j*2.3999;seed(x+Math.cos(aa)*.015,y,z+Math.sin(aa)*.015,.015,.012,.015,bloom);}
    }
  }
  if(kind===7){
    stem(0,0,1.12);const tiers=level===0?5:level===1?3:2;
    for(let j=0;j<tiers;j++)for(let side=0;side<2;side++){
      const a=j*1.7+side*Math.PI,x=Math.cos(a),z=Math.sin(a),y=.66+j*.085;
      tube([[x*.007,y,z*.007],[x*.034,y+.014,z*.034],[x*.058,y+.025,z*.058]], [.006,.014,.009],[.005,.011,.006],bloom,level===0?5:3);
    }
  }else if(kind===8){
    stem(0,0,.80);const count=level===0?4:level===1?3:1;
    for(let j=0;j<count;j++){const a=j*2.4,x=Math.cos(a)*.065,z=Math.sin(a)*.065,y=.71+(j%2)*.09;
      tube([[0,.53,0],[x,y,z]],[.003,.002],[.003,.002],green,3);head(x,y,z,5,.038);
    }
  }else if(kind===9){
    stem(0,0,1.04);head(0,1.04,0,level===0?16:level===1?10:6,.086);
  }else if(kind===10){
    stem(0,0,.90);const count=level===0?3:level===1?2:1;
    for(let j=0;j<count;j++){
      const a=j*2.4,x=Math.cos(a)*.052,z=Math.sin(a)*.052,y=.85+j*.085;
      tube([[0,.63,0],[x,y,z]],[.003,.002],[.003,.002],green,3);
      for(let k=0;k<5;k++)for(let fork=0;fork<(level===2?1:2);fork++){
        const aa=k*Math.PI*2/5+(fork?-.11:.11),dx=Math.cos(aa),dz=Math.sin(aa);
        tube([[x+dx*.01,y,z+dz*.01],[x+dx*.034,y+.008,z+dz*.034],[x+dx*.052,y+.02,z+dz*.052]],[.004,.010,.003],[.002,.003,.0015],bloom,level===0?4:3);
      }
      seed(x,y+.007,z,.012,.010,.012,bloom.clone().multiplyScalar(.65));
    }
  }else if(kind===11){
    stem(0,0,1.06);head(0,1.06,0,level===0?14:level===1?9:5,.067);
    if(level<2)head(0,1.078,0,level===0?9:5,.042,true);
  }else if(kind===12){
    stem(0,0,.91);const count=level===0?3:level===1?2:1;
    for(let j=0;j<count;j++){
      const a=j*2.4,x=Math.cos(a)*.055,z=Math.sin(a)*.055,y=.85+(j%2)*.08;
      tube([[0,.58,0],[x,y,z]],[.003,.002],[.003,.002],green,3);
      for(let k=0;k<5;k++){const aa=k*Math.PI*2/5,dx=Math.cos(aa),dz=Math.sin(aa);
        tube([[x+dx*.013,y,z+dz*.013],[x+dx*.039,y+.013,z+dz*.039],[x+dx*.061,y+.024,z+dz*.061]],[.007,.022,.007],[.003,.005,.003],bloom,level===0?5:3);
      }
      seed(x,y+.010,z,.012,.011,.012,bloom.clone().multiplyScalar(.56));
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData={solidBotany:true,species:kind,detailLevel:level};return g;
}

export function createBotanyController(group,records,{mobile=false}={}){
  const material=new T.MeshStandardMaterial({name:'Wiesenbotanik – körperliche alpine Pflanzen',vertexColors:true,roughness:.87,metalness:0,side:T.FrontSide});
  const meshes=records.map((rows,k)=>Array.from({length:3},(_,level)=>{
    const mesh=new T.InstancedMesh(makeVolumetricPlant(k,level),material,Math.max(1,rows.length)+(k===6?6000:1500));mesh.name=names[k]+' – '+['Nahbereich','Mittlere Distanz','Ferne'][level];mesh.count=0;mesh.visible=false;
    mesh.userData={alpineBotany:true,species:k,botanyLOD:level,solidGeometry:true};mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=level===0;mesh.receiveShadow=true;mesh.boundingBox=new T.Box3();mesh.boundingSphere=new T.Sphere();const b=mesh.geometry.boundingBox;mesh.botanicalExtent={radius:Math.hypot(Math.max(Math.abs(b.min.x),Math.abs(b.max.x)),Math.max(Math.abs(b.min.z),Math.abs(b.max.z))),minY:b.min.y,maxY:b.max.y};group.add(mesh);return mesh;
  }));
  const last=new T.Vector3(Infinity,Infinity,Infinity),matrix=new T.Matrix4(),q=new T.Quaternion(),v=new T.Vector3(),scale=new T.Vector3();
  let lastTime=-Infinity,localRecords=names.map(()=>[]),localRegion=null,indexSize=-1,persistent=[],cells=new Map();
  function indexRecords(){const size=records.reduce((n,rows)=>n+rows.length,0);if(indexSize===size)return;indexSize=size;persistent=names.map(()=>[]);cells=new Map();records.forEach((rows,k)=>rows.forEach(r=>{if(r.coverageAnchor||r.rank<=.18-.12)persistent[k].push(r);else{const key=Math.floor(r.x/32)+','+Math.floor(r.z/32);if(!cells.has(key))cells.set(key,[]);cells.get(key).push([k,r]);}}));}
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  function fill(camera,exporting=false){
    const counts=records.map(()=>[0,0,0]);
    meshes.flat().forEach(mesh=>mesh.boundingBox.makeEmpty());
    const apply=(r,k,isLocal=false)=>{
      if(!exporting&&!isLocal&&localRegion&&Math.hypot(r.x-localRegion.x,r.z-localRegion.z)<localRegion.radius)return;
      let level=exporting&&r.foreground?0:1;
      if(!exporting){
        const dx=r.x-camera.position.x,dy=r.y-camera.position.y,dz=r.z-camera.position.z;
        const reach=mobile?115:180;
        if(Math.abs(dx)>reach||Math.abs(dy)>reach||Math.abs(dz)>reach){
          if(mobile||(!r.coverageAnchor&&r.rank>.18-.12))return;
          level=2;
        }else{
          const d=Math.hypot(dx,dy,dz);
          const density=mobile?(d<24?1:d<65?.52-.38*smooth(24,65,d):.14-.10*smooth(65,115,d)):(d<75?1-.82*smooth(25,75,d):.18-.12*smooth(75,180,d));
          if(!r.coverageAnchor&&r.rank>density)return;
          // A hysteresis band prevents plants flickering between full,
          // medium and distant meshes when a camera crosses a LOD boundary.
          // Geometry, colour and total instance capacities stay untouched.
          const near=mobile?24:34,far=mobile?70:95;
          level=d<near?0:d<far?1:2;
          if(r._lastLod===0&&d<near+5)level=0;
          else if(r._lastLod===1){
            if(d>near-5&&d<far+8)level=1;
          }else if(r._lastLod===2&&d>far-8)level=2;
          r._lastLod=level;
        }
      }else if(r.rank>.43&&!r.foreground&&!r.coverageAnchor)return;
      if(!r.matrixElements){q.set(0,Math.sin(r.yaw/2),0,Math.cos(r.yaw/2));v.set(r.x,r.y,r.z);scale.set(r.radial,r.h,r.radial);matrix.compose(v,q,scale);r.matrixElements=new Float32Array(matrix.elements);}
      const mesh=meshes[k][level];mesh.instanceMatrix.array.set(r.matrixElements,counts[k][level]++*16);
      // Conservative solid-plant bounds are accumulated with the instances,
      // avoiding repeated per-vertex matrix transforms on every camera move.
      const radius=mesh.botanicalExtent.radius*r.radial,b=mesh.boundingBox;
      b.min.x=Math.min(b.min.x,r.x-radius);b.max.x=Math.max(b.max.x,r.x+radius);
      b.min.z=Math.min(b.min.z,r.z-radius);b.max.z=Math.max(b.max.z,r.z+radius);
      b.min.y=Math.min(b.min.y,r.y+mesh.botanicalExtent.minY*r.h);b.max.y=Math.max(b.max.y,r.y+mesh.botanicalExtent.maxY*r.h);
    };
    if(exporting)records.forEach((rows,k)=>rows.forEach(r=>apply(r,k)));
    else{indexRecords();persistent.forEach((rows,k)=>rows.forEach(r=>apply(r,k)));const reach=mobile?115:180,minX=Math.floor((camera.position.x-reach)/32),maxX=Math.floor((camera.position.x+reach)/32),minZ=Math.floor((camera.position.z-reach)/32),maxZ=Math.floor((camera.position.z+reach)/32);for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)for(const [k,r]of cells.get(x+','+z)||[])apply(r,k);}
    if(!exporting)localRecords.forEach((rows,k)=>rows.forEach(r=>apply(r,k,true)));
    meshes.forEach((list,k)=>list.forEach((mesh,level)=>{mesh.count=counts[k][level];mesh.visible=mesh.count>0;mesh.instanceMatrix.clearUpdateRanges();if(mesh.count){mesh.instanceMatrix.addUpdateRange(0,mesh.count*16);mesh.instanceMatrix.needsUpdate=true;}mesh.boundingBox.getBoundingSphere(mesh.boundingSphere);}));
    return counts.map(r=>r.slice());
  }
  return {
    meshes,records,
    setLocalRecords(rows,region){if(rows.some((r,k)=>r.length>(k===6?6000:1500)))throw new Error('Local meadow capacity exceeded');localRecords=rows;localRegion=region;last.set(Infinity,Infinity,Infinity);lastTime=-Infinity;},
    prepareExport(){return fill(null,true);},
    update(camera,force=false){const now=globalThis.performance?.now()||Date.now();if(!force&&(last.distanceToSquared(camera.position)<1||now-lastTime<120))return null;last.copy(camera.position);lastTime=now;return fill(camera);}
  };
}
