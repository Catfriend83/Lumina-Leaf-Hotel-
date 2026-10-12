"""Check the local paving coverage, overlaps and measured boundary heights."""
import json
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

cfg=json.loads(Path('dist/townhall-floor-data.js').read_text().split('=',1)[1].rstrip(';\n'))
patch=unary_union([Polygon(p['outer'],p['holes']) for p in cfg['patch']])
old=json.loads(Path('.sites-runtime/measurement-v70-source.json').read_text())
new=json.loads(Path('.sites-runtime/measurement-v70-result.json').read_text())
def stone(r):
 e=r['extras'];return e.get('villagePlazaFinish') or e.get('townhallGroundConnection') or e.get('townhallFloorRepair') or e.get('plazaRefinement') and e['kind']=='stone'
def polygons(data):
 out=[]
 for r in data['rows']:
  if r['owned'] or not r['position'] or not stone(r):continue
  p=np.array(r['position']).reshape(-1,3)
  if not box(*p[:,[0,2]].min(0),*p[:,[0,2]].max(0)).intersects(patch):continue
  for ids in np.array(r['index']).reshape(-1,3):
   poly=Polygon(p[ids][:,[0,2]])
   if poly.is_valid and poly.area>1e-12 and poly.intersects(patch):
    part=poly.intersection(patch)
    if part.area>1e-12:out.append(part)
 return out
a=polygons(old);b=polygons(new);ua=unary_union(a);ub=unary_union(b)
missing=patch.difference(ub).area;difference=ua.symmetric_difference(ub).area
overlap=sum(p.area for p in b)-ub.area
assert missing<.001,('Open paving area',missing)
assert difference<.001,('Changed paving footprint',difference)
assert overlap<.001,('Overlapping paving triangles',overlap)
rim={}
for s in cfg['surfaces']:
 for cut in s['cuts']:
  for tri in cut['outside']:
   for vertex in tri:
    x,y,z=vertex['point'];key=(x,z)
    rim[key]=max(rim.get(key,-1e20),y)
errors=[]
for x,y,z in cfg['positions'][:cfg['report']['rimVertices']]:
 if (x,z) in rim:errors.append(abs(y-rim[(x,z)]))
assert errors and max(errors)<.00002,('New rim height step',max(errors))
report={'version':70,'missingPavingArea':missing,'footprintDifference':difference,'overlappingTriangleArea':overlap,'matchedRetainedRimVertices':len(errors),'maxRetainedRimHeightDifference':max(errors)}
Path('townhall-floor-topology-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
