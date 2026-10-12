"""Verify area conservation, separate path materials and seamless local patches."""
import json
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
from shapely import STRtree,Point
old=json.loads(Path('.sites-runtime/measurement-v69-source.json').read_text())
new=json.loads(Path('.sites-runtime/measurement-v69-result.json').read_text())
cfg=json.loads(Path('dist/plaza-refinement-data.js').read_text().split('=',1)[1].rstrip(';\n'))
def region(a):return unary_union([Polygon(p['outer'],p['holes']) for p in a])
patch=region(cfg['patch']);rear=region(cfg['rear']);oldbeds=region(cfg['oldBeds']);newbeds=region(cfg['newBeds'])
def mesh_polygons(r):
 p=np.array(r['position']).reshape(-1,3);ix=np.array(r['index']).reshape(-1,3)
 lo=p[:,[0,2]].min(0);hi=p[:,[0,2]].max(0)
 if not box(*lo,*hi).intersects(patch):return []
 out=[]
 for ids in ix:
  poly=Polygon(p[ids][:,[0,2]])
  if poly.is_valid and poly.area>1e-12 and poly.intersects(patch):
   poly=poly.intersection(patch)
   if poly.area>1e-12:out.append(poly)
 return out
def surfaces(data):
 out=[]
 for r in data['rows']:
  e=r['extras']
  if r['owned'] or not r['position'] or not(e.get('villageGround') or e.get('villagePlazaFinish') or e.get('townhallGroundConnection') or e.get('plazaRefinement') or e.get('villageTrafficSurface')=='walk'):continue
  out.append((r,mesh_polygons(r)))
 return out
a=surfaces(old);b=surfaces(new)
def union(p):return unary_union(p)
before=union([p for r,ps in a for p in ps]);after=union([p for r,ps in b for p in ps])
coverageDifference=before.symmetric_difference(after).area
assert coverageDifference<.001,('Open or extra surface',coverageDifference)
def stone(r):return r['extras'].get('villagePlazaFinish') or r['extras'].get('townhallGroundConnection') or r['extras'].get('plazaRefinement') and r['extras']['kind']=='stone'
stoneBefore=union([p for r,ps in a if stone(r) for p in ps]);stoneAfter=union([p for r,ps in b if stone(r) for p in ps]);walkAfter=union([p for r,ps in b if r['extras'].get('plazaRefinement') and r['extras']['kind']=='walk' for p in ps]);soilAfter=union([p for r,ps in b if r['extras'].get('plazaRefinement') and r['extras']['kind']=='soil' for p in ps]);
overhang=stoneAfter.intersection(rear).area
assert overhang<.001,('Bright wedge remains',overhang)
repaired=stoneBefore.intersection(rear)
assert repaired.difference(walkAfter).area<.001,'Missing restored path'
assert stoneAfter.intersection(walkAfter).area<.001,'Stone/path overlap'
assert oldbeds.difference(stoneAfter).area<.001,'Old tree bed not paved closed'
assert newbeds.difference(soilAfter).area<.001,'New tree bed not closed'
areaBefore=sum(p.area for r,ps in a for p in ps);areaAfter=sum(p.area for r,ps in b for p in ps)
assert abs(areaBefore-areaAfter)<.001,('Duplicated or lost triangles',areaBefore,areaAfter)
# Every new vertex remains on its original surface plane; UVs and materials may
# change but the repaired path and retained stone never acquire a height step.
maxError=0;checked=0
byname={r['name']:r for r,ps in a}
for r,ps in b:
 if not r['extras'].get('plazaRefinement'):continue
 origin=byname[r['extras']['sourceSurface']];op=np.array(origin['position']).reshape(-1,3);oi=np.array(origin['index']).reshape(-1,3)
 candidates=[(Polygon(op[ids][:,[0,2]]),op[ids]) for ids in oi];tree=STRtree([c[0] for c in candidates])
 for p in np.array(r['position']).reshape(-1,3)[::3]:
  x,y,z=p;errors=[]
  for ci in tree.query(box(x-.00003,z-.00003,x+.00003,z+.00003)):
   poly,t=candidates[ci]
   if poly.is_valid and poly.area>1e-12 and poly.buffer(.00003).covers(Point(x,z)):
    den=(t[1,2]-t[2,2])*(t[0,0]-t[2,0])+(t[2,0]-t[1,0])*(t[0,2]-t[2,2]);u=((t[1,2]-t[2,2])*(x-t[2,0])+(t[2,0]-t[1,0])*(z-t[2,2]))/den;v=((t[2,2]-t[0,2])*(x-t[2,0])+(t[0,0]-t[2,0])*(z-t[2,2]))/den
    errors.append(abs(y-np.dot([u,v,1-u-v],t[:,1])))
  assert errors,'New vertex has no source surface'
  e=min(errors);maxError=max(maxError,float(e));checked+=1;assert e<.0001,('New height step',e)
report={'version':69,'repairedPathArea':repaired.area,'stoneOverhangRemaining':overhang,'stonePathOverlap':stoneAfter.intersection(walkAfter).area,'coverageDifference':coverageDifference,'projectedTriangleAreaDifference':abs(areaBefore-areaAfter),'oldTreeBedsClosed':True,'newTreeBedsClosed':True,'heightSamples':checked,'maxHeightDifference':maxError}
Path('plaza-refinement-topology-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
