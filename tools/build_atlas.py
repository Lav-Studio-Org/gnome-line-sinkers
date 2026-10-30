# Builds img/atlas.png (+ js/atlas.js) from the asset packs and hand-made sprites.
# Run: python3 tools/build_atlas.py <path to Assets folder>
# Assets/ (not in git, the licences forbid redistributing the raw packs):
#   pixel-gnome/             Pixel Gnome Fishing Pack sample, one PNG per fish (no outline versions)
#   moranovo-fishing-icons/  80+ Fishing Icons: Fishing Icons.png (16 px grid) + Licence.txt
#   free-fish/               free fish.png (3 x 3 grid of 16 px fish)
import sys, json, os
from PIL import Image
import numpy as np
from rotsprite import rotsprite
SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(__file__), '..')
PG = os.path.join(SRC, 'pixel-gnome')
sprites = {}
def pack(name, file): sprites[name] = Image.open(file).convert('RGBA')
for n in ['Anchovy', 'Clownfish', 'Crab - Dungeness', 'Pufferfish', 'Surgeonfish',
          'Angelfish', 'Bass', 'Catfish', 'Goldfish', 'Rainbow Trout', 'Rusty Can', 'Worm']:
    key = n.lower().replace(' - dungeness', '').replace(' ', '_')
    pack(key, os.path.join(PG, n + '.png'))
