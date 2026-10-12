import {T} from './core.js?v=75';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';

export const CINEMATIC={exposure:1.0,bloomStrength:.24,bloomRadius:.42,bloomThreshold:1.25};

// Applied after tone mapping, before sRGB conversion, in live and 8K output.
// Full-frame coordinates prevent a vignette or bloom seam at any tile edge.
export const FILM_GRADE_GLSL=`
vec3 luxuryFilmGrade(vec3 color,vec2 fullUv){
 float luma=dot(color,vec3(.2126,.7152,.0722));
 float shadows=1.0-smoothstep(.08,.48,luma);
 float highlights=smoothstep(.48,.94,luma);
 color*=mix(vec3(1.0),vec3(1.012,1.0,.986),shadows*.4);
 color*=mix(vec3(1.0),vec3(1.018,1.0,.984),highlights);
 float gradedLuma=dot(color,vec3(.2126,.7152,.0722));
 color=mix(vec3(gradedLuma),color,1.0);
 color=max(vec3(0.0),(color-.18)*1.01+.18);
 vec2 edge=(fullUv-.5)*vec2(1.0,.85);
 float vignette=1.0-.025*smoothstep(.12,.46,dot(edge,edge));
 return color*vignette;
}`;
export function createCinematicOutput(bloomTexture=null){
 const output=new OutputPass();
 output.uniforms.filmCrop={value:new T.Vector4(0,0,1,1)};
 let shader=output.material.fragmentShader.replace('uniform sampler2D tDiffuse;','uniform sampler2D tDiffuse;\nuniform vec4 filmCrop;\n'+(bloomTexture?'uniform sampler2D filmBloom;\n':''));
 shader=shader.replace('void main() {',FILM_GRADE_GLSL+'\nvoid main() {');
 if(bloomTexture){output.uniforms.filmBloom={value:bloomTexture};shader=shader.replace('gl_FragColor = texture2D( tDiffuse, vUv );','gl_FragColor = texture2D( tDiffuse, vUv );\ngl_FragColor.rgb += texture2D(filmBloom,filmCrop.xy+vUv*filmCrop.zw).rgb;');}
 shader=shader.replace('// color space','gl_FragColor.rgb=luxuryFilmGrade(gl_FragColor.rgb,filmCrop.xy+vUv*filmCrop.zw);\n\n// color space');
 output.material.fragmentShader=shader;return output;
}
