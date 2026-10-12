"""Build disjoint, conforming road/curb/paving polygons from the saved layout.

All boolean operations happen here, never on the user's mobile GPU. The output
contains world-space planar triangles; Three.js samples the shared elevations.
Requires Shapely 2.1. Inputs retain the version-37 buildings and access axes.
"""
import json, math, sys
from pathlib import Path
from shapely import constrained_delaunay_triangles, segmentize
from shapely.geometry import Polygon, Point, MultiPoint, box, LineString
from shapely.ops import unary_union, triangulate

data=json.loads(Path(sys.argv[1]).read_text())
center=(-166.,-129.)
beds=json.loads(Path('scripts/plaza-order-layout.json').read_text())['beds']
def strip(path):
    rows=path['rows']
    left=[(r['x']-r['nx']*r['width']/2,r['z']-r['nz']*r['width']/2) for r in rows]
    right=[]
    for r in reversed(rows):
        t=max(0,min(1,r['s']/20));inset=.30*(1-t*t*(3-2*t)) if path['id']=='uferstrasse' else 0
        right.append((r['x']+r['nx']*(r['width']/2-inset),r['z']+r['nz']*(r['width']/2-inset)))
    return Polygon(left+right).buffer(0)
tail=data['roads'][0]['rows'][-1]
turn=Point(tail['x'],tail['z']).buffer(4.2,quad_segs=16)
road=unary_union([*(strip(p) for p in data['roads']),turn])
# Round the outer corners at road junctions; keep the hotel tie-in unchanged.
local=road.intersection(box(-240,-220,-90,-100)).buffer(2.0,quad_segs=12).buffer(-2.0,quad_segs=12)
road=unary_union([road.difference(box(-240,-220,-90,-100)),local])
curb=road.buffer(.30,quad_segs=8).difference(road)
sidewalk=road.buffer(2.50,quad_segs=12).difference(road.buffer(.30,quad_segs=8))
curb=curb.difference(box(-59.2,28.1,-58.0,39.7)).difference(box(-58.5,20,120,120))
sidewalk=sidewalk.difference(box(-61,28.1,-58.0,39.7)).difference(box(-58.5,20,120,120))
# Match the original 1.8 m Hotel-side pavement; ease toward the 2.2 m village pavement.
rows=data['roads'][0]['rows'];inner=[];outer_edge=[]
for r in rows:
    if r['s']>22:break
    t=max(0,min(1,r['s']/20));fade=1-t*t*(3-2*t);road_edge=r['width']/2-.30*fade
    inner.append((r['x']+r['nx']*(road_edge+.30+2.2-.4*fade),r['z']+r['nz']*(road_edge+.30+2.2-.4*fade)))
    outer_edge.append((r['x']+r['nx']*(road_edge+4),r['z']+r['nz']*(road_edge+4)))
sidewalk=sidewalk.difference(Polygon(inner+list(reversed(outer_edge))).buffer(0))
square=data['square']; plaza=box(square['x']-square['width']/2,square['z']-square['depth']/2,square['x']+square['width']/2,square['z']+square['depth']/2)
terrace=box(-153,-164.2,-137,-157.2)
access=unary_union([strip(a['path']) for a in data['accesses']])
prom=next(w for w in data['walks'] if w['id']=='promenade');rest=[]
loop=strip(prom)
for entry in data['rests']:
    i=round((len(prom['rows'])-1)*entry['fraction']);a,b=prom['rows'][i-1],prom['rows'][i+1]
    rest.append(Polygon([(r['x']+r['nx']*r['width']*f,r['z']+r['nz']*r['width']*f) for r,f in [(a,.5),(a,1.36),(b,1.36),(b,.5)]]))
walk=unary_union([sidewalk,plaza,terrace,access,*(strip(w) for w in data['walks'] if w['id']!='promenade')]).difference(road.union(curb).union(loop))
rest_union=unary_union(rest).difference(loop.union(walk).union(road).union(curb))
bed_union=unary_union([Point(x,z).buffer(r,quad_segs=16) for x,z,r in beds])
walk=walk.difference(bed_union)
footprints={f['id']:Polygon(f['corners']) for f in data['footprints']}
# Terrace was formerly a box extending beneath the inn. Its new paved boundary
# meets the real front wall, without a second coplanar slab beneath the facade.
walk=walk.difference(unary_union(list(footprints.values())))
assert road.is_valid and walk.is_valid and curb.is_valid
assert road.intersection(walk).area<1e-7
assert road.intersection(curb).area<1e-7
assert walk.intersection(curb).area<1e-7
for name,p in footprints.items():
    assert road.intersection(p.buffer(.15)).area<1e-7, name

def components(geometry):
    if geometry.geom_type=='Polygon': return [geometry]
    return [p for p in getattr(geometry,'geoms',[]) if p.geom_type=='Polygon']
