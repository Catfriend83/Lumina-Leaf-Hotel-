"""Check the relocated house, plaza-facing shop, and unchanged traffic layouts."""
import json
import sys
from pathlib import Path
from shapely.geometry import Polygon, Point, LineString, box
from shapely.ops import unary_union

def read_js(path):
    return json.loads(Path(path).read_text().split('=',1)[1].rstrip(';\n'))

traffic = read_js('dist/village-traffic-data.js')
old = read_js(sys.argv[1])
layout = json.loads(Path('scripts/village-traffic-layout.json').read_text())
order = json.loads(Path('scripts/plaza-order-layout.json').read_text())
for kind in ['road','curb','loop','rest']:
    assert old[kind] == traffic[kind], kind
parts = {b['id']:Polygon(b['corners']) for b in layout['footprints']}
house,shop = parts['haus-6'],parts['dorfladen']
other = unary_union([p for name,p in parts.items() if name not in ['haus-6','dorfladen']])
assert house.distance(other) > 4
assert shop.intersection(other).area == 0
road = unary_union([Polygon(p['outer'],p['holes']) for p in traffic['road']['polygons']])
assert house.distance(road) > 3 and shop.intersection(road).area == 0
accesses = {a['id']:a for a in layout['accesses']}
for name in ['haus-6','dorfladen']:
    path = LineString([(p['x'],p['z']) for p in accesses[name]['path']['rows']]).buffer(.825)
    assert path.intersection(other).area < 1e-9
    for x,z,r in order['beds']:
        assert path.intersection(Point(x,z).buffer(r)).area < 1e-9, 'Entrance blocked by tree'
walk = unary_union([Polygon(p['outer'],p['holes']) for p in traffic['walk']['polygons']])
assert walk.intersection(house).area < 1e-9 and walk.intersection(shop).area < 1e-9
old_walk = unary_union([Polygon(p['outer'],p['holes']) for p in old['walk']['polygons']])
allowed = box(-141,-209,-105,-171).union(box(-143,-167,-119,-142))
assert walk.symmetric_difference(old_walk).difference(allowed).area < 1e-8
report = {'version':48,'houseNeighborGap':house.distance(other),'houseRoadGap':house.distance(road),
          'houseAccessLength':accesses['haus-6']['path']['length'], 'shopAccessLength':accesses['dorfladen']['path']['length'],
          'shopRoadOverlap':0,'entrancesClearOfBuildingsAndTrees':True,'protectedTrafficShapesIdentical':True,
          'unrelatedSidewalkChangedArea':0}
Path('village-shop-topology-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
