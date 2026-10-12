"""Partition the current base meshes locally, preserving original triangles/attributes elsewhere."""
import json,struct,math,sys
from pathlib import Path
from shapely.geometry import Polygon,Point,box
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles
from shapely.strtree import STRtree
import numpy as np
surfaces=None
if sys.argv[1].endswith('.json'):surfaces=json.loads(Path(sys.argv[1]).read_text())
else:
 raw=Path(sys.argv[1]).read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:]
def acc(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];width={'SCALAR':1,'VEC3':3}[a['type']]
 return np.ndarray((a['count'],width),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*width),np.dtype(dt).itemsize)).copy()
def mesh(kind):
 if surfaces is not None:return np.array(surfaces[kind]['positions'],dtype=np.float32),np.array(surfaces[kind]['indices'],dtype=np.uint32)
 node=next(n for n in g['nodes'] if n.get('extras',{}).get('villageTrafficSurface')==kind or kind=='ground' and n.get('extras',{}).get('villageGround'))
 p=g['meshes'][node['mesh']]['primitives'][0];return acc(p['attributes']['POSITION']),acc(p['indices']).ravel()
def parts(geom):
 if geom.geom_type=='Polygon':return [geom]
 return [p for p in getattr(geom,'geoms',[]) if p.geom_type=='Polygon']
def shape(polys):return unary_union([Polygon(p['outer'],p['holes']) for p in polys])
traffic=json.loads(Path('dist/village-traffic-data.js').read_text().split('=',1)[1].rstrip(';\n'));layout=json.loads(Path('scripts/village-traffic-layout.json').read_text())
road=shape(traffic['road']['polygons']);sidewalk=road.buffer(2.5,quad_segs=12).difference(road.buffer(.3,quad_segs=8))
footprints=unary_union([Polygon(f['corners']) for f in layout['footprints']]);beds=unary_union([Point(x,z).buffer(r,quad_segs=16) for x,z,r in traffic['beds']])
# Use the complete island enclosed by the roads and their existing sidewalks.
road_edge=road.buffer(2.5,quad_segs=12)
inner=max([Polygon(r) for p in parts(road_edge) for r in p.interiors],key=lambda p:p.area)
mask=inner.buffer(-.0001).difference(footprints).difference(beds)
wp,wi=mesh('walk');gp,gi=mesh('ground')
wtri=[Polygon(wp[wi[j:j+3]][:,[0,2]]) for j in range(0,len(wi),3)];tree=STRtree(wtri)
def weights(x,z,pts):
 a,b,c=pts.astype(np.float64);den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den;v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;return [float(u),float(v),float(1-u-v)]
def walk_anchor(x,z):
 p=Point(x,z);near=tree.query(p.buffer(.001))
 for ti in near:
  tri=wtri[ti]
  if tri.distance(p)<.001:
   ids=wi[ti*3:ti*3+3];w=weights(x,z,wp[ids]);return float(sum(w[i]*wp[ids[i]][1] for i in range(3)))
 return None

def partition(pos,indices,ground=False):
 cuts={};keep=[];inside=[];area=0;original=0
 for j in range(0,len(indices),3):
  ids=indices[j:j+3];pts=pos[ids];tri=Polygon(pts[:,[0,2]])
  if tri.area<1e-12 or not tri.intersects(mask):keep.extend(map(int,ids));continue
  hit=tri.intersection(mask)
  if hit.area<1e-10:keep.extend(map(int,ids));continue
  area+=hit.area
  if tri.difference(mask).area<1e-10 and not ground:
   inside.extend(map(int,ids));original+=1;continue
  vertices=[];lookup={};inix=[];outix=[]
  def emit(region,target):
   for part in parts(region):
    if part.area<1e-10:continue
    for t in constrained_delaunay_triangles(part).geoms:
     if t.area<1e-10:continue
     xy=list(t.exterior.coords)[:3];signed=sum(xy[i][0]*xy[(i+1)%3][1]-xy[(i+1)%3][0]*xy[i][1] for i in range(3))
     if signed>0:xy.reverse()
     for x,z in xy:
      key=(round(x,9),round(z,9))
      if key not in lookup:
       w=weights(x,z,pts);vertex={'source':list(map(int,ids)),'weights':w,'point':[x,z]}
       if ground:
        anchor=walk_anchor(x,z);vertex['walkY']=anchor;vertex['boundaryDistance']=mask.boundary.distance(Point(x,z))
       lookup[key]=len(vertices);vertices.append(vertex)
      target.append(lookup[key])
  emit(hit,inix);emit(tri.difference(mask),outix);cuts[str(j)]={'vertices':vertices,'inside':inix,'outside':outix}
 return {'keep':keep,'inside':inside,'cuts':cuts,'area':area,'unchangedTriangles':len(keep)//3,'retintedOriginalTriangles':original}
walk=partition(wp,wi);ground=partition(gp,gi,True)
polygons=[{'outer':list(p.exterior.coords)[:-1],'holes':[list(r.coords)[:-1] for r in p.interiors]} for p in parts(mask)]
report={'version':49,'innerCoreArea':inner.area,'plazaArea':walk['area']+ground['area'],'existingPavingRefinished':walk['area'],'grassFilled':ground['area'],'sidewalkOverlap':mask.intersection(sidewalk).area,'roadOverlap':mask.intersection(road).area,'buildingOverlap':mask.intersection(footprints).area,'bedsOverlap':mask.intersection(beds).area,'unchangedWalkTriangles':walk['unchangedTriangles'],'unchangedTerrainTriangles':ground['unchangedTriangles']}
assert all(report[k]<1e-7 for k in ['sidewalkOverlap','roadOverlap','buildingOverlap','bedsOverlap'])
Path('dist/plaza-finish-data.js').write_text('export const PLAZA_FINISH='+json.dumps({'walk':walk,'ground':ground,'polygons':polygons,'report':report},separators=(',',':'))+';\n')
Path('plaza-finish-topology-report.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
