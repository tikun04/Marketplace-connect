# Marketplace Integration Setup Guide

This guide walks you through setting up production-grade integrations for Shopify, eBay, and Amazon SP-API.

## Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL database
- A 32-character hex encryption key for credentials storage
- Developer apps/credentials from each marketplace

---

## Shopify Setup

### 1. Create a Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create a new app or use an existing one
3. Navigate to **Configuration** and set:
   - **App URL**: `https://your-domain.com` (or `http://localhost:3000` for development)
   - **Allowed redirection URL(s)**: `https://your-domain.com/api/oauth/shopify/callback`

### 2. Get API Credentials

1. Go to **API credentials** in your app settings
2. Copy the following:
   - **Client ID** → `SHOPIFY_CLIENT_ID`
   - **Client secret** → `SHOPIFY_CLIENT_SECRET`

### 3. Set Required Scopes

Add these OAuth scopes to your app configuration:
```
write_products
read_products
write_inventory
read_inventory
read_locations
```

### 4. Configure Environment Variables

```env
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
SHOPIFY_REDIRECT_URI=https://your-domain.com/api/oauth/shopify/callback
```

### 5. Webhook Setup (Optional, for real-time updates)

Register webhooks in your app settings:
- `products/create`
- `products/update`
- `products/delete`
- `inventory_levels/update`

Webhook endpoint: `https://your-domain.com/api/webhooks/shopify`

### Testing in Development

1. Install the app in a development store
2. User clicks "Connect Shopify" → redirected to `/api/oauth/shopify/init`
3. User authorizes → redirected to Shopify's consent screen
4. User grants permissions → redirected to `/api/oauth/shopify/callback`
5. Credentials saved encrypted in database

---

## eBay Setup

### 1. Create eBay Developer Account

1. Go to [eBay Developer Portal](https://developer.ebay.com/)
2. Register as a developer and create an account
3. Create a new app and request sell.inventory and sell.account scopes

### 2. Get API Credentials

In your app settings, copy:
- **Client ID** → `EBAY_CLIENT_ID`
- **Client secret** → `EBAY_CLIENT_SECRET`

### 3. Set RU Name (Redirect URL)

1. In your app settings, add a RU Name (Redirect URL):
   - Production: `https://your-domain.com/api/oauth/ebay/callback`
   - Sandbox: Same format but using sandbox shop

2. Copy the RU Name value → `EBAY_RU_NAME`

### 4. Configure Environment Variables

```env
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret
EBAY_REDIRECT_URI=https://your-domain.com/api/oauth/ebay/callback
EBAY_RU_NAME=your_ru_name
EBAY_SANDBOX_MODE=false  # Set to true for sandbox testing
```

### 5. Get OAuth Token (One-Time)

eBay requires initial user consent. The flow is:
1. User clicks "Connect eBay"
2. Redirected to `/api/oauth/ebay/init`
3. Redirected to eBay's authorization screen
4. User grants permissions
5. Redirected back with auth code
6. System exchanges code for refresh token
7. Refresh token stored encrypted and used for all subsequent API calls

### Important: Token Refresh

The connector automatically refreshes access tokens using the stored refresh token. No manual intervention needed.

### Testing in Development

1. Use eBay sandbox credentials: `EBAY_SANDBOX_MODE=true`
2. Create a sandbox seller account at [eBay Sandbox](https://sandbox.ebay.com/)
3. Connect through the app UI
4. Test product sync and inventory updates

---

## Amazon SP-API Setup

### 1. Create Amazon Seller Central Account

1. Go to [Seller Central](https://sellercentral.amazon.com/)
2. Complete account verification
3. Go to **Apps and Services** → **Develop Apps**

### 2. Create SP-API App

1. Register as a developer
2. Create a new app with these permissions:
   - `sellingpartnerapi::operations/products:ReadProductCatalog`
   - `sellingpartnerapi::operations/products:UpdateProductCatalog`
   - `sellingpartnerapi::operations/inventory:ManageInventory`

### 3. Get LWA Credentials

1. Go to **LWA Credentials** section
2. Create a new security profile
3. Copy:
   - **Client ID** → `AMAZON_CLIENT_ID`
   - **Client secret** → `AMAZON_CLIENT_SECRET`

### 4. Authorize with LWA (One-Time)

You need to exchange auth code for a refresh token:

```bash
curl -X POST https://api.amazon.com/auth/o2/tokenrefresh \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=YOUR_REDIRECT_URI"
```

From the response, copy the `refresh_token` value.

### 5. Get AWS Credentials

For SP-API request signing, you need AWS IAM credentials:

1. Go to **IAM** in AWS Console
2. Create a new IAM user or use existing one
3. Attach policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "execute-api:Invoke"
         ],
         "Resource": "arn:aws:execute-api:*:*:sellingpartnerapi-*"
       }
     ]
   }
   ```
4. Generate access key and secret key

### 6. Configure Environment Variables

```env
AMAZON_CLIENT_ID=your_client_id
AMAZON_CLIENT_SECRET=your_client_secret
AMAZON_REFRESH_TOKEN=your_refresh_token
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AMAZON_REGION=NA  # NA (North America), EU, or FE (Far East)
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER  # US marketplace ID
```

### Important: Request Signing

All SP-API requests must be signed with AWS SigV4. The connector handles this automatically using the provided AWS credentials.

### Testing in Development

1. Use your real seller account or sandbox account
2. Test listings creation/update with the app UI
3. Verify inventory updates are reflected in Seller Central

---

## Encryption Key Setup

Generate a 32-character hex encryption key for storing credentials:

```bash
# Generate using Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 16
```

Set in environment:
```env
ENCRYPTION_KEY=your_generated_hex_key
```

---

## Database Schema Updates

Run Prisma migrations to set up the required tables:

```bash
npx prisma migrate dev --name init
```

This creates tables for:
- Users and Teams
- ChannelCredentials (encrypted storage)
- Products and ProductChannelListings
- Sync records and logs
- WebhookEvents

---

## Integration Testing

### Test Shopify Connection

```bash
curl -X POST http://localhost:3000/api/oauth/shopify/init \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "your_team_id",
    "shop": "your-store.myshopify.com"
  }'
