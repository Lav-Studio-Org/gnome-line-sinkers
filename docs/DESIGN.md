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
| Rock | Estuary | solid, you slide around it (the detour costs line) | solid |
| Sea urchin (on a rock) | Reef | turns the line up, no catch | harmless |
| Mine | 110 m | boom: turns the line up and scares fish away | knocks your last fish off |
| Ghost net | 18 m | everything at 35% speed inside | same |
| Current | Estuary | pushes sideways, and that drift pays out line | pushes sideways |
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

## 12. Portrait and landscape

Settings > Screen: Auto (follows how the phone is held), Landscape or Portrait. A pinned choice
asks the browser to lock the orientation (works in the installed app and fullscreen); when it
cannot, a full-screen note asks to turn the phone, with a "Follow the phone" way out. The
layout itself always follows the real window shape (`body.port`), so nothing ever renders
sideways.

Portrait rules (`/* portrait */` block at the end of `style.css`):

- **Thumb zone.** Menu, Trophies, Shop, Fishdex and Settings move to a five-button bottom bar;
  Skill, Auto and the cast chip sit right above it. The top keeps only the wallet.
- **Same sea, same balance.** The sea stays 100 m wide (the balance sim plays 100 m). A
  portrait screen shows about 65 m at the same pixel size as landscape, and the camera pans
  sideways after the hook (`R.camX`, `R.ox`). A narrower sea was measured in the sim at up to
  18% less income, so it was not an option.
- **More depth.** The water line sits at 30% of the screen instead of 42%, so the extra height
  is spent on seeing fish coming.
- **Bottom sheets.** Haul, Settings and dialogs slide up from the bottom; the skill panel docks
  under the tree; the start menu is a bottom card under the live scene.
- **Tab strip.** The dark side rail of the Fishdex, Trophies and Shop becomes a scrolling tab
  strip on top; cards are one column on phones and two or more on tablets.

## 13. Line is a length, not a depth

The line upgrade used to be a depth limit. Now it is the length on the spool: every metre the
hook travels on the way down pays out line, sideways included. When the spool is empty the hook
turns, wherever it is. Reeling up costs nothing.

Why: steering on the way down was free, so the best play was to swerve at everything. Now each
swerve is a small trade (dodge this fish, or keep the depth), which is the decision a fishing
game should be about. It also turns the existing obstacles into level design without adding new
ones: a current's drift and a detour around a rock now cost line, so a straight gap through a
field of rocks is worth looking for, and the deeper zones (more mines, more currents) ask for
cleaner lines.

- **Readable cost.** A rope pill next to the catch counter shows the line left while going down
  and turns red at 20%. The orange marker on the depth gauge moves up as you spend line: it is
  the deepest point still in reach going straight down.
