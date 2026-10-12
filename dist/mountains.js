// Distant relief only: the hotel, forest, village and lake retain their ground.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const fract=v=>v-Math.floor(v);
function hash(x,z){return fract(Math.sin(x*127.1+z*311.7)*43758.5453123);}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz),a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;}
function fbm(x,z){let sum=0,amp=.5,norm=0;for(let i=0;i<5;i++){sum+=amp*noise(x,z);norm+=amp;x=x*2.07+17.4;z=z*2.07-29.8;amp*=.51;}return sum/norm;}
function ridge(x,z){let sum=0,amp=.5,norm=0;for(let i=0;i<4;i++){const r=1-Math.abs(2*noise(x,z)-1);sum+=amp*r*r;norm+=amp;x=x*2.13-11.8;z=z*2.13+21.7;amp*=.48;}return sum/norm;}
export function mountainWeight(x,z){return smooth(760,900,Math.hypot(x,z+80));}
export function mountainHeight(x,z,base){
 const distance=Math.hypot(x,z+80),weight=mountainWeight(x,z);if(!weight)return base;
 const angle=Math.atan2(z+80,x),warp=(fbm(x*.0032,z*.0032)-.5)*58;
 const crest=1100+105*Math.sin(angle*3+.7)+57*Math.sin(angle*7-1.2)+warp;
 const inner=clamp(1-Math.abs(distance-crest)/(distance<crest?210:300));
 const outerCrest=1390+76*Math.sin(angle*4-1.6)+warp*.45;
 const outer=clamp(1-Math.abs(distance-outerCrest)/(distance<outerCrest?150:245));
 const peaks=155+120*fbm(Math.cos(angle)*3.6+12,Math.sin(angle)*3.6-4)+65*ridge(Math.cos(angle)*9.5-7,Math.sin(angle)*9.5+18);
 const saddles=58*Math.pow(.5+.5*Math.sin(angle*5.7+fbm(x*.0018,z*.0018)*2),8);
 let relief=Math.max(Math.pow(inner,1.08)*(peaks-saddles),Math.pow(outer,1.3)*(210+120*fbm(x*.002,z*.002)));
 // Branching erosion gullies and tilted bedding planes break up broad faces.
 const face=smooth(12,100,relief),gullies=(1-ridge(x*.011+warp*.015,z*.011))**3;
 relief+=face*((ridge(x*.028,z*.028)-.45)*18-gullies*27+Math.sin(x*.043+z*.021+fbm(x*.015,z*.015)*3)*2.3);
 return base*(1-.45*weight)+Math.max(0,relief)*.40*weight;
}
export function mountainSurface(x,z,height,ny){
 const variation=fbm(x*.016,z*.016),snowLine=112+18*fbm(x*.008,z*.008)+8*Math.sin(x*.004);
 // Bare steep rock; vegetation on lower, gentler slopes; snow on shelves.
 const snow=smooth(snowLine-15,snowLine+25,height)*smooth(.32,.73,ny);
 const vegetation=(1-smooth(75,110,height))*smooth(.56,.85,ny);
 const bedding=.5+.5*Math.sin(height*.28+x*.022+z*.009+variation*2.1);
 return {category:snow>.42?2:1,variation,snow,vegetation,bedding};
}
