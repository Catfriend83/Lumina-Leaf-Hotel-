import {T} from './core.js?v=75';
import left from './reception-character-0.js?v=86';
import right from './reception-character-1.js?v=86';
const geometryCache=new Map();
function decode(text,Type){const str=atob(text),bytes=new Uint8Array(str.length);for(let i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i);return new Type(bytes.buffer);}
function volume(profile){
 if(!geometryCache.has(profile)){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(decode(profile.data.position,Float32Array),3));g.setAttribute('uv',new T.BufferAttribute(decode(profile.data.uv,Float32Array),2));g.setIndex(new T.BufferAttribute(decode(profile.data.index,Uint32Array),1));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();geometryCache.set(profile,g);
 }
 return geometryCache.get(profile);
}
export function buildReceptionTeam(parent,m,floor){
 const configs=[left,right],groups=[];
 for(const [index,x]of [6.70,9.30].entries()){
  const profile=configs[index],map=m.receptionTextures[index];
  const mat=new T.MeshPhysicalMaterial({name:'Empfangsteam – '+profile.name,map,alphaTest:.42,roughness:.72,metalness:0,clearcoat:.04,clearcoatRoughness:.55,envMapIntensity:.32,bumpMap:map,bumpScale:.0005});
  const g=new T.Group();g.name=index?'Empfangsmitarbeiterin rechts – glattes blondes Haar':'Empfangsmitarbeiterin links – dunkelblonde Locken';g.position.set(x,floor,-3.72);
  g.userData={referenceStaff:true,receptionist:true,identity:index,female:true,adult:true,uniform:'dunkelblaues Kostüm, helle Bluse, türkisblaues Halstuch',heightMeters:profile.height,referenceAppearance:profile.name,phototexturedVolume:true,reconstructedDepth:true,frontBackTexture:true,handsPose:'entspannt neben dem Körper',facesEntrance:true};
  const mesh=new T.Mesh(volume(profile),mat);mesh.name='Geschlossene Empfangsfigur – '+profile.name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={receptionBody:true,vertices:profile.vertices,triangles:profile.triangles};g.add(mesh);parent.add(g);groups.push(g);
 }
 parent.userData.receptionTeam={version:86,employees:2,centerX:8,spacingMeters:2.6,heightMeters:1.72,uniform:'navy blazer, matching skirt, light blouse, turquoise scarf, name badge, black closed shoes',construction:'Closed reconstructed human volumes with individual front/back photograph textures; unseen depth approximated, not a human scan.'};
 return groups;
}
