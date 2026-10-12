// Static hosting has a per-file size limit. Parts reconstruct the exact gzip
// stream before decompression; visitors still receive one complete GLB file.
export async function loadModelBlob(url,fetcher=fetch){
  const resolved=new URL(url,import.meta.url),response=await fetcher(resolved);
  if(!response.ok)throw new Error('Download fehlgeschlagen');
  let source=response.body;
  if(resolved.pathname.endsWith('.json')){
    const manifest=await response.json(),parts=[];
    if(manifest.format!=='gzip-parts-v1'||!Array.isArray(manifest.parts)||!manifest.parts.length)throw new Error('Ungültiges Modellpaket');
    let bytes=0;
    for(const part of manifest.parts){
      const r=await fetcher(new URL(part.file,resolved));if(!r.ok)throw new Error('Modellteil fehlt');
      const blob=await r.blob();if(blob.size!==part.bytes)throw new Error('Modellteil unvollständig');parts.push(blob);bytes+=blob.size;
    }
    if(bytes!==manifest.bytes)throw new Error('Modell unvollständig');
    source=new Blob(parts).stream();
  }
  return new Blob([await new Response(source.pipeThrough(new DecompressionStream('gzip'))).blob()],{type:'model/gltf-binary'});
}
