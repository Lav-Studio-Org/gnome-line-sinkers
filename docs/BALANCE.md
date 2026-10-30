# Balance

All numbers come from `scripts/balance.js`: a bot (`js/bot.js`, skill 0.6 = an average
player) plays real casts with the real engine, buys the cheapest skill it can afford, spends
4 s per cast on the haul screen, and earns fish pen income between casts.

## First season (fitted with `--tune`)

Node cost = `TIER[t] * c * g^level`. `--tune` binary-searches each `TIER` so the line skill of
that tier reaches its zone on time (averaged over 3 seeds):

| Milestone | Target | Simulated |
|---|---|---|
| First skill | < 1 min | 0:33 |
| Reef 30 m | 0.7 min | 0.7 min |
| Open Blue 90 m | (follows) | ~9 min |
| Twilight 220 m | 18 min | 16.5 min |
| Trench 480 m (new season unlocked) | 40 min | 42.6 min |
| Weird Deep 1050 m | 85 min | 81 min |

Refitted on 2026-10-30 after obstacles (rocks, urchins, mines, nets, currents, vents) and the
2D hook were added: `TIER = [30, 650, 4e5, 1.2e8, 6e9, 3e11]`. Ads were removed at the same
time; the sim never used them, so the pacing above is the whole game.

Every cast pays: the first three casts have easy fish under the boat, and a fish you bump
into on the way down bites (it becomes the first catch).

## Seasons (prestige)

Pearls pay for **new depth records**: a record is worth `5 * sqrt((depth - 380) / 100)` pearls
in total and each season pays what you have not received yet (minimum 1). Pearls are a flat
+10% fish value each, based on pearls ever earned, so spending them on pearl skills never
hurts. This replaced two coin-based formulas that snowballed in simulation (pearls doubling
every 5 minutes after hour 2).

24-hour simulation (reset when a season pays at least 4 pearls, or after an hour):

| Season | Length | Pearls earned |
|---|---|---|
| 1 | 35 min | 5 |
| 2-6 | 11-22 min each | 4 each |
| 7-8 | ~38 min | 4-5 |
| 9-10 | ~60 min | 2-3 |
| 11+ | ~60-70 min | +1 per season |

After about 2.5-3 hours of optimal play the climb becomes a slow long tail: depth is limited by
dodging (fish get denser deeper) and the Endless Line skill costs x3 per level. Real players
are slower than the bot, so expect roughly 2-3x these times.

## Idle

Fish pen income is `0.003 * sum(value * sqrt(caught))` times pen and value multipliers: about
10-20% of active income mid-game and close to active income once the pen branch is maxed,
so the late game can be played idle with the Auto Angler. Offline income is capped at 3 h
(+2 h per Night Keeper level).

## Re-running

```sh
node scripts/balance.js 0.6 6 3        # timeline
node scripts/balance.js --tune --write # refit TIER after changing values or nodes
node scripts/test-engine.js
```
