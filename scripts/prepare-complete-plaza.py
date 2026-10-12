"""Replace fragmented plaza paving with a single constrained, graded surface."""
import warnings
warnings.filterwarnings("ignore",category=DeprecationWarning)
import json
from pathlib import Path
import numpy as np, triangle
from shapely.geometry import Polygon, Point, LineString, box
from shapely.ops import unary_union, nearest_points
from shapely import STRtree, constrained_delaunay_triangles, union_all, set_precision
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve
s=json.loads(Path('.sites-runtime/complete-v72-source.json').read_text())
def parts(g): return [g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
def kind(r):
 if 'Geschnittener Naturstein' in r['material'][0]:return 'stone'
 if r['material'][0]=='cobbles' and r['extras'].get('villageTrafficSurface')!='rest':return 'walk'
 if r['extras'].get('villageGround') or r['extras'].get('alpineTerrain') or r['extras'].get('terrainTransition') or r['name']=='Fein modellierte Wiesen und natürliche Uferübergänge':return 'ground'
rows=[r for r in s['rows'] if not r['owned'] and r['position'] and kind(r)]
triangles=[];stones=[];walks=[];bound=box(-188,-180,-119,-133)
for r in rows:
 if kind(r)=='ground':continue
 p=np.array(r['position']).reshape(-1,3)
 for ids in np.array(r['index']).reshape(-1,3):
  t=p[ids];poly=Polygon(t[:,[0,2]])
  if poly.is_valid and poly.area>1e-12 and poly.intersects(bound):
   triangles.append((poly,t));(stones if kind(r)=='stone' else walks).append(poly)
originalStone=unary_union(stones);originalWalk=unary_union(walks)
closed=originalStone.buffer(.003).buffer(-.003)
# Only actual building/tree-bed openings remain; tiny fragments are geometry defects.
stoneRegion=Polygon(Polygon(closed.exterior).simplify(.012).exterior,[h for h in closed.interiors if Polygon(h).area>1])
raw=stoneRegion.union(originalWalk.intersection(stoneRegion.buffer(2.3))).buffer(.001).buffer(-.001)
patch=Polygon(Polygon(raw.exterior).simplify(.003).exterior,[h for h in raw.interiors if Polygon(h).area>1])
stoneRegion=stoneRegion.intersection(patch);walkRegion=patch.difference(stoneRegion)
assert patch.geom_type=='Polygon'
def bary(x,z,t):
 a,b,c=t;den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den;v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;return [float(u),float(v),float(1-u-v)]
sourceTree=STRtree([p for p,t in triangles])
def height(x,z):
 pt=Point(x,z);out=[]
 for j in sourceTree.query(pt.buffer(.00015)):
  poly,t=triangles[j]
  if poly.covers(pt):out.append(float(np.dot(bary(x,z,t),t[:,1])))
 if not out:
  j=sourceTree.nearest(pt);poly,t=triangles[j];q=nearest_points(pt,poly)[1];out=[float(np.dot(bary(q.x,q.y,t),t[:,1]))]
 return max(out)
# Remove previous surfaces, including the hidden terrain strictly underneath this patch.
cuts=[];rim=set();boundary=patch.boundary
for r in rows:
 p=np.array(r['position']).reshape(-1,3);ix=np.array(r['index']).reshape(-1,3);cc=[]
 candidates=np.flatnonzero((p[ix][:,:,0].max(1)>=patch.bounds[0])&(p[ix][:,:,0].min(1)<=patch.bounds[2])&(p[ix][:,:,2].max(1)>=patch.bounds[1])&(p[ix][:,:,2].min(1)<=patch.bounds[3]))
 if kind(r)=='stone':
  cuts.append({'name':r['name'],'sourceVertices':len(p),'sourceIndices':len(ix)*3,'cuts':[{'triangle':ti,'source':ids.tolist(),'outside':[]} for ti,ids in enumerate(ix)]});continue
 for ti in candidates:
  ids=ix[ti];t=p[ids];poly=Polygon(t[:,[0,2]])
  if not poly.is_valid or poly.area<1e-12 or poly.intersection(patch).area<1e-10:continue
  def vertex(x,z):
   w=bary(x,z,t);q=[float(x),float(np.dot(w,t[:,1])),float(z)]
   if kind(r)!='ground' and boundary.distance(Point(x,z))<.00001:rim.add((float(x),float(z)))
   return {'weights':w,'point':q}
  for pp in parts(poly.intersection(patch)):
   for x,z in pp.exterior.coords:vertex(x,z)
  keep=[]
  for pp in parts(poly.difference(patch)):
   if pp.area<1e-10:continue
   for tri in constrained_delaunay_triangles(pp).geoms:
    xy=np.array(tri.exterior.coords)[:3]
    if np.cross(xy[1]-xy[0],xy[2]-xy[0])>0:xy=xy[[0,2,1]]
    keep.append([vertex(*q) for q in xy])
  cc.append({'triangle':int(ti),'source':ids.tolist(),'outside':keep})
 if cc:cuts.append({'name':r['name'],'sourceVertices':len(p),'sourceIndices':len(ix)*3,'cuts':cc})
# Node all shared constraint segments together, so both materials use the very same seam.
lines=[]
for reg in [patch,stoneRegion]:
 for poly in parts(reg):
  for ring in [poly.exterior,*poly.interiors]:
   coords=list(ring.coords)
   for a,b in zip(coords[:-1],coords[1:]):
    a=np.array(a);d=np.array(b)-a;length=np.linalg.norm(d)
    if length<1e-8:continue
    ts=[0.,1.]+list(np.arange(.4,length,.4)/length)
    for q in rim:
     t=np.dot(np.array(q)-a,d)/length**2
     if 1e-7<t<1-1e-7 and np.linalg.norm(a+t*d-q)<.00001:ts.append(float(t))
    seq=[tuple(np.round(a+t*d,6)) for t in sorted(set(ts))]
    lines.extend(LineString([x,y]) for x,y in zip(seq[:-1],seq[1:]) if x!=y)
noded=union_all([set_precision(l,.0001) for l in lines],grid_size=.0001);verts=[];lookup={};segments=[]
def vi(q):
 q=tuple(np.round(q,6))
 if q not in lookup:lookup[q]=len(verts);verts.append(q)
 return lookup[q]
for line in noded.geoms:
 cc=list(line.coords)
 for a,b in zip(cc[:-1],cc[1:]):
  i,j=vi(a),vi(b)
  if i!=j:segments.append([i,j])
holes=[list(Polygon(h).representative_point().coords)[0] for h in patch.interiors]
mesh=triangle.triangulate({'vertices':np.array(verts),'segments':np.array(segments),'holes':np.array(holes)},'pYa0.12Q')
xy=mesh['vertices'];faces=mesh['triangles'];assert len(faces)>1000;assert np.isfinite(xy).all(), 'Invalid constrained mesh';
# Smooth global grading, retaining the measured external contact heights.
adj=[set() for p in xy]
for a,b,c in faces:
 for u,v in [(a,b),(b,c),(c,a)]:adj[u].add(v);adj[v].add(u)
fixed={i:height(*q) for i,q in enumerate(xy) if boundary.distance(Point(q))<.00015}
# Keep the town hall's foundation contact at its existing measured elevation.
hall=box(-166.33,-167.38,-154.47,-159.02)
for i,q in enumerate(xy):
 if hall.boundary.distance(Point(q))<.24:fixed[i]=height(*q)
free=[i for i in range(len(xy)) if i not in fixed];where={v:i for i,v in enumerate(free)};mat=lil_matrix((len(free),len(free)));rhs=np.zeros(len(free));weight=.10
for v in free:
 i=where[v];weights={u:1/max(np.linalg.norm(xy[v]-xy[u])**2,.000001) for u in adj[v]};mat[i,i]=sum(weights.values())+weight;rhs[i]=weight*height(*xy[v])
 for u in adj[v]:
  if u in fixed:rhs[i]+=weights[u]*fixed[u]
  else:mat[i,where[u]]-=weights[u]
heights=dict(fixed);heights.update(zip(free,spsolve(mat.tocsr(),rhs)))
positions=np.array([[q[0],heights[i],q[1]] for i,q in enumerate(xy)],dtype=np.float32)
indices={'stone':[],'walk':[]};normals=np.zeros_like(positions,dtype=float)
for ids in faces:
 if np.cross(positions[ids[1]]-positions[ids[0]],positions[ids[2]]-positions[ids[0]])[1]<0:ids=ids[[0,2,1]]
 kindname='stone' if stoneRegion.covers(Point(xy[ids].mean(0))) else 'walk';indices[kindname].extend(map(int,ids))
 n=np.cross(positions[ids[1]]-positions[ids[0]],positions[ids[2]]-positions[ids[0]])
 if n[1]>1e-6:
  for i in ids:normals[i]+=n
lengths=np.linalg.norm(normals,axis=1);normals[lengths<1e-12]=[0,1,0];normals/=np.linalg.norm(normals,axis=1)[:,None];assert np.isfinite(positions).all() and np.isfinite(normals).all()
# Remove internal original vertical rim walls, the source of dashed floor lines.
edges=[]
for r in s['rows']:
 if not r['extras'].get('villagePavingEdge') or not r['position']:continue
 p=np.array(r['position']).reshape(-1,3);remove=[]
 for ti,ids in enumerate(np.array(r['index']).reshape(-1,3)):
  t=p[ids][:,[0,2]];a=t[0];b=max(t,key=lambda q:np.linalg.norm(q-a));d=b-a;length=np.linalg.norm(d)
  if length<1e-6:continue
  line=LineString([a,b]);intersection=line.intersection(patch.buffer(-.002))
  # Exterior road/footpath edges remain. Every internal obsolete paving wall goes.
  if intersection.length>min(.02,length*.1):remove.append(ti)
 if remove:edges.append({'name':r['name'],'sourceIndices':len(r['index']),'remove':remove})
def region(p):return [{'outer':list(q.exterior.coords)[:-1],'holes':[list(h.coords)[:-1] for h in q.interiors]} for q in parts(p)]
report={'version':72,'repairedArea':patch.area,'stoneArea':stoneRegion.area,'walkArea':walkRegion.area,'sourceSurfaces':len(cuts),'vertices':len(xy),'triangles':len(faces),'removedInternalEdgeTriangles':sum(len(e['remove']) for e in edges),'originalPavingMicroHoles':len(originalStone.interiors),'remainingIntentionalHoles':len(stoneRegion.interiors),'sharedNormals':True}
Path('dist/complete-plaza-data.js').write_text('export const COMPLETE_PLAZA='+json.dumps({'patch':region(patch),'stoneRegion':region(stoneRegion),'surfaces':cuts,'positions':positions.tolist(),'normals':normals.tolist(),'indices':indices,'edges':edges,'report':report},separators=(',',':'))+';\n')
print(json.dumps(report))
