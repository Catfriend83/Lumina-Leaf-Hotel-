"""Rebuild the local plaza and sidewalk as adjoining, watertight surfaces."""
import json
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,Point,box,LineString
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles,STRtree
from scipy.spatial import Delaunay
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve
s=json.loads(Path('.sites-runtime/measurement-v71-source.json').read_text())
def stone(r):
 e=r['extras'];return e.get('villagePlazaFinish') or e.get('townhallGroundConnection') or e.get('townhallFloorRepair') or e.get('plazaRefinement') and e['kind']=='stone'
def parts(g):return [g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
rows=[r for r in s['rows'] if not r['owned'] and r['position'] and (stone(r) or r['extras'].get('villageTrafficSurface')=='walk')]
clip=box(-187,-158,-162,-134.7).union(box(-187,-146.5,-123.5,-134.7));tris=[];stones=[];walks=[]
for r in rows:
 p=np.array(r['position']).reshape(-1,3)
 for ids in np.array(r['index']).reshape(-1,3):
  t=p[ids];poly=Polygon(t[:,[0,2]])
  if poly.is_valid and poly.area>1e-12 and poly.intersects(clip.buffer(1)):
   tris.append((poly,t));(stones if stone(r) else walks).append(poly)
stoneBefore=unary_union(stones);walkBefore=unary_union(walks)
patch=stoneBefore.intersection(clip).union(walkBefore.intersection(stoneBefore.buffer(.9)).intersection(clip)).buffer(.001).buffer(-.00097).simplify(.00006,preserve_topology=True)
assert patch.geom_type=='Polygon',[(p.area,p.bounds) for p in parts(patch)]
# Follow the established path contour. Remove only millimetre-scale jaggedness
# in its outer ring; preserve building and live tree-bed holes verbatim.
sp=stoneBefore.intersection(patch).buffer(.00003).simplify(.00006,preserve_topology=True)
stoneRegion=unary_union([Polygon(Polygon(p.exterior).simplify(.015).exterior,p.interiors) for p in parts(sp)]).intersection(patch)
walkRegion=patch.difference(stoneRegion)
boundary=patch.boundary;cuts=[];rim={}
def bary(x,z,t):
 den=(t[1,2]-t[2,2])*(t[0,0]-t[2,0])+(t[2,0]-t[1,0])*(t[0,2]-t[2,2]);u=((t[1,2]-t[2,2])*(x-t[2,0])+(t[2,0]-t[1,0])*(z-t[2,2]))/den;v=((t[2,2]-t[0,2])*(x-t[2,0])+(t[0,0]-t[2,0])*(z-t[2,2]))/den
 return [float(u),float(v),float(1-u-v)]
for r in rows:
 p=np.array(r['position']).reshape(-1,3);ix=np.array(r['index']).reshape(-1,3);cc=[]
 for ti,ids in enumerate(ix):
  t=p[ids];poly=Polygon(t[:,[0,2]])
  if not poly.is_valid or poly.area<1e-12 or not poly.intersects(patch) or poly.intersection(patch).area<1e-10:continue
  def vertex(x,z):
   w=bary(x,z,t);q=np.array([x,np.dot(w,t[:,1]),z],dtype=np.float32).astype(float).tolist()
   if boundary.distance(Point(x,z))<.00001:rim[(q[0],q[2])]=max(rim.get((q[0],q[2]),-1e20),q[1])
   return {'weights':w,'point':q}
  for pp in parts(poly.intersection(patch)):
   for x,z in pp.exterior.coords:vertex(x,z)
  kept=[]
  for pp in parts(poly.difference(patch)):
   for tri in constrained_delaunay_triangles(pp).geoms:
    xy=np.array(tri.exterior.coords)[:3];a,b=xy[1]-xy[0],xy[2]-xy[0]
    if a[0]*b[1]-a[1]*b[0]>0:xy=xy[[0,2,1]]
    kept.append([vertex(*q) for q in xy])
  cc.append({'triangle':ti,'source':ids.tolist(),'outside':kept})
 if cc:cuts.append({'name':r['name'],'sourceVertices':len(p),'sourceIndices':len(ix)*3,'cuts':cc})
tree=STRtree([p for p,t in tris])
def originalHeight(x,z):
 found=[];pt=Point(x,z)
 for j in tree.query(pt.buffer(.0001)):
  poly,t=tris[j]
  if poly.buffer(.0001).covers(pt):found.append(float(np.dot(bary(x,z,t),t[:,1])))
 if not found:
  j=tree.nearest(pt);poly,t=tris[j];assert poly.distance(pt)<.002,('Unanchored paving rim',x,z);found.append(float(np.dot(bary(x,z,t),t[:,1])))
 return max(found)
# Give both materials identical seam vertices. All retained cut points are
# included on the patch rim, preventing height gaps at T-junctions.
def ring(coords):
 out=[];coords=list(coords)
 for a,b in zip(coords[:-1],coords[1:]):
  a=np.array(a);b=np.array(b);d=b-a;length=np.linalg.norm(d);fractions=[0.]
  if length<1e-9:continue
  fractions.extend(np.arange(.4,length,.4)/length)
  for p in rim:
   t=np.dot(np.array(p)-a,d)/length**2
   if 1e-7<t<1-1e-7 and np.linalg.norm(a+t*d-p)<.00005:fractions.append(t)
  for t in sorted(set(fractions)):
   q=tuple(np.array(a+t*d,dtype=np.float32).astype(float));
   if not out or q!=out[-1]:out.append(q)
 return out
points=[];lookup={};indices={'stone':[],'walk':[]};fixed={}
def vi(p):
 q=tuple(np.array(p,dtype=np.float32).astype(float));
 if q not in lookup:
  lookup[q]=len(points);points.append(q)
  if boundary.distance(Point(q))<.00006:fixed[lookup[q]]=rim[q] if q in rim else originalHeight(*q)
 return lookup[q]
for kind,region in [('stone',stoneRegion),('walk',walkRegion)]:
 for poly in parts(region):
  if poly.area<1e-9:continue
  dense=Polygon(ring(poly.exterior.coords),[ring(h.coords) for h in poly.interiors])
  dense=dense.buffer(0)
  for tri in constrained_delaunay_triangles(dense).geoms:
   xy=np.array(tri.exterior.coords)[:3];lo=xy.min(0);hi=xy.max(0);inner=[]
   for x in np.arange(np.ceil(lo[0]/.4)*.4,hi[0],.4):
    for z in np.arange(np.ceil(lo[1]/.4)*.4,hi[1],.4):
     if tri.buffer(-.0001).covers(Point(x,z)):inner.append([x,z])
   pp=np.vstack([xy,inner]) if inner else xy
   faces=Delaunay(pp).simplices if inner else np.array([[0,1,2]])
   for ids in faces:
    t=pp[ids];a,b=t[1]-t[0],t[2]-t[0]
    if a[0]*b[1]-a[1]*b[0]>0:t=t[[0,2,1]]
    indices[kind].extend(vi(p) for p in t)
adj=[set() for p in points]
for kind,ix in indices.items():
 for ids in np.array(ix).reshape(-1,3):
  for a,b in [(ids[0],ids[1]),(ids[1],ids[2]),(ids[2],ids[0])]:adj[a].add(b);adj[b].add(a)
free=[i for i in range(len(points)) if i not in fixed];where={v:i for i,v in enumerate(free)};mat=lil_matrix((len(free),len(free)));rhs=np.zeros(len(free))
for v in free:
 i=where[v];mat[i,i]=len(adj[v]);assert adj[v]
 for u in adj[v]:
  if u in fixed:rhs[i]+=fixed[u]
  else:mat[i,where[u]]-=1
heights=dict(fixed);heights.update(zip(free,spsolve(mat.tocsr(),rhs)))
positions=[[p[0],float(heights[i]),p[1]] for i,p in enumerate(points)]
# Old vertical walk rims are internal now. Remove only faces surrounded by
# stone on both sides, preserving all exterior path and building edges.
edges=[]
for r in s['rows']:
 if not r['extras'].get('villagePavingEdge') or not r['position']:continue
 p=np.array(r['position']).reshape(-1,3);remove=[]
 for ti,ids in enumerate(np.array(r['index']).reshape(-1,3)):
  t=p[ids][:,[0,2]];a=t[0];b=max(t,key=lambda q:np.linalg.norm(q-a));d=b-a;length=np.linalg.norm(d)
  if length<1e-6:continue
  mid=(a+b)/2;normal=np.array([-d[1],d[0]])/length*.04
  if patch.intersects(LineString([a,b])) and stoneBefore.buffer(.0001).covers(Point(mid+normal)) and stoneBefore.buffer(.0001).covers(Point(mid-normal)):remove.append(ti)
 if remove:edges.append({'name':r['name'],'sourceIndices':len(r['index']),'remove':remove})
def region(p):return [{'outer':list(q.exterior.coords)[:-1],'holes':[list(h.coords)[:-1] for h in q.interiors]} for q in parts(p)]
report={'version':71,'repairedArea':patch.area,'stoneArea':stoneRegion.area,'walkArea':walkRegion.area,'sourceSurfaces':len(cuts),'vertices':len(points),'triangles':sum(len(i) for i in indices.values())//3,'retainedRimVertices':len(fixed),'removedInternalEdgeTriangles':sum(len(e['remove']) for e in edges),'existingBuildingsAndTreeHolesPreserved':True}
data={'version':71,'patch':region(patch),'stoneRegion':region(stoneRegion),'surfaces':cuts,'positions':positions,'indices':indices,'edges':edges,'fixed':list(fixed),'report':report}
Path('dist/church-floor-data.js').write_text('export const CHURCH_FLOOR='+json.dumps(data,separators=(',',':'))+';\n');print(json.dumps(report))
