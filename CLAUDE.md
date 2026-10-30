# CLAUDE.md

Gnome, Line & Sinker (working title KAIL!): chill fishing incremental game (Lav Studio). Plain web game, no build step; will
ship to the Play Store as a web payload, so landscape + mobile first.

- No emoji or text symbols as icons: use the `#i-*` SVG sprite in `index.html` via `ic('name')`.
  `node scripts/check-no-emoji.js` must pass.
- Colours: orange `--accent` = main action, `--gold` = coins, `--pearl` = pearls, `--green` =
  good news. No gradients, 2px ink outlines, hard shadows, text left aligned.
- UI copy in Indonesian and English (`js/i18n.js`). Code and commits in English.
- No ads (removed on request, 2026-10-30). Balance must work without any multiplier from outside play.
- `js/engine.js` stays pure (no DOM). After rule or number changes run
  `node scripts/test-engine.js` and `node scripts/balance.js --tune --write`, then update
  `docs/BALANCE.md`.
- Audio: keep `unlock` / `recover` / `duck` in `js/audio.js`.
- Save key `kail.save.v1` (kept so old progress survives the rename), namespace `KL`, test hook
  `window.__kail` (`give`, `setNodes`, `cast(x)`). Save files: `{ game: 'gnome-line-sinker', v, at, save }`.
- The docked preview run is the next cast (`g.preview` becomes `g.run`), so idle fish = cast fish.
- Credit both asset packs (Moranovo 80+ Fishing Icons, PixelGnome Fishing Pack sample) in the
  in-game credits and README.
- Sprites: edit `tools/build_atlas.py` and run `python3 tools/build_atlas.py Assets` (folder layout in
  the build script header). Static drawings (rocks, nets, light holes) go through `R.baked()` so
  they are drawn once, not every frame. Fonts in `style.css` are subset to the characters the UI uses:
  re-subset if you add copy with new non-ASCII characters.
