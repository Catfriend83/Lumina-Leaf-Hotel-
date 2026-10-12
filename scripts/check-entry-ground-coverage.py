import json,struct,sys,io
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial.transform import Rotation
b=Path(sys.argv[1]).read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);data=b[28+n:]
kind={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'};sizes={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def access(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype(kind[a['componentType']]);w=sizes[a['type']];return np.ndarray((a['count'],w),dtype=dt,buffer=data,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*w),dt.itemsize)).copy()
def matrix(n):
 if 'matrix'in n:return np.array(n['matrix']).reshape(4,4,order='F')
 m=np.eye(4);m[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])};worlds={}
def world(i):
 if i not in worlds:worlds[i]= (world(parents[i]) if i in parents else np.eye(4))@matrix(g['nodes'][i])
 return worlds[i]

from scipy.ndimage import label
xmin,xmax,zmin,zmax=-218,-168,-143,-98
step=.1;xx=np.arange(xmin,xmax+.001,step);zz=np.arange(zmin,zmax+.001,step);heights=np.full((len(zz),len(xx)),-np.inf);allheights=heights.copy();hits=np.zeros_like(heights,dtype=int);counts={}
allowed=['Alpine Wiesen','Fein modellierte','Durchgängiges Gelände','Bündiger Übergang','Nahtlose Fortsetzung','Bündige Gehwege','Gemeinsame Bordsteinkanten','Durchgehender Natursteinbelag','Vollständig geschlossene Natursteinfläche','Durchgehend asphaltierter See','Ebene Bankplätze']
for i,n in enumerate(g['nodes']):
 if 'mesh' not in n or not any(n.get('name','').startswith(s) for s in allowed):continue
 p=g['meshes'][n['mesh']]['primitives'][0];pos=access(p['attributes']['POSITION']);pts=(world(i)@np.c_[pos,np.ones(len(pos))].T).T[:,:3];ix=access(p['indices']).reshape(-1,3) if 'indices'in p else np.arange(len(pts)).reshape(-1,3)
 valid=0;down=0
 for ind in ix:
  tri=pts[ind];xs=tri[:,0];zs=tri[:,2]
  if xs.max()<xmin or xs.min()>xmax or zs.max()<zmin or zs.min()>zmax:continue
  idsx=np.where((xx>=xs.min()-1e-7)&(xx<=xs.max()+1e-7))[0];idsz=np.where((zz>=zs.min()-1e-7)&(zz<=zs.max()+1e-7))[0]
  if not len(idsx)or not len(idsz):continue
  x,z=np.meshgrid(xx[idsx],zz[idsz]);a,b,c=tri[:,[0,2]];den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
  if abs(den)<1e-8:continue
  u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(z-c[1]))/den;v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(z-c[1]))/den;w=1-u-v;mask=(u>=-1e-6)&(v>=-1e-6)&(w>=-1e-6);y=u*tri[0,1]+v*tri[1,1]+w*tri[2,1]
  if den>0:down+=1
  else:valid+=1
  for ar in [allheights] if den>0 else [allheights,heights]:
   sub=ar[np.ix_(idsz,idsx)];sub[mask]=np.maximum(sub[mask],y[mask]);ar[np.ix_(idsz,idsx)]=sub
  sub=hits[np.ix_(idsz,idsx)];sub[mask]+=1;hits[np.ix_(idsz,idsx)]=sub
 counts[n['name']]={'up':valid,'down':down}
missing=~np.isfinite(heights);labs,c=label(missing);out=[]
for j in range(1,c+1):
 rz,rx=np.where(labs==j)
 if len(rx)<5:continue
 out.append({'samples':len(rx),'area':len(rx)*step**2,'x':[xx[rx].min(),xx[rx].max()],'z':[zz[rz].min(),zz[rz].max()]})


assert not missing.any(), 'Missing or downward-facing ground surface in the entry repair area'
report={'version':58,'areaBounds':[xmin,xmax,zmin,zmax],'sampleSpacingMeters':step,'testedSurfacePoints':int(heights.size),'uncoveredGroundPoints':int(missing.sum()),'reversedSurfaceTriangles':sum(c['down'] for c in counts.values()),'existingTerrainAndTrafficCoverageContinuous':True}
assert report['reversedSurfaceTriangles']==0
Path('entry-ground-coverage-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
