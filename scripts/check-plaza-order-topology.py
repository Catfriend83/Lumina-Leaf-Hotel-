"""Check unchanged roadside paving and the continuous equipment-free gym runner."""
import json
import subprocess
from pathlib import Path
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union

def read_js(text):
    return json.loads(text.split('=', 1)[1].rstrip(';\n'))

def surface(data):
    return unary_union([Polygon(p['outer'], p['holes']) for p in data['polygons']])

old = read_js(subprocess.check_output(['git', 'show', '2811e8104a07df2674d9813db00bc2f2e481d2ee:dist/village-traffic-data.js'], text=True))
new = read_js(Path('dist/village-traffic-data.js').read_text())
for kind in ['road', 'curb', 'loop', 'rest']:
    assert old[kind] == new[kind], kind + ' changed'
road = surface(new['road'])
edges = road.buffer(2.5, quad_segs=12)
parts = [edges] if edges.geom_type == 'Polygon' else list(edges.geoms)
inner = max([Polygon(r) for p in parts for r in p.interiors], key=lambda p:p.area)
layout = json.loads(Path('scripts/village-traffic-layout.json').read_text())
usable = inner.difference(unary_union([Polygon(f['corners']) for f in layout['footprints']]))
order = json.loads(Path('scripts/plaza-order-layout.json').read_text())
centroid_error = usable.centroid.distance(Point(order['center']))
assert centroid_error < 1e-10
walk_delta = surface(old['walk']).symmetric_difference(surface(new['walk']))
assert walk_delta.difference(inner).area < 1e-8, 'Roadside sidewalk changed'
gym = json.loads(Path('.sites-runtime/gym-carpet-geometry.json').read_text())
carpet = Polygon(gym['outline'])
assert carpet.is_valid and carpet.geom_type == 'Polygon' and not carpet.interiors
clearances = []
for equipment in gym['equipment']:
    footprint = Polygon(equipment['corners'])
    assert carpet.intersection(footprint).area < 1e-10, equipment['name']
    clearances.append(carpet.distance(footprint))
assert min(clearances) > .38
report = {'version':46, 'centroidError':centroid_error, 'protectedRoadAndLakeSurfacesIdentical':True,
          'roadsideSidewalkChangedArea':walk_delta.difference(inner).area,
          'carpetOneContinuousPolygon':True, 'carpetArea':carpet.area,
          'fitnessEquipmentOverlap':0, 'minimumEquipmentClearance':min(clearances)}
Path('plaza-order-topology-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
