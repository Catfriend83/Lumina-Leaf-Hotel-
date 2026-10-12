"""Extract the original contact surfaces before relocation for paving preparation."""
import json,struct,sys,numpy as np
from scipy.spatial.transform import Rotation
from pathlib import Path
b=Path(sys.argv[1]).read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);data=b[28+n:];sizes={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16};types={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}
def access(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype(types[a['componentType']]);w=sizes[a['type']];return np.ndarray((a['count'],w),dtype=dt,buffer=data,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*w),dt.itemsize)).copy()
def matrix(n):
 if 'matrix' in n:return np.array(n['matrix']).reshape(4,4,order='F')
 m=np.eye(4);m[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])};worlds={}
def world(i):
 if i not in worlds:worlds[i]=(world(parents[i]) if i in parents else np.eye(4))@matrix(g['nodes'][i])
 return worlds[i]
hall=next(i for i,n in enumerate(g['nodes']) if n.get('extras',{}).get('buildingId')=='rathaus' and n.get('extras',{}).get('villageBuilding'))
def owned(i):
 while i is not None:
  if i==hall:return True
  i=parents.get(i)
 return False
rows=[]
for i,node in enumerate(g['nodes']):
 if 'mesh' not in node:continue
 extras=node.get('extras',{});prims=g['meshes'][node['mesh']]['primitives'];material=g['materials'][prims[0]['material']]['name'];isowned=owned(i);atts=node.get('extensions',{}).get('EXT_mesh_gpu_instancing',{}).get('attributes');instances=[]
 if atts:
  aa={k:access(v) for k,v in atts.items()};count=len(next(iter(aa.values())));
  if 'rathaus' not in material and material not in ['stoneDark','villageWindow','gold','warm','Dorf warm']:continue
  for j in range(count):
   q={k:aa[v][j].tolist() for k,v in [('translation','TRANSLATION'),('rotation','ROTATION'),('scale','SCALE')] if v in aa};mw=world(i)@matrix(q);x,y,z=mw[:3,3]
   if -172<x<-157 and -171<z<-158 and 3.8<y<15:instances.append(mw)
  isowned=bool(instances)
 elif isowned or extras.get('villagePlazaFinish') or extras.get('villageGround') or extras.get('villageTrafficSurface') or extras.get('townhallGroundConnection') or extras.get('plazaRefinement') or extras.get('townhallFloorRepair') or extras.get('churchFloorRepair') or extras.get('villagePavingEdge'):instances=[world(i)]
 else:continue
 boxes=[];ps=[];inds=[]
 for p in prims:
  a=access(p['attributes']['POSITION']);ps.append(a);ix=access(p['indices']).flatten() if 'indices'in p else np.arange(len(a));inds.extend((ix+sum(len(s) for s in ps[:-1])).tolist())
 pos=np.vstack(ps)
 for mw in instances:
  corners=np.array([[x,y,z,1] for x in [pos[:,0].min(),pos[:,0].max()] for y in [pos[:,1].min(),pos[:,1].max()] for z in [pos[:,2].min(),pos[:,2].max()]]);vv=(mw@corners.T).T[:,:3];boxes.append({'min':vv.min(0).tolist(),'max':vv.max(0).tolist()})
 if not boxes:continue
 rows.append({'name':node.get('name'),'material':[material],'owned':isowned,'extras':extras,'boxes':boxes,'position':pos.flatten().tolist() if not atts else None,'index':inds if not atts else None,'matrix':world(i).flatten(order='F').tolist()})
finish=json.loads(Path('dist/plaza-finish-data.js').read_text().split('=',1)[1].rstrip(';\n'))
Path(sys.argv[2] if len(sys.argv)>2 else '.sites-runtime/measurement-v69-source.json').write_text(json.dumps({'hall':g['nodes'][hall],'rows':rows,'plaza':finish['polygons']}));print('rows',len(rows),'hall',g['nodes'][hall]['translation'])
