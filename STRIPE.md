# Stripe Setup Guide

## Subscription Plans

| Plan | Monthly Credits | Stripe Price ID Env Var |
|---|---|---|
| FREE | 1,000 | (no price — default plan) |
| PRO | 10,000 | `STRIPE_PRO_PRICE_ID` |
| BUSINESS | 100,000 | `STRIPE_BUSINESS_PRICE_ID` |

## Required Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Defined in `backend/src/config/configuration.ts` under `stripe.*`.

## Step-by-Step Setup

### 1. Create a Stripe Account

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) and sign up (free, no KYO needed for test mode)
2. Ensure the dashboard toggle says **"Test mode"** (orange badge in top-right)

### 2. Get Your API Key (STRIPE_SECRET_KEY)

1. Navigate to **Developers → API keys**
2. Copy the **Secret key** (starts with `sk_test_`)

### 3. Create Products & Prices (STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID)

1. Go to **Products → Add product**
2. Create **"Pro Plan"**
   - Name: `Pro Plan`
   - Pricing: Recurring, monthly (set your price, e.g. $20/mo)
   - Copy the **Price ID** (starts with `price_`) → this is your `STRIPE_PRO_PRICE_ID`
3. Create **"Business Plan"**
   - Name: `Business Plan`
   - Pricing: Recurring, monthly (set your price, e.g. $50/mo)
   - Copy the **Price ID** (starts with `price_`) → this is your `STRIPE_BUSINESS_PRICE_ID`

> **Note:** FREE plan has no Stripe price — users start on FREE by default and upgrade via checkout.

### 4. Set Up Webhooks (STRIPE_WEBHOOK_SECRET)

**Option A: Stripe Dashboard (for staging/production)**

1. Go to **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://your-backend-domain/api/subscription/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. After creating → click **Reveal** to copy the signing secret (starts with `whsec_`)

**Option B: Stripe CLI (for local development)**

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Log in to your Stripe account
stripe login

# Forward webhooks to your local backend
stripe listen --forward-to localhost:3001/api/subscription/webhook
```

The `stripe listen` command outputs a `whsec_` signing secret — use that as `STRIPE_WEBHOOK_SECRET` in your `.env`.

### 5. Add Variables to Your Environment

Add to your `backend/.env` (or wherever you load env vars):

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_BUSINESS_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Testing

### Test Card Numbers

| Scenario | Card Number |
|---|---|
| Success | `4242 4242 4242 4242` |
| Decline | `4000 0000 0000 0002` |
| Requires authentication | `4000 0025 0000 3155` |

Use any future expiry date, any CVC, any postal code.

### Testing the Flow

1. **Checkout**: As a logged-in user, call `POST /subscription/checkout` with `{"plan": "PRO"}` or `{"plan": "BUSINESS"}` — this returns a Stripe Checkout URL
2. **Complete payment**: Open the URL, use test card `4242 4242 4242 4242`
3. **Webhook processes**: Stripe sends `checkout.session.completed` → backend creates/updates subscription with plan + credits
4. **Monthly renewal**: Stripe sends `invoice.payment_succeeded` → backend resets credits via idempotency check on `lastProcessedInvoiceId`

### Triggering Webhooks Manually (Stripe CLI)

```bash
# Trigger a checkout completion event
stripe trigger checkout.session.completed

# Trigger a subscription update
stripe trigger customer.subscription.updated

# Trigger an invoice payment (monthly credit reset)
stripe trigger invoice.payment_succeeded
```

> All test-mode resources are free — no real charges.
