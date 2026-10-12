"""Check the moved seating group against the unchanged usable paving."""
import json
from pathlib import Path
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

order = json.loads(Path('scripts/plaza-order-layout.json').read_text())
data = json.loads(Path('dist/plaza-finish-data.js').read_text().split('=',1)[1].rstrip(';\n'))
paving = unary_union([Polygon(p['outer'],p['holes']) for p in data['polygons']])
footprints = json.loads(Path('scripts/village-traffic-layout.json').read_text())['footprints']
buildings = unary_union([Polygon(p['corners']) for p in footprints])
x,z = order['center']
assert paving.contains(Point(x,z).buffer(2.2))
seats = [box(bx-.925,bz-.33,bx+.925,bz+.265) if i%2==0 else box(bx-.33,bz-.925,bx+.265,bz+.925)
         for i,(bx,bz,angle) in enumerate(order['benches'])]
for seat in seats:
    assert paving.contains(seat.buffer(.3))
    assert seat.distance(buildings) > .5
pair_gap = min(seats[i].distance(seats[j]) for i in range(4) for j in range(i+1,4))
tree_gap = min(seat.distance(Point(tree))-.85 for seat in seats for tree in order['trees'])
assert pair_gap > 5 and tree_gap > 5
report = {'version':47,'insideExistingPaving':True,'minimumBankToBuilding':min(s.distance(buildings) for s in seats),
          'minimumBankToBank':pair_gap,'minimumBankToTreeBed':tree_gap}
Path('fountain-topology-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
