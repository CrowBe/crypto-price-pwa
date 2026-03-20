# Upgrade crypto-price-server: server-driven price broadcasting

## Context

The companion PWA (`crypto-price-pwa`) has been refactored so that when
Pusher is configured it acts as a **passive subscriber only** — it no longer
POSTs prices to the server. The server must now own the full fetch-and-broadcast
cycle.

The previous (broken) flow was:
```
PWA → fetches CoinGecko → POST /prices/new → Express → Pusher → PWA (circular)
```

The correct flow is:
```
Express server → fetches CoinGecko (+ CryptoCompare fallback) → Pusher broadcast
                                                                       ↓
                                                           PWA subscribes & displays
                                                       (+ one initial direct fetch for fast start)
```

---

## Task

Upgrade `server.js` (and related files) so the server:

1. **Fetches prices on a schedule** using `setInterval` (default every 60 s,
   configurable via `FETCH_INTERVAL_MS` env var).
2. **Fetches all 4 currencies at once** (AUD, USD, EUR, GBP) in a single
   CoinGecko request so every connected PWA client can display their chosen
   currency without extra calls.
3. **Falls back to CryptoCompare** if CoinGecko fails (same retry strategy the
   PWA already uses — up to 3 attempts with exponential backoff: 1 s, 2 s, 4 s).
4. **Broadcasts the multi-currency payload** via the existing Pusher
   `coin-prices` channel, `prices` event — same event name the PWA already
   listens for.
5. **Keeps `/prices/new`** as a manual override endpoint (useful for testing
   and local dev without a running schedule).
6. **Keeps the `GET /` health check** but extend the response to include
   `lastFetchedAt` (ISO timestamp of the last successful price fetch).

---

## Coins and currencies

Fetch these 7 coins in all 4 currencies in every scheduled request:

| Symbol | CoinGecko ID  |
|--------|---------------|
| BTC    | bitcoin       |
| ETH    | ethereum      |
| XRP    | ripple        |
| SOL    | solana        |
| DOGE   | dogecoin      |
| ADA    | cardano       |
| LTC    | litecoin      |

Currencies: `aud`, `usd`, `eur`, `gbp`

---

## CoinGecko API call

```
GET https://api.coingecko.com/api/v3/simple/price
  ?ids=bitcoin,ethereum,ripple,solana,dogecoin,cardano,litecoin
  &vs_currencies=aud,usd,eur,gbp
  &x_cg_demo_api_key=<COINGECKO_API_KEY>   ← omit header/param if key not set
```

Response shape:
```json
{
  "bitcoin":  { "aud": 150000, "usd": 98000, "eur": 90000, "gbp": 77000 },
  "ethereum": { "aud": 5000,   "usd": 3200,  "eur": 2950,  "gbp": 2500  },
  ...
}
```

Map to the PWA's expected shape before broadcasting:
```json
{
  "BTC": { "AUD": "150000", "USD": "98000", "EUR": "90000", "GBP": "77000" },
  "ETH": { "AUD": "5000",   "USD": "3200",  "EUR": "2950",  "GBP": "2500"  },
  ...
}
```

---

## CryptoCompare fallback API call

```
GET https://min-api.cryptocompare.com/data/pricemulti
  ?fsyms=BTC,ETH,XRP,SOL,DOGE,ADA,LTC
  &tsyms=AUD,USD,EUR,GBP
  &api_key=<CRYPTOCOMPARE_API_KEY>
```

Response is already in the right shape.

---

## Pusher broadcast

Trigger on the existing channel and event:
- Channel: `coin-prices`
- Event: `prices`
- Payload: the mapped multi-currency object above

---

## Environment variables

### Add to `.env` / `.env.example` on the server

```dotenv
# --- NEW ---

# CoinGecko API key (optional — raises rate limit from 30 to 500 req/min)
# Free demo key: https://www.coingecko.com/en/api/pricing
COINGECKO_API_KEY=

# CryptoCompare API key (fallback provider, required for fallback to work)
# Free key: https://www.cryptocompare.com/cryptopian/api-keys
CRYPTOCOMPARE_API_KEY=

# How often (ms) to fetch and broadcast prices. Defaults to 60000 (60 s).
FETCH_INTERVAL_MS=60000
```

### Existing vars — no changes needed

```dotenv
PUSHER_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
PORT=5000
CORS_ORIGIN=*
```

### Remove from `.env` on the server (no longer sent by client)

None — the server never relied on client-sent API keys, so nothing to remove.

---

## PWA environment variables

The PWA (`crypto-price-pwa`) already has these changes committed.
For reference, its `.env` / `.env.example` is now:

```dotenv
# CryptoCompare fallback (used only in polling mode — no Pusher)
VITE_COIN_API_KEY=

# Pusher subscribe credentials (read-only — PWA never publishes)
VITE_PUSHER_KEY=
VITE_PUSHER_CLUSTER=

# REMOVED: VITE_PUSHER_API — client no longer POSTs prices to the server
```

---

## Implementation notes

- Use `axios` (already a dependency via the existing server) or Node's built-in
  `fetch` (Node >= 18) for the HTTP calls — do not add new HTTP client packages.
- Keep the fetch logic in a dedicated module `priceService.js` (or inline in
  `server.js` if you prefer minimal footprint) — do not add a heavyweight
  framework.
- If a scheduled fetch fails after all retries, log the error but **do not
  crash** — the next interval will try again.
- On server startup, run the first fetch immediately (don't wait 60 s for the
  first broadcast).
- Update `server.test.js` to cover:
  - Scheduled fetch calls the price API and triggers a Pusher broadcast
  - CryptoCompare fallback is used when CoinGecko fails
  - `/prices/new` manual override still works
  - `GET /` includes `lastFetchedAt` in the response
- Update `README.md` to reflect the new server-driven architecture and the
  new env vars.
