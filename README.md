# Gnome, Line & Sinker

A chill fishing incremental game for landscape phones and desktop browsers. Tap the sea and the
gnome throws the hook there. Guide the lead weight down with your finger or cursor (the line
trails behind it like a snake), dodge fish, urchins, mines, ghost nets and currents, then catch
everything you touch on the way back up. Grow a 47-node skill tree from a muddy estuary to a sea
where goldfish have three eyes.

![Menu](docs/screenshots/menu.png)
![Obstacles](docs/screenshots/obstacles.png)
![Trophies](docs/screenshots/trophies.png)
![Shop](docs/screenshots/shop.png)

<img src="docs/screenshots/share-card.png" alt="Share card" width="270">

![Portrait](docs/screenshots/portrait.png)

Plain HTML + JS, no build step, no dependencies, works offline (the Playables SDK script in
`index.html` is a no-op outside YouTube and simply fails to load when there is no network).

## Play

Live: https://gnome.assamimuzaki.work/

```sh
python3 -m http.server 8124
# open http://localhost:8124/
```

(Opening `index.html` straight from disk also works in most browsers; a local server is safer
for fonts and the sprite sheet.)

Controls: tap the sea to cast. While the hook is underwater it chases your finger or cursor;
let go and it keeps sinking straight. Arrow keys / WASD work too, Space casts and collects.
On phones a joystick at the bottom steers the hook while casting, so your thumb does not cover
it (Settings > Controls switches back to touching the sea).

The start menu has Continue / New game, **Save to file** (downloads a `.sav` save) and
**Load from file**. Saves, in the file and in the browser, are scrambled with a keyed checksum
(`js/savecodec.js`), so an edited save is refused. Old plain browser saves still load once and are
re-saved encoded; old `.json` save files are no longer accepted. The same two buttons are in Settings.

## What is in it

- Obstacles: rocks to steer around, sea urchins and mines that end a dive (a mine on the way
  up knocks a fish off the hook), ghost nets that slow you, currents and bubble vents that push.
- 79 species (plus 5 guardians) in 6 depth zones (Estuary, Reef, Open Blue, Twilight, Trench, Weird Deep), 4
  mutations (Big, Golden, Prismatic, Titan), a Fishdex with mastery stars.
- Five zone guardians (boss fish): each one blocks the way to the next zone until you win a
  tug-of-war fight against it; a guardian that gets away keeps the stamina it lost.
- Every cast has a time of day and a weather (shown as a forecast on the dock), and you pick a
  bait once the reef is open. See `docs/DESIGN.md` sections 14 and 15.
- Skill tree with six branches, mystery "?" nodes, pearl skills after the first new season.
- Fish pen idle income and capped offline earnings.
- Auto Angler skill that plays for you (the same bot the balance simulation uses).
- Generative lo-fi music and synthesized sound effects; the music muffles and darkens as the
  hook goes deeper.
