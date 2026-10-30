# Gnome, Line & Sinker design notes

One-line pitch: drop a hook, dodge fish on the way down, sweep up everything you can on the
way back, and grow a skill tree until the sea stops making sense.

## 1. Research: what makes fishing / incremental games stick

| Game | What it teaches us | Used here as |
|---|---|---|
| **Ridiculous Fishing** (2013) | Two-phase cast: avoid fish going down, catch going up. "Even your worst cast makes some money." | The core loop. A fish you bump into bites (first catch), so no cast is ever empty. |
| **Nodebuster** (2025) | 15-30 s runs, then spend in a big tree that reveals itself one ring at a time. Players finished in 3-4 h. Critique: upgrades with no visible effect, a dull last hour. | Short casts (5-30 s), tree with "?" mystery nodes next to what you own, every node changes something you can see (line length on the ruler, more fish on the hook, glowing fish, a cat on the boat). Endless deep zone so the last hour is not dead. |
| **Cast n Chill** (2025, 9/10 Shacknews) | Calm comes from simple controls, music, a pet, and an optional idle mode that fishes for you. Friction: fish that are hard to tell apart. | Lo-fi soundtrack, ship cat skill, the **Auto Angler** skill (the same bot the balance sim uses), big readable sprites with outlines. |
| **Fisch** (Roblox) | Mutations as value multipliers (x1.3 to x6.5), a bestiary, rare variants people chase. | 4 mutations (Big x2, Golden x5, Prismatic x15, Titan x40), visible in the water so you steer toward them. Fishdex with mutation squares per species. |
| **Idle game math** (Pecorella, Part I and III) | Costs grow geometrically, newest tier dominates; prestige formulas decide how fast resets snowball (Egg Inc. is deliberately slow). | Tiered costs fitted by simulation. Season (prestige) pearls grow with the log of coins earned, so they never run away. |
| **Scale the Depths** (Steam) | The line is a body you steer: the weight chases the cursor with a little lag and the line snakes behind it. | The hook chases your finger or cursor in 2D; the line is a chain of points along the path you took that slowly relaxes straight. |
| Genre critique (GameDev.net, 2025) | The genre is full of look-alike "node busters"; you need your own identity from minute one. | Cozy pixel sea with a gnome, weird abyss fish ("Three-Eyed Goldfish"), music that muffles as you sink. |

## 2. Loops

- **Cast (5-30 s, active):** tap the sea where you want to throw. Underwater the weight chases
  your finger (it can stop or even rise a little), so you thread it between fish, urchins and
  mines on the way down, then sweep fish on the way up until the hook is full. The fish you see
  while docked are exactly the fish of your next cast. Each catch plays the next note of a rising
  pentatonic scale, so a big haul sounds like a melody.
- **Haul (3 s):** fish fly into the crate, a list shows what you got, collect.
- **Skill tree (minutes):** 41 coin skills in six branches + 6 pearl skills. Nodes next to what
  you own are shown as "?", so there is always something just out of sight.
- **Collection (days):** 79 species x 5 variants. Every new variant is +1% value forever;
  catching 10 / 50 / 250 / 1000 of a kind adds +25% each for that kind.
- **Fish pen (idle):** your collection earns coins per second, also while away (3 h, up to 13 h).
- **Season (prestige, hours):** after reaching the Trench (480 m), reset coin skills for pearls.
  Pearls are a flat +10% value each and buy pearl skills. Each season is faster than the last.

## 3. Skill tree branches

| Branch | Direction | Role |
|---|---|---|
| Line (Tali) | right | depth: line length, sink speed, free fall |
| Hook (Kail) | up right | fish per cast, reach, "A Song for Fish" (fish swim to you), twin catch |
| Market (Pasar) | up left | value: +%, x1.5, x2, full crate, bulk, recycling junk |
| Fish pen (Keramba) | left | idle income, offline hours, ship cat |
| Luck | down left | mutation chance, rare fish, golden scales, sonar, full moon nights |
| Control | down right | reel speed, hook guard, steering, Focus slow motion, Auto Angler |

Every node has a tier (which zone it belongs to). Its cost is `TIER[t] * c * g^level`; `TIER`
is fitted by `node scripts/balance.js --tune --write` so the first season hits these targets
for a bot playing at "average player" skill (0.6):

| Milestone | Target |
|---|---|
| First skill | under 1 min |
| Reef (30 m) | ~1 min |
| Open Blue (90 m) | ~10 min |
| Twilight (220 m) | ~18 min |
| Trench (480 m), first season possible | ~40 min |
| Weird Deep (1050 m) | ~85 min |

## 4. Free-to-play rules

- No ads. Removed on request; the economy never depended on them (the balance bot never
  watched one), and the offline cap went from 2 h to 3 h to keep the welcome back generous.
- Nothing is sold that a player cannot earn by playing.
- Offline income is capped (3 h, up to 13 h with skills) so returning players get a treat,
  not a replacement for playing.

## 5. Look and feel

- Pixel art at an integer scale (4 art pixels per metre), flat colour steps instead of
  gradients, 2 px ink outlines and hard drop shadows on every panel, one pixel typeface
  (Pixelify Sans), text aligned left, panels slide in from the sides (no centred modals).
