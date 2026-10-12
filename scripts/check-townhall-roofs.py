import sys
sys.argv=['check','.sites-runtime/models/Lumina_Leaf_Gesamtszene.glb']
exec(open('scripts/render-surface-diagnostics.py').read().split('import math')[0])
roof={k:[] for k in ['rathaus','gasthaus']}
for i,n in enumerate(g['nodes']):
 if 'mesh' not in n:continue
 for p in g['meshes'][n['mesh']]['primitives']:
  name=g['materials'][p['material']].get('name','');k=next((k for k in roof if name=='Dorfziegel '+k),None)
  if k is None:continue
  v=access(p['attributes']['POSITION']);ix=access(p['indices']).reshape(-1,3) if 'indices'in p else np.arange(len(v)).reshape(-1,3);ms=[world(i)];attrs=n.get('extensions',{}).get('EXT_mesh_gpu_instancing',{}).get('attributes')
  if attrs:
   aa={key:access(value) for key,value in attrs.items()};count=len(next(iter(aa.values())));ms=[world(i)@matrix({key:aa[value][j].tolist() for key,value in [('translation','TRANSLATION'),('rotation','ROTATION'),('scale','SCALE')] if value in aa}) for j in range(count)]
  for mw in ms:roof[k].extend((mw@np.c_[v,np.ones(len(v))].T).T[:,:3][ix])
def at(t,x,z):
 t=np.array(t);den=(t[:,1,2]-t[:,2,2])*(t[:,0,0]-t[:,2,0])+(t[:,2,0]-t[:,1,0])*(t[:,0,2]-t[:,2,2]);u=((t[:,1,2]-t[:,2,2])*(x-t[:,2,0])+(t[:,2,0]-t[:,1,0])*(z-t[:,2,2]))/np.where(abs(den)>1e-10,den,1);v=((t[:,2,2]-t[:,0,2])*(x-t[:,2,0])+(t[:,0,0]-t[:,2,0])*(z-t[:,2,2]))/np.where(abs(den)>1e-10,den,1);ok=(u>=0)&(v>=0)&(u+v<=1)&(abs(den)>1e-10);yy=u*t[:,0,1]+v*t[:,1,1]+(1-u-v)*t[:,2,1];return (min(yy[ok]),max(yy[ok])) if ok.any() else None
a=np.array(roof['rathaus']).reshape(-1,3);b=np.array(roof['gasthaus']).reshape(-1,3)
gap=float(b[:,0].min()-a[:,0].max());assert gap>.03,gap
report={'version':68,'roofAndFasciaPlanGapMeters':gap,'noRoofIntersection':True};open('townhall-roof-clearance-report.json','w').write(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
