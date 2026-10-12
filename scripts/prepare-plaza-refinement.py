"""Partition only the rear paving wedge and the two relocated tree beds."""
import json, math
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles

source=json.loads(Path('.sites-runtime/measurement-v69-source.json').read_text())
finish=json.loads(Path('dist/plaza-finish-data.js').read_text().split('=',1)[1].rstrip(';\n'))
old=[[-168.06857196541156,-159.18609902793065],[-168.06857196541156,-152.78609902793067]]
new=[[-169.6,-156.2],[-151.2,-156.2]]
# Restore the original road-parallel edge across the notch occupied by the
# previous Rathaus. Its two existing boundary points define the exact line.
polygons=[]
for p in finish['polygons']:
 ring=[q for q in p['outer'] if q not in [[-158.75,-169.0],[-158.75,-161.0],[-170.25,-161.0]]]
 polygons.append(Polygon(ring,p['holes']))
desired=unary_union(polygons)
rear=box(-171.5,-173,-157.9,-167.6).difference(desired)
oldbeds=unary_union([Point(*p).buffer(.85,quad_segs=16) for p in old])
newbeds=unary_union([Point(*p).buffer(.85,quad_segs=16) for p in new])
patch=unary_union([rear,oldbeds,newbeds])
def polys(g):return [g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
def region(g):return [{'outer':list(p.exterior.coords)[:-1],'holes':[list(h.coords)[:-1] for h in p.interiors]} for p in polys(g)]
surfaces=[];areas={'walk':0,'stone':0,'soil':0}
for r in source['rows']:
 if r['owned'] or not r.get('position'):continue
 stone=bool(r['extras'].get('villagePlazaFinish') or r['extras'].get('townhallGroundConnection'))
 if not(stone or r['extras'].get('villageGround')):continue
 pos=np.array(r['position']).reshape(-1,3);ind=np.array(r['index']).reshape(-1,3);cuts=[]
 for ti,ids in enumerate(ind):
  t=pos[ids];poly=Polygon(t[:,[0,2]])
  if not poly.is_valid or poly.area<1e-12 or not poly.intersects(patch):continue
  regions={'walk':poly.intersection(rear) if stone else Polygon(),
           'stone':poly.intersection(oldbeds) if not stone else Polygon(),
           'soil':poly.intersection(newbeds) if stone else Polygon()}
  changed=unary_union(list(regions.values()))
  if changed.area<1e-10:continue
  regions={'keep':poly.difference(changed),**regions}
  den=(t[1,2]-t[2,2])*(t[0,0]-t[2,0])+(t[2,0]-t[1,0])*(t[0,2]-t[2,2])
  def vertex(x,z):
   u=((t[1,2]-t[2,2])*(x-t[2,0])+(t[2,0]-t[1,0])*(z-t[2,2]))/den
   v=((t[2,2]-t[0,2])*(x-t[2,0])+(t[0,0]-t[2,0])*(z-t[2,2]))/den
   return [float(u),float(v),float(1-u-v)]
  outputs={}
  for kind,g in regions.items():
   if kind!='keep':areas[kind]+=g.area
   triangles=[]
   for p in polys(g):
    for tri in constrained_delaunay_triangles(p).geoms:
     xy=np.array(tri.exterior.coords)[:3]
     a,b=xy[1]-xy[0],xy[2]-xy[0]
     if a[0]*b[1]-a[1]*b[0]>0:xy=xy[[0,2,1]]
     triangles.append([vertex(*q) for q in xy])
   outputs[kind]=triangles
  cuts.append({'triangle':ti,'source':ids.tolist(),'outputs':outputs})
 if cuts:surfaces.append({'name':r['name'],'sourceVertices':len(pos),'sourceIndices':len(ind)*3,'cuts':cuts})
data={'version':69,'treeIndices':[0,3],'oldTrees':old,'newTrees':new,'frontZ':-159.2,'facadeAxisX':-160.4,
      'bedRadius':.85,'rearBoundary':[[-166.59344367873075,-169],[-170.25,-167.74093133489504]],
      'rear':region(rear),'oldBeds':region(oldbeds),'newBeds':region(newbeds),'patch':region(patch),'surfaces':surfaces,
      'report':{'surfaceAreas':areas,'cutTriangles':sum(len(s['cuts']) for s in surfaces),'affectedSurfaces':len(surfaces),'treeFacadeDistance':3.0,'treeAxisDistance':9.2}}
Path('dist/plaza-refinement-data.js').write_text('export const PLAZA_REFINEMENT='+json.dumps(data,separators=(',',':'))+';\n')
print(json.dumps(data['report']))
