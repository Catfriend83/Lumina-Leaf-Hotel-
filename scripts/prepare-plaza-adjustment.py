"""Retain v48 layout; mirror only the right tree in storefront coordinates."""
import json,math
from pathlib import Path
p=Path('scripts/plaza-order-layout.json');cfg=json.loads(p.read_text())
rot=math.atan2(cfg['plazaCenter'][0]+131,cfg['plazaCenter'][1]+154)
c,s=math.cos(rot),math.sin(rot)
x,z=cfg['trees'][1];dx,dz=x+131,z+154
lx,lz=c*dx-s*dz,s*dx+c*dz
right=[-131-c*lx+s*lz,-154+s*lx+c*lz]
cfg['trees'][2]=right;cfg['beds'][2]=[*right,cfg['treeBedRadius']]
cfg.update(version=49,benchFrontClearance=1.,benchAxisRadius=2.2+1.+cfg['benchFrontOffset'],shopTreeSymmetry={'referenceIndex':1,'movedIndex':2,'facadeCenter':[-131,-154],'rotation':rot,'leftLocal':[lx,lz],'rightLocal':[-lx,lz]})
x,z=cfg['center'];r=cfg['benchAxisRadius'];cfg['benches']=[[x,z-r,0],[x+r,z,-math.pi/2],[x,z+r,math.pi],[x-r,z,math.pi/2]]
p.write_text(json.dumps(cfg,indent=2)+'\n');Path('dist/plaza-order-data.js').write_text('export const PLAZA_ORDER='+json.dumps(cfg,separators=(',',':'))+';\n')
print({'leftLocal':[lx,lz],'rightWorld':right,'bankAxisRadius':r,'bankClearance':1.})
