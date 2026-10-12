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


import math
cam=np.array(json.loads(sys.argv[2]),dtype=float);target=np.array(json.loads(sys.argv[3]),dtype=float);out=sys.argv[4]
W,H=1440,900;fwd=target-cam;fwd/=np.linalg.norm(fwd);right=np.cross(fwd,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,fwd);view=np.stack([right,up,fwd]);f=H/(2*np.tan(np.deg2rad(55)/2));depth=np.full((H,W),np.inf);rgb=np.zeros((H,W,3),np.uint8);rgb[:]=[38,37,34];texcache={};visible={}
for i,node in enumerate(g['nodes']):
 if 'mesh'not in node:continue
 for prim in g['meshes'][node['mesh']]['primitives']:
  pos=access(prim['attributes']['POSITION']);ix=access(prim['indices']).reshape(-1,3) if 'indices'in prim else np.arange(len(pos)).reshape(-1,3)
  mat=g['materials'][prim.get('material',0)];name=mat.get('name','');pbr=mat.get('pbrMetallicRoughness',{});base=np.array(pbr.get('baseColorFactor',[1,1,1,1])[:3]);base=np.power(np.clip(base,0,1),1/2.2)*255
  if mat.get('alphaMode','OPAQUE')=='BLEND':continue
  if 'Grünpatina' in name:base=np.array([70.,100.,85.])
  transforms=[world(i)];att=node.get('extensions',{}).get('EXT_mesh_gpu_instancing',{}).get('attributes')
  if att and any(v is None for v in att.values()):continue
  if att:
   aa={k:access(v)for k,v in att.items()};ct=len(next(iter(aa.values())));transforms=[]
   if ct>500:continue
   for j in range(ct):
    inst=matrix({'translation':aa.get('TRANSLATION',np.zeros((ct,3)))[j].tolist(),'rotation':aa.get('ROTATION',np.tile([0,0,0,1],(ct,1)))[j].tolist(),'scale':aa.get('SCALE',np.ones((ct,3)))[j].tolist()});transforms.append(world(i)@inst)
  norm=access(prim['attributes']['NORMAL']) if 'NORMAL' in prim['attributes'] else None
  texture=None;uv=access(prim['attributes']['TEXCOORD_0']) if 'TEXCOORD_0'in prim['attributes'] else None
  tx=pbr.get('baseColorTexture')
  if tx:
   tid=tx['index']
   if tid not in texcache:
    im=g['images'][g['textures'][tid]['source']];bv=g['bufferViews'][im['bufferView']];texcache[tid]=np.array(Image.open(io.BytesIO(data[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGBA'))
   texture=texcache[tid]
  for mw in transforms:
   xyz=(mw@np.c_[pos,np.ones(len(pos))].T).T[:,:3];q=(view@(xyz-cam).T).T
   if q[:,2].max()<.1 or q[:,2].min()>140:continue
   proj=np.c_[W/2+q[:,0]*f/np.maximum(q[:,2],.01),H/2-q[:,1]*f/np.maximum(q[:,2],.01)]
   for ids in ix:
    qt=q[ids];pts=proj[ids]
    if qt[:,2].min()<.1:continue
    lo=np.maximum(np.floor(pts.min(0)).astype(int),[0,0]);hi=np.minimum(np.ceil(pts.max(0)).astype(int),[W-1,H-1])
    if (lo>hi).any():continue
    a,b,c=pts;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if abs(den)<1e-8:continue
    if den>0 and not mat.get('doubleSided'):continue
    xs,ys=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5)
    u=((b[1]-c[1])*(xs-c[0])+(c[0]-b[0])*(ys-c[1]))/den;v=((c[1]-a[1])*(xs-c[0])+(a[0]-c[0])*(ys-c[1]))/den;w=1-u-v;zz=1/(u/qt[0,2]+v/qt[1,2]+w/qt[2,2]);sub=depth[lo[1]:hi[1]+1,lo[0]:hi[0]+1];mask=(u>=0)&(v>=0)&(w>=0)&(zz<sub)
    if not mask.any():continue
    sub[mask]=zz[mask];col=np.broadcast_to(base,(*xs.shape,3)).copy()
    if texture is not None and uv is not None:
     tu=(u[...,None]*uv[ids[0]]/qt[0,2]+v[...,None]*uv[ids[1]]/qt[1,2]+w[...,None]*uv[ids[2]]/qt[2,2])*zz[...,None];h1,w1=texture.shape[:2];tt=texture[(tu[...,1]%1*h1).astype(int)%h1,(tu[...,0]%1*w1).astype(int)%w1];col=tt[...,:3]*base/255
     if mat.get('alphaMode')=='MASK':mask&=tt[...,3]/255>=mat.get('alphaCutoff',.5)
    if norm is not None:
     interpolated=(u[...,None]*norm[ids[0]]/qt[0,2]+v[...,None]*norm[ids[1]]/qt[1,2]+w[...,None]*norm[ids[2]]/qt[2,2])*zz[...,None];interpolated=interpolated@mw[:3,:3].T;interpolated/=np.maximum(np.linalg.norm(interpolated,axis=2,keepdims=True),1e-12);light=np.array([-.3,.7,.7]);light/=np.linalg.norm(light);shade=.80+.20*np.maximum(0,interpolated@light);col*=shade[...,None]
    rgb[lo[1]:hi[1]+1,lo[0]:hi[0]+1][mask]=np.clip(col[mask],0,255).astype(np.uint8);visible[node.get('name','')]=visible.get(node.get('name',''),0)+int(mask.sum())
Image.fromarray(rgb).save(out);print(json.dumps(sorted(visible.items(),key=lambda x:-x[1])[:16]))
