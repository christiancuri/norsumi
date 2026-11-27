import sys, math, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo import *
from cute import normalized
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

B = sys.argv[1]           # brand dir
FONTS = sys.argv[2]
SCR = sys.argv[3]         # scratch out
DY = 0.03
BLUE_A, BLUE_B = "#4F8CFF", "#2E6BFF"
INK = "#0A1030"

def mark_d(size, fit, dy=DY, prec=2):
    return d(normalized(size, fit, dy), prec)

def w(path, s):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w").write(s.strip() + "\n")

# ---------- superellipse (iOS-like squircle) ----------
def squircle(size=1024, n=5.0, N=128):
    c = size/2
    pts=[]
    for i in range(N):
        t = 2*math.pi*i/N
        ct, st = math.cos(t), math.sin(t)
        x = c + c*math.copysign(abs(ct)**(2/n), ct)
        y = c + c*math.copysign(abs(st)**(2/n), st)
        pts.append((x,y))
    # Catmull-Rom -> cubic
    out=[f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"]
    for i in range(N):
        p0,p1,p2,p3 = pts[i-1], pts[i], pts[(i+1)%N], pts[(i+2)%N]
        c1=(p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6)
        c2=(p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6)
        out.append(f"C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}")
    return "".join(out)+"Z"

# ---------- icon ----------
def icon_svg(rounded=False, size=1024, fit=0.60, bg_a=BLUE_A, bg_b=BLUE_B, shadow=True, uid="n"):
    md = mark_d(1024, fit)
    shape = f'<path d="{squircle()}"/>' if rounded else '<rect width="1024" height="1024"/>'
    clip = f'<clipPath id="{uid}c">{shape}</clipPath>'
    sh = f'''<filter id="{uid}s" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="16"/><feOffset dy="18"/><feComponentTransfer><feFuncA type="linear" slope="0.38"/></feComponentTransfer><feFlood flood-color="#06103F"/><feComposite operator="in" in2="SourceAlpha" result="x"/></filter>''' if False else ""
    # shadow done as blurred copy of mark (more portable than complex filter chains)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="{size}" height="{size}">
<defs>
<linearGradient id="{uid}bg" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{bg_a}"/><stop offset="1" stop-color="{bg_b}"/></linearGradient>
<radialGradient id="{uid}hl" cx="300" cy="110" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="{uid}vg" cx="860" cy="940" r="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1F4FE0" stop-opacity=".30"/><stop offset="1" stop-color="#1F4FE0" stop-opacity="0"/></radialGradient>
<linearGradient id="{uid}mk" x1="0" y1="250" x2="0" y2="800" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1F5FF"/></linearGradient>
<filter id="{uid}bl" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="22"/></filter>
{clip}
</defs>
<g clip-path="url(#{uid}c)">
<rect width="1024" height="1024" fill="url(#{uid}bg)"/>
<rect width="1024" height="1024" fill="url(#{uid}hl)"/>
<rect width="1024" height="1024" fill="url(#{uid}vg)"/>
{f'<path d="{md}" fill="#0E3BC2" opacity=".30" transform="translate(0 20)" filter="url(#{uid}bl)"/>' if shadow else ""}
<path d="{md}" fill="url(#{uid}mk)"/>
</g>
{f'<path d="{squircle()}" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="3"/>' if rounded else '<rect x="1.5" y="1.5" width="1021" height="1021" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="3"/>'}
</svg>'''

# ---------- text to path ----------
def text_path(text, font, px, x, y, tracking=0):
    blob = hb.Blob.from_file_path(font); face = hb.Face(blob); f = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(f, buf, {"kern": True, "liga": True})
    tt = TTFont(font); gs = tt.getGlyphSet(); upm = tt["head"].unitsPerEm; order = tt.getGlyphOrder()
    s = px/upm; pen = SVGPathPen(gs); cx = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        g = order[info.codepoint]
        tp = TransformPen(pen, (s, 0, 0, -s, x + (cx+pos.x_offset)*s, y - pos.y_offset*s))
        gs[g].draw(tp); cx += pos.x_advance + tracking
    return pen.getCommands(), cx*s - tracking*s

SERIF = os.path.join(FONTS, "InstrumentSerif-Regular.ttf")
GEIST = os.path.join(FONTS, "geist/geist-font/Geist/ttf/Geist-Regular.ttf")
GEISTM = os.path.join(FONTS, "geist/geist-font/Geist/ttf/Geist-Medium.ttf")

def nested_icon(x, y, s, uid):
    inner = icon_svg(rounded=True, uid=uid).split("\n",1)[1].rsplit("</svg>",1)[0]
    return f'<svg x="{x}" y="{y}" width="{s}" height="{s}" viewBox="0 0 1024 1024">{inner}</svg>'

def wordmark(variant):
    T = 160  # tile size
    xh = 0.50*T; px = xh/0.510
    base = T/2 + xh/2 + 2
    gap = 0.30*T
    tp, tw = text_path("norsumi", SERIF, px, T+gap, base, tracking=-8)
    W = T + gap + tw + 4
    if variant == "light": style = f'.t{{fill:{INK}}}'
    elif variant == "dark": style = '.t{fill:#F4F6FF}'
    else: style = f'.t{{fill:{INK}}}@media (prefers-color-scheme:dark){{.t{{fill:#F4F6FF}}}}'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {T}" width="{W:.0f}" height="{T}" role="img" aria-label="norsumi">
<title>norsumi</title><style>{style}</style>
{nested_icon(0,0,T,"w"+variant[0])}
<path class="t" d="{tp}"/>
</svg>'''

def og():
    Wd, Ht = 1200, 630
    T = 236
    tp, tw = text_path("norsumi", SERIF, 172, 0, 0, tracking=-10)
    tg, tgw = text_path("Every screenshot, remembered.", GEIST, 38, 0, 0, tracking=-6)
    gap = 56
    group = T + gap + max(tw, tgw)
    x0 = (Wd - group)/2; ty = Ht/2 - T/2 - 8
    tx = x0 + T + gap
    tp, _ = text_path("norsumi", SERIF, 172, tx - 4, Ht/2 + 26, tracking=-10)
    tg, _ = text_path("Every screenshot, remembered.", GEIST, 38, tx, Ht/2 + 92, tracking=-6)
    foot, fw = text_path("OPEN SOURCE  ·  AI SCREENSHOT MEMORY", GEISTM, 17, 0, 0, tracking=120)
    foot, _ = text_path("OPEN SOURCE  ·  AI SCREENSHOT MEMORY", GEISTM, 17, (Wd-fw)/2, Ht-52, tracking=120)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {Wd} {Ht}" width="{Wd}" height="{Ht}">
<defs>
<linearGradient id="ob" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10235F"/><stop offset="1" stop-color="#070C2A"/></linearGradient>
<radialGradient id="og1" cx="{x0+T/2}" cy="{Ht/2}" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4F8CFF" stop-opacity=".45"/><stop offset="1" stop-color="#4F8CFF" stop-opacity="0"/></radialGradient>
<radialGradient id="og2" cx="1150" cy="-60" r="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#6F8BFF" stop-opacity=".18"/><stop offset="1" stop-color="#6F8BFF" stop-opacity="0"/></radialGradient>
<filter id="osh" x="-40%" y="-40%" width="180%" height="190%"><feGaussianBlur stdDeviation="26"/></filter>
</defs>
<rect width="{Wd}" height="{Ht}" fill="url(#ob)"/>
<rect width="{Wd}" height="{Ht}" fill="url(#og1)"/>
<rect width="{Wd}" height="{Ht}" fill="url(#og2)"/>
<rect x="{x0+18}" y="{ty+40}" width="{T-36}" height="{T-30}" rx="60" fill="#000418" opacity=".7" filter="url(#osh)"/>
{nested_icon(x0, ty, T, "og")}
<path d="{tp}" fill="#F5F7FF"/>
<path d="{tg}" fill="#A8C6FF"/>
<path d="{foot}" fill="#6585D6"/>
</svg>'''

def favicon():
    md = mark_d(1024, 0.80)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<style>.a{{stop-color:{BLUE_A}}}.b{{stop-color:{BLUE_B}}}@media (prefers-color-scheme:dark){{.a{{stop-color:#5C97FF}}.b{{stop-color:#3B76FF}}}}</style>
<defs><linearGradient id="g" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse"><stop offset="0" class="a"/><stop offset="1" class="b"/></linearGradient></defs>
<rect width="1024" height="1024" rx="232" fill="url(#g)"/>
<path d="{md}" fill="#fff"/>
</svg>'''

def flat_icon(fit, rounded=False):
    """Simple icon (no filters) for small raster sizes."""
    md = mark_d(1024, fit)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs><linearGradient id="g" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{BLUE_A}"/><stop offset="1" stop-color="{BLUE_B}"/></linearGradient></defs>
{f'<rect width="1024" height="1024" rx="232" fill="url(#g)"/>' if rounded else '<rect width="1024" height="1024" fill="url(#g)"/>'}
<path d="{md}" fill="#fff"/>
</svg>'''

# ---------- android ----------
def vd(paths, extra_ns=False):
    ns = ' xmlns:aapt="http://schemas.android.com/aapt"' if extra_ns else ""
    return f'''<?xml version="1.0" encoding="utf-8"?>
<!-- norsumi brand: generated from brand/ sources. 108dp adaptive icon layer. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"{ns}
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
{paths}
</vector>'''

def android():
    A = os.path.join(B, "android")
    FIT = 46/108   # mark ~46dp wide: ~64% of the 72dp visible area, inside 66dp safe zone
    m = normalized(108, FIT, DY)
    # verify safe zone
    import itertools
    maxr = 0
    for c in m.contours:
        for pt in c.points: maxr = max(maxr, math.hypot(pt[0]-54, pt[1]-54))
    print("android foreground max radius from center (dp):", round(maxr,2), "(safe zone r=33)")
    assert maxr < 33
    pd = d(m, 3)
    fg = f'''    <path android:pathData="{pd}">
        <aapt:attr name="android:fillColor">
            <gradient android:type="linear"
                android:startX="54" android:startY="34" android:endX="54" android:endY="76"
                android:startColor="#FFFFFFFF" android:endColor="#FFF1F5FF" />
        </aapt:attr>
    </path>'''
    w(f"{A}/drawable/ic_launcher_foreground.xml", vd(fg, True))
    bg = '''    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient android:type="linear"
                android:startX="18" android:startY="18" android:endX="90" android:endY="90"
                android:startColor="#FF4F8CFF" android:endColor="#FF2E6BFF" />
        </aapt:attr>
    </path>
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient android:type="radial"
                android:centerX="36" android:centerY="22" android:gradientRadius="62"
                android:startColor="#29FFFFFF" android:centerColor="#08FFFFFF" android:endColor="#00FFFFFF" />
        </aapt:attr>
    </path>'''
    w(f"{A}/drawable/ic_launcher_background.xml", vd(bg, True))
    mono = f'    <path android:fillColor="#FFFFFFFF" android:pathData="{pd}" />'
    w(f"{A}/drawable/ic_launcher_monochrome.xml", vd(mono))
    w(f"{A}/values/ic_launcher_background.xml", '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Solid fallback / splash color (mid-point of the #4F8CFF -> #2E6BFF gradient). -->
    <color name="ic_launcher_background">#3F7CFF</color>
</resources>''')
    ai = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>'''
    w(f"{A}/mipmap-anydpi-v26/ic_launcher.xml", ai)
    w(f"{A}/mipmap-anydpi-v26/ic_launcher_round.xml", ai)
    # svg twins for previews
    w(f"{SCR}/android_fg.svg", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><path d="{pd}" fill="#fff"/></svg>')

if __name__ == "__main__":
    w(f"{B}/mark.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" role="img" aria-label="norsumi">
<path d="{mark_d(512, 0.94)}"/>
</svg>''')
    w(f"{B}/icon.svg", icon_svg(False))
    w(f"{B}/icon-rounded.svg", icon_svg(True))
    w(f"{B}/wordmark.svg", wordmark("auto"))
    w(f"{B}/wordmark-light.svg", wordmark("light"))
    w(f"{B}/wordmark-dark.svg", wordmark("dark"))
    w(f"{B}/web/favicon.svg", favicon())
    w(f"{SCR}/og.svg", og())
    w(f"{SCR}/flat_full.svg", flat_icon(0.60))
    w(f"{SCR}/fav_light.svg", favicon().replace("@media (prefers-color-scheme:dark)", "@media (max-width:0px)"))
    w(f"{SCR}/maskable.svg", icon_svg(False, fit=0.50, uid="mk"))
    android()
    print("ok")
