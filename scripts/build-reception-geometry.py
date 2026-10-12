"""Build closed, photo-textured human volumes from front/back character sheets.

The photograph controls silhouette and UV detail. Depth is reconstructed from
anatomical cross sections, with a sculpted facial relief. This is an approximation
rather than a scan, and contains no camera-facing planes or billboards.
"""
import sys,json,struct
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import binary_fill_holes, distance_transform_edt, gaussian_filter

root=Path('dist/assets')
for ident,filename in enumerate(sys.argv[1:]):
    im=Image.open(filename).convert('RGBA'); a=np.array(im); H,W=a.shape[:2]
    masks=[]; boxes=[]
    for half in range(2):
        mask=a[:,half*W//2:(half+1)*W//2,3]>150
        yy,xx=np.where(mask)
        if len(xx)<100:raise RuntimeError('No transparent character silhouette')
        boxes.append([int(xx.min()+half*W//2),int(yy.min()),int(xx.max()+half*W//2),int(yy.max())])
    x0,y0,x1,y1=boxes[0]; bw=x1-x0;bh=y1-y0
    height=1.72; width=height*bw/bh
    nx=max(100,round(width/height*600));ny=600
    gx=np.linspace(x0,x1,nx);gy=np.linspace(y0,y1,ny)
    mask=a[np.rint(gy).astype(int)[:,None],np.rint(gx).astype(int)[None,:],3]>170
    mask=binary_fill_holes(mask)
    # Keep spaces between relaxed arms/torso and between calves; no fill larger holes.
    raw=a[np.rint(gy).astype(int)[:,None],np.rint(gx).astype(int)[None,:],3]>170
    mask=raw
    # Avoid zero-area surface faces at isolated alpha pixels.
    vids=np.full((ny,nx),-1,int);valid=[]
    for j in range(ny):
        for i in range(nx):
            if mask[j,i]:vids[j,i]=len(valid);valid.append((j,i))
    dist=distance_transform_edt(mask)
    span=np.zeros((ny,nx));center=np.zeros((ny,nx));radius=np.zeros((ny,nx))
    for j in range(ny):
        active=np.where(mask[j])[0]
        groups=np.split(active,np.where(np.diff(active)>1)[0]+1)
        for seg in groups:
            if not len(seg):continue
            l,r=seg[0],seg[-1];c=(l+r)/2;rad=max((r-l)/2,1)
            center[j,seg]=c;radius[j,seg]=rad
            span[j,seg]=np.sqrt(np.clip(1-((seg-c)/rad)**2,0,1))
    # Measured full-body height normalizes thickness profiles to human proportions.
    levels=np.array([0,.05,.15,.28,.42,.55,.62,.70,.76,.80,.84,.87,.90,.94,.98,1])
    front=np.array([.13,.09,.07,.075,.09,.13,.12,.145,.145,.11,.095,.09,.115,.125,.105,.015])
    back=np.array([.075,.07,.065,.07,.075,.11,.12,.11,.12,.10,.08,.085,.095,.12,.10,.015])
    pos=[];uv=[]
    # Face locations are normalized per generated reference for nose, lips, cheeks.
    profile=json.loads(Path('scripts/reception-profiles.json').read_text())[ident]
    faceX=profile['faceX'];faceY=profile['faceY'];faceW=profile['faceWidth'];faceH=profile['faceHeight']
    for side in [0,1]:
        for j,i in valid:
            fx=(gx[i]-x0)/bh;fy=1-(gy[j]-y0)/bh
            x=(gx[i]-(x0+x1)/2)/bh*height;y=fy*height
            section=span[j,i]
            # A small geometric edge thickness closes sleeves and hair strands.
            depth=.003+np.interp(fy,levels,front if side==0 else back)*section
            # Arms are slimmer than the torso. Connected shoulder spans remain broad.
            cx=(center[j,i]-(nx-1)/2)/(nx-1)*width
            if .45<fy<.80 and abs(cx)>.16:depth=min(depth,.053*section+.003)
            if fy<.045:depth+=.04*section # shoe toe volume
            # Individual curls inherit their own strand radius rather than full head depth.
            if fy>.82:depth=min(depth,.8*radius[j,i]/(nx-1)*width+.003)
            if side==0:
                X=(gx[i]/W-faceX)/faceW;Y=(gy[j]/H-faceY)/faceH
                # Sculpt a continuous nose bridge/tip, cheek planes, lips and chin.
                depth+=.035*np.exp(-(X/.075)**2-((Y+.03)/.17)**2)
                depth+=.022*np.exp(-(X/.115)**2-((Y-.06)/.075)**2)
                depth+=.007*np.exp(-(X/.27)**2-((Y-.30)/.035)**2)
                depth+=.008*np.exp(-(X/.31)**2-((Y-.46)/.09)**2)
            pos.extend([x,y,depth if side==0 else -depth])
            if side==0: uv.extend([gx[i]/W,1-gy[j]/H])
            else:
                bx0,by0,bx1,by1=boxes[1];py=by0+(1-fy)*(by1-by0)
                # Warp back rows to the matching front silhouette; preserves a full volume.
                bj=int(np.clip(round(py),0,H-1));backrow=np.where(a[bj,bx0:bx1+1,3]>150)[0]
                if len(backrow):
                    l,r=backrow[0]+bx0,backrow[-1]+bx0
                    frontrow=np.where(mask[j])[0];fl,fr=frontrow[0],frontrow[-1]
                    t=(i-fl)/max(1,fr-fl);px=r-t*(r-l)
                else:px=(bx0+bx1)/2
                uv.extend([px/W,1-py/H])
    count=len(valid);indices=[];faces=[]
    for j in range(ny-1):
        for i in range(nx-1):
            q=[vids[j,i],vids[j+1,i],vids[j+1,i+1],vids[j,i+1]]
            good=[v for v in q if v>=0]
            if len(good)==4:faces.extend([[q[0],q[1],q[2]],[q[0],q[2],q[3]]])
            elif len(good)==3:faces.append(good)
    # Split silhouette vertices where two disjoint triangle fans meet at one pixel.
    # Each volume then has a manifold boundary instead of a pinched vertical edge.
    incidence={}
    for fi,f in enumerate(faces):
        for v in f:incidence.setdefault(v,[]).append(fi)
    fp=np.array(pos[:count*3]).reshape(-1,3).tolist();bp=np.array(pos[count*3:]).reshape(-1,3).tolist()
    fu=np.array(uv[:count*2]).reshape(-1,2).tolist();bu=np.array(uv[count*2:]).reshape(-1,2).tolist()
    for vertex,incident in incidence.items():
        remaining=set(incident);components=[]
        while remaining:
            current={remaining.pop()};pending=list(current)
            while pending:
                fi=pending.pop();neighbors=set(faces[fi])-{vertex}
                attached=[other for other in remaining if neighbors.intersection(set(faces[other])-{vertex})]
                for other in attached:remaining.remove(other);current.add(other);pending.append(other)
            components.append(current)
        for component in components[1:]:
            newv=len(fp);fp.append(fp[vertex]);bp.append(bp[vertex]);fu.append(fu[vertex]);bu.append(bu[vertex])
            for fi in component:faces[fi]=[newv if v==vertex else v for v in faces[fi]]
    count=len(fp);pos=np.array(fp+bp).reshape(-1).tolist();uv=np.array(fu+bu).reshape(-1).tolist()
    for f in faces:indices.extend(f)
    for f in faces:indices.extend([f[2]+count,f[1]+count,f[0]+count])
    edges={}
    for f in faces:
        for a1,b1 in zip(f,f[1:]+f[:1]):
            key=tuple(sorted([a1,b1]));edges.setdefault(key,[]).append((a1,b1))
    for pairs in edges.values():
        if len(pairs)==1:
            a1,b1=pairs[0];indices.extend([b1,a1,a1+count,b1,a1+count,b1+count])
    # Remove vertices absent from the triangulated alpha surface.
    used=np.unique(indices);remap=np.full(len(pos)//3,-1,int);remap[used]=np.arange(len(used));
    pos=np.array(pos).reshape(-1,3)[used].reshape(-1).tolist();uv=np.array(uv).reshape(-1,2)[used].reshape(-1).tolist();indices=remap[np.array(indices)].tolist()
    xyz=np.array(pos).reshape(-1,3);lo=xyz[:,1].min();hi=xyz[:,1].max();xyz[:,1]=(xyz[:,1]-lo)*height/(hi-lo);pos=xyz.reshape(-1).tolist()
    # Compact mesh source, with typed arrays decoded by the browser without extra requests.
    import base64
    arrays={'position':np.array(pos,dtype='<f4'),'uv':np.array(uv,dtype='<f4'),'index':np.array(indices,dtype='<u4')}
    encoded={key:base64.b64encode(value.tobytes()).decode() for key,value in arrays.items()}
    cfg={'name':profile['name'],'height':height,'width':width,'sourceSize':[W,H],'bounds':boxes,'vertices':len(pos)//3,'triangles':len(indices)//3,'data':encoded}
    Path(f'dist/reception-character-{ident}.js').write_text('export default '+json.dumps(cfg,separators=(',',':'))+';\n')
    print(json.dumps({k:v for k,v in cfg.items() if k!='data'}))
