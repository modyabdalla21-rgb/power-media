# POWER MEDIA

**We Create. We Scale. We Dominate.**

An AI-powered digital marketing agency and SaaS platform for Egypt, Saudi Arabia, the UAE and the GCC. It has three parts:

1. **Public website**: Home, About, Services, Our Work, Case Studies, POWER AI, Pricing, Contact
2. **Agency dashboard** (`/[locale]/dashboard`): Overview, Clients, Projects, Campaigns, Tasks, Team, Reports, Revenue, Invoices, Settings
3. **POWER AI platform** (`/[locale]/dashboard/ai`): seven AI tools, each with its own workspace

The whole platform is available in English (LTR) and Arabic (RTL).

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 with design tokens in `src/app/globals.css` |
| Auth / DB | Supabase via `@supabase/ssr` (cookie sessions) |
| Validation | Zod |
| Icons | lucide-react |
| Fonts | Plus Jakarta Sans (Latin) and IBM Plex Sans Arabic, self-hosted via Fontsource |

## Getting started

Requires Node 20 or later.

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Open http://localhost:3000. You will be redirected to `/en` or `/ar` based on your browser language.

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run i18n:check` | Strict English/Arabic dictionary parity |
| `npm run check` | i18n + lint + typecheck |

### Dashboard preview without Supabase

In development, if Supabase isn't configured, the dashboard opens in **preview mode** with a banner, and nothing is stored. Set `DASHBOARD_PREVIEW_MODE=false` to turn it off. In production, preview mode is always off.

## Supabase setup

1. **Environment variables** (Vercel → Settings → Environment Variables, or `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the `sb_publishable_…` key (a legacy anon JWT also works)
   - `SUPABASE_SERVICE_ROLE_KEY`: the `sb_secret_…` key, server only. It's needed to send team invite emails and to remove members.