- Colour meaning: orange = main action, gold = coins, lavender = pearls, green = good news.
- Landscape layout for thumbs: tap the sea to cast (a dashed "tap the sea" chip bottom right
  also casts), skills bottom left, wallet top left,
  depth ruler on the left edge during a cast, catch counter top right.
- Depth is felt, not only read: water colour steps per zone, light rays fade, darkness closes
  in with a lantern circle around the hook, glowing fish cut holes in the dark, the music
  low-passes and switches to darker chords below 200 m.

## 6. Obstacles

Placed from their own random stream (so tuning them never changes which fish a cast has),
one every 7-15 m, denser deeper. The mix shifts by zone:

| Obstacle | From | Going down | Going up |
|---|---|---|---|
| Rock | Estuary | solid, you slide around it | solid |
| Sea urchin (on a rock) | Reef | turns the line up, no catch | harmless |
| Mine | 110 m | boom: turns the line up and scares fish away | knocks your last fish off |
| Ghost net | 18 m | everything at 35% speed inside | same |
| Current | Estuary | pushes sideways | same |
| Bubble vent | Twilight | pushes up (slows your dive) | lifts you faster |

Hook Guard absorbs urchins and mines too. Mines, urchins and vents glow faintly so they are
readable in the dark zones. The Auto Angler and the balance bot see them.

## 7. Menu and saves

Start menu on a side panel over the live dock scene: Continue / Start, New game (asks first),
Save to file, Load from file, Credits. Save files are JSON
(`{ game: 'gnome-line-sinker', v: 1, at, save }`); loading validates the shape and asks before
replacing progress.

## 8. Name

**Gnome, Line & Sinker**: the gnome is the angler, "hook, line and sinker" is the fishing idiom
for being completely caught (what an incremental wants to do to you), and the sinker is the
weight you steer. Tagline: "A fishing incremental".

## 9. Achievements and activity

57 achievements in five rarity tiers, read straight from the save (`E.achValue`), so old saves
unlock what they already earned the first time they load:

| Tier | Count | Shells | Meant for |
|---|---|---|---|
| Umum / Common | 10 | 3 | the first ten minutes (first fish, first mine, first purchase) |
| Langka / Uncommon | 13 | 6 | the first evening (Twilight, 1,000 fish, first golden fish) |
| Epik / Rare | 14 | 12 | committed players (the Trench, a new season, 10 hours) |
| Legendaris / Epic | 11 | 25 | weeks of play (Weird Deep, a titan, every species) |
| Mitos / Mythic | 9 | 50 | almost nobody (a million fish, 5 km, every variant incl. titans) |

The activity record (`save.rec`) never resets with a season: fish, junk, mutations by kind,
biggest haul, most fish in one cast, full crates, mines, stings, fish lost, full moons, metres of
line dropped, time fishing, days played, first day, and the most valuable fish ever caught. The
Trophies screen shows it as tiles, with the best fish and the most caught fish as big cards.

## 10. Shop: gnome outfits and boats

Research notes: cosmetic collections keep idle games alive between upgrades when they are tied
to milestones rather than to the main currency (Cats & Soup outfits, Tap Titans skins); fishing
games make the boat the player's identity and give each one a role (Dredge hull upgrades,
Fishing Clash boats). Rules we took from that:

- **Own currency, shells.** Coins inflate by many orders of magnitude and reset each season, so
  a coin price would be meaningless a week later. Shells only come from achievements, new
  species (1), mastering a fish (2 at 250, 5 at 1000 caught) and each new season (5). They are
  finite and tied to playing well, so every item marks a real milestone.
- **One outfit plus one boat, perks while worn.** Choosing is the game: the Lighthouse Keeper is
  best for idle players, the Lucky Gnome for mutation hunters, the Abyss Gnome only pays in the
  Trench. Every perk is an existing skill effect (or value / deep value / full moon), small
  enough to be a nudge (+10 to 35%) and never a new mechanic.
- **Gates.** Each item needs a zone reached; the Golden Gnome needs the Living Encyclopedia
  achievement and the Ghost Ship needs Two Kilometres. Locked items show the requirement.
- **Kept forever.** Outfits and boats survive new seasons, which also makes a fresh season
  start faster.
- **Indonesian boats.** Sampan, jukung (outrigger), perahu ketek (long-tail), pinisi, then a
  research vessel, a trawler, a mini sub and a ghost ship. Each is drawn in code
  (`paintBoat` in `js/render.js`); outfits recolour the gnome sprite (`dressGnome`).

All 15 items cost 1,615 shells; a player who earns everything else can buy all of them (checked
in `scripts/test-engine.js`), and the Full Fleet achievement is the last step.

## 11. Share card

A 1080 x 1350 image (4:5, fits the Instagram feed, Stories with a border, and WhatsApp): the
gnome on the boat and outfit you wear, a flat band per zone you reached with the line down to
your best fish, the fish count as the headline, six tiles (deepest, species, time played,
achievements, lifetime coins, season), the rarest achievement as a ribbon, and a Lav Studio
footer. Buttons: Share (system share sheet with the image where supported), Save image, and
WhatsApp (text). Instagram has no web share link, so the hint says to save the image and post
it, or to use the share sheet on phones.
