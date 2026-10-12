const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const gardenPathShift=z=>Math.max(0,7-z)*.20+Math.max(0,-z-16)*.95;
export const gardenWalkHeight=z=>1.25*smooth(0,52,-z-3);
export function gardenMeadowHeight(x,z){const center=26+gardenPathShift(z),t=Math.min(1,Math.abs(x-center)/30),shoulder=.5+.5*Math.cos(t*Math.PI);return gardenWalkHeight(z)*shoulder+.02;}
export function rearMeadowWeight(x,z){const r=Math.sqrt(((x-14)/82)**2+((z+69)/64)**2);return 1-smooth(.55,1,r);}
export function rearMeadowHeight(x,z){return .24+1.05*Math.exp(-(((x-34)/47)**2+((z+82)/49)**2))+.07*Math.sin(x*.045+z*.037);}