def coordinates(geometry):
    return [{'outer':list(p.exterior.coords)[:-1],'holes':[list(r.coords)[:-1] for r in p.interiors]} for p in components(geometry)]
def triangles(poly,spacing=2.8):
    # Delaunay partitions a common point set. Intersect each tile with the exact
    # polygon so concave corners and islands never get bridged by triangles.
    rings=segmentize(poly,2.0)
    points=[]
    for p in components(rings):
        points.extend(list(p.exterior.coords))
        for r in p.interiors: points.extend(list(r.coords))
    x0,z0,x1,z1=poly.bounds
    for ix in range(math.floor(x0/spacing),math.ceil(x1/spacing)+1):
        for iz in range(math.floor(z0/spacing),math.ceil(z1/spacing)+1):
            p=Point(ix*spacing,iz*spacing)
            if poly.contains(p):points.append((p.x,p.y))
    verts=[];indices=[];lookup={}
    for t in triangulate(MultiPoint(points)):
        part=t.intersection(poly)
        for p in components(part):
            if p.area<1e-9:continue
            for tri in constrained_delaunay_triangles(p).geoms:
                coords=list(tri.exterior.coords)[:3]
                if tri.area<1e-9:continue
                signed=sum(coords[i][0]*coords[(i+1)%3][1]-coords[(i+1)%3][0]*coords[i][1] for i in range(3))
                if signed>0:coords.reverse() # Upward normal in world X/Z.
                for x,z in coords:
                    key=(round(x,7),round(z,7))
                    if key not in lookup:lookup[key]=len(verts);verts.append(list(key))
                    indices.append(lookup[key])
    total=sum(abs((verts[indices[i+1]][0]-verts[indices[i]][0])*(verts[indices[i+2]][1]-verts[indices[i]][1])-(verts[indices[i+2]][0]-verts[indices[i]][0])*(verts[indices[i+1]][1]-verts[indices[i]][1]))/2 for i in range(0,len(indices),3))
    assert abs(total-poly.area)<.00001*poly.area,(total,poly.area)
    return {'vertices':verts,'indices':indices,'area':poly.area,'polygons':coordinates(poly)}
lake=Polygon(data['lake'])
assert walk.intersection(lake).area<1e-7, 'Walking path intersects water'
loop=strip(prom)
assert loop.intersection(lake).area<1e-7
assert rest_union.intersection(lake).area<1e-7
assert walk.intersection(loop).area<1e-7
assert rest_union.intersection(loop).area<1e-7
assert len(loop.interiors)==1, 'The loop must form a closed annulus'
# Preserve the established coarse/fine terrain seam during this bounded edit.
region=unary_union([Polygon(p['outer'],p['holes']) for p in json.loads(Path('scripts/village-terrain-region.json').read_text())])
ground=region.difference(lake.union(road).union(curb).union(walk).union(loop).union(rest_union))
output={'revision':49,'intersection':{'x':center[0],'z':center[1],'branches':3},'beds':beds,'restAreas':coordinates(unary_union(rest)),'road':triangles(road),'curb':triangles(curb,3.0),'walk':triangles(walk),'loop':triangles(loop),'rest':triangles(rest_union),'accesses':data['accesses'],'floors':{f['id']:f['floor'] for f in data['footprints']}}
Path('dist/village-traffic-data.js').write_text('export const TRAFFIC='+json.dumps(output,separators=(',',':'))+';\n')
report={'roadArea':road.area,'walkArea':walk.area,'curbArea':curb.area,'roadWalkOverlap':road.intersection(walk).area,'roadCurbOverlap':road.intersection(curb).area,'walkCurbOverlap':walk.intersection(curb).area,'roundaboutRemoved':True,'intersectionBranches':3,'triangles':{k:len(output[k]['indices'])//3 for k in ['road','walk','curb']}}
report.update({'loopArea':loop.area,'loopWaterOverlap':loop.intersection(lake).area,'restWaterOverlap':rest_union.intersection(lake).area,'asphaltWidth':2.5,'lakeLoopLength':prom['length'],'loopClosed':True,'walkWaterOverlap':walk.intersection(lake).area,'squareArea':plaza.area,'townhallRoadOverlap':road.intersection(footprints['rathaus']).area})
Path('.sites-runtime').mkdir(exist_ok=True)
Path('.sites-runtime/terrain-region.json').write_text(json.dumps({'region':coordinates(region),'ground':coordinates(ground)}))
ground_data=triangles(ground,.9)
outer_boundary=unary_union([LineString(p.exterior.coords) for p in components(region)])
ground_data['borderDistances']=[outer_boundary.distance(Point(v)) for v in ground_data['vertices']]
ground_data['region']=coordinates(region)
ground_data['hotelLawn']=triangles(box(-37.5,-53,57.5,45).difference(region),1.8)
Path('dist/village-ground-data.js').write_text('export const VILLAGE_GROUND='+json.dumps(ground_data,separators=(',',':'))+';\n')
Path('traffic-topology-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
