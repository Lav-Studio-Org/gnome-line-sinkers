# Global counter (Cloudflare Worker + D1)

Counts players and fish caught by everyone. Free tier is far more than enough
(100k requests/day; the game reports at most once every few minutes per player).

Needs `CLOUDFLARE_API_TOKEN` (Edit Cloudflare Workers + D1 Edit) and `CLOUDFLARE_ACCOUNT_ID`
in the environment.

```sh
cd server
npx wrangler d1 create gnome-line-sinker          # copy the database_id into wrangler.toml
npx wrangler d1 execute gnome-line-sinker --remote --file schema.sql
npx wrangler deploy                               # prints https://gnome-line-sinker-counter.<sub>.workers.dev
```

Then put that URL in `GLOBAL_URL` at the top of `js/global.js`. With an empty URL the game
never calls out and the "Whole sea" panel stays hidden.

Anti-cheat is deliberately simple: each report is clamped to what a very fast player could
catch since the same id last reported (see `PER_SEC` in `worker.js`), and a new id can only
bring ten minutes of play. Players are a random id; no personal data is stored.