2. **Database**: in the Supabase SQL Editor, run `supabase/migrations/0001_initial_schema.sql`, `0002_power_ai.sql`, then `0003_client_self_serve.sql`. Each script is idempotent, so it's safe to run again.
3. **Make yourself admin**: sign up on the site, confirm your email, then run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
4. **Auth URLs** (Authentication → URL Configuration):
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `https://<your-domain>/**` (add `http://localhost:3000/**` for local development)
5. **Email templates** (recommended, Authentication → Email Templates). Use token-hash links so they work even when opened in a different browser:
   - Confirm signup: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/en/dashboard`
   - Invite user: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/en/reset-password`
   - Reset password: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/en/reset-password`

   The default templates also work: `/auth/callback` handles `?code=` links, and `/[locale]/auth-complete` handles links that carry the session in the URL fragment.

### Roles

| Role | Access |
|---|---|
| `admin` | Everything: team and invites, revenue, invoices, delete clients and leads |
| `team` | Leads, clients, projects, campaigns, tasks, reports, POWER AI |
| `client` | Read-only portal: their own projects, campaigns, published reports and non-draft invoices |

New sign-ups are `client`. Admins invite staff from **Dashboard → Team**. The role comes from `team_invites`, never from sign-up metadata, and role changes are guarded by a database trigger. To give a client portal access, edit the client record and set **Client portal user**.

### Auth routes

| Route | Purpose |
|---|---|
| `/[locale]/login`, `/signup`, `/forgot-password` | Guest-only pages. Signed-in users are redirected to the dashboard. |
| `/[locale]/reset-password` | Set a new password (after a recovery or invite link) |
| `/auth/callback` | Email-link handler (PKCE code or token hash) |
| `/[locale]/auth-complete` | Completes links that return tokens in the URL fragment |

## POWER AI

Three tools live at `/[locale]/dashboard/ai`. They're for staff (`admin` and `team`):

| Tool | What it produces |
|---|---|
| Ad & Copy Studio | Meta, TikTok and Google Search ads, social posts and short video scripts in English, MSA, Egyptian or Gulf Arabic |
| Campaign & Media Planner | Campaign structure, audience angles, and a budget and channel allocation that adds up to the given total |
| Client Report Generator | A client-ready report built from dashboard records plus the results you paste in. It never invents figures. |

- **Providers:** `lib/ai/provider.ts` tries Gemini (`GEMINI_API_KEY`) first, then Anthropic (`ANTHROPIC_API_KEY`) if it's set. On rate limits, quota or a missing model, it falls back to the next model, then the next provider. Keys are sent as opaque strings, and only normalised error codes reach the browser.
- **AI library** (`/dashboard/ai/history`): every successful generation is saved automatically. Staff can link it to a client or project, rename it, share it with the client, copy it or delete it. Clients see only documents shared with their account.
- **Access** (`0002_power_ai.sql`): admins manage everything, team members manage their own generations, clients have read-only access to shared ones, and generated content can't be edited after it's saved.
- **Limits:** `AI_HOURLY_LIMIT` caps generations per user per hour (default 30), to protect the free-tier quota.

## Client self-serve

- **Sign-up → workspace:** every client sign-up gets their own workspace automatically (a `clients` row with `source = self_serve`, plan `free`), created by the sign-up trigger, or by `ensure_client_workspace()` on first visit for older accounts. No admin approval is needed.
- **Onboarding:** first-time clients land on `/dashboard/onboarding` (Brand profile), then go to the AI identity generator if they don't have a logo yet.
- **Brand kit:** `/dashboard/brand` holds the profile and the active brand kit (`brand_kits`, one active per client). All POWER AI tools add the brand profile and active kit to their prompts.
- **AI Logo & Brand Identity:** `/dashboard/ai/brand-identity` returns structured JSON with positioning, palette, typography, voice and three SVG logo concepts. Any concept can be applied as the active kit. SVGs are sanitised against an allow-list and only ever rendered through `<img>` data URIs.
- **Plans:** `clients.plan_tier` (`free` / `growth` / `pro`), with limits in `src/config/plans.ts`. Usage is counted monthly from `ai_generations` and enforced before any AI call. At the limit, an upgrade modal creates a `client_requests` row. Staff handle requests in **Client requests** and change the tier in **Clients**. There's no payment gateway yet.
- **Access:** clients can edit only their own workspace's brand fields (a trigger protects plan, status, retainer and notes), plus their own brand kits, generations and requests.

## Egyptian mode (مصري)

`/eg` is a third UI locale: right-to-left, `lang="ar-EG"`. Its dictionary is Arabic plus Egyptian colloquial overrides from `src/i18n/dictionaries/eg.ts`. `npm run i18n:check` validates that every override key exists in English with matching placeholders. Choosing Egypt during onboarding offers to switch the interface.

## Project structure

```
src/
├── proxy.ts                    # Locale redirect + dashboard auth guard (Next 16 "proxy")
├── app/
│   ├── globals.css             # Design tokens, base styles, utilities
│   ├── icon.svg                # Favicon (brand bolt)
│   ├── api/
│   │   ├── ai/[tool]/route.ts  # Server-only AI endpoint (validation, auth, provider)
│   │   └── contact/route.ts    # Contact form → Supabase `leads`
│   └── [locale]/
│       ├── layout.tsx          # <html lang dir>, fonts, metadata
│       ├── (site)/…            # Public website pages
│       ├── (auth)/             # login, signup, forgot/reset password, auth-complete
│       └── dashboard/
│           ├── page.tsx        # Overview
│           ├── [module]/       # Config-driven CRUD (leads, clients, projects, campaigns, tasks, reports, invoices)
│           ├── team/           # Members, roles, invitations (admin)
│           ├── revenue/        # MRR, paid & outstanding by currency (admin)
│           ├── settings/
│           └── ai/[tool]/      # POWER AI tool workspaces
├── components/
│   ├── ui/                     # Button, Card, Badge, form controls, Container, SectionHeading
│   ├── brand/                  # Logo + BoltMark (SVG)
│   ├── site/                   # Header, footer, CTA band, page hero, contact & login forms
│   ├── dashboard/              # Sidebar, PageHeader, StatCard, DataTable, EmptyState, Panel
│   └── ai/                     # ToolWorkspace (form → API → output)
├── config/                     # site, navigation, pricing, dashboard nav, CRUD module definitions
├── content/                    # Portfolio & testimonials (real, approved entries only)
├── i18n/                       # Locale config + en/ar dictionaries (typed)
└── lib/
    ├── env.ts / env.server.ts  # Public vs server-only env access
    ├── supabase/               # Browser, server and proxy clients
    ├── ai/                     # Tool registry (schemas, prompts) + provider abstraction
    ├── auth/                   # sign in/up/out, password reset actions, safe redirects
    ├── crud/                   # Generic CRUD validation, server actions, queries
    ├── team/                   # Invites, role changes, member removal, profile
    └── validation/             # Zod schemas
