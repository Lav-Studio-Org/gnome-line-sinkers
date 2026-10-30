# Balance

All numbers come from `scripts/balance.js`: a bot (`js/bot.js`, skill 0.6 = an average
player) plays real casts with the real engine, buys the cheapest skill it can afford, spends
4 s per cast on the haul screen, and earns fish pen income between casts.

## First season (fitted with `--tune`)

Node cost = `TIER[t] * c * g^level`. `--tune` binary-searches each `TIER` so the line skill of
that tier reaches its zone on time (averaged over 3 seeds):

| Milestone | Target | Simulated |
|---|---|---|
| First skill | < 1 min | 0:38 |
| Reef 30 m | 0.7 min | 0.7 min |
| Open Blue 90 m | (follows) | ~10 min |
| Twilight 220 m | 18 min | 17.7 min |
| Trench 480 m (new season unlocked) | 40 min | 42.4 min |
| Weird Deep 1050 m | 85 min | 76.3 min |

Refitted on 2026-10-30 after obstacles (rocks, urchins, mines, nets, currents, vents) and the
2D hook were added, and again when 46 species from the 80+ Fishing Icons pack joined
(79 in total): `TIER = [33, 800, 5.3e5, 2.1e8, 1.1e10, 5.5e11]`. Ads were removed at the same
time; the sim never used them, so the pacing above is the whole game.

Refitted again with achievements and the outfit and boat shop: the bot now buys the cheapest
item it can with shells and wears it, so the perks are part of the pacing.
`TIER = [33, 1300, 8.4e5, 1.9e8, 9.5e9, 4.8e11]`.

Refitted when the sea started carrying over between casts: uncaught fish in the top 80 m (what
the dock shows) stay where they are and only caught ones are replaced, deeper water is new each
cast. The sim plays it the same way (`E.carryOver`).
`TIER = [43, 620, 6.3e5, 1.4e8, 7e9, 3.5e11]`; zones at 0.6 / 10.5 / 17.9 / 39 / 75 min.

## Shells (outfits and boats)

Shells come from achievements (3 / 6 / 12 / 25 / 50 by tier), new species (1), mastery steps
(2 at 250 and 5 at 1000 caught of a kind) and new seasons (5). In the sim (skill 0.6):

| Item | Shells | Bought at |
|---|---|---|
| Beachcomber | 10 | 0:48 |
| Outrigger | 20 | 3 min |
| Diver | 30 | 6 min |
| Ship Cook | 40 | 10 min |
| Longtail | 40 | 17 min |
| Lighthouse Keeper | 55 | 38 min |
| Lucky Gnome | 70 | 53 min (season 2) |
| Pinisi | 70 | 60 min |

About 33 of 57 achievements fall in the first 75 minutes (mostly Common to Rare); the Epic and
Mythic tiers need many hours, many seasons or a lot of luck (25 titans, every variant). Total
price of all items is 1,615 shells against about 1,700 available to someone who earns
everything else.

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
| 1 | 38 min | 5 |
| 2-7 | 13-20 min each | 4-6 each |
| 8 | ~62 min | 3 |
| 9+ | ~60 min | +1-2 per season |

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
