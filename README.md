# Easy Crypto Tracking — PWA

Real-time cryptocurrency price tracker for **Bitcoin (BTC)**, **Ethereum (ETH)**, and **XRP**, displayed in AUD or USD. Built as a Progressive Web App (PWA) — installable on mobile and desktop, works offline via cached data.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Build | **Vite** (migrated from Create React App) |
| UI Framework | **React 18** + **TypeScript 5** |
| Styling | **Tailwind CSS v3** with dark mode |
| Charts | **Recharts** |
| Real-time | **Pusher Channels** |
| Price data | **CryptoCompare API** |
| HTTP client | **Axios** |
| Date handling | **date-fns v3** |
| PWA | **vite-plugin-pwa** + Workbox |

---

## Features

- **Live prices** — BTC, ETH, XRP fetched every 60 seconds and broadcast via Pusher WebSockets
- **Historical charts** — line charts for the past 2–30 days, switchable to table view
- **AUD / USD toggle** — switch the display currency in the header
- **Dark / light mode** — system preference detected, persisted to `localStorage`
- **PWA** — installable, offline-capable (CryptoCompare responses cached via Workbox)
- **Skeleton loaders** — smooth loading states
- **Responsive** — mobile-first grid layout

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A [CryptoCompare](https://www.cryptocompare.com/cryptopian/api-keys) API key (free tier works)
- A [Pusher](https://pusher.com/) Channels app *(optional — prices will still fetch via polling)*

### Setup

```bash
git clone <repo-url>
cd crypto-price-pwa
npm install
cp .env.example .env   # then fill in your keys
npm run dev            # http://localhost:3000
```

### Environment variables (`.env`)

```
VITE_COIN_API_KEY=      # CryptoCompare API key
VITE_PUSHER_KEY=        # Pusher app key
VITE_PUSHER_CLUSTER=    # e.g. ap4
VITE_PUSHER_API=        # URL of crypto-price-server backend
```

> See [crypto-price-server](https://github.com/your-org/crypto-price-server) for the Pusher broadcasting backend.
> The app works without Pusher — it falls back to polling CryptoCompare directly every 60 seconds.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | TypeScript type check (no emit) |

### Deployment

Deploy the `dist/` folder to any static host. The PWA manifest and service worker are generated automatically by `vite-plugin-pwa`.

```bash
npm run build
# Upload dist/ to Vercel, Netlify, Cloudflare Pages, etc.
```

---

## Server Updates (crypto-price-server)

The companion server handles Pusher event broadcasting when the client posts fresh prices. Relevant updates aligned with this PWA modernisation:

- Environment variables follow the same naming convention (`PUSHER_*`)
- The `/prices/new` endpoint accepts `{ BTC, ETH, XRP }` price strings and broadcasts them on the `coin-prices` Pusher channel under the `prices` event
- CORS should be configured to allow the PWA's origin in production

---

## Suggested Features

The items below are documented here to guide future development.

### High priority

| Feature | Description |
|---------|-------------|
| **Price alerts** | Let users set a target price for any coin; trigger a browser notification when it's hit. Uses the [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) — the scaffolding (commented-out `showNotification`) is already in `Today.tsx`. |
| **More currencies** | Add `USD`, `EUR`, `GBP` as additional display options (the CryptoCompare API supports them; `tsyms` is already an array). |
| **More coins** | Extend `CoinKey` with `SOL`, `DOGE`, `ADA`, `LTC`. CryptoCompare supports all of them via `pricemulti`. |

### Medium priority

| Feature | Description |
|---------|-------------|
| **Portfolio tracker** | Allow users to enter coin quantities; calculate total portfolio value in real time. State stored in `localStorage`. |
| **Percentage change** | Show 24-hour % change alongside each live price. CryptoCompare's `pricemultifull` endpoint returns `CHANGEPCT24HOUR`. |
| **Combined chart** | Normalised (indexed to 100) multi-coin chart so BTC, ETH, and XRP can be compared on the same axis. |
| **CSV / JSON export** | Button to download the visible historical data. |
| **Last seen offline indicator** | When loaded offline, show a banner with the timestamp of the cached data. |

### Lower priority / nice-to-have

| Feature | Description |
|---------|-------------|
| **Coin search** | Allow users to search any coin supported by CryptoCompare instead of a fixed list. |
| **Sparklines in live cards** | Small inline chart in each coin card showing the last 24 hours from the `histohour` endpoint. |
| **Theming** | Additional accent colour themes beyond the default indigo. |
| **i18n** | Internationalise labels and number formats for non-AU/US users. |
| **End-to-end tests** | Playwright tests for the main user flows. |

---

## Credits

- Original tutorial: [Build a Realtime PWA with React](https://medium.com/better-programming/build-a-realtime-pwa-with-react-99e7b0fd3270) by Yomi
- `useStatus` custom hook: [Michael Theodorou](https://levelup.gitconnected.com/usestatus-a-custom-react-hook-for-managing-ui-states-a5b1bc6555bf)