supabase/migrations/            # SQL schema with RLS policies
```

## Design system

- **Colors**: Midnight Navy `#001323`, Electric Blue `#0789E8`, Power Orange `#FF7900`, Energy Yellow `#FFB800`, and White. Surface and text shades are tints of navy and white only. Use the Tailwind tokens (`bg-navy`, `text-blue`, `bg-surface-1`, `text-ink-muted`, `border-line`, …) rather than raw hex values.
- **RTL**: use logical utilities only (`ms-*`, `ps-*`, `start-*`, `text-start`, `border-s`). Add `flip-rtl` to directional icons such as arrows. Use the `rtl:` variant for one-off cases.
- **Motion**: subtle fade-ups and glows. `prefers-reduced-motion` is respected globally.
- The **logo** is the vector `Logo` component. `brand-reference.jpg` is the source reference.

## Internationalization

- Dictionaries live in `src/i18n/dictionaries/{en,ar}.ts`. `ar.ts` is typed against `en.ts`, so a missing translation fails the build.
- To add a locale, extend `locales` and `localeMeta` in `src/i18n/config.ts` and add a dictionary for it.

## Security notes

- Secrets are read only in `lib/env.server.ts`, which imports `server-only`. Importing it from client code breaks the build.
- AI keys never reach the browser. The client posts to `/api/ai/[tool]`, and that route validates the input with Zod, requires a session when Supabase is configured, and strips unknown fields.
- The tool forms only receive labels and options. System prompts stay on the server.
- The contact form has Zod validation and a honeypot field.
- Security headers are set in `next.config.ts`. RLS is enabled on every table.

## Content integrity

The site doesn't publish invented testimonials, clients, results or prices:

- `content/portfolio.ts` holds portfolio items and testimonials. While it's empty, the site shows honest placeholder states.
- `config/pricing.ts` holds plan prices. `null` renders as "Custom quote" or "Early access".
- `config/site.ts` holds the contact email and social links. Empty values are hidden.
- The POWER AI tools are labeled "In development". Until a provider is connected, the API returns `503 AI_NOT_CONFIGURED` and the UI says so. It never shows fake output.

## Roadmap

- [x] **Phase 1**: design system, public website, navigation, responsive and RTL layouts, dashboard foundation, AI tool interfaces
- [x] **Phase 2**: Supabase auth (sign-up, sign-in, reset, invites), roles with RLS, live contact leads, CRUD dashboard, live KPIs and revenue
- [x] **Phase 3**: POWER AI (Gemini + optional Anthropic), Ad & Copy Studio, Campaign & Media Planner, Client Report Generator, AI library with sharing
- [ ] **Phase 4**: subscriptions and payments (Stripe plus Paymob, Moyasar or Tap for local methods), client portal
- [ ] **Phase 5**: tests (unit + Playwright), security review, CSP, performance, deployment (Vercel + Supabase)
