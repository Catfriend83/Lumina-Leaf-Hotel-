"""Check exported plaza coverage and traffic clearance, including roof eaves."""
import json,struct,sys
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from shapely.geometry import Polygon,box
from shapely.ops import unary_union

def read(path):
 b=Path(path).read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
def surface(path):
 g,data=read(path);out=[];mats=[]
 def access(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]);w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];return np.ndarray((a['count'],w),dtype=dt,buffer=data,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*w),dt.itemsize)).copy()
 for n in g['nodes']:
  e=n.get('extras',{})
  if 'mesh' not in n or not(e.get('villageGround') or e.get('villagePlazaFinish') or e.get('townhallGroundConnection')):continue
  p=g['meshes'][n['mesh']]['primitives'][0];v=access(p['attributes']['POSITION']);v=v@Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix().T+np.array(n.get('translation',[0,0,0]));ix=access(p['indices']).reshape(-1,3);t=v[ix];near=(t[:,:,0].max(1)>-173)&(t[:,:,0].min(1)<-152)&(t[:,:,2].max(1)>-171)&(t[:,:,2].min(1)<-156)
  tris=[Polygon(a[:,[0,2]]) for a in t[near]];tris=[p for p in tris if p.area>1e-10];out.extend(tris)
  if e.get('villagePlazaFinish') or e.get('townhallGroundConnection'):mats.extend(tris)
 return unary_union(out),unary_union(mats),sum(p.area for p in out)
cfg=json.loads(Path('dist/townhall-placement-data.js').read_text().split('=',1)[1].rstrip(';\n'));patch=unary_union([Polygon(p['outer'],p['holes']) for p in cfg['patch']]);before,_,_=surface(sys.argv[1]);after,stone,area=surface('.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb');delta=before.symmetric_difference(after).intersection(patch.buffer(.01)).area;assert delta<.001,delta
foot=box(-167.15,-168.243,-153.65,-158.25).union(box(-161.90,-159.075,-158.90,-157.725));plaza=json.loads(Path('dist/plaza-finish-data.js').read_text().split('=',1)[1].rstrip(';\n'));allowed=unary_union([Polygon(p['outer'],p['holes']) for p in plaza['polygons']]).union(patch);outside=foot.difference(allowed).area;assert outside<1e-5,outside
traffic=json.loads(Path('dist/village-traffic-data.js').read_text().split('=',1)[1].rstrip(';\n'));road=unary_union([Polygon(p['outer'],p['holes']) for p in traffic['road']['polygons']]);curb=unary_union([Polygon(p['outer'],p['holes']) for p in traffic['curb']['polygons']]);walk=unary_union([Polygon(p['outer'],p['holes']) for p in traffic['walk']['polygons']]).difference(allowed);clearance=min(foot.distance(road),foot.distance(walk),foot.distance(curb));assert clearance>.8,clearance;assert foot.intersection(road.union(walk).union(curb)).area<1e-9
body=box(*cfg['body']);assert body.difference(stone).area<.001,'Building base is not wholly on paving'
report={'version':68,'plazaCoverageDifferenceSquareMeters':delta,'wholeBuildingAndEavesOnPlaza':True,'trafficOverlapSquareMeters':0,'minimumTrafficClearanceMeters':clearance,'bodyOutsidePavingSquareMeters':body.difference(stone).area,'localTerrainPatchSquareMeters':patch.area};Path('townhall-topology-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
