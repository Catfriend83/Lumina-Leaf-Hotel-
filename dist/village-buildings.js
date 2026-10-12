import {buildBavarianRoof} from './bavarian-houses.js?v=75';
import {buildReferenceAlpineHouse} from './alpine-houses.js?v=75';
import {buildAlpinePublicBuilding} from './alpine-public-buildings.js?v=75';
import {buildVillageShop} from './village-shop.js?v=75';
// Every retained plot has one explicit architecture path. Unknown kinds fail.
export function buildVillageBuilding(root,materials,b,height){
 if(b.kind==='shop')return buildVillageShop(root,materials,b,height);
 if(['house','pension'].includes(b.kind))return buildReferenceAlpineHouse(root,materials,b,height,buildBavarianRoof);
 if(['chapel','inn','townhall'].includes(b.kind))return buildAlpinePublicBuilding(root,materials,b,height,buildBavarianRoof);
 throw new Error('No regional architecture for '+b.id+' ('+b.kind+')');
}
