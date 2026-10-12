"""Compare v45 planar surfaces to a supplied prior traffic data file."""
import json,sys
from pathlib import Path
from shapely.geometry import Polygon,LineString,Point,box
from shapely.ops import unary_union
def read(path):return json.loads(Path(path).read_text().split('=',1)[1].rstrip(';\n'))
def shape(polys):return unary_union([Polygon(p['outer'],p['holes']) for p in polys])
now=read('dist/village-traffic-data.js');old=read(sys.argv[1]);layout=json.loads(Path('scripts/village-traffic-layout.json').read_text())
changed_spur=box(-120,-220,-86,-140)
new_access=next(a for a in now['accesses'] if a['id']=='haus-5')
old_access=next(a for a in old['accesses'] if a['id']=='haus-5')
access_area=unary_union([LineString(a['points']).buffer(4) for a in [old_access,new_access]])
footprints={f['id']:Polygon(f['corners']) for f in layout['footprints']}
house=footprints['haus-5'];clearances={k:house.distance(p) for k,p in footprints.items() if k!='haus-5'}
assert min(clearances.values())>2.5
access=LineString(new_access['points']).buffer(.825)
assert all(access.intersection(p).area<1e-6 for k,p in footprints.items() if k!='haus-5'), 'Access crosses another building'
assert house.intersection(shape(now['road']['polygons'])).area==0
changes={}
for kind in ['road','walk','curb']:
 delta=shape(old[kind]['polygons']).symmetric_difference(shape(now[kind]['polygons']))
 outside=delta.difference(changed_spur.union(access_area)).area
 assert outside<1e-7,kind+' changes outside the house access and removed spur'
 changes[kind]={'changedArea':delta.area,'unrelatedChanges':outside}
for kind in ['loop','rest']:
 assert old[kind]==now[kind],kind+' changed'
assert len(now['accesses'])==13
report={'version':45,'minimumHouseSeparation':min(clearances.values()),'houseAccessLength':LineString(new_access['points']).length,'houseAccessClear':True,'roadChangesConfinedToSpur':True,'lakeLoopAndSeatsExact':True,'surfaceChanges':changes}
Path('core-road-topology-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
