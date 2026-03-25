# Ev Yemekleri Marketplace

A comprehensive Turkish home-cooked food marketplace mobile app built with Expo React Native + Express API + PostgreSQL.

## Architecture

- **Frontend**: Expo React Native (mobile, web-compatible)
  - Path: `artifacts/mobile/`
  - Framework: Expo Router v6 (file-based routing)
  - State: React Query + AsyncStorage
  - Styling: StyleSheet with warm orange/cream/red theme (#E8651A primary)
  - Font: Inter (400/500/600/700) via @expo-google-fonts/inter

- **Backend**: Express.js API Server
  - Path: `artifacts/api-server/`
  - Auth: Custom JWT (HMAC-SHA256 password hashing), `JWT_SECRET` env var required
  - ORM: Drizzle + PostgreSQL (`@workspace/db`)
  - Build: esbuild via `build.mjs`

- **Database**: PostgreSQL (Replit-managed)
  - Schema: `packages/db/src/schema.ts`
  - Migrations: `packages/db/drizzle/`

- **Scripts**: `scripts/` — seed script for demo data

## Key Features

- Buyer/seller dual roles
- Food listings with categories, ratings, prep time, stock
- Cart system (single seller per cart, enforced)
- Orders with status tracking (received → preparing → ready → on_the_way → delivered)
- JWT authentication + AsyncStorage persistence
- Chat/messaging between buyers and sellers
- Seller wallet with pending/earning transactions
- Reviews & ratings (buyer → seller + product)
- Favorites system
- Seller dashboard (my products, wallet)
- Demo seed data (5 sellers, 20+ products, 15 orders, 15 reviews)

## Demo Accounts

- **Buyer**: buyer@demo.com / demo123
- **Seller (Ayşe)**: ayse@demo.com / demo123
- Other sellers: fatma@demo.com, zeynep@demo.com, elif@demo.com, meryem@demo.com (all: demo123)

## App Screens

### Tabs
- `(tabs)/index.tsx` — Home/Discover: product listing with search + category filter
- `(tabs)/explore.tsx` — Sellers list
- `(tabs)/orders.tsx` — Orders (buyer view + seller view toggle)
- `(tabs)/messages.tsx` — Conversations list
- `(tabs)/profile.tsx` — User profile + navigation

### Detail Screens
- `product/[id].tsx` — Product detail with add-to-cart, favorites, seller info
- `seller/[id].tsx` — Seller profile with their products and reviews
- `order/[id].tsx` — Order detail with status history + update (seller)
- `chat/[id].tsx` — Chat conversation
- `checkout.tsx` — Checkout flow: address, note, payment method, summary
- `auth.tsx` — Login/Register with role selection
- `wallet.tsx` — Seller wallet with transaction history
- `my-products.tsx` — Seller's product management
- `favorites.tsx` — Buyer's favorite products

## API Routes

- `GET /api/products` — list with search/category/seller filters
- `GET /api/products/:id` — single product + isFavorited for authed user
- `GET /api/products/sellers` — sellers list with product count
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — get JWT token
- `GET /api/auth/me` — current user profile
- `GET/POST /api/orders` — list/create orders
- `GET /api/orders/:id` — order detail
- `PUT /api/orders/:id/status` — update order status
- `GET /api/chat/conversations` — conversation list
- `GET/POST /api/chat/messages` — messages in a conversation
- `GET /api/favorites` — user's favorites
- `POST /api/favorites/toggle` — toggle favorite
- `GET /api/wallet` — seller wallet + transactions
- `GET/POST /api/reviews` — reviews

## Development

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start mobile/expo
pnpm --filter @workspace/mobile run dev

# Run seed script
pnpm --filter @workspace/scripts run seed

# DB migrations
pnpm --filter @workspace/db run push
```

## Important Notes

- **inArray()** from drizzle-orm must be used for `WHERE id = ANY(...)` patterns (NOT raw SQL `ANY()`)
- Tab layout: `(tabs)/_layout.tsx` uses `expo-router` Tabs + Feather icons (no NativeTabs/SymbolView on web)
- Web insets: top=67px, bottom=34px (use `Platform.OS === "web"` check)
- Cart enforces single seller: adding a different seller's item clears the cart first
- Platform fee: 10% of subtotal (seller receives 90%); delivery fee: ₺15 flat
- Orders `statusHistory` is a JSON array: `{status: string, timestamp: string}[]`
- `react-native-maps` pinned to 1.18.0 (version mismatch warning is expected)
- `react-native-keyboard-controller` at 1.21.2 (mismatch warning expected)
- `setBaseUrl()` called in `_layout.tsx` with `EXPO_PUBLIC_DOMAIN`
- `setAuthTokenGetter()` called in `AuthContext.tsx`