free = Image.open(os.path.join(SRC, 'free-fish', 'free fish.png')).convert('RGBA')
free_names = ['rainbowfish', 'whitefish', 'kelp', 'sardine', 'scallop', 'redcrab', 'koi', 'striped', 'silverfish']
for i, n in enumerate(free_names):
    c = free.crop(((i % 3) * 16, (i // 3) * 16, (i % 3) * 16 + 16, (i // 3) * 16 + 16))
    if n in ('rainbowfish', 'whitefish', 'sardine', 'koi', 'striped', 'silverfish'):
        c = rotsprite(c, -135)
    elif n == 'redcrab':
        c = rotsprite(c, -45)
    else:
        c = c.crop(c.getbbox())
    sprites[n] = c

# 80+ Fishing Icons (Moranovo): a 10 x 9 grid of 16 px icons. Most fish are drawn diagonally
# (head up-left), so they are RotSprite-rotated to face right; side-on ones facing left are flipped.
MO = Image.open(os.path.join(SRC, 'moranovo-fishing-icons', 'Fishing Icons.png')).convert('RGBA')
MO_ICONS = {
  # name: (index in the grid, 'rot' | 'flip' | 'keep')
  'mo_stickleback': (10, 'rot'), 'mo_sunfish': (11, 'rot'), 'mo_prawn': (12, 'keep'), 'mo_minnow': (13, 'rot'),
  'mo_snapper': (14, 'rot'), 'mo_snail': (19, 'keep'), 'mo_tilapia': (8, 'rot'),
  'mo_croaker': (20, 'rot'), 'mo_tuna': (21, 'rot'), 'mo_saury': (22, 'rot'), 'mo_cod': (23, 'rot'), 'mo_salmon': (24, 'rot'),
  'mo_grouper': (25, 'rot'), 'mo_mackerel': (26, 'rot'), 'mo_turbot': (27, 'flip'), 'mo_pomfret': (28, 'flip'), 'mo_gpomfret': (29, 'flip'),
  'mo_tetra': (30, 'rot'), 'mo_guppy': (31, 'rot'), 'mo_ytang': (35, 'flip'), 'mo_flying': (36, 'rot'), 'mo_hairtail': (37, 'flip'),
  'mo_seahorse': (39, 'keep'), 'mo_cucumber': (41, 'keep'), 'mo_bcucumber': (42, 'keep'), 'mo_octopus': (43, 'keep'), 'mo_batfish': (44, 'flip'),
  'mo_stingray': (47, 'keep'), 'mo_ray': (48, 'keep'), 'mo_manta': (49, 'keep'), 'mo_abalone': (57, 'keep'), 'mo_turtle': (58, 'keep'),
  'mo_coral': (59, 'keep'), 'mo_lobster': (62, 'keep'), 'mo_hermit': (63, 'keep'), 'mo_vstar': (64, 'keep'), 'mo_rstar': (65, 'keep'),
  'mo_blob': (70, 'flip'), 'mo_angler': (71, 'flip'), 'mo_eeel': (72, 'keep'), 'mo_snake': (73, 'keep'), 'mo_oranda': (75, 'flip'),
  'mo_bottle': (77, 'keep'),
}
for n, (i, mode) in MO_ICONS.items():
    c = MO.crop(((i % 10) * 16, (i // 10) * 16, (i % 10) * 16 + 16, (i // 10) * 16 + 16))
    # the diagonal icons face up-left, so turning them leaves the belly up: flip back upright
    if mode == 'rot': c = rotsprite(c, -135).transpose(Image.FLIP_TOP_BOTTOM)
    elif mode == 'flip': c = c.transpose(Image.FLIP_LEFT_RIGHT)
    sprites[n] = c.crop(c.getbbox())

# Hand-made sprites (facing right). '.' = transparent.
HAND = {
 'jellyfish': ({'k':'#2b1b3d','p':'#e88ad6','P':'#ffc2f0','d':'#b45aa8','t':'#c97fe0','e':'#1a1424'}, [
  "................","....kkkkkkkk....","..kkPPPpppppkk..",".kPPpppppppppdk.","kPpppppppppppddk",
  "kpppeppppeppdddk","kddpdpdpdpdpdddk",".kkkkkkkkkkkkkk.","..t.t..tt..t.t..","..t..t.tt.t..t..",
  "...t.t.t..t.t...","...t..t.t.t..t..","..t...t..t...t..","..t....t.t....t.","........t......."]),
 'shrimp': ({'k':'#3a1410','o':'#ff8a5c','O':'#ffc09a','r':'#d9533a','e':'#120a08'}, [
  "...........k...k","....kkkkkkk.k.k.","..kkOOOOOOOkkk..",".kOooooooooooeok","kOoorooroorooook",
  "kooroorooroooork",".krrkrrkrrkrrkk.",".kOok.k..k..k...","kOOok...........",".kkk............"]),
 'lanternfish': ({'k':'#0c1430','b':'#2d4a8a','B':'#4a72c4','d':'#1d2f60','g':'#8ff7ff','e':'#000000','w':'#ffffff'}, [
  "......kkkkk.....","....kkBBBBBkk...","k..kBBbbbbbbbk..","kk.kbbbbbbbwwek.","kbkbbbbbbbbweek.",
  "kbbbbgbgbgbbbbk.","kbkdddddddddddk.","kk.kdgdgdgddkk..","k...kkkkkkkk...."]),
 'squid': ({'k':'#3b0f24','p':'#e05a7a','P':'#ff9ab0','d':'#a8344f','e':'#000000','w':'#ffffff'}, [
  "........kkkk....",".......kPPPPkk..","p.p.kkkPppppPPk.",".kpkwekppppppppk","kpppppppppppppdk",
  ".kdkdkkdddddddk.","d.p.k..kkkkkkk.."]),
 'eel': ({'k':'#14200f','g':'#5f7d3a','G':'#8fae5a','d':'#3e5426','e':'#000000','y':'#e8d36a'}, [
  "..........kkkkkkkkkk....",".....kkkkkGGGGGGGGGGkk..","kk.kkGGGggggggggggggyekk",".kkgggggggggggggggggggdk",
  "..kddddddddddddddddddkk.","...kkkkkkkkkkkkkkkkkk..."]),
 'angler': ({'k':'#0a0a14','b':'#3a3550','B':'#5a5478','d':'#24203a','w':'#f2f2e6','g':'#ffe58a','e':'#ff5a5a'}, [
  "...........kkk....","...........kgk....","............k.....","......kkkkkk.k....","....kkBBBBBBkkk...",
  "k..kBBbbbbbbbbbk..","kk.kbbbbbbbbbekkk.","kbkbbbbbbbbbbbkwk.","kbbbbbbbbbbbbbkkkk","kbkdddddddddddkwk.",
  "kk.kddddddddddkkk.","k...kkdddddddk....",".......kkkkkkk...."]),
 'coelacanth': ({'k':'#101a24','b':'#4a6a8a','B':'#6f93b5','d':'#2f4860','s':'#d8e6f0','e':'#000000','w':'#ffffff'}, [
  "..........kkkkk.........","........kkBBBBBkkkkk....","kk...kkkBBBbbbbBBBBBkk..","kbk.kbbbbbbsbbbbbbbbbbk.",
  "kbbkbbsbbbbbbbbsbbbbwek.","kbbbbbbbbsbbbbbbbbbbbbbk","kbbkdddddddddsdddddddddk.".replace('k.','k')[:24],"kbk.kddsddddddddddddkk..",
  "kk...kkkdkkkkkddkkkk....",".......kdk...kddk.......","........k.....kk........"]),
 'gnome': ({'k':'#1b1420','r':'#d8452f','R':'#ff6a4d','s':'#f2b48a','e':'#1b1420','n':'#e07a6a','w':'#f4efe6','b':'#3f6fb5'}, [
  "....kk....","...kRrk...","...kRrk...","..kRrrrk..","..kRrrrrk.",".kkkkkkkkk",
  ".kssessk..",".ksssnsk..",".kwwwwwk..","kbkwwwkbk.","kbbkwkbbk.","kbbbbbbbk.",".kkkkkkk.."]),
 'hook': ({'s':'#dfe7ee','k':'#5a6670'}, [
  "..k..","..s..","..s..","..s..","k.s..","s.s..",".ss.."]),
}
def hexc(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
for name, (pal, rows) in HAND.items():
    w = max(len(r) for r in rows)
    for r in rows: assert len(r) == w, (name, r, len(r), w)
    im = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.': im.putpixel((x, y), hexc(pal[ch]))
    sprites[name] = im

# simple shelf packing
items = sorted(sprites.items(), key=lambda kv: -kv[1].height)
W = 256; x = y = rowh = 0; rects = {}
for n, im in items:
    if x + im.width > W: x = 0; y += rowh + 1; rowh = 0
    rects[n] = [x, y, im.width, im.height]; x += im.width + 1; rowh = max(rowh, im.height)
H = y + rowh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for n, im in sprites.items():
    r = rects[n]; atlas.paste(im, (r[0], r[1]))
# exact palette (the sheet has well under 256 colours) keeps it lossless and much smaller
cols = atlas.getcolors(4096)
if cols and len(cols) <= 256:
    pal = Image.new('P', (1, 1))
    flat = []
    for _, c in cols: flat += list(c[:3])
    out = Image.new('P', atlas.size)
    idx = {c: i for i, (_, c) in enumerate(cols)}
    out.putdata([idx[p] for p in atlas.getdata()])
    out.putpalette(flat + [0] * (768 - len(flat)))
    out.info['transparency'] = bytes(c[3] for _, c in cols)
    out.save(os.path.join(ROOT, 'img', 'atlas.png'), optimize=True, transparency=bytes(c[3] for _, c in cols))
else:
    atlas.save(os.path.join(ROOT, 'img', 'atlas.png'), optimize=True)
import base64
png64 = base64.b64encode(open(os.path.join(ROOT, 'img', 'atlas.png'), 'rb').read()).decode()
with open(os.path.join(ROOT, 'js', 'atlas.js'), 'w') as f:
    f.write('// Generated by tools/build_atlas.py. Sprite rects in the atlas: [x, y, w, h].\n')
    f.write('// The PNG is embedded so the game also runs from file:// without a tainted canvas.\n')
    f.write('(function (root) { const A = ' + json.dumps(rects, separators=(',', ':')) + ';\n')
    f.write("  if (typeof module !== 'undefined') module.exports = A;\n")
    f.write("  else { root.KL = root.KL || {}; root.KL.ATLAS = A; root.KL.ATLAS_PNG = 'data:image/png;base64," + png64 + "'; }\n})(this);\n")
print('atlas', W, H, len(rects))
