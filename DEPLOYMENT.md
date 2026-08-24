# Everante — Deployment Notes

This is written for whoever is doing the deploy, not necessarily a developer.
Follow it in order.

## 1. Frontend — Hostinger

Upload the **contents of this repo's root folder** — `index.html`,
`dashboard.html`, `css/`, `js/`, `assets/` — to Hostinger's `public_html`
(or whichever folder Hostinger serves as the site root). Do **not** upload
the `backend/` folder to Hostinger — that runs on Render, not Hostinger.

## 2. Backend — Render environment variables

Render does **not** read the `.env` file committed to (or excluded from) this
repo. Every variable `backend/config.js` needs must be entered by hand in the
Render dashboard, under the backend service → **Environment**. After saving,
Render automatically restarts the service to pick up the new values.

Set all of these:

- `PORT`
- `NODE_ENV` (`production`)
- `BASE_URL`
- `ALLOWED_ORIGINS` — see item 8 below
- `ADMIN_EMAILS`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `MOCK_WHATSAPP` (`true` for now — see item 7)
- `AISENSY_API_KEY`
- `AISENSY_CAMPAIGN_NAME`
- `WHATSAPP_GROUP_LINK_PLAN_2W`
- `WHATSAPP_GROUP_LINK_PLAN_4W`
- `WHATSAPP_GROUP_LINK_PLAN_8W`

## 3. Razorpay webhook

In the Razorpay dashboard, register a webhook with:

- **URL:** `https://everante-naas.onrender.com/webhook/razorpay`
- **Events:** `payment.captured` and `payment.failed` (only these two)
- **Secret:** must be the exact same string as `RAZORPAY_WEBHOOK_SECRET` in
  Render's environment variables — if they don't match character-for-character,
  every webhook call will be rejected as an invalid signature and no
  subscription will ever activate.

## 4. Supabase — email template (critical, easy to miss)

Go to **Supabase → Authentication → Emails → Magic Link** template.

The frontend calls `verifyOtp()` expecting the customer to type in a
6-digit code. Supabase's default Magic Link template sends a clickable
**link** instead of a code. If the template still says
`{{ .ConfirmationURL }}`, login is broken end-to-end — customers get an
email with a link that doesn't match what the page is asking for.

**The template must reference `{{ .Token }}`, not `{{ .ConfirmationURL }}`,**
so the email shows the 6-digit code the customer types into the site.

## 5. Supabase — custom SMTP (required before real users sign up)

Go to **Supabase → Authentication → Emails → SMTP Settings**.

Supabase's built-in email sender is rate-limited to a handful of emails per
hour, and when the limit is hit it **fails silently** — the customer never
gets a code and never gets an error either. Before any real customer traffic,
custom SMTP must be configured there. DNS records for the sending domain
(everantenaas.com) will need to be added wherever its DNS is managed.

## 6. Razorpay is in test mode

The `RAZORPAY_KEY_ID` currently in use is a `rzp_test_...` key. Real payments
will not work until Razorpay's KYC is completed and the live key/secret pair
replaces the test ones in Render's environment variables (and the webhook
secret is re-registered to match).

## 7. WhatsApp sending is mocked

`MOCK_WHATSAPP=true` means no automatic WhatsApp message is sent through
AiSensy when a payment is captured — this is intentional for now (AiSensy
live sending isn't implemented yet). The actual mechanism customers use is
the **group-join link shown on the checkout success screen** once their
subscription is active — that part is live and does not depend on AiSensy.

## 8. CORS — ALLOWED_ORIGINS

If the site is reachable at **both** `https://everantenaas.com` and
`https://www.everantenaas.com`, both must be listed (comma-separated) in
`ALLOWED_ORIGINS`. Whichever one is left out will have its checkout/login
requests silently blocked by the browser.
