import {optimizeStaticScene} from './static-performance.js?v=78';
import {createPerformanceMonitor} from './performance-monitor.js?v=78';
import {loadModelBlob} from './model-download.js?v=75';
import {T} from './core.js?v=75';
import {createScene,cameraViews} from './scene.js?v=102';
import {createRendering} from './rendering.js?v=94';
import {CINEMATIC} from './cinematic.js?v=75';
import {assemble8K,EXPORT_8K} from './export-8k.js?v=75';
import {OrbitControls} from './vendor/addons/controls/OrbitControls.js';
const el=id=>document.getElementById(id);let renderer,camera,controls,built,rendering,activeView='cinematic',flight=null,busy=false,toastTimer,optimization,monitor;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
// Handheld devices start with a GPU-friendly rendering profile; desktop retains
// its cinematic output. This only changes viewer rendering, never exported models.
const mobile=/Android|iPhone|iPod|Mobile/i.test(navigator.userAgent)||innerWidth<700;
const fastHotel=mobile&&new URLSearchParams(location.search).get('full')!=='1';
function setLoadingProgress(percent,message){
 const loading=el('loading');if(!loading)return;
 const value=Math.min(100,Math.max(0,Math.round(percent)));
 const bar=loading.querySelector('.load-line');
 if(bar){bar.style.setProperty('--loading-percent',value+'%');bar.setAttribute('aria-valuenow',String(value));}
 const status=loading.querySelector('p');if(status)status.textContent=message;
}
function toast(text,timeout=5000){clearTimeout(toastTimer);el('toast').textContent=text;el('toast').hidden=false;if(timeout)toastTimer=setTimeout(()=>el('toast').hidden=true,timeout);}
function setView(name,animate=true){if(!cameraViews[name])throw new Error('Unbekannte Perspektive');activeView=name;const v=cameraViews[name],target=new T.Vector3(...v.target),position=new T.Vector3(...v.position);const frame=el('viewport'),fit=Math.max(1,(16/9)/(frame.clientWidth/frame.clientHeight));camera.fov=v.interior?Math.min(100,2*Math.atan(Math.tan(v.fov*Math.PI/360)*fit)*180/Math.PI):(v.fov||27.88);camera.updateProjectionMatrix();if(!v.interior)position.sub(target).multiplyScalar(fit*(fastHotel?.76:1)).add(target);document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));if(animate&&!reduced){flight={from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),toTarget:target,start:performance.now(),duration:1100};}else{camera.position.copy(position);controls.target.copy(target);controls.update();}setRotate(false);}
function setRotate(state){controls.autoRotate=state;el('rotate-btn').setAttribute('aria-pressed',String(state));}
async function download(url,name){if(url.includes('.glb.gz')||url.includes('.download.json')){try{const blob=await loadModelBlob(url),local=URL.createObjectURL(blob);await download(local,name);setTimeout(()=>URL.revokeObjectURL(local),60000);}catch(e){toast('Das 3D-Modell konnte nicht heruntergeladen werden. Bitte erneut versuchen.');}return;}const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();}
function hideHint(){el('hint').style.opacity='0';}
function resize(){if(!renderer||busy)return;const box=el('viewport');renderer.setSize(box.clientWidth,box.clientHeight);camera.aspect=box.clientWidth/box.clientHeight;camera.updateProjectionMatrix();rendering?.resize(box.clientWidth,box.clientHeight);}
async function start(){
 setLoadingProgress(2,'Schrift und Grafiksystem werden geladen …');
 // A missing decorative font must not prevent the 3D model from starting.
 try{const scriptFont=new FontFace('Lumina Script','url(./assets/lumina-script.otf)');document.fonts.add(await scriptFont.load());}
 catch(e){console.warn('Optionale Schrift konnte nicht geladen werden.',e);}
 renderer=new T.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.8));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=CINEMATIC.exposure;renderer.shadowMap.enabled=!fastHotel;renderer.shadowMap.type=T.PCFSoftShadowMap;el('viewport').append(renderer.domElement);
 camera=new T.PerspectiveCamera(27.88,1,.1,3500);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.screenSpacePanning=true;controls.minDistance=4;controls.maxDistance=440;controls.maxPolarAngle=Math.PI*.492;controls.autoRotateSpeed=.65;controls.target.set(-1,5,-8);controls.zoomSpeed=.85;controls.panSpeed=.65;controls.rotateSpeed=.6;
 monitor=createPerformanceMonitor(renderer);
 const loader=new T.TextureLoader(),assets=new Map();
 const paths=fastHotel?
  ['photo-reference.jpg','alpine-stone.png','alpine-limestone.png','granite-cobblestone.png','botanical-wrap.png','snowy-spruce.png','alpine-forest-pine.png','festive-shrub.png','limousine-side-wrap-v12.png','sunset-sky.png']:
  ['photo-reference.jpg','alpine-stone.png','alpine-limestone.png','granite-cobblestone.png','botanical-wrap.png','snowy-spruce.png','alpine-forest-pine.png','festive-shrub.png','limousine-side-wrap-v12.png','sunset-sky.png'];
 const loadTexture=path=>{if(!assets.has(path)){const task=loader.loadAsync(new URL(path,import.meta.url)).then(t=>{t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;});task.catch(()=>{});assets.set(path,task);}return assets.get(path);};
 for(const name of paths)loadTexture('assets/'+name);
 built=await createScene({createCanvas:(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},loadTexture,onProgress:setLoadingProgress,mobile,fastHotel});
 setLoadingProgress(97,'Grafikleistung für dein Gerät optimieren …');
 // Hotel builders already batch thousands of repeated parts as InstancedMesh.
 // Skip the extra whole-scene batching pass before the first mobile frame.
 optimization=fastHotel?{report:{mobileHotelFastStart:true},fullDetail(){},dispose(){}}:
   optimizeStaticScene(built,{multiDraw:!!renderer.getContext().getExtension('WEBGL_multi_draw')});
 rendering=createRendering(renderer,built,camera,{mobile,monitor});resize();setView(fastHotel?'original':'cinematic',false);built.meadowController.update(camera,true);controls.addEventListener('start',()=>{flight=null;hideHint();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));});
 // Only keep high-poly forest instances within viewing range on handhelds.
 // The actual forest geometry remains untouched for export and desktop views.
 const mobileForest=[];
 if(mobile)built.scene.traverse(o=>{
  if(!o.visible||!(o.isInstancedMesh||o.isBatchedMesh)||!/Alpiner Mischwald/i.test(o.material?.name||''))return;
  if(!o.boundingSphere)o.computeBoundingSphere();
  if(!o.boundingSphere)return;
  const sphere=o.boundingSphere.clone().applyMatrix4(o.matrixWorld);
  mobileForest.push({object:o,x:sphere.center.x,z:sphere.center.z,radius:sphere.radius});
 });
 let lastForestCull=-Infinity;
 function cullDistantForest(now){
  if(!mobile||now-lastForestCull<350)return;
  lastForestCull=now;
  const x=camera.position.x,z=camera.position.z;
  for(const item of mobileForest)item.object.visible=Math.hypot(x-item.x,z-item.z)-item.radius<315;
 }
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();busy=true;toast('Die Grafik wurde unterbrochen. Bitte lade die Seite erneut.',0);});
 setLoadingProgress(99,'Erste 3D-Ansicht wird gerendert …');
 // Track actual frame intervals. Scale only the mobile framebuffer in small
 // steps; avoid expensive full-scene rebuilds or deleting source meshes.
 let firstFrame=true,last=performance.now(),sampleDuration=0,sampleFrames=0,lastAdjustment=0;
 function adaptMobileResolution(now,period){
  if(!mobile||period>250||period<=0)return;
  sampleDuration+=period;sampleFrames++;
  if(sampleDuration<2500||sampleFrames<12)return;
  const average=sampleDuration/sampleFrames,old=renderer.getPixelRatio();
  const upper=Math.min(devicePixelRatio,1);
  let next=old;
  if(average>42)next=Math.max(.65,old-.12);
  else if(average>34)next=Math.max(.65,old-.07);
  else if(average<27)next=Math.min(upper,old+.05);
  sampleDuration=0;sampleFrames=0;
  if(Math.abs(next-old)>.025&&now-lastAdjustment>2300){
   renderer.setPixelRatio(Math.round(next*100)/100);
   resize();
   lastAdjustment=now;
  }
 }
 renderer.setAnimationLoop(now=>{if(busy||document.hidden){last=now;sampleDuration=0;sampleFrames=0;return;}const period=now-last,dt=Math.min(period/1000,.1);last=now;cullDistantForest(now);monitor.begin(now,period);if(flight){const t=Math.min(1,(now-flight.start)/flight.duration),e=t*t*(3-2*t);camera.position.lerpVectors(flight.from,flight.to,e);controls.target.lerpVectors(flight.fromTarget,flight.toTarget,e);if(t===1)flight=null;}controls.update(dt);if(monitor.measure('vegetation',()=>built.meadowController.update(camera))&&!mobile)renderer.shadowMap.needsUpdate=true;rendering.update(now/1000);monitor.measure('renderSubmission',()=>rendering.render(dt));monitor.end();adaptMobileResolution(now,period);
 if(firstFrame){firstFrame=false;setLoadingProgress(100,'Hotelansicht ist bereit');
  const loading=el('loading');if(loading){loading.style.opacity='0';setTimeout(()=>loading.remove(),550);}
 }
 });
 window.luminaPerformance={read:()=>({...monitor.summary(),optimization:optimization.report,pixelRatio:renderer.getPixelRatio(),renderProfile:fastHotel?'mobile-alpine-landscape':mobile?'mobile-fluent':'cinematic'})};
 if(mobile){
  const modeButton=el('scene-mode-btn');
  modeButton.hidden=false;
  modeButton.textContent=fastHotel?'Volle 3D-Details laden':'Mobile Landschaftsansicht';
  modeButton.onclick=()=>{location.search=fastHotel?'?full=1':'';};
 }
 if(fastHotel){
  const available=new Set(['cinematic','original','pool','back','aerial','fitness','eingang','rezeption','vorfahrt','tiefgarage','rampe','village','lake','seehaeuser','kirchenchor','dorfeinfahrt','rathaus','gasthaus','kapelle','landhaeuser','dorfladen','rundweg','meadow']);
  document.querySelectorAll('[data-view]').forEach(b=>{if(!available.has(b.dataset.view))b.hidden=true;});
 }
 addEvents();registerTools();
 window.addEventListener('pagehide',event=>{if(event.persisted)return;renderer.setAnimationLoop(null);controls.dispose();rendering.dispose();optimization.dispose();const geometries=new Set(),materials=new Set(),textures=new Set([built.sky]);built.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)materials.add(m);});for(const m of Object.values(built.materials))if(m?.isMaterial)materials.add(m);else if(m?.isTexture)textures.add(m);for(const m of materials){for(const t of Object.values(m))if(t?.isTexture)textures.add(t);m.dispose();}for(const g of geometries)g.dispose();for(const t of textures)t.dispose();renderer.dispose();},{once:true});
}
function addEvents(){document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));el('reset-btn').onclick=()=>setView('cinematic');el('rotate-btn').onclick=()=>{flight=null;setRotate(!controls.autoRotate);hideHint();};el('fullscreen-btn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(el('experience').requestFullscreen)await el('experience').requestFullscreen();else{document.body.classList.toggle('immersive');toast('Ansicht angepasst. Mit der Vollbildtaste zurück.');}}catch{toast('Vollbild wird von diesem Browser nicht unterstützt.');}};
 el('reference-btn').onclick=()=>el('reference-dialog').showModal();el('close-reference').onclick=()=>el('reference-dialog').close();el('reference-dialog').addEventListener('click',e=>{if(e.target===el('reference-dialog'))el('reference-dialog').close();});
 el('model-btn').onclick=()=>el('model-dialog').showModal();el('close-model').onclick=()=>el('model-dialog').close();el('model-dialog').addEventListener('click',e=>{if(e.target===el('model-dialog'))el('model-dialog').close();});
 el('download-hotel').onclick=()=>{download('./assets/Lumina_Leaf_Hotel_Viewer.download.json?v=92','Lumina_Leaf_Hotel_V92.glb');el('model-dialog').close();toast('Die Hotelanlage wird heruntergeladen.');};
 el('download-landscape').onclick=()=>{download('./assets/Lumina_Leaf_Gesamtszene.download.json?v=92','Lumina_Leaf_Gesamtszene_V92.glb');el('model-dialog').close();toast('Das Hotel mit Landschaft und Wasserfahrzeugen wird heruntergeladen.');};el('snapshot-btn').onclick=export8K;window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);
 el('viewport').addEventListener('keydown',e=>{if(busy)return;const offset=camera.position.clone().sub(controls.target);const spherical=new T.Spherical().setFromVector3(offset);if(e.key==='ArrowLeft')spherical.theta-=.08;else if(e.key==='ArrowRight')spherical.theta+=.08;else if(e.key==='ArrowUp')spherical.phi=Math.max(.05,spherical.phi-.06);else if(e.key==='ArrowDown')spherical.phi=Math.min(Math.PI*.49,spherical.phi+.06);else if(e.key==='+'||e.key==='=')spherical.radius=Math.max(4,spherical.radius*.9);else if(e.key==='-')spherical.radius=Math.min(440,spherical.radius*1.1);else if(e.key==='Home'){setView('cinematic');return;}else return;e.preventDefault();flight=null;setRotate(false);camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical));controls.update();hideHint();});
}
async function export8K(){
 if(busy)return;built.meadowController.update(camera,true);busy=true;flight=null;const wasRotating=controls.autoRotate;controls.autoRotate=false;controls.enabled=false;el('snapshot-btn').disabled=true;
 const oldAspect=camera.aspect,oldView=camera.view?{...camera.view}:null,{width,height,tileWidth,tileHeight}=EXPORT_8K;let target,pipeline,output;
 toast('8K-Bild wird erstellt: 0 %',0);
 try{
  optimization.fullDetail(true);camera.clearViewOffset();camera.aspect=width/height;camera.updateProjectionMatrix();
  target=new T.WebGLRenderTarget(tileWidth,tileHeight,{type:T.UnsignedByteType,format:T.RGBAFormat});
  pipeline=rendering.createExport(tileWidth,tileHeight);
  output=await assemble8K({createCanvas:(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},
   renderTile(area,pixels){camera.setViewOffset(width,height,area.x,area.y,area.width,area.height);pipeline.render(target,area,EXPORT_8K);renderer.readRenderTargetPixels(target,0,0,area.width,area.height,pixels);},
   progress:percent=>toast(`8K-Bild wird erstellt: ${percent} %`,0)});
  const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw new Error('Der Browser konnte das große Bild nicht speichern.');
  const url=URL.createObjectURL(blob);download(url,'Lumina_Leaf_Hotel_7680x4320.png');setTimeout(()=>URL.revokeObjectURL(url),60000);toast('8K-Bild erstellt: 7680 × 4320 Pixel.');
 }catch(e){toast(e.message||'8K-Export fehlgeschlagen. Bitte versuche es auf einem Gerät mit mehr freiem Speicher.',9000);}
 finally{if(output){output.width=1;output.height=1;}camera.clearViewOffset();if(oldView?.enabled)camera.setViewOffset(oldView.fullWidth,oldView.fullHeight,oldView.offsetX,oldView.offsetY,oldView.width,oldView.height);camera.aspect=oldAspect;camera.updateProjectionMatrix();renderer.setRenderTarget(null);target?.dispose();pipeline?.dispose();optimization.fullDetail(false);controls.enabled=true;controls.autoRotate=wasRotating;busy=false;el('snapshot-btn').disabled=false;resize();}
}
function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();const add=t=>{try{Promise.resolve(context.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 add({name:'show_hotel_view',description:'Zeigt eine der vordefinierten Perspektiven des 3D-Hotels.',inputSchema:{type:'object',properties:{view:{type:'string',enum:Object.keys(cameraViews)}},required:['view'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!Object.hasOwn(cameraViews,input.view))throw new Error('Ungültige Perspektive');if(busy)throw new Error('Bildexport läuft');setView(input.view,false);return {view:activeView};}});
 add({name:'read_hotel_performance',description:'Liest die auf diesem Gerät gemessene Bildrate und Renderlast.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(){return window.luminaPerformance.read();}});
 add({name:'read_hotel_view',description:'Liest die aktuelle Kameraposition und Drehung des Hotelmodells.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(){return {camera:camera.position.toArray(),target:controls.target.toArray(),autoRotate:controls.autoRotate,exporting:busy};}});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
start().catch(e=>{console.error(e);el('loading')?.remove();el('error').hidden=false;el('error-message').textContent='Die 3D-Szene konnte nicht geladen werden. Bitte versuche es erneut oder öffne den Link in Chrome bzw. Firefox. '+(e.message||'');});