```

This returns an authorization URL. Visit it to authorize.

### Test eBay Connection

```bash
curl -X POST http://localhost:3000/api/oauth/ebay/init \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "your_team_id",
    "sandboxMode": true
  }'
```

### Test Product Sync

Once connected, use the app UI or API to:
1. Create a product in the dashboard
2. Click "Sync to Channel"
3. Monitor sync status and logs

---

## Troubleshooting

### Shopify
- **"Invalid OAuth code"**: Ensure redirect URI matches exactly in app settings
- **"Signature verification failed"**: Check webhook secret is correct
- **Token expired**: Shopify tokens don't expire by default, but re-auth if issues persist

### eBay
- **"Unauthorized"**: Ensure refresh token is valid and not expired (refresh automatically)
- **Inventory not updating**: Check marketplace ID and location settings
- **Sandbox vs Production**: Verify `EBAY_SANDBOX_MODE` setting matches your environment

### Amazon
- **"Invalid access token"**: System should auto-refresh; check `AMAZON_REFRESH_TOKEN`
- **SigV4 signing failed**: Verify AWS credentials are correct
- **Region mismatch**: Ensure `AMAZON_REGION` matches your marketplace
- **Rate limiting**: Implement exponential backoff in production (already in place)

---

## Production Deployment Checklist

- [ ] All environment variables set in production hosting platform
- [ ] ENCRYPTION_KEY is securely stored (not in code)
- [ ] Database is backed up and secured
- [ ] Webhook endpoints are HTTPS
- [ ] Refresh tokens are securely stored in encrypted database
- [ ] Add rate limiting to API endpoints
- [ ] Monitor sync logs for errors
- [ ] Set up alerts for failed syncs
- [ ] Test all three channels before going live
- [ ] Document team's marketplace credentials and app IDs

---

## API Endpoints

### OAuth
- `POST /api/oauth/shopify/init` - Initiate Shopify connection
- `GET /api/oauth/shopify/callback` - Shopify callback handler
- `POST /api/oauth/ebay/init` - Initiate eBay connection
- `GET /api/oauth/ebay/callback` - eBay callback handler

### Webhooks
- `POST /api/webhooks/shopify` - Shopify webhook receiver

### Sync
Use the dashboard UI or implement:
- `POST /api/products/{id}/sync` - Sync product to channel
- `POST /api/products/{id}/inventory-sync` - Sync inventory across all channels
- `GET /api/syncs` - List sync history with logs

---

## Additional Resources

- [Shopify Admin API Docs](https://shopify.dev/api/admin-rest)
- [eBay Sell API Docs](https://developer.ebay.com/docs/sell/content/)
- [Amazon SP-API Docs](https://developer-docs.amazon.com/sp-api/)
