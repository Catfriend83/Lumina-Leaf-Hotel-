// Render every output pixel from the 3D camera; no screenshot enlargement.
export const EXPORT_8K={width:7680,height:4320,tileWidth:960,tileHeight:540};
export function exportTiles({width,height,tileWidth,tileHeight}=EXPORT_8K){
 const tiles=[];
 for(let y=0;y<height;y+=tileHeight)for(let x=0;x<width;x+=tileWidth)tiles.push({x,y,width:Math.min(tileWidth,width-x),height:Math.min(tileHeight,height-y)});
 return tiles;
}
export async function assemble8K({createCanvas,renderTile,progress=()=>{},yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0))}){
 const {width,height,tileWidth,tileHeight}=EXPORT_8K,output=createCanvas(width,height),ctx=output.getContext('2d');
 if(!ctx)throw new Error('Nicht genug Speicher für das 8K-Bild.');
 const tile=createCanvas(tileWidth,tileHeight),tc=tile.getContext('2d');
 if(!tc)throw new Error('Das 8K-Bild konnte nicht aufgebaut werden.');
 const idata=tc.createImageData(tileWidth,tileHeight),pixels=new Uint8Array(idata.data.length),tiles=exportTiles();
 try{
  for(let i=0;i<tiles.length;i++){
   const area=tiles[i];await renderTile(area,pixels);
   for(let y=0;y<tileHeight;y++)idata.data.set(pixels.subarray((tileHeight-1-y)*tileWidth*4,(tileHeight-y)*tileWidth*4),y*tileWidth*4);
   tc.putImageData(idata,0,0);ctx.drawImage(tile,area.x,area.y);progress(Math.round((i+1)/tiles.length*100));await yieldFrame();
  }
  return output;
 }catch(e){output.width=1;output.height=1;throw e;}finally{tile.width=1;tile.height=1;}
}
