// Indexed barycentric contact sampling avoids scanning the entire landscape
// for each small footing, especially when opening the model on a phone.
export function createGroundContact(meshes){
 const grid=new Map(),cell=3;
 for(const mesh of meshes){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index.array,m=mesh.matrixWorld.elements;
  for(let i=0;i<ix.length;i+=3){const t=[];for(let j=0;j<3;j++){const a=ix[i+j],x=p.getX(a),y=p.getY(a),z=p.getZ(a);t.push(m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]);}
   const den=(t[5]-t[8])*(t[0]-t[6])+(t[6]-t[3])*(t[2]-t[8]);if(Math.abs(den)<1e-12)continue;t.push(den);
   for(let x=Math.floor(Math.min(t[0],t[3],t[6])/cell);x<=Math.floor(Math.max(t[0],t[3],t[6])/cell);x++)for(let z=Math.floor(Math.min(t[2],t[5],t[8])/cell);z<=Math.floor(Math.max(t[2],t[5],t[8])/cell);z++){const k=x+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(t);}
  }
 }
 return (x,z)=>{let y=-Infinity;for(const t of grid.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){const a=((t[5]-t[8])*(x-t[6])+(t[6]-t[3])*(z-t[8]))/t[9],b=((t[8]-t[2])*(x-t[6])+(t[0]-t[6])*(z-t[8]))/t[9],c=1-a-b;if(a<-.000002||b<-.000002||c<-.000002)continue;y=Math.max(y,a*t[1]+b*t[4]+c*t[7]);}if(!Number.isFinite(y))throw new Error('Missing terrain contact at '+x+','+z);return y;};
}
