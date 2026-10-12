"""One planar road union: no overlapping approach, exit or VIP asphalt sheets."""
import json, math
from pathlib import Path
import numpy as np
from shapely.geometry import LineString, Polygon, box
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles

def ease(t):
    t=max(0,min(1,t));return t**3*(10-15*t+6*t*t)
def main_z(x):
    return 33.9+20*(ease((x+58.5)/38.5) if x< -20 else 1 if x<=22 else ease((66.5-x)/44.5))
main=[[float(x),main_z(x)] for x in np.linspace(-58.5,66.5,251)]
def bezier(p,steps=90):
    return [[float(v) for v in sum(np.array(p[j])*math.comb(3,j)*t**j*(1-t)**(3-j) for j in range(4))] for t in np.linspace(0,1,steps+1)]
entry=bezier([[44,main_z(44)],[35,main_z(44)-1],[34,35.7],[20,35.7]])
exit=bezier([[-20,35.7],[-34,35.7],[-35,main_z(-44)-1],[-44,main_z(-44)]])
drive=entry+[[float(x),35.7] for x in np.linspace(20,-20,81)[1:]]+exit[1:]
domain=box(-58.5,28.4,66.5,65)
main_line=LineString(main);drive_line=LineString(drive)
garage=box(-18.715,28.4,-6.515,37.8)
vip=box(-3.20,28.4,16.10,37.8)
# Rear apron stops at the first outer path-border face, world x=20.67.
# Preserve the garden path and its original sidewalk; replace only the intervening lawn.
road=unary_union([main_line.buffer(5.8,cap_style=2,quad_segs=16),drive_line.buffer(2.1,cap_style=2,quad_segs=16),garage,vip,box(-6.515,28.4,-3.20,33.6),box(16.10,28.4,20.67,33.6)]).intersection(domain)
# Rounded curb returns at driveway junctions; the hotel and garage thresholds stay open.
curb=road.buffer(.3,quad_segs=12).difference(road).intersection(domain)
# Flush apron termination: no raised curb across the new straight asphalt/grass edge.
curb=curb.difference(box(20.67,28.4,20.98,33.6))
south=[];south_outer=[]
for i,p in enumerate(main):
    a=main[max(0,i-1)];b=main[min(len(main)-1,i+1)];dx=b[0]-a[0];dz=b[1]-a[1];l=math.hypot(dx,dz);nx=-dz/l;nz=dx/l
    south.append([p[0]+nx*6.1,p[1]+nz*6.1]);south_outer.append([p[0]+nx*8.3,p[1]+nz*8.3])
walk=Polygon(south+south_outer[::-1]).intersection(domain).difference(road.union(curb))
grass=domain.difference(unary_union([road,curb,walk]))
def parts(g):return [g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
def polygons(g):return [{'outer':list(p.exterior.coords)[:-1],'holes':[list(r.coords)[:-1] for r in p.interiors]} for p in parts(g)]
def mesh(g,grid=False):
    vertices=[];lookup={};indices=[]
    regions=parts(g)
    if grid:
        regions=[]
        for x in np.arange(-58.5,66.5,2):
            for z in np.arange(28.4,65,2):regions.extend(parts(g.intersection(box(x,z,min(x+2,66.5),min(z+2,65)))))
    for region in regions:
        for tri in constrained_delaunay_triangles(region).geoms:
            if tri.area<1e-10:continue
            pts=list(tri.exterior.coords)[:3]
            if sum(pts[i][0]*pts[(i+1)%3][1]-pts[(i+1)%3][0]*pts[i][1] for i in range(3))>0:pts.reverse()
            for x,z in pts:
                key=(round(x,7),round(z,7))
                if key not in lookup:lookup[key]=len(vertices);vertices.append(list(key))
                indices.append(lookup[key])
    return {'vertices':vertices,'indices':indices,'polygons':polygons(g)}
def radius(points):
    values=[]
    for a,b,c in zip(points,points[1:],points[2:]):
        a,b,c=map(np.array,[a,b,c]);cross=abs(float((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])))
        if cross>1e-8:values.append(float(np.linalg.norm(b-a)*np.linalg.norm(c-b)*np.linalg.norm(c-a)/(2*cross)))
    return min(values)
data={'bounds':{'minX':-58.5,'maxX':66.5,'minZ':28.4,'maxZ':65},'main':main,'entry':entry,'exit':exit,'drive':drive,'road':mesh(road),'curb':mesh(curb),'walk':mesh(walk),'grass':mesh(grass,True),'mainWidth':11.6,'driveWidth':4.2,'shiftMeters':20,'minimumRadii':{'main':radius(main),'entry':radius(entry),'exit':radius(exit)}}
assert road.is_valid and curb.is_valid and walk.is_valid and grass.is_valid
assert all(x>6 for x in data['minimumRadii'].values()),data['minimumRadii']
assert abs(road.area+curb.area+walk.area+grass.area-domain.area)<1e-5
Path('dist/hotel-drive-data.js').write_text('export const HOTEL_DRIVE='+json.dumps(data,separators=(',',':'))+';\n')
print(json.dumps({'radii':data['minimumRadii'],'surfaceAreas':{'road':road.area,'grass':grass.area},'vertices':{s:len(data[s]['vertices']) for s in ['road','curb','walk','grass']}}))