- **Fair numbers.** Dragging the line sideways through the water costs 1.8 m of line per metre
  (1:1 was too cheap, swerving barely showed on the meter; 3:1 emptied the spool too fast when
  moving quickly). Smooth Steering (and the Diver outfit, Longtail boat) cut that by 10% per 20%
  steering, down to 0.9 m. Wiggling the stick hard left and right ends a 150 m line at about
  85 m deep. Going up inside the
  down phase (pulling up, a vent's lift) does not refund line.
- **Free Fall** still drops straight down, so its share of the line is never wasted.
- **Bot.** It now weighs side moves by how much line is left (cheap early, expensive near the
  end), so the Auto Angler and the balance sim play the same trade. It loses about 5-15% of its
  line to swerves and currents; a human steering by hand loses more, which the TIER refit keeps
  out of the pacing targets.

## 14. Zone guardians (boss fish)

Every zone now has a guardian sitting a few metres above it. Until you catch it, your line
cannot go past its arena: reaching that depth hooks it and starts a fight. Catching it opens
the way for good, pays shells once, and the guardian goes into the Fishdex like any fish.

### Research and what we took from it

- **Stardew Valley legendary fish**: one fish per location, much harder than the rest, caught
  once, and a trophy in the collection. Taken: one named fish per zone, a first-catch reward,
  a Fishdex entry. Not taken: Stardew's legendaries are optional; here they are gates, because
  a gate turns "buy more line" into "get strong enough to win", which is a better goal.
- **Dredge**: the sea gets more dangerous in layers, and each region has one big set piece.
  Taken: each zone has its own guardian with its own behaviour, and they get meaner with depth.
- **Ridiculous Fishing / Cat Goes Fishing**: the fish fight back with simple, readable patterns
  instead of reflex tests. Taken: every move is announced by a white flash 0.45 s before it
  happens, so a fight is about reading the guardian, not reacting faster than it.
- **Incremental games (Cookie Clicker, Idle Fishing tycoons)**: a hard wall that only stats
  can break feels like a paywall. So the wall here is beaten by skill *and* by stats, and every
  attempt makes progress (see "No dead attempts").

### The fight

The hook is in the guardian's mouth. It swims left or right and takes line from the spool as it
runs. You aim the hook (finger, joystick or keys) on the **far side** of where it is heading:

- **Counter** `c` goes from 0 (aim follows the guardian) to 1 (aim 4 m or more on the other
  side). It slows the guardian down (`speed * (1 - 0.75c)`), drains its stamina faster
  (`reel * (0.2 + 0.8c)` per second) and reels line back in.
- **Line** is the tug-of-war meter. The guardian takes `pull * arenaDepth` metres per second
  while it runs free; holding it gives some back:
  `paid += pull * depth * ((1 - 0.75c) - 0.6c) * dt`. Spool empty: it gets away.
- **Slack.** The strike pulls the line tight, so the slack you fight with is `line - depth`.
  The reel's drag always gives at least 15% of the depth, so arriving on your last metres of
  line is hard but never hopeless; every metre of line past that makes the fight easier. This
  is why a line upgrade still matters while you are stuck at a gate.
- **Moves.** Every `turn` seconds it flashes, then does one of:
  run (turns around), dash (turns and bursts at 1.8x for 0.8 s), dive (turns and pulls 6 m down,
  double pull) or feint (flashes but keeps going, punishing players who switch on the flash
  alone).
- **Reel** (the reel speed stat) is the damage stat, so the Reel branch is the "fight" branch.
  Smooth Steering has no effect on fights; line and reel do.

| Guardian | Arena | Stamina | Pull | Turns every | Moves | Shells |
|---|---|---|---|---|---|---|
| King Catfish (Lele Raja) | 26 m | 70 | 12% | 1.6-2.6 s | run | 10 |
| Old Reef Grouper (Kerapu Karang Tua) | 86 m | 300 | 10% | 1.3-2.2 s | run, dash | 15 |
| Lightning Tuna (Tuna Kilat) | 214 m | 600 | 8% | 1.0-1.8 s | run, dash x2 | 25 |
| Shadow Manta (Manta Bayangan) | 472 m | 1200 | 8% | 1.0-1.7 s | run, dash, dive | 40 |
| Elder Angler (Pemancing Purba) | 1040 m | 1900 | 7% | 0.8-1.5 s | run, dash, dive, feint | 60 |

Stamina is sized to the reel speed a player has when they first reach the arena in the sim
(9, 32, 50, 94, 95 m/s), so a good fight lasts 9 to 25 seconds: long enough to feel like an
event, short enough to fit a cast. Win rates at arrival stats with 15% slack (40 fights each,
`scripts/balance.js` bot, skill = reaction time `0.55 - 0.4 * skill` s):

| Guardian | skill 0.3 | skill 0.6 | skill 0.9 |
|---|---|---|---|
| King Catfish | 100% | 100% | 100% |
| Old Reef Grouper | 90% | 100% | 100% |
| Lightning Tuna | 3% | 85% | 100% |
| Shadow Manta | 0% | 70% | 100% |
| Elder Angler | 15% | 57% | 100% |

The first guardian is a tutorial: it only turns, slowly, and teaches the counter. The tuna is
the first real check. Slow players get through on persistence and more line.

### No dead attempts

- A gate guardian that gets away keeps half of the stamina it lost that fight, for good (shown
  as "Stamina 63%" on the forecast chip). Three or four honest tries always win.
- The cast is not wasted: after the fight (won or lost) the hook turns up from the arena and
  catches fish on the way up as usual. A caught guardian rides up on the hook without taking a
  crate slot, is worth one to four hauls of its zone, and the cat never copies it.
- Arenas are open water: no rocks, urchins or mines within 9 m, so the fight is only the fight.

### Gates, old saves and rematches

- `s.bosses[id] = { won, left, free }`. The first closed guardian is the floor of every cast;
  deeper water is not reachable, though its fish are still drawn (you can see what is waiting).
- Saves from before guardians keep every zone they reached: those guardians are marked `free`
  and act like beaten ones.
- A beaten guardian stays in its arena as a **rematch**: it fights only if the hook touches
  it on the way down, at full stamina, for half its coins (no shells), then rests (below). Rocks around it are cleared
  too, so you can choose to dodge it.
- New seasons keep the gates you opened; the guardians are a one-time key, the season is a
  reset of the economy.

### Rest (rematch cooldown)

Added in v1.8 after playtest feedback: a beaten guardian could be fished again on every cast.

- **Measured.** At the moment a guardian is first beaten it is worth 23 to 33 normal hauls
  (because the gate held your hauls to shallow water), and on the second win still 3 to 13
  hauls (sim, skill 0.6). A rematch cast takes about 1.6 normal casts of time, so with no
  cooldown farming the newest guardian paid 5 to 8 times normal income and beat diving deeper.
- **Rule.** Counted in casts, like the day and the weather (changing the device clock does
  nothing, and the Auto Angler counts the same way): caught again, a guardian rests 12 casts,
  one day at sea (about 3 minutes of play); after it gets away in a rematch, 4 casts. (v1.8
  shipped 36 and 12; Assami found that far too long, so v1.9 uses one day.) A rematch catch pays half; the first catch pays in full. A gate guardian you have not
  beaten never rests, because it is the wall and the retry loop ("half the stamina you took
  stays gone") is the progression.
- **Why 12 and half pay.** The extra income from a rematch is about
  `(value_in_hauls - 1.6) / rest`. With half pay (3 to 6 hauls right after unlocking) and 12
  casts that is about 12 to 35% on top of normal fishing for the first minutes after a new
  guardian falls, a fair reward for the fight, falling under 5% within a few upgrades as your
  hauls grow. Big enough to be worth a detour, too small to replace diving. A bot that
  dives at every rematch in the sim (12-cast rest) ended 45 minutes with between 31% less and
  1% more coins than a normal player (3 seeds): farming is no longer the best plan.
- **Prestige.** Rest is kept across seasons (cast numbers never reset), so a new season is no
  way to skip it.

### Reading it on screen

- A pixel crown over the guardian: gold for a closed gate, lilac for a rematch. The depth gauge
  marks arenas with the same colours.
- The dock forecast shows a dark chip with the next guardian and its depth; tapping it explains
  the gate, its stamina left, the first-catch reward and how slack works.
- In a fight: a stamina bar with the guardian's name at the top (its frame turns orange while it
  warns of a move), a chevron at your aim (green when it holds, orange half, red not at all), the
  taut line from your aim to its mouth, and the line pill counting what is left.
- The very first fight shows a hint: "pull the other way; when it flashes white it turns".

## 15. Cast conditions: time of day, weather, bait

Every cast now has a time of day and a weather, and the player picks a bait. They are
side-grades: none of them is simply better, each one bends what bites.

### Why

Incrementals live on "one more cast", and identical casts wear that out. Dredge's day/night
changes which fish (and which dangers) are out; Stardew's weather and time windows make a
rare fish an appointment; real fishing is about choosing bait for the target. A forecast that
is never wrong lets the player *plan* ("a storm in 2 casts, keep the lucky run for it"), which
is the kind of small decision an idle game needs between upgrades.

### Time of day (turns every 3 casts)

| Time | Effect |
|---|---|
| Morning (Pagi) | +30% fish above 90 m |
| Midday (Siang) | reel up 10% faster |
| Dusk (Senja) | rare species 60% more often |
| Night (Malam) | glowing species 2.2x, mutations +40%; the upper sea is dark |

The ghost ship's full moon always falls on a night.

### Weather (holds for 4 casts)

| Weather | Odds | Effect |
|---|---|---|
| Clear (Cerah) | 60% | none |
| Rain (Hujan) | 28% | +20% fish, but they swim 25% faster |
| Storm (Badai) | 12% | +50% coins on the haul, currents 1.8x stronger and more common (they eat line) |

The first 8 casts are always clear, so a new player learns the plain sea first.
Weather comes from a hash of `floor(cast / 4)`, time from `floor(cast / 3) % 4`, so the dock's
chips show exactly what the next cast gets, and tapping the weather chip tells when it changes
("Storm in 3 casts").

### Bait (free, unlocks with zones)

| Bait | Opens at | Effect |
|---|---|---|
| Worm (Cacing) | start | plain |
| Pellets (Pelet) | Reef | +35% fish, rare ones x0.6: fills the crate |
| Shrimp (Udang) | Open Blue | rare species x1.8, fish x0.75: hunting the Fishdex |
| Glow Lure (Umpan Lampu) | Twilight | glowing x2.5, mutations +25%, shallow fish -40% |

Bait stacks with time and weather (all effects multiply), so a Glow Lure on a full-moon night is
the mutation hunt, Pellets in the rain fill any crate, and Shrimp at dusk is the rare-fish
appointment. The bait chip only appears once a second bait is open.

### Balance

The balance bot plays with worm bait and takes the weather as it comes, so the pacing targets
already include the average effect (storms pay +50% one cast in eight, rain thickens the shallows).
Bait choices are on top: a player who picks well is a little faster than the targets, never
slower.

### On screen

- Sky: warm morning, pale blue midday, orange-purple dusk, dark night with a moon; rain greys it
  and hides the sun, a storm darkens it further, with lightning flashes.
- Rain and storm streaks fall over the sky and ring the surface.
- Night and storms darken the upper sea, so the glow of lantern fish and mutations shows.
- Haul screen: a storm cast lists "Storm +50%" with the other bonuses.
- Achievements: First Guardian, Sea Conqueror (all five), Storm Sailor (10 storm casts).

## 16. Help pages

Help (in the main menu and in Settings; the top bar has no help button since v1.9.1, it overflowed the phone bar) opens a sheet of short topics: fishing, line,
obstacles, guardians, guardian rest, time/weather/bait, mutations, skills, new season, shells,
fish pen and saves. One topic is open at a time; copy is in `js/help.js` (Indonesian and
English) and its numbers follow the engine, so update both when a rule changes.
