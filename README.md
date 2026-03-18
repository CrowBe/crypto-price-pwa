# Easy Crypto Tracking — PWA

Real-time cryptocurrency price tracker for **BTC, ETH, XRP, SOL, DOGE, ADA & LTC**, displayed in AUD, USD, EUR or GBP. Built as a Progressive Web App (PWA) — installable on mobile and desktop, works offline via cached data.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Build | **Vite 6** |
| UI Framework | **React 18** + **TypeScript 5** (strict mode) |
| Styling | **Tailwind CSS v3** with dark mode |
| Charts | **Recharts** |
| Real-time | **Pusher Channels** |
| Price data | **CryptoCompare API** |
| HTTP client | **Axios** |
| Date handling | **date-fns v3** |
| PWA | **vite-plugin-pwa** + Workbox |
| Testing | **Vitest** + **React Testing Library** |

---

## Features

- **Live prices** — 7 coins fetched every 60 seconds, broadcast via Pusher WebSockets
- **Price alerts** — set above/below targets per coin; browser notifications when triggered
- **Historical charts** — line charts for the past 2–30 days, switchable to table view
- **4-currency toggle** — AUD, USD, EUR, GBP in the header
- **Dark / light mode** — system preference detected, persisted to `localStorage`
- **PWA** — installable, offline-capable (CryptoCompare responses cached via Workbox)
- **Skeleton loaders** — smooth loading states for all async content
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
VITE_PUSHER_KEY=        # Pusher app key (optional)
VITE_PUSHER_CLUSTER=    # e.g. ap4 (optional)
VITE_PUSHER_API=        # URL of crypto-price-server backend (optional)
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
| `npm test` | Run test suite once |
| `npm run test:watch` | Run tests in interactive watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |

### Deployment

Deploy the `dist/` folder to any static host. The PWA manifest and service worker are generated automatically by `vite-plugin-pwa`.

```bash
npm run build
# Upload dist/ to Vercel, Netlify, Cloudflare Pages, etc.
```

---

## Architecture

### Source layout

```
src/
├── types.ts                 # All shared TypeScript types (exported module)
├── interfaces.d.ts          # Ambient re-exports for backwards compatibility
├── api.ts                   # Axios CryptoCompare client
├── cryptoService.ts         # API helper functions
├── utils.ts                 # Currency formatters + coin metadata constants
├── App.tsx                  # Root: dark-mode, currency selector, lazy History
├── hooks/
│   └── useStatus.tsx        # Loading-state render hook
├── Today/
│   └── Today.tsx            # Live price grid + Pusher/polling logic
├── History/
│   └── History.tsx          # Historical charts & table (lazy-loaded)
├── PriceAlerts/
│   └── PriceAlerts.tsx      # Alert management + Notifications API
└── Results/
    ├── LoadingState.tsx
    ├── ErrorState.tsx
    └── EmptyState.tsx
```

### Type system

All shared types live in `src/types.ts` as named exports. The `interfaces.d.ts` file re-declares them as ambient globals so existing component files compile without extra imports; new code should import from `src/types` directly:

```ts
import type { CoinKey, Currency, IPriceAlert } from "../types";
```

### Real-time data flow

1. `Today` component fetches prices from CryptoCompare on mount.
2. If Pusher env vars are set, a WebSocket subscription is opened on `coin-prices`.
3. On each Pusher `prices` event (or poll interval), prices are formatted and saved to `localStorage`.
4. `onPriceUpdate` callback propagates raw numeric prices to `App` → `PriceAlerts` for alert checking.

---

## Testing

Tests use [Vitest](https://vitest.dev/) as the runner and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for component assertions.

### Running tests

```bash
npm test                 # one-shot run
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report
```

### Test files

| File | What is tested |
|------|---------------|
| `src/utils.test.ts` | `formatCurrency`, `sortByDateDescending`, `COIN_META`, `COIN_ICONS` |
| `src/hooks/useStatus.test.tsx` | State transitions, correct element rendering |
| `src/cryptoService.test.ts` | API function calls, parameter passing, error propagation |
| `src/PriceAlerts/PriceAlerts.test.tsx` | Alert CRUD, trigger logic, localStorage persistence |
| `src/Today/Today.test.tsx` | Loading/success/error states, offline restore, callback |
| `src/History/History.test.tsx` | Chart/table toggle, day stepper, offline restore |

### Writing new tests

- Co-locate test files next to the source (e.g. `Foo.test.tsx` beside `Foo.tsx`).
- Mock external modules with `vi.mock()`.
- Use `@testing-library/user-event` for user interactions over raw `fireEvent`.

---

## Server Updates (crypto-price-server)

The companion server handles Pusher event broadcasting when the client posts fresh prices.

- Environment variables follow the same naming convention (`PUSHER_*`)
- The `/prices/new` endpoint accepts a price payload and broadcasts on the `coin-prices` Pusher channel under the `prices` event
- CORS should be configured to allow the PWA's origin in production

---

## Roadmap

### Medium priority

| Feature | Description |
|---------|-------------|
| **Portfolio tracker** | Allow users to enter coin quantities; calculate total portfolio value in real time. |
| **Percentage change** | Show 24-hour % change alongside each live price (`pricemultifull` endpoint). |
| **Combined chart** | Normalised multi-coin chart so all coins can be compared on the same axis. |
| **CSV / JSON export** | Button to download the visible historical data. |
| **Offline indicator** | Banner showing the timestamp of cached data when loaded offline. |

### Lower priority / nice-to-have

| Feature | Description |
|---------|-------------|
| **Coin search** | Search any coin supported by CryptoCompare instead of a fixed list. |
| **Sparklines** | Small inline chart in each coin card (last 24 hours from `histohour`). |
| **Theming** | Additional accent colour themes beyond the default indigo. |
| **i18n** | Internationalise labels and number formats for non-AU/US users. |
| **E2E tests** | Playwright tests for the main user flows. |

---

## Credits

- Original tutorial: [Build a Realtime PWA with React](https://medium.com/better-programming/build-a-realtime-pwa-with-react-99e7b0fd3270) by Yomi
- `useStatus` custom hook: [Michael Theodorou](https://levelup.gitconnected.com/usestatus-a-custom-react-hook-for-managing-ui-states-a5b1bc6555bf)
