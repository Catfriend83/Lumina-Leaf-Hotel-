import {T} from './core.js?v=75';

// UV coordinates select the user's pixels without altering the source image.
// These surfaces are attached to the building/car volumes, not a scene billboard.
export function mapPhotoUV(geometry,corners,bounds){
 const p=geometry.attributes.position,uv=[],[xmin,xmax,ymin,ymax]=bounds;
 for(let i=0;i<p.count;i++){
  const u=(p.getX(i)-xmin)/(xmax-xmin),v=(p.getY(i)-ymin)/(ymax-ymin);
  const bx=corners[0][0]*(1-u)+corners[1][0]*u,by=corners[0][1]*(1-u)+corners[1][1]*u;
  const tx=corners[3][0]*(1-u)+corners[2][0]*u,ty=corners[3][1]*(1-u)+corners[2][1]*u;
  uv.push((bx*(1-v)+tx*v)/1536,1-(by*(1-v)+ty*v)/864);
 }
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return geometry;
}
export function photoPlane(root,material,{name,x,y,z,width,height,corners,rotation=0}){
 const geo=new T.PlaneGeometry(width,height,16,8);
 mapPhotoUV(geo,corners,[-width/2,width/2,-height/2,height/2]);
 const mesh=new T.Mesh(geo,material);mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.y=rotation;root.add(mesh);return mesh;
}
