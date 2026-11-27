import math, pathops
from picosvg.svg_types import SVGPath, SVGCircle, SVGRect, SVGEllipse
from picosvg import svg_pathops as sp
from picosvg.svg_transform import Affine2D

def _sk(svgshape):
    return sp.skia_path(svgshape.as_cmd_seq(), "nonzero")
def path(d): return _sk(SVGPath(d=d))
def circle(cx,cy,r): return _sk(SVGCircle(cx=cx,cy=cy,r=r).as_path())
def ellipse(cx,cy,rx,ry): return _sk(SVGEllipse(cx=cx,cy=cy,rx=rx,ry=ry).as_path())
def rrect(x,y,w,h,r): return _sk(SVGRect(x=x,y=y,width=w,height=h,rx=r,ry=r).as_path())
def xf(p, a, b, c, dd, e, f):  # x'=a*x+c*y+e ; y'=b*x+dd*y+f
    q = _cq(p); return q.transform(a, b, c, dd, e, f)
def rot(p, deg, cx, cy):
    t = math.radians(deg); co, si = math.cos(t), math.sin(t)
    return xf(p, co, si, -si, co, cx - co*cx + si*cy, cy - si*cx - co*cy)
def move(p, dx, dy): return xf(p,1,0,0,1,dx,dy)
def scale(p, s, cx=0, cy=0): return xf(p,s,0,0,s,cx-s*cx,cy-s*cy)
def mirror_x(p, cx): return xf(p,-1,0,0,1,2*cx,0)
def U(*ps):
    return sp.union(*[(sp.svg_commands(p),"nonzero") for p in ps]) if False else _op(ps, pathops.PathOp.UNION)
def _op(ps, op):
    b = pathops.OpBuilder(fix_winding=True, keep_starting_points=False)
    for p in ps: b.add(p, pathops.PathOp.UNION if b is None else op)
    return b.resolve()
def _cq(p):
    q = pathops.Path(); q.addPath(p); q.convertConicsToQuads(); return q
def _op(ps, op):
    ps = [_cq(p) for p in ps]
    res = ps[0]
    for p in ps[1:]:
        res = pathops.op(res, p, op, fix_winding=True)
    return res
def U(*ps): return _op(list(ps), pathops.PathOp.UNION)
def D(a, *bs): return _op([a]+list(bs), pathops.PathOp.DIFFERENCE)
def I(a, b): return _op([a,b], pathops.PathOp.INTERSECTION)
def stroke(p, w, cap="round", join="round"):
    q = pathops.Path(); q.addPath(p)
    q.stroke(w, getattr(pathops.LineCap, cap.upper()+"_CAP"), getattr(pathops.LineJoin, join.upper()+"_JOIN"), 4)
    return U(q)
def grow(p, g):  # offset outward by g
    return U(p, stroke(p, 2*g))
def d(p, prec=2):
    sv = SVGPath.from_commands(sp.svg_commands(p))
    sv = sv.round_floats(prec) if hasattr(sv,'round_floats') else sv
    return sv.d
def bounds(p): return p.bounds

def clean(p, minarea=200):
    out = pathops.Path()
    for c in p.contours:
        if abs(c.area) >= minarea: out.addPath(c)
    return U(out)

def shrink(p, g): return D(p, stroke(p, 2*g))
def closing(p, r): return shrink(grow(p, r), r)
def opening(p, r): return grow(shrink(p, r), r)
