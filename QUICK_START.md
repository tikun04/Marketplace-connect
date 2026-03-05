# Quick Start Guide

Get Marketplace Connect running locally in 5 minutes.

## 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

## 2. Set Up Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with:
- `DATABASE_URL` - Your PostgreSQL connection string
- `ENCRYPTION_KEY` - Generate with: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`
- Marketplace credentials (see `MARKETPLACE_SETUP.md`)

## 3. Set Up Database

```bash
npx prisma migrate dev
```

This creates all required tables.

## 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 5. Test a Connection

### Shopify

1. In the app, go to **Channels** → **Connect Shopify**
2. Enter your test store domain: `my-test-store.myshopify.com`
3. Authorize when redirected to Shopify
4. Credentials saved automatically

### eBay

1. Go to **Channels** → **Connect eBay**
2. Select Sandbox mode (optional)
3. Authorize when redirected
4. You're connected!

### Amazon

Currently, Amazon requires manual LWA token setup. Follow `MARKETPLACE_SETUP.md` to get refresh token, then provide it to support team for configuration.

## 6. Create & Sync a Product

1. Go to **Products** → **New Product**
2. Fill in details (name, SKU, price, inventory)
3. Click **Create**
4. Click **Sync to Channels**
5. Select channels and click **Sync**
6. Monitor status in **Sync Logs**

## Common Issues

| Issue | Fix |
|-------|-----|
| "ENCRYPTION_KEY not set" | Add 32-char hex key to `.env.local` |
| "Database connection failed" | Check `DATABASE_URL` and PostgreSQL is running |
| "Shopify redirect mismatch" | Verify redirect URI matches app settings exactly |
| "eBay token expired" | System auto-refreshes; restart server if stuck |
| "Amazon SigV4 invalid" | Check AWS credentials in env vars |

## File Structure

```
lib/
├── connectors/
│   ├── shopify-connector.ts    # Shopify API integration
│   ├── ebay-connector.ts       # eBay API integration
│   └── amazon-connector.ts     # Amazon SP-API integration
├── marketplaces/
│   ├── shopify-oauth.ts        # Shopify OAuth handler
│   ├── ebay-oauth.ts           # eBay OAuth handler
│   └── amazon-lwa.ts           # Amazon LWA token exchange
├── sync-engine.ts              # Unified sync orchestration
└── encryption.ts               # Credential encryption

app/api/
├── oauth/
│   ├── shopify/init & callback # Shopify OAuth flow
│   └── ebay/init & callback    # eBay OAuth flow
├── webhooks/
│   └── shopify/                # Shopify webhook receiver
└── products/
    ├── [id]/sync/              # Product sync endpoint
    └── [id]/inventory-sync/    # Inventory sync endpoint

prisma/
└── schema.prisma               # Database schema
```

## Key Concepts

### Connectors
Each marketplace has a connector class that handles API calls. They all extend `BaseConnector` and implement:
- `authenticate()` - Verify credentials
- `createProduct()` - Create new listing
- `updateProduct()` - Update existing listing
- `deleteProduct()` - Remove listing
- `syncInventory()` - Update stock levels

### Sync Engine
Orchestrates syncs across channels:
```typescript
// Sync single product to one channel
await SyncEngine.syncProductToChannel(teamId, productId, "SHOPIFY");

// Sync inventory to all channels
await SyncEngine.syncInventoryToChannels(teamId, productId);
```

### Encrypted Storage
Credentials are encrypted before storage:
```typescript
const encrypted = encryptCredentials(credentials);
// Later:
const credentials = decryptCredentials(encrypted);
```

### OAuth Flow
1. User clicks "Connect [Marketplace]"
2. Calls `/api/oauth/{marketplace}/init`
3. Redirected to marketplace's authorization screen
4. User authorizes
5. Redirected to `/api/oauth/{marketplace}/callback?code=xxx`
6. Code exchanged for token
7. Token encrypted and stored
8. User redirected back to dashboard

## Next Steps

- Read `MARKETPLACE_SETUP.md` for detailed marketplace configuration
- See `IMPLEMENTATION_SUMMARY.md` for architecture details
- Check connector source files for API-specific implementation
- Review sync logs in database for debugging

## Getting Help

1. **Setup questions** → See `MARKETPLACE_SETUP.md`
2. **API errors** → Check database sync logs
3. **Code questions** → Review inline comments in connectors
4. **Marketplace-specific** → Check official marketplace docs:
   - [Shopify Admin API](https://shopify.dev/api/admin-rest)
   - [eBay Sell API](https://developer.ebay.com/docs/sell/content/)
   - [Amazon SP-API](https://developer-docs.amazon.com/sp-api/)

Happy syncing! 🚀
