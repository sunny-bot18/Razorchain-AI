# RazorChain AI

RazorChain AI is a demo-ready B2B settlement workflow: delivery evidence is extracted by a vision agent, checked by deterministic rules, screened for prompt injection, and only then becomes eligible for payment capture.

## What is real and what is simulated

The application uses the official Razorpay Node SDK only when `RAZORCHAIN_PAYMENT_PROVIDER=razorpay` and valid `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` values are configured. Its default is the clearly identified local mock provider—no funds are reserved, captured, or settled externally. Razorpay UPI Reserve Pay requires account eligibility and activation, so it is represented by the provider abstraction rather than being falsely presented as a live reservation.

Gemini is used for image/PDF analysis when `GOOGLE_API_KEY` is configured. Without it, only the supplied plain-text fixtures use a narrow, deterministic demo parser; uploaded image/PDF evidence is not claimed to have been AI analyzed.

## Architecture

```text
Buyer/Seller UI → Next.js route handlers → PostgreSQL
                                      ├─ Contract Agent
                                      ├─ Vision Agent → Aegis Firewall
                                      ├─ Deterministic Verification Engine
                                      └─ Execution Agent → PaymentProvider
                                                            ├─ Razorpay SDK
                                                            └─ Demo mock
```

The LLM extracts data only. `verification-engine.ts` compares evidence with the stored contract and `execution-agent.ts` requires an approved result, SAFE Aegis result, authorized reservation, confidence threshold, valid state, and no prior execution before capture.

## Run locally

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and a strong `NEXTAUTH_SECRET`.
2. Start PostgreSQL with `docker compose up db -d`, then run `npx drizzle-kit migrate`.
3. Run `npm install` and `npm run dev`.
4. On the home page, choose **Launch demo**, then log in with `buyer@demo.com` / `password123`.

The seeded transaction is `RC-DEMO-1045`. Reserve it as the buyer, sign in as `seller@demo.com` to upload files from `sample-docs/`, then return as the buyer to verify and execute its simulated settlement. The three `.txt` fixtures are intentionally accepted only to make the offline demo repeatable.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm test
```

## Deployment notes

Use a managed PostgreSQL database, persist uploads in object storage rather than the local `uploads/` directory, configure a real Razorpay webhook endpoint, and store all credentials in the deployment platform’s secret manager. Never put `RAZORPAY_KEY_SECRET`, `GOOGLE_API_KEY`, or `NEXTAUTH_SECRET` in client-side variables.