- 60 achievements in five rarity tiers, a lifetime activity page, and a share card (image for
  Instagram and WhatsApp, or the phone's share sheet).
- Shop with 8 gnome outfits and 8 boats (sampan, jukung, pinisi, mini sub, ghost ship...),
  bought with shells from achievements; the one you wear gives a small perk.
- Every depth zone has its own scenery: seagrass and mangrove roots in the estuary, corals and
  anemones on the reef, kelp in the open blue, sea lilies in the twilight, smoking chimneys and
  tube worms in the trench, glowing crystals and eye stalks in the weird deep, plus a landmark
  far off (a shipwreck, a passing whale, its bones, a ruined arch). Decoration only.
- Plays in portrait or landscape (auto, or pinned in Settings), with a bottom bar and bottom
  sheets on phones held upright.
- Indonesian and English (follows the device language, switch in Settings).

## Files

| Path | What |
|---|---|
| `index.html`, `style.css` | shell, icon sprite, design system |
| `js/data.js` | zones, species, mutations, skill tree, tier costs |
| `js/engine.js` | pure game logic (no DOM): stats, tree, one cast, economy, seasons |
| `js/bot.js` | steering bot (Auto Angler, tests, balance) |
| `js/render.js` | canvas renderer |
| `js/decor.js` | scenery per zone: wall props, background boulders, far shapes, landmarks |
| `js/ui.js`, `js/main.js` | interface and game flow |
| `js/platform.js` | YouTube Playables adapter: cloud save, pause, mute, language, score, restrictions |
| `js/trophies.js` | achievements, activity, share card, outfit and boat shop |
| `js/global.js`, `server/` | global counter (players and fish caught by everyone), Cloudflare Worker + D1 |
| `js/audio.js` | music, ambience and SFX (Web Audio) |
| `img/atlas.png`, `js/atlas.js` | sprite sheet, built by `tools/build_atlas.py` from `Assets/` |
| `docs/DESIGN.md` | research and design decisions |
| `docs/BALANCE.md` | pacing targets and simulation results |

## YouTube Playables

The same tree ships as a Playable; nothing is forked. `js/platform.js` (`KL.Platform`) detects
`ytgame.IN_PLAYABLES_ENV` and owns the platform specific parts:

- `index.html` is the bundle (no build step), so the Playables SDK script stays the first script in
  it, before every `js/` file.
- Progress goes through `ytgame.game.saveData` / `loadData` only (browser storage is not allowed
  there). The cloud copy is the same scrambled `.sav` envelope, so old saves migrate the same way.
  The save-file buttons and the update button are removed, and Help explains the YouTube save.
- `onPause` / `onResume` replace the Page Visibility API: pause stops the frame loop, blocks every
  click and key, parks the audio context, stops the music scheduler and writes the save out.
- The YouTube mute button wins over the in-game switches, the score sent to YouTube is the deepest
  line the save shows, the UI language follows `getLanguage()`, orientation is never locked, and
  there is no share prompt, no clickable link out, no global counter and no external call.

```sh
node scripts/bundle-playables.js   # dist/playables.zip + the platform limit/rules checks
node scripts/smoke-playables.js    # boots with a stub SDK and checks every rule above
                                   # (PW_CHANNEL=msedge runs an installed browser)
```

Upload that ZIP at https://www.youtube.com/playables_portal (Details -> entry point `index.html`),
then Test (SDK Test Suite plus the preview links for desktop, mobile web, Android and iOS), Age
rating (IARC) and Submit for review. Pre-roll ads are applied by YouTube itself and cannot be turned
off; the game still carries no ads of its own, so the "no multiplier from outside play" rule holds.

## Checks

```sh
node scripts/test-engine.js          # engine tests
node scripts/check-no-emoji.js       # icons come from the SVG sprite, never emoji
node scripts/balance.js              # play a simulated timeline (skill 0.6, 6 h)
node scripts/balance.js --tune --write   # refit tier costs to the pacing targets
node scripts/smoke.js http://localhost:8124/ shots   # browser smoke test (Playwright)
node scripts/bundle-playables.js     # build and validate the Playables upload (dist/playables.zip)
node scripts/smoke-playables.js      # Playables-mode browser test with a stub SDK
```

Rebuild the sprite sheet after changing sprites: `python3 tools/build_atlas.py Assets`
(needs Pillow and numpy). `Assets/` is kept out of git and holds only the files the build reads:

```
Assets/
  pixel-gnome/             12 fish PNGs + Read Me.txt   (Pixel Gnome Fishing Pack sample)
  moranovo-fishing-icons/  Fishing Icons.png + Licence.txt + Fishing Icon List.txt
  free-fish/               free fish.png
```

## Credits

Made by [Assami Muzaki](https://www.youtube.com/@AssamiMuzaki).

- **80+ Fishing Icons Asset Pack** by Moranovo: https://moranovo.itch.io/80fishing-icons-asset-pack
- **Pixel Gnome Fishing Pack** (free sample) by PixelGnome: https://pixelgnome.itch.io/fish
- Deep-sea fish, gnome, boat, obstacles, icons, UI, music and sound by Lav Studio.
- Font: Pixelify Sans (SIL Open Font License, `fonts/OFL.txt`).

The raw asset packs in `Assets/` are not redistributed with builds, only the packed sprite sheet.
