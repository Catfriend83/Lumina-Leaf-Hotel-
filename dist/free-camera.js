import {T} from './core.js?v=75';
import {createCameraCollision} from './camera-collision.js?v=113';
export function createFreeCamera({camera,canvas,scene,orbit,collisionWorld=null,onChange=()=>{},onHint=()=>{}}){
 let enabled=false,collision=collisionWorld,yaw=0,pitch=0,lastTap=null,focusFlight=null;
 const pointers=new Map(),keys=new Set(),pending=new T.Vector3(),velocity=new T.Vector3(),euler=new T.Euler(0,0,0,'YXZ'),desired=new T.Quaternion();
 let gesture=null,precision=1,mouse=false;
 const forward=()=>new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion),right=()=>new T.Vector3(1,0,0).applyQuaternion(camera.quaternion);
 const bounds=()=>canvas.getBoundingClientRect();
 const look=(dx,dy)=>{const r=bounds(),scale=.0028*Math.max(.22,precision);yaw-=dx*scale;pitch=T.MathUtils.clamp(pitch-dy*scale,-Math.PI*.47,Math.PI*.47);focusFlight=null;};
 const pan=(dx,dy)=>{const f=forward();f.y=0;if(f.lengthSq()<.001)f.set(Math.sin(yaw),0,-Math.cos(yaw));f.normalize();
  const r=right();r.y=0;r.normalize();const scale=.045*Math.max(.06,precision);
  pending.addScaledVector(r,-dx*scale).addScaledVector(f,dy*scale);focusFlight=null;
 };
 const getGesture=()=>{const p=[...pointers.values()];if(p.length<2)return null;return{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)};};
 function consume(e){if(!enabled)return false;e.preventDefault();e.stopImmediatePropagation();return true;}
 function down(e){if(!consume(e))return;canvas.focus?.({preventScroll:true});canvas.setPointerCapture?.(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,time:e.timeStamp,moved:false});gesture=getGesture();mouse=e.pointerType==='mouse';
 }
 function move(e){if(!consume(e))return;const p=pointers.get(e.pointerId);if(!p)return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.startX,p.y-p.startY)>6)p.moved=true;
  if(pointers.size===1)look(dx,dy);
  else{const next=getGesture();if(gesture&&next){pan(next.x-gesture.x,next.y-gesture.y);
    if(gesture.d>10&&next.d>10)pending.addScaledVector(forward(),T.MathUtils.clamp(Math.log(next.d/gesture.d)*16,-3,3)*Math.max(.07,precision));
   }gesture=next;for(const p of pointers.values())p.moved=true;
  }
 }
 function up(e){if(!consume(e))return;const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);gesture=getGesture();
  if(p&&!p.moved&&e.timeStamp-p.time<330&&e.type!=='pointercancel'){
   if(lastTap&&e.timeStamp-lastTap.time<340&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<25){focusAt(e.clientX,e.clientY);lastTap=null;}
   else lastTap={time:e.timeStamp,x:e.clientX,y:e.clientY};
  }
 }
 function wheel(e){if(!consume(e))return;pending.addScaledVector(forward(),T.MathUtils.clamp(-e.deltaY*.014,-3,3)*Math.max(.07,precision));focusFlight=null;}
 function keyDown(e){if(!enabled||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)||e.target?.isContentEditable)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);focusFlight=null;}
 }
 const keyUp=e=>keys.delete(e.code),clear=()=>{keys.clear();pointers.clear();pending.set(0,0,0);velocity.set(0,0,0);gesture=null;};
 const handlers=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['wheel',wheel],['contextmenu',e=>{if(enabled)e.preventDefault();}]];
 for(const[type,fn]of handlers)canvas.addEventListener(type,fn,{capture:true,passive:false});
 const host=canvas.ownerDocument?.defaultView||globalThis;host.addEventListener?.('keydown',keyDown);host.addEventListener?.('keyup',keyUp);host.addEventListener?.('blur',clear);
 function setEnabled(value){if(enabled===value)return;if(value&&!collision)collision=createCameraCollision(scene);
  enabled=value;clear();focusFlight=null;
  if(value){euler.setFromQuaternion(camera.quaternion,'YXZ');pitch=T.MathUtils.clamp(euler.x,-Math.PI*.47,Math.PI*.47);yaw=euler.y;
   orbit.enabled=false;orbit.autoRotate=false;camera.near=.07;camera.updateProjectionMatrix();canvas.style.cursor='grab';canvas.tabIndex=0;
   onHint('Freie Kamera: ein Finger blickt umher, zwei Finger bewegen, Pinch zoomt. Doppeltippen fokussiert.');
  }else{orbit.target.copy(camera.position).addScaledVector(forward(),Math.max(orbit.minDistance||2,Math.min(40,orbit.target.distanceTo(camera.position))));orbit.enabled=true;camera.near=.35;camera.updateProjectionMatrix();canvas.style.cursor='';}
  onChange(enabled);
 }
 function focusAt(x,y){if(!enabled)return false;const r=bounds(),ndc=new T.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),ray=new T.Raycaster();ray.setFromCamera(ndc,camera);
  const point=collision.focus(ray.ray.origin,ray.ray.direction);if(!point)return false;
  const distance=camera.position.distanceTo(point),standOff=T.MathUtils.clamp(distance*.18,1.1,7),end=point.clone().addScaledVector(ray.ray.direction,-standOff);
  focusFlight={point,start:camera.position.clone(),end:collision.constrain(camera.position,end),elapsed:0};clear();return true;
 }
 function update(dt){if(!enabled)return;dt=Math.min(Math.max(dt,0),.05);precision=collision.precision(camera.position);
  if(focusFlight){const f=focusFlight;f.elapsed+=dt;const t=Math.min(1,f.elapsed/.85),s=t*t*(3-2*t);
   camera.position.copy(collision.constrain(camera.position,f.start.clone().lerp(f.end,s)));camera.lookAt(f.point);euler.setFromQuaternion(camera.quaternion,'YXZ');yaw=euler.y;pitch=euler.x;if(t===1)focusFlight=null;return;
  }
  euler.set(pitch,yaw,0,'YXZ');desired.setFromEuler(euler);camera.quaternion.slerp(desired,1-Math.exp(-dt*18));
  const f=forward(),r=right(),input=new T.Vector3();
  if(keys.has('KeyW')||keys.has('ArrowUp'))input.add(f);if(keys.has('KeyS')||keys.has('ArrowDown'))input.sub(f);
  if(keys.has('KeyD')||keys.has('ArrowRight'))input.add(r);if(keys.has('KeyA')||keys.has('ArrowLeft'))input.sub(r);
  if(keys.has('Space'))input.y+=1;if(keys.has('ShiftLeft')||keys.has('ShiftRight'))input.y-=1;
  if(input.lengthSq()>1)input.normalize();input.multiplyScalar(14*Math.max(.045,precision));
  velocity.lerp(input,1-Math.exp(-dt*14));
  const drag=pending.clone().multiplyScalar(1-Math.exp(-dt*20));pending.sub(drag);
  const delta=velocity.clone().multiplyScalar(dt).add(drag);
  if(delta.lengthSq()>1e-9)camera.position.copy(collision.constrain(camera.position,camera.position.clone().add(delta)));
 }
 return {setEnabled,update,focusAt,get enabled(){return enabled;},get precision(){return precision;},
  state(){return{enabled,precision,position:camera.position.toArray(),collision:collision?.report};},
  dispose(){setEnabled(false);for(const[type,fn]of handlers)canvas.removeEventListener(type,fn,true);host.removeEventListener?.('keydown',keyDown);host.removeEventListener?.('keyup',keyUp);host.removeEventListener?.('blur',clear);}};
}
