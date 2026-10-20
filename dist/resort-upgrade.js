import {T,Kit} from './core.js?v=75';
// Scoped finishing only. No new terrain, roads, hotel wings or village objects.
export function finishResortArrival(scene,m,createCanvas){
 const root=new T.Group();root.name='Lumina Leaf – präzise Resort-Außenanlagen';scene.add(root);
 const k=new Kit(root),metal=m.frame.clone(),stone=m.stone.clone(),gold=m.gold.clone();
 metal.name='Anthrazit – Resort-Pflanzgefäße';metal.color.set('#202725');metal.roughness=.55;metal.metalness=.5;
 stone.name='Geschliffener Naturstein – Ankunft';stone.color.set('#c3bcae');stone.roughness=.82;
 const warm=new T.MeshStandardMaterial({name:'Indirektes warmweißes Ankunftslicht',color:'#e4ceb0',emissive:'#ffd4a0',emissiveIntensity:.65,roughness:.8});
 const carpet=scene.getObjectByName('Einziger durchgehender roter Eingangsteppich');
 const entry=new T.Vector3(...carpet.userData.entry),end=new T.Vector3(...carpet.userData.end),direction=end.clone().sub(entry).normalize(),across=new T.Vector3(direction.z,0,-direction.x);
 // Four symmetric accents, entirely inside the existing arrival apron.
 for(const t of [.12,.52])for(const side of [-1,1]){
  const p=entry.clone().lerp(end,t).addScaledVector(across,side*5.0);
  k.bevel(metal,p.x,.58,p.z,.9,.94,.9,.05);k.box(gold,p.x,1.06,p.z,.92,.035,.92);
  k.box(m.soil,p.x,1.083,p.z,.82,.02,.82);
  for(const [dx,dz,h]of [[0,0,.58],[-.22,-.2,.25],[.22,-.2,.25],[-.22,.2,.25],[.22,.2,.25]])k.ball(m.leaf2,p.x+dx,1.10+h*.7,p.z+dz,h,h*.8,h);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;k.ball(m.flowerWhite,p.x+Math.cos(a)*.30,1.25,p.z+Math.sin(a)*.30,.12,.07,.12);}
  k.box(warm,p.x,.25,p.z+.457,.50,.045,.012);
 }
 // Refine the eight existing carpet planters rather than adding lamp rows.
 const fixtures=scene.getObjectByName('Neu ausgerichtete Pflanzen und Teppichleuchten');
 fixtures?.traverse(o=>{if(!o.isMesh||!o.material)return;if(o.material===m.warm)o.material=warm;else if(o.material===m.frame)o.material=metal;});
 const board=(title,sub)=>{const c=createCanvas(1536,512),ctx=c.getContext('2d');ctx.fillStyle='#111615';ctx.fillRect(0,0,1536,512);ctx.strokeStyle='#ba9b61';ctx.lineWidth=6;ctx.strokeRect(20,20,1496,472);ctx.fillStyle='#dfc28a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 126px Georgia, serif';ctx.fillText(title,768,195,1400);ctx.font='82px Arial, sans-serif';ctx.fillText(sub,768,370,1400);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return new T.MeshBasicMaterial({map:tex});};
 // Reuse the existing VIP sign's actual position and size.
 scene.traverse(o=>{if(o.isMesh&&o.material===m.vipParkingSign)o.material=board('Hotelzufahrt','Lumina Leaf Hotel · ★★★★★');});
 // Only reception/lounge illumination, behind the existing glass.
 const hotel=scene.getObjectByName('Lumina Leaf Hotel und Außenanlage');
 hotel?.traverse(o=>{if(o.isPointLight&&o.name==='Weiches Licht über der Referenz-Rezeption'){o.color.set('#ffdbac');o.intensity=28;}
  if(o.isMesh&&o.material?.name==='Kontrolliertes warmes Lobbylicht'){const mat=o.material.clone();mat.emissive.set('#ffdaa4');mat.emissiveIntensity=.90;o.material=mat;}
 });
 k.finish();root.userData={existingArchitecturePreserved:true,arrivalPlanters:4,additionalShadowMaps:0,joystick:false};
 scene.userData.resortFinish={revision:113,arrivalAxis:[entry.toArray(),end.toArray()],preserved:['hotel envelope','garden path','lake','village','main road alignment']};
}
