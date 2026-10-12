"""Area centroid of the complete usable inner square, before symmetric beds."""
import json
from pathlib import Path
from shapely.geometry import Polygon,Point
from shapely.ops import unary_union
traffic=json.loads(Path('dist/village-traffic-data.js').read_text().split('=',1)[1].rstrip(';\n'))
layout=json.loads(Path('scripts/village-traffic-layout.json').read_text())
road=unary_union([Polygon(p['outer'],p['holes'])for p in traffic['road']['polygons']]);edge=road.buffer(2.5,quad_segs=12)
parts=[edge]if edge.geom_type=='Polygon'else list(edge.geoms)
inner=max([Polygon(r)for p in parts for r in p.interiors],key=lambda p:p.area)
footprints=unary_union([Polygon(f['corners'])for f in layout['footprints']]);usable=inner.difference(footprints);c=usable.centroid;dx,dz=15.3,3.2;radius=.85
corners=[[c.x+sx*dx,c.y+sz*dz]for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
for x,z in corners:assert usable.contains(Point(x,z).buffer(radius+.04))
benches=[[c.x,c.y-dz,0],[c.x+dx,c.y,-1.5707963267948966],[c.x,c.y+dz,3.141592653589793],[c.x-dx,c.y,1.5707963267948966]]
for x,z,a in benches:assert usable.contains(Point(x,z).buffer(1.1))
beds=[[*p,radius]for p in corners];finish=usable.difference(unary_union([Point(x,z).buffer(r,quad_segs=16)for x,z,r in beds]));assert finish.centroid.distance(c)<1e-10
result={'version':48,'center':[c.x,c.y],'centroidMethod':'Area centroid of the complete inner paving domain excluding buildings; four equal symmetric tree beds preserve the centroid','halfWidth':dx,'halfDepth':dz,'treeHeight':4.2,'treeBedRadius':radius,'trees':corners,'beds':beds,'benches':benches,'usableArea':usable.area,'finishedArea':finish.area}

result['plazaCenter']=result['center'];result['fountainOffset']=[-1.2,1.6];result['center']=[c.x-1.2,c.y+1.6];result['centroidMethod']='Existing plaza centroid retained; fountain and benches shifted moderately down-left in the village view';result['benchFrontClearance']=2.15;result['benchAxisRadius']=4.59;result['benchFrontOffset']=.24;result['benchAxisGroup']=True
x,z=result['center'];r=result['benchAxisRadius'];result['benches']=[[x,z-r,0],[x+r,z,-1.5707963267948966],[x,z+r,3.141592653589793],[x-r,z,1.5707963267948966]]
Path('dist/plaza-order-data.js').write_text('export const PLAZA_ORDER='+json.dumps(result,separators=(',',':'))+';\n');Path('scripts/plaza-order-layout.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
