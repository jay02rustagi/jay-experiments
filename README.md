# SpyneAuto AI

An AI sales assistant for car dealerships that takes a buyer from first question to booked test drive, and hands the dealer a scored lead.

Built as a product experiment: how much of a dealership's presales, sales and aftersales conversation can one assistant carry, and what does the dealer need to see to trust it?

## What it does

**For the buyer: Vini, the assistant**
- **Presales:** qualifies budget and use case, then recommends cars from live inventory.
- **Sales:** pushes to a confirmed test drive through an in-chat booking form.
- **Aftersales:** acts as a service concierge for existing owners.

**For the dealer: the admin console (`/admin`)**
- **CRM:** every chat becomes a lead with a Cold / Warm / Hot intent score, extracted details (name, budget, use case, urgency) and the full transcript.
- **Service:** tracks owned cars, odometer and service history.

## How it works

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), React 19, Tailwind 4 |
| AI | Gemini 2.5 Flash via the Vercel AI SDK, with tool calls for `list_cars` and `book_demo` |
| Data | Supabase (Postgres): `customers`, `vendor_leads`, `customer_cars` — see `supabase/schema.sql` |
| Hosting | Vercel |

**Reliability:** the chat runs a three-tier fallback. It tries the primary Gemini key, then a secondary key, then a scripted reply, so a buyer never hits a dead chat. A daily Vercel cron pings `/api/health` to keep the database awake.

**Lead scoring:** after each reply, the conversation is re-read to extract lead fields. Three or more filled fields make a lead Hot, one or more make it Warm. A confirmed booking makes it Hot and moves it to the Sales stage.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the keys below
npm run dev                  # http://localhost:3000
```

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes | Primary Gemini key |
| `SECONDARY_GEMINI_API_KEY` | no | Fallback Gemini key |
| `ADMIN_PASSWORD` | no | If set, `/admin` asks for it (any username). Leave unset to keep the dealer console open for demos. |

To set up a fresh database, run `supabase/schema.sql` in the Supabase SQL editor.
