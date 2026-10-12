import json
from pathlib import Path
from collections import Counter
import numpy as np
from shapely.geometry import Polygon,Point
from shapely.ops import unary_union
s=json.loads(Path('dist/complete-plaza-data.js').read_text().split('=',1)[1].rstrip(';\n'));p=np.array(s['positions']);n=np.array(s['normals']);assert np.isfinite(p).all() and np.isfinite(n).all();assert np.max(abs(np.linalg.norm(n,axis=1)-1))<1e-6
patch=unary_union([Polygon(a['outer'],a['holes']) for a in s['patch']]);stone=unary_union([Polygon(a['outer'],a['holes']) for a in s['stoneRegion']]);polys=[];edge=Counter();areas={};triangles={}
for kind,ix in s['indices'].items():
 a=[]
 for ids in np.array(ix).reshape(-1,3):
  q=p[ids][:,[0,2]];poly=Polygon(q);assert poly.area>1e-12;assert np.cross(p[ids[1]]-p[ids[0]],p[ids[2]]-p[ids[0]])[1]>0
  a.append(poly)
  for x,y in zip(ids,np.roll(ids,-1)):edge[tuple(sorted((int(x),int(y))))]+=1
 triangles[kind]=unary_union(a);polys+=a;areas[kind]=sum(a1.area for a1 in a)
assert max(edge.values())==2,'Nonmanifold paving';cover=unary_union(polys);missing=patch.difference(cover).area;extra=cover.difference(patch).area;overlap=sum(areas.values())-cover.area
assert missing<.015 and extra<.015 and overlap<.001,(missing,extra,overlap)
# No open internal edges or T-junctions: every single-use edge belongs to the outer rim/real holes.
internal=[]
for (a,b),count in edge.items():
 if count==1 and patch.boundary.distance(Point(p[[a,b]][:,[0,2]].mean(0)))>.0002:internal.append((a,b))
assert not internal,('Internal open seams',len(internal))
# Stone/path seam vertices share normals and heights in the runtime's common arrays.
shared=set(s['indices']['stone'])&set(s['indices']['walk']);assert len(shared)>200
for former in [(-168.06857,-159.1861),(-168.06857,-152.7861)]:assert cover.covers(Point(former)), 'Old ground symbol remains open'
# Material boundaries follow the constrained stone region, never cutting across a triangle.
materialError=triangles['stone'].symmetric_difference(stone).area;assert materialError<.02, materialError
report={**s['report'],'uncoveredArea':missing,'excessArea':extra,'overlapArea':overlap,'internalOpenEdges':len(internal),'materialBoundaryAreaError':materialError,'sharedSeamVertices':len(shared),'finitePositionsAndUnitNormals':True};Path('complete-plaza-topology-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))

# Check the exported scene as well: no hidden duplicate floor may remain underneath the repair.
import sys
if len(sys.argv)>1:
 source=json.loads(Path(sys.argv[1]).read_text());duplicate=0.;oldFragments=[]
 for row in source['rows']:
  e=row['extras']
  if row['owned'] or not row['position'] or e.get('completePlazaRepair') or e.get('villagePavingEdge') or e.get('villageTrafficSurface')=='curb' or e.get('plazaRefinement') and e.get('kind')=='soil':continue
  vv=np.array(row['position']).reshape(-1,3);ii=np.array(row['index']).reshape(-1,3);tt=vv[ii]
  ids=np.flatnonzero((tt[:,:,0].max(1)>=patch.bounds[0])&(tt[:,:,0].min(1)<=patch.bounds[2])&(tt[:,:,2].max(1)>=patch.bounds[1])&(tt[:,:,2].min(1)<=patch.bounds[3]))
  total=0.
  for i in ids:
   t=tt[i];poly=Polygon(t[:,[0,2]])
   if poly.is_valid and poly.area>1e-10:total+=poly.intersection(patch.buffer(-.0002)).area
  if total>.001:oldFragments.append((row['name'],total))
  duplicate+=total
 assert not oldFragments,('Underlying duplicate paving',oldFragments)
 report['exportedUnderlyingOverlap']=duplicate;Path('complete-plaza-topology-report.json').write_text(json.dumps(report,indent=2)+'\n');print('Exported duplicate-floor check passed',duplicate)
