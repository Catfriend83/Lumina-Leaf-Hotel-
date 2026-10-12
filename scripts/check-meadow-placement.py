import json,struct,sys,io
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial.transform import Rotation
b=Path('.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);data=b[28+n:]
component_types={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'};sizes={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def access(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype(component_types[a['componentType']]);w=sizes[a['type']];return np.ndarray((a['count'],w),dtype=dt,buffer=data,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*w),dt.itemsize)).copy()
def matrix(n):
 if 'matrix'in n:return np.array(n['matrix']).reshape(4,4,order='F')
 m=np.eye(4);m[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])};worlds={}
def world(i):
 if i not in worlds:worlds[i]= (world(parents[i]) if i in parents else np.eye(4))@matrix(g['nodes'][i])
 return worlds[i]
from collections import defaultdict
cells=[defaultdict(list),defaultdict(list)]; triangles=[[],[]]; roots=[]
CELL=20
vegetation=('leaf','leaves','foliage','flower','bloom','petal','grass','blossom','needle','trunk','bark','blüte','blatt','wiesenbotanik')
def add_triangle(kind,t):
 den=(t[1,2]-t[2,2])*(t[0,0]-t[2,0])+(t[2,0]-t[1,0])*(t[0,2]-t[2,2])
 if abs(den)<1e-8:return
 lo=t[:,[0,2]].min(0);hi=t[:,[0,2]].max(0)
 if hi[0]<-1550 or lo[0]>1550 or hi[1]<-1770 or lo[1]>1330:return
 lo=np.maximum(lo,[-1550,-1770]);hi=np.minimum(hi,[1550,1330]);idx=len(triangles[kind]);triangles[kind].append(t)
 for x in range(int(np.floor(lo[0]/CELL)),int(np.floor(hi[0]/CELL))+1):
  for z in range(int(np.floor(lo[1]/CELL)),int(np.floor(hi[1]/CELL))+1):cells[kind][x,z].append(idx)
for i,node in enumerate(g['nodes']):
 if 'mesh' not in node:continue
 mesh=g['meshes'][node['mesh']];p=mesh['primitives'][0];name=g['materials'][p['material']].get('name','');att=node.get('extensions',{}).get('EXT_mesh_gpu_instancing',{}).get('attributes')
 if 'Wiesenbotanik' in name:
  assert att is not None
  tr=access(att['TRANSLATION']);roots.extend((world(i)@np.c_[tr,np.ones(len(tr))].T).T[:,:3]);continue
 if att is not None:continue
 if any(v in name.lower() for v in vegetation) or 'Himmel' in node.get('name',''):continue
 kind=0 if 'Alpine Blumenwiese' in name else 1
 for p in mesh['primitives']:
  pos=access(p['attributes']['POSITION']);xyz=(world(i)@np.c_[pos,np.ones(len(pos))].T).T[:,:3];ix=access(p['indices']).reshape(-1,3) if 'indices'in p else np.arange(len(pos)).reshape(-1,3)
  for t in xyz[ix]:add_triangle(kind,t)
triangles=[np.array(t) for t in triangles]
cells=[{key:triangles[k][value] for key,value in c.items()} for k,c in enumerate(cells)]
def top(kind,x,z):
 t=cells[kind].get((int(np.floor(x/CELL)),int(np.floor(z/CELL))))
 if t is None:return None
 a,b,c=t[:,0],t[:,1],t[:,2];den=(b[:,2]-c[:,2])*(a[:,0]-c[:,0])+(c[:,0]-b[:,0])*(a[:,2]-c[:,2]);u=((b[:,2]-c[:,2])*(x-c[:,0])+(c[:,0]-b[:,0])*(z-c[:,2]))/den;v=((c[:,2]-a[:,2])*(x-c[:,0])+(a[:,0]-c[:,0])*(z-c[:,2]))/den;w=1-u-v;valid=(u>=-1e-6)&(v>=-1e-6)&(w>=-1e-6)
 if not valid.any():return None
 return float((u*a[:,1]+v*b[:,1]+w*c[:,1])[valid].max())
max_contact=0
for x,y,z in roots:
 h=top(0,x,z);assert h is not None,('Plant outside meadow',x,y,z)
 assert -.001<=y-h<=.009,('Plant floating or buried',x,y,z,h)
 max_contact=max(max_contact,abs(y-h));solid=top(1,x,z)
 assert solid is None or solid<h-.069,('Plant intersects solid surface or water',x,y,z,solid,h)
# Independently sample actual rendered tuft extents near every care zone.
for x,y,z in roots[::13]:
 for a in np.arange(8)*np.pi/4:
  xx=x+np.cos(a)*.22;zz=z+np.sin(a)*.22;h=top(0,xx,zz);solid=top(1,xx,zz)
  assert h is not None and (solid is None or solid<h-.068),('Botanical extent crosses boundary',x,z,xx,zz)
coverage=next(n['extras']['coverage']for n in g['nodes']if n.get('extras',{}).get('alpineMeadows'))
rendered_cells={(int(np.floor(x/CELL)),int(np.floor(z/CELL)))for x,y,z in roots}
assert len(rendered_cells)==coverage['occupiedTerrainCells'],('Meadow coverage lost in export',len(rendered_cells),coverage['occupiedTerrainCells'])
report={'occupiedMeadowCellsChecked':len(rendered_cells),'allCoverageCellsRetainedInExport':True,'version':66,'renderedPlantBasesChecked':len(roots),'allBasesOnExistingMeadow':True,'maximumBaseOffsetMeters':max_contact,'noPlantsOnProjectedRoadPathBuildingOrWaterSurfaces':True,'sampledTuftExtentClearancesChecked':len(roots[::13])*8}
Path('meadow-placement-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
