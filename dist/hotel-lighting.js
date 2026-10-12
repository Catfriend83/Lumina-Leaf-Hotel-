// Hotel-only finishes: retain the source textures, colours and geometry.
// Keep shared village, spa, car and landscape materials untouched.
export function makeHotelExteriorMaterials(source){
 const finish={...source};
 const copy=(key,properties)=>{finish[key]=source[key].clone();Object.assign(finish[key],properties);return finish[key];};
 copy('stone',{roughness:.92,envMapIntensity:.45});
 copy('ivory',{roughness:.88,envMapIntensity:.4});
 copy('wood',{roughness:.82,envMapIntensity:.5});
 copy('frame',{roughness:.62,metalness:.38,envMapIntensity:.55});
 copy('glass',{roughness:.14,metalness:.08,envMapIntensity:.7,specularIntensity:.75});
 copy('gold',{roughness:.5,metalness:.72,envMapIntensity:.65});
 copy('greenLight',{emissiveIntensity:.72,roughness:.88,envMapIntensity:.2});
 copy('warm',{emissiveIntensity:1.15,roughness:.72,envMapIntensity:.35});
 copy('glow',{opacity:.022});
 // Bright green lighting is also baked into the reference facade pixels.
 // A small highlight shoulder tones down those pixels without changing UVs,
 // source images, warm interiors or the facade's architectural details.
 const photo=copy('photoMaterial',{});
 photo.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float hotelEmerald = smoothstep(0.04, 0.20, diffuseColor.g - max(diffuseColor.r, diffuseColor.b));
   float hotelHighlight = smoothstep(0.30, 0.85, diffuseColor.g);
   diffuseColor.rgb *= 1.0 - 0.22 * hotelEmerald * hotelHighlight;
  `);
 };
 photo.customProgramCacheKey=()=> 'hotel-emerald-highlight-shoulder-v79';
 return finish;
}

// Isolate side fixtures so the entrance and rear lighting stay unchanged.
export function makeHotelSideLighting(front){
 const side={...front};
 const clone=(key,properties)=>{side[key]=front[key].clone();side[key].name='Seitliche Fassadenleuchte – '+key;Object.assign(side[key],properties);return side[key];};
 clone('gold',{roughness:.93,metalness:.24,envMapIntensity:.15});
 const green=clone('greenLight',{emissiveIntensity:.30,roughness:.98,envMapIntensity:.08});
 green.color.set('#9fbaa8');green.emissive.set('#4f986c');
 clone('warm',{emissiveIntensity:.72,roughness:.96,envMapIntensity:.12});
 clone('glow',{opacity:.004});
 side.photoMaterial=front.photoMaterial.clone();
 side.photoMaterial.name='Ruhigere Lichtwirkung in den Seitenfenstern';
 side.photoMaterial.color.setRGB(.76,.76,.76);
 side.photoMaterial.onBeforeCompile=front.photoMaterial.onBeforeCompile;
 side.photoMaterial.customProgramCacheKey=front.photoMaterial.customProgramCacheKey;
 return side;
}

export function softenHotelFacadeLights(hotel){
 let lights=0;
 hotel.traverse(object=>{
  if(!object.isPointLight||object.name!=='Dezentes grünes Fassadenlicht')return;
  object.intensity*=.65;
  object.distance*=1.10;
  lights++;
 });
 return lights;
}
