import numpy as np
from PIL import Image
def scale2x(a):
    h,w=a.shape[:2]; o=np.zeros((h*2,w*2,4),a.dtype)
    P=np.pad(a,((1,1),(1,1),(0,0)),mode='edge')
    eq=lambda x,y:np.all(x==y,axis=-1)
    for y in range(h):
        for x in range(w):
            p=P[y+1,x+1];A=P[y,x+1];B=P[y+1,x+2];C=P[y+1,x];D=P[y+2,x+1]
            e0=e1=e2=e3=p
            if not np.all(C==B) and not np.all(A==D):
                if np.all(C==A): e0=A
                if np.all(A==B): e1=B
                if np.all(D==C): e2=C
                if np.all(B==D): e3=D
            o[2*y,2*x]=e0;o[2*y,2*x+1]=e1;o[2*y+1,2*x]=e2;o[2*y+1,2*x+1]=e3
    return o
def rotsprite(im,angle,out=None):
    a=np.array(im.convert('RGBA'))
    for _ in range(3): a=scale2x(a)
    big=Image.fromarray(a).rotate(angle,resample=Image.NEAREST,expand=True)
    w,h=big.size
    small=big.resize((w//8,h//8),Image.NEAREST)
    # recenter-sample: take pixel at block center
    b=np.array(big); sw,sh=w//8,h//8
    s=b[4::8,4::8][:sh,:sw]
    img=Image.fromarray(s)
    bb=img.getbbox(); return img.crop(bb)
