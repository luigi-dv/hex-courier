# Hex Courier

<!-- TODO: GIF of the ring search (the autoplay on the first screen is a good take) -->

A small food-delivery demo: you place an order on a map of Warsaw, and the backend finds the nearest idle courier using [H3](https://h3geo.org), Uber's hexagonal grid. The map shows the couriers moving, the hex cells they're in, and the search rings growing around the pickup until someone is found.

Every visitor gets their own city, kept in Redis, so it runs on Vercel's serverless functions without a long-running server. The page around the map explains the search with things you can touch: a ring-by-ring inspector, a scenario that shows why the matcher looks one ring further than it needs to, a benchmark that runs in your own browser, and a log of every API call with the server's own timings.

Built with Next.js 16 (App Router), React 19 and TypeScript, `h3-js` v4 for the grid, Leaflet for the map, Upstash Redis for state and Tailwind CSS 4 for the styles. Tests run on Vitest.

## Run it locally

Needs Node 24 (see `.nvmrc`).

```bash
npm ci
npm run dev        # http://localhost:3000
```

Without Redis variables, development keeps the cities in memory, which is fine on one machine. To use Redis locally, pull the variables from the linked Vercel project with `vercel env pull .env.local`.

The page plays a sample order every 12 seconds until you touch it. Then click the map once for the pickup, once for the dropoff, and press **Place Order** (or **Random Order**). Your city has thirty couriers wandering around the centre. The one that gets the order drives to the pickup, then to the dropoff, and is free again when it arrives (or when you press **Complete**).

`npm test` runs the tests, `npm run lint` and `npm run typecheck` check the code, and `npm run benchmark` compares the H3 search with scanning every courier.

## Why H3

The naive way to find a courier is to measure the distance to every courier and sort. It works, but every order costs as much as the whole fleet, and it gets worse with every courier you add.

H3 splits the world into hexagons and gives each one an id. So instead of asking "who is within 1 km?", I ask "who is in these cells?", which is a map lookup. I went with hexagons and not a square grid or geohash for three reasons:

- **Every neighbour is the same distance away.** A hexagon has six neighbours, all sharing an edge. A square has four edge neighbours and four corner ones that are further, so "one ring out" means different distances depending on the direction.
- **Indexing is cheap.** Turning a coordinate into a cell is one function call, and moving a courier is just moving its id from one set to another.
- **Resolutions are hierarchical.** Resolution 8 cells are about 530 m per edge, 9 about 200 m, 10 about 76 m. Bigger cells mean fewer rings but more couriers to rank in each one, and smaller cells the other way around. The demo lets you switch between them to see that trade-off.

## How the matching works

Everything lives in `findNearbyCouriers` (`src/lib/matching`), a pure function: it gets the pickup and a way to ask "who is in this cell?", and returns the ranked candidates and the rings it searched.

1. Turn the pickup into a cell.
2. Look at ring k = 0 (the pickup cell), then ring 1, ring 2... up to `K_MAX` (5). Each ring only holds the new cells, so no cell is looked up twice.
3. Collect the idle couriers in those cells. No distance maths yet, only lookups.
4. Once there are enough candidates (3), search **one more ring** and stop.
5. Rank everyone found by straight-line distance and assign the first one.

The extra ring in step 4 is on purpose. Ring distance is not real distance: if the pickup is close to the edge of its cell, a courier just across the border (ring 1) can be closer than one at the far side of the pickup's own cell (ring 0). Stopping at the first ring that has enough would pick the wrong courier in that case. There's a test for exactly that situation.

The rest of the edge cases are covered too: nobody around (the order stays `unassigned`), busy couriers (skipped), a courier standing exactly on a cell vertex, and pentagons. H3 has 12 pentagons per resolution where the fast ring function fails. They're all in the ocean, so a city never hits one, but the matcher falls back to a slower function that handles them anyway.

Assigning a courier happens inside one compare-and-set save of the city (see below), so two orders can't grab the same courier.

## Benchmark

`npm run benchmark` builds a city of 1k, 10k and 100k couriers spread over a 10 km radius (one in five busy), then runs 500 orders through both approaches. On my laptop (Node 22, resolution 9):

| Couriers | H3 mean  | H3 p95   | Scan mean | Scan p95 | Same nearest | Speedup |
| -------- | -------- | -------- | --------- | -------- | ------------ | ------- |
| 1,000    | 0.025 ms | 0.062 ms | 0.29 ms   | 0.55 ms  | 100%         | 11x     |
| 10,000   | 0.045 ms | 0.088 ms | 3.3 ms    | 4.0 ms   | 100%         | 74x     |
| 100,000  | 0.21 ms  | 0.24 ms  | 43 ms     | 52 ms    | 100%         | 209x    |

The scan grows with the fleet. The H3 search grows with how many couriers are near the pickup, which is why 100x more couriers only costs it about 8x more time. And in every one of the 1,500 orders both approaches picked the same courier.

## API

| Method | Route                         | Body                               | Returns                                                                                   |
| ------ | ----------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| GET    | `/api/city`                   |                                    | `{ at, couriers, orders }`                                                                |
| POST   | `/api/city/reset`             |                                    | a fresh city                                                                              |
| GET    | `/api/couriers`               |                                    | `{ couriers }`                                                                            |
| POST   | `/api/couriers/[id]/location` | `{ lat, lng }`                     | `{ courier }`, or 404                                                                     |
| GET    | `/api/orders`                 |                                    | `{ orders }`                                                                              |
| POST   | `/api/orders`                 | `{ pickup, dropoff, resolution? }` | `{ order, candidates, ringUsed, rings, durationMs }` (201), 409 with 5 orders on the road |
| POST   | `/api/orders/[id]/complete`   |                                    | `{ order }`, 404 if unknown, 409 if not active                                            |

Everything is scoped to your city through an `hc_city` cookie, set on the first request. Coordinates are validated (lat between -90 and 90, lng between -180 and 180) and `resolution` must be 8, 9 or 10. Anything else is a 400 with a message that says which field is wrong. More than 20 new cities from one address in 10 minutes is a 429.

Every response carries a `Server-Timing` header (`load`, `replay`, `match`, `save`), which is what the request log on the page shows.

## How it's put together

```
src/
  app/            the page and the API routes, kept thin: validate, call a service, respond
  components/     one folder per component (LiveCity, CourierMap, GuardScenario, Benchmark...)
  constants/      geo (resolution, K_MAX, city centre), city (tick, TTL, limits), site
  hooks/          polling, autoplay, the ring stepper, smooth courier movement
  lib/            pure logic: matching, the city, the cell index, scenarios, the benchmark, repositories
  providers/      the H3 resolution, shared by the map and the big switch and kept in ?res=
  services/       cityService: the cookie, loading, replaying and saving a city
  workers/        the benchmark, run off the main thread
  types/          City, Courier, Order, Match
scripts/          the benchmark for the terminal, same code as the page's
```

**A city per visitor, without a server that stays up.** Serverless functions don't keep memory between requests, and nothing runs while nobody is calling them. So a city is plain data in Redis (one hash per visitor, deleted after 15 idle minutes), and it doesn't need anything ticking in the background: every request loads it and replays the seconds that passed since it was saved. The city carries the state of its own random generator, so the same saved city replayed to the same moment always comes out the same. That's why polling is read-only: a `GET` replays and answers without writing, and only changes (an order, a delivery, a moved courier) save.

**No lost updates.** A poll and an order can arrive at the same time. Saves are compare-and-set, done by a small Lua script in one round trip: the city is saved only if its version is still the one that was loaded. If not, the request starts over from the fresh city. A poll can never overwrite an order.

**The matcher doesn't know about any of this.** It only needs something that answers "who is in this cell?". For a city of 30 couriers the cell index is rebuilt per request in microseconds; a fleet-sized city would keep it in storage (a Redis set per cell, or Postgres with an indexed `h3_cell` column) behind the same lookup.

The figures on the page are measured, not written: the search rules section runs the real matcher on a seeded city at build time, and the benchmark runs in the visitor's browser.

## Deploying

On Vercel, with an Upstash Redis database from the Vercel Marketplace:

```bash
vercel link
vercel integration add upstash   # sets KV_REST_API_URL and KV_REST_API_TOKEN
vercel deploy
```

Without Redis, production refuses to start rather than quietly keeping cities in memory, where they would vanish between instances. On a single long-running server (a container on Fly.io or Railway) you can opt into memory with `CITY_STORE=memory`.

## What's next

- **Real travel time.** Distance here is a straight line. A courier across the river can look close and be 15 minutes away. [OSRM](https://project-osrm.org) or [Valhalla](https://github.com/valhalla/valhalla) on the top candidates would fix that.
- **A shared index for big fleets**, in Redis sets or Postgres, behind the same lookup.
- **Server-Sent Events** instead of polling every second.
- **A supply and demand map**: orders and couriers per cell, to show where surge pricing would kick in.

## License

[MIT](LICENSE).
