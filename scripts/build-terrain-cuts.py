import json
from pathlib import Path
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles, segmentize
r=json.loads(Path('.sites-runtime/terrain-region.json').read_text())
region=unary_union([Polygon(p['outer'],p['holes']) for p in r['region']]);boundary=region.boundary
output={}
for key,data in json.loads(Path('.sites-runtime/terrain-grids.json').read_text()).items():
    v=data['vertices'];ix=data['indices'];cuts={}
    for i in range(0,len(ix),3):
        ids=ix[i:i+3];tri=Polygon([v[j] for j in ids])
        if not tri.intersects(region):continue
        clipped=tri.difference(region);parts=[clipped] if clipped.geom_type=='Polygon' else [p for p in getattr(clipped,'geoms',[]) if p.geom_type=='Polygon'];verts=[]
        for part in parts:
            if part.area<1e-8:continue
            for t in constrained_delaunay_triangles(segmentize(part,.75)).geoms:
                coords=list(t.exterior.coords)[:3]
                signed=sum(coords[j][0]*coords[(j+1)%3][1]-coords[(j+1)%3][0]*coords[j][1] for j in range(3))
                if signed>0:coords.reverse()
                for x,z in coords:verts.append([round(x,7),round(z,7),int(boundary.distance(Point(x,z))<1e-6)])
        cuts[str(i)]={'source':ids,'vertices':verts}
    output[key]=cuts
Path('dist/terrain-cuts.js').write_text('export const TERRAIN_CUTS='+json.dumps(output,separators=(',',':'))+';\n')
print({key:len(cuts) for key,cuts in output.items()})
