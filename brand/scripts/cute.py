import sys, math, json, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo import *

P = dict(hx=256, hy=246, hr=124, hrx=None, hry=None,
         ear="rrect", er=104, edx=156, ey=214, eW=206, eH=236, erad=90, etilt=-14, gap=18,
         trunk="M256 318 L256 398 A44 44 0 0 0 344 398 L344 386", root="M256 300 L256 398",
         tw=50, side=1, fr=30,
         eyx=58, eyy=258, eyr=13, hl=0)

# Official mark = v3 (J-hook `trunk` stroke above). Brainstorm alternative v4
# (straight, tapered, soft tip) is kept in brand/brainstorm/; render it with
# NORSUMI_TRUNK=straight scripts/render_all.sh (into a scratch copy, not brand/).
if os.environ.get("NORSUMI_TRUNK") == "straight":
    P["tshape"] = dict(segs=[[[256,300],[256,360],[256,410],[256,446]]], r0=48, r1=36)

def head(p):
    if p["hrx"]: return ellipse(p["hx"],p["hy"],p["hrx"],p["hry"])
    return circle(p["hx"],p["hy"],p["hr"])

def ears(p):
    es=[]
    for s in (-1,1):
        cx = p["hx"]+s*p["edx"]
        if p["ear"]=="circle": e = circle(cx, p["ey"], p["er"])
        elif p["ear"]=="ellipse": e = rot(ellipse(cx, p["ey"], p["eW"]/2, p["eH"]/2), s*p["etilt"], cx, p["ey"])
        else: e = rot(rrect(cx-p["eW"]/2, p["ey"]-p["eH"]/2, p["eW"], p["eH"], p["erad"]), s*p["etilt"], cx, p["ey"])
        es.append(e)
    return U(*es)

def _bez(seg, t):
    (x0,y0),(x1,y1),(x2,y2),(x3,y3) = seg; u = 1-t
    return (u**3*x0+3*u*u*t*x1+3*u*t*t*x2+t**3*x3, u**3*y0+3*u*u*t*y1+3*u*t*t*y2+t**3*y3)

def _smooth(pts):
    """closed Catmull-Rom spline through pts -> pathops Path"""
    N = len(pts); out = [f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"]
    for i in range(N):
        p0,p1,p2,p3 = pts[i-1], pts[i], pts[(i+1)%N], pts[(i+2)%N]
        c1=(p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6); c2=(p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6)
        out.append(f"C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}")
    return U(path("".join(out)+"Z"))

def taper(segs, r0, r1, n=24, ease=1.0):
    """Solid tapered trunk along cubic segments: radius r0 -> r1, round tip."""
    c = []
    for si, seg in enumerate(segs):
        for k in range(n + (1 if si == len(segs)-1 else 0)):
            c.append(_bez(seg, k/n))
    L = len(c); left = []; right = []
    for i,(x,y) in enumerate(c):
        a = c[max(i-1,0)]; b = c[min(i+1,L-1)]
        tx, ty = b[0]-a[0], b[1]-a[1]; m = math.hypot(tx,ty) or 1; tx, ty = tx/m, ty/m
        r = r0 + (r1-r0)*((i/(L-1))**ease)
        left.append((x - ty*r, y + tx*r)); right.append((x + ty*r, y - tx*r))
    ex, ey = c[-1]; a = c[-2]; ang = math.atan2(ey-a[1], ex-a[0])
    tip = [(ex + r1*math.cos(ang + math.pi/2 - math.pi*k/8), ey + r1*math.sin(ang + math.pi/2 - math.pi*k/8)) for k in range(1,8)]
    return _smooth(left + tip + right[::-1])

def build(p):
    h = head(p)
    if p.get("tshape"):
        ts = p["tshape"]
        t = taper(ts["segs"], ts["r0"], ts["r1"], ease=ts.get("ease", 1.0))
        root = t
    else:
        t = stroke(path(p["trunk"]), p["tw"])
        root = stroke(path(p["root"]), p["tw"]) if p.get("root") else t
    if p["side"] < 0: t = mirror_x(t, p["hx"]); root = mirror_x(root, p["hx"])
    f = U(closing(U(h, root), p["fr"]), t)
    if p.get("tshape") and p["tshape"].get("grooves"):
        g = U(*[stroke(path(gd), p["tshape"].get("gw", 12)) for gd in p["tshape"]["grooves"]])
        f = D(f, g)
    e = opening(D(ears(p), grow(f, p["gap"])), 10)
    m = U(f, e)
    for s in (-1,1):
        ex = p["hx"]+s*p["eyx"]
        if p.get("eyo"): m = D(m, ellipse(ex, p["eyy"], p["eyr"]*0.86, p["eyr"]*1.12))
        else: m = D(m, circle(ex, p["eyy"], p["eyr"]))
        if p["hl"]: m = U(m, circle(ex+p["eyr"]*0.32, p["eyy"]-p["eyr"]*0.36, p["hl"]))
    return m

def raw_mark(**kw):
    p = dict(P); p.update(kw); return build(p)

def normalized(size=512, fit=0.94, dy=0, **kw):
    p = dict(P); p.update(kw)
    m = build(p)
    x0,y0,x1,y1 = m.bounds
    s = size*fit/max(x1-x0,y1-y0)
    def T(q):
        q = move(q, -(x0+x1)/2, -(y0+y1)/2); q = scale(q, s)
        return move(q, size/2, size/2 + dy*size)
    return T(m)

A, Bc = "#4F8CFF", "#2E6BFF"
def icon(md):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs><linearGradient id="g" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{A}"/><stop offset="1" stop-color="{Bc}"/></linearGradient></defs>
<rect width="1024" height="1024" rx="230" fill="url(#g)"/><path d="{md}" fill="#fff"/></svg>'''

if __name__=="__main__":
    V = json.loads(sys.argv[1])
    for n,kw in V.items():
        md = d(normalized(1024, 0.62, 0.0, **kw))
        open(f"concept_{n}.svg","w").write(icon(md))
