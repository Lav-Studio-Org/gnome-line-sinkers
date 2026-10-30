#!/usr/bin/env python3
# Usage: python3 tools/fix_digits.py style.css   (run again after re-subsetting the fonts)
# Redraw the digits that read badly in Pixelify Sans (2 looks like an S, 5 is an S, 7 has a hook)
# on the font's own 5x7 pixel grid, for both embedded weights, and write the woff2 back.
import sys, re, base64, io
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

GLYPHS = {
  'two':   ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  'five':  ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  'seven': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
}
GRID = {  # x edges, y edges (bottom to top): outer strokes a little heavier, like the font
  '400': ([60, 161, 248, 336, 423, 525], [-12, 88, 176, 265, 353, 442, 530, 631]),
  '600': ([61, 179, 258, 338, 417, 536], [-11, 113, 193, 272, 352, 431, 511, 636]),
}

def loops(rows):
  cells = {(c, 6 - r) for r, line in enumerate(rows) for c, ch in enumerate(line) if ch == '#'}
  edges = {}
  for (c, r) in cells:  # clockwise in y-up
    for a, b in (((c, r), (c, r + 1)), ((c, r + 1), (c + 1, r + 1)), ((c + 1, r + 1), (c + 1, r)), ((c + 1, r), (c, r))):
      if (b, a) in edges: del edges[(b, a)]
      else: edges[(a, b)] = 1
  out = {}
  for a, b in edges: out.setdefault(a, []).append(b)
  res = []
  while out:
    start = next(iter(out)); pts = [start]; cur = start; prev = None
    while True:
      nxt = out[cur]
      if len(nxt) > 1 and prev:  # touching corners: take the sharpest right turn to keep loops apart
        d = (cur[0] - prev[0], cur[1] - prev[1]); right = (d[1], -d[0])
        nxt.sort(key=lambda p: 0 if (p[0] - cur[0], p[1] - cur[1]) == right else 1)
      b = nxt.pop(0)
      if not nxt: del out[cur]
      prev, cur = cur, b
      if cur == start: break
      pts.append(cur)
    # drop collinear points
    clean = [p for i, p in enumerate(pts) if not ((pts[i - 1][0] == p[0] == pts[(i + 1) % len(pts)][0]) or (pts[i - 1][1] == p[1] == pts[(i + 1) % len(pts)][1]))]
    res.append(clean)
  return res

def patch(data, weight):
  f = TTFont(io.BytesIO(data))
  xs, ys = GRID[weight]
  gs = f.getGlyphSet()
  for name, rows in GLYPHS.items():
    pen = TTGlyphPen(gs)
    for lp in loops(rows):
      pen.moveTo((xs[lp[0][0]], ys[lp[0][1]]))
      for p in lp[1:]: pen.lineTo((xs[p[0]], ys[p[1]]))
      pen.closePath()
    g = pen.glyph(); g.recalcBounds(f['glyf'])
    f['glyf'][name] = g
    f['hmtx'][name] = (f['hmtx'][name][0], g.xMin)
  f.flavor = 'woff2'
  b = io.BytesIO(); f.save(b); return b.getvalue()

css_path = sys.argv[1]
css = open(css_path).read()
def rep(m):
  return 'base64,' + base64.b64encode(patch(base64.b64decode(m.group(1)), m.group(2))).decode() + ") format('woff2'); font-weight: " + m.group(2)
css = re.sub(r"base64,([A-Za-z0-9+/=]+)\) format\('woff2'\); font-weight: (\d+)", rep, css)
open(css_path, 'w').write(css)
print('patched')
