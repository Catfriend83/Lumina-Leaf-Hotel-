"""Prepare localized paving cuts from the pre-relocation GLB; roads are excluded."""
import json, math
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles

source=json.loads(Path('.sites-runtime/measurement-v68.json').read_text())
old=box(-170.43,-169.18,-158.57,-160.82)
body=box(-166.33,-167.38,-154.47,-159.02)
entry=box(-161.90,-159.075,-158.90,-157.725)
patch=unary_union([old.buffer(.12,join_style=2),body.buffer(.80,join_style=2),entry.buffer(.65,join_style=2)])
traffic=json.loads(Path('dist/village-traffic-data.js').read_text().split('=',1)[1].rstrip(';\n'))
road=unary_union([Polygon(p['outer'],p['holes']) for p in traffic['road']['polygons']])
curb=unary_union([Polygon(p['outer'],p['holes']) for p in traffic['curb']['polygons']])
plaza=unary_union([Polygon(p['outer'],p['holes']) for p in source['plaza']]).union(old)
walk=unary_union([Polygon(p['outer'],p['holes']) for p in traffic['walk']['polygons']]).difference(plaza)
patch=patch.difference(unary_union([road,curb,walk]))
def polys(g):return [g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def height(x,z,original):
 p=__import__('shapely').Point(x,z)
 w=1-smooth(body.distance(p)/.8)
 y=original*(1-w)+4.33*w
 ew=1-smooth(entry.distance(p)/.65)
 return max(y,y*(1-ew)+4.49*ew) if ew else y
surfaces=[]
for r in source['rows']:
 if r['owned'] or not r.get('position'):continue
 if not(r['extras'].get('villageGround') or r['extras'].get('villagePlazaFinish')):continue
 pos=np.array(r['position']).reshape(-1,3);ind=np.array(r['index']).reshape(-1,3);cuts=[]
 for ti,ids in enumerate(ind):
  t=pos[ids];poly=Polygon(t[:,[0,2]])
  if not poly.is_valid or poly.area<1e-12 or not poly.intersects(patch):continue
  inside=poly.intersection(patch)
  if inside.area<1e-10:continue
  den=(t[1,2]-t[2,2])*(t[0,0]-t[2,0])+(t[2,0]-t[1,0])*(t[0,2]-t[2,2])
  def vertex(x,z,changed):
   u=((t[1,2]-t[2,2])*(x-t[2,0])+(t[2,0]-t[1,0])*(z-t[2,2]))/den;v=((t[2,2]-t[0,2])*(x-t[2,0])+(t[0,0]-t[2,0])*(z-t[2,2]))/den;weights=[float(u),float(v),float(1-u-v)];y=float(np.dot(weights,t[:,1]));return {'weights':weights,'point':[float(x),height(x,z,y) if changed else y,float(z)]}
  out=[];replacement=[]
  for changed,g in [(False,poly.difference(patch)),(True,inside.intersection(entry)),(True,inside.difference(entry).intersection(body)),(True,inside.difference(entry.union(body)))]:
   for p in polys(g):
    for tri in constrained_delaunay_triangles(p).geoms:
     todo=[np.array(tri.exterior.coords)[:3]]
     while todo:
      xy=todo.pop()
      if changed and max(np.linalg.norm(xy[a]-xy[b]) for a,b in [(0,1),(1,2),(2,0)])>.75:
       a,b,c=xy;ab=(a+b)/2;bc=(b+c)/2;ca=(c+a)/2;todo.extend([np.array(x) for x in [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]]);continue
      # Counterclockwise X/Z projects to an upward-facing 3D triangle in reverse order.
      d1=xy[1]-xy[0];d2=xy[2]-xy[0];cross=d1[0]*d2[1]-d1[1]*d2[0];xy=xy[[0,2,1]] if cross>0 else xy
      (replacement if changed else out).append([vertex(*q,changed) for q in xy])
  cuts.append({'triangle':ti,'source':ids.tolist(),'outside':out,'inside':replacement})
 if cuts:surfaces.append({'name':r['name'],'sourceVertices':len(pos),'sourceIndices':len(ind)*3,'stone':bool(r['extras'].get('villagePlazaFinish')),'cuts':cuts})
data={'version':68,'position':[-160.4,4.49,-163.2],'rotation':[0,0,0],'delta':[4.1,.18,1.8],'body':list(body.bounds),'entry':list(entry.bounds),'patch': [{'outer':list(p.exterior.coords)[:-1],'holes':[list(h.coords)[:-1] for h in p.interiors]} for p in polys(patch)],'surfaces':surfaces,'report':{'affectedSurfaces':len(surfaces),'cutTriangles':sum(len(s['cuts']) for s in surfaces),'localPatchArea':patch.area,'roadOverlap':patch.intersection(road).area,'sidewalkOverlap':patch.intersection(walk).area,'curbOverlap':patch.intersection(curb).area,'foundationSurfaceY':4.33,'floorY':4.49}}
Path('dist/townhall-placement-data.js').write_text('export const TOWNHALL_PLACEMENT='+json.dumps(data,separators=(',',':'))+';\n');print(json.dumps(data['report']))
