"""Join the exposed former Rathaus/tree parcel to its actual paved rim."""
import json
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,box,Point
from shapely.ops import unary_union
from scipy.spatial import Delaunay
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve

source=json.loads(Path('.sites-runtime/measurement-v70-source.json').read_text())
def is_stone(r):
 e=r['extras'];return e.get('villagePlazaFinish') or e.get('townhallGroundConnection') or e.get('plazaRefinement') and e['kind']=='stone'
rows=[r for r in source['rows'] if not r['owned'] and r.get('position') and is_stone(r)]
clip=box(-170.8,-167.8,-166.4,-157.9)
footprints=[]
for r in rows:
 p=np.array(r['position']).reshape(-1,3)
 for ids in np.array(r['index']).reshape(-1,3):
  t=Polygon(p[ids][:,[0,2]])
  if t.is_valid and t.area>1e-12 and t.intersects(clip):footprints.append(t.intersection(clip))
patch=unary_union(footprints).buffer(.00003).intersection(clip).simplify(.00006,preserve_topology=True)
# The road-parallel rear boundary is inherited from version 69, never extended.
oldcfg=json.loads(Path('dist/plaza-refinement-data.js').read_text().split('=',1)[1].rstrip(';\n'))
rear=unary_union([Polygon(p['outer'],p['holes']) for p in oldcfg['rear']])
patch=patch.difference(rear)
assert patch.geom_type=='Polygon' and not patch.interiors
boundary=patch.boundary
cuts=[];rim={};outside_area=0
def polys(g):return [g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
from shapely import constrained_delaunay_triangles
for r in rows:
 p=np.array(r['position']).reshape(-1,3);ix=np.array(r['index']).reshape(-1,3);part=[]
 for ti,ids in enumerate(ix):
  t=p[ids];poly=Polygon(t[:,[0,2]])
  if not poly.is_valid or poly.area<1e-12 or not poly.intersects(patch):continue
  inside=poly.intersection(patch)
  if inside.area<1e-10:continue
  den=(t[1,2]-t[2,2])*(t[0,0]-t[2,0])+(t[2,0]-t[1,0])*(t[0,2]-t[2,2])
  def vertex(x,z):
   u=((t[1,2]-t[2,2])*(x-t[2,0])+(t[2,0]-t[1,0])*(z-t[2,2]))/den;v=((t[2,2]-t[0,2])*(x-t[2,0])+(t[0,0]-t[2,0])*(z-t[2,2]))/den
   weights=[float(u),float(v),float(1-u-v)];y=float(np.dot(weights,t[:,1]));q=np.array([x,y,z],dtype=np.float32).astype(float).tolist()
   if boundary.distance(Point(x,z))<1e-7:
    key=(q[0],q[2]);rim[key]=max(rim.get(key,-1e20),q[1])
   return {'weights':weights,'point':q}
  # Register all exact split locations along the retained outer paving.
  for pp in polys(inside):
   for x,z in list(pp.exterior.coords)[:-1]:vertex(x,z)
  kept=[]
  for pp in polys(poly.difference(patch)):
   for tri in constrained_delaunay_triangles(pp).geoms:
    xy=np.array(tri.exterior.coords)[:3];a,b=xy[1]-xy[0],xy[2]-xy[0]
    if a[0]*b[1]-a[1]*b[0]>0:xy=xy[[0,2,1]]
    kept.append([vertex(*q) for q in xy])
  part.append({'triangle':ti,'source':ids.tolist(),'outside':kept})
 if part:cuts.append({'name':r['name'],'sourceVertices':len(p),'sourceIndices':len(ix)*3,'cuts':part})
# Include the polygon corners using the nearest measured paving rim height.
for x,z in list(patch.exterior.coords)[:-1]:
 q=np.array([x,z],dtype=np.float32).astype(float);key=tuple(q)
 if key not in rim:
  nearest=min(rim,key=lambda p:(p[0]-x)**2+(p[1]-z)**2);assert np.hypot(nearest[0]-x,nearest[1]-z)<.001;rim[key]=rim[nearest]
points=list(rim);heights=list(rim.values());fixed=len(points)
for x in np.arange(patch.bounds[0]+.2,patch.bounds[2],.35):
 for z in np.arange(patch.bounds[1]+.2,patch.bounds[3],.35):
  if patch.buffer(-.07).covers(Point(x,z)):points.append((float(np.float32(x)),float(np.float32(z))));heights.append(0)
xy=np.array(points);tri=Delaunay(xy);indices=[];adj=[set() for p in points]
for ids in tri.simplices:
 poly=Polygon(xy[ids])
 if poly.area<1e-10 or poly.difference(patch.buffer(.00004)).area>1e-9:continue
 ids=ids[[0,2,1]];indices.extend(ids.tolist())
 for a,b in [(ids[0],ids[1]),(ids[1],ids[2]),(ids[2],ids[0])]:adj[a].add(b);adj[b].add(a)
free=list(range(fixed,len(points)));where={v:i for i,v in enumerate(free)};mat=lil_matrix((len(free),len(free)));rhs=np.zeros(len(free))
for v in free:
 i=where[v];mat[i,i]=len(adj[v]);assert adj[v]
 for u in adj[v]:
  if u<fixed:rhs[i]+=heights[u]
  else:mat[i,where[u]]-=1
ys=spsolve(mat.tocsr(),rhs)
for v,y in zip(free,ys):heights[v]=float(y)
positions=[[p[0],heights[i],p[1]] for i,p in enumerate(points)]
data={'version':70,'patch':[{'outer':list(patch.exterior.coords)[:-1],'holes':[]}],'surfaces':cuts,'positions':positions,'indices':indices,'report':{'area':patch.area,'rimVertices':fixed,'surfaceVertices':len(points),'triangles':len(indices)//3,'affectedSurfaces':len(cuts),'originalRimHeightsPreserved':True,'heightMin':min(heights),'heightMax':max(heights)}}
Path('dist/townhall-floor-data.js').write_text('export const TOWNHALL_FLOOR='+json.dumps(data,separators=(',',':'))+';\n');print(json.dumps(data['report']))
