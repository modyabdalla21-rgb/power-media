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

### Dashboard preview without Supabase

In development, if Supabase isn't configured, the dashboard opens in **preview mode**. A banner shows at the top and no data is stored. To turn preview mode off, set `DASHBOARD_PREVIEW_MODE=false`. In production, preview mode is always off and unauthenticated users are redirected to `/[locale]/login`.

### Connecting Supabase

1. Create a Supabase project.
2. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
3. Apply `supabase/migrations/0001_initial_schema.sql`, either with `supabase db push` or by pasting it into the SQL editor.
4. Create a user in Supabase Auth, then set that user's `profiles.role` to `admin`.

Once this is done, sign-in works, the dashboard requires a session, and the contact form stores leads in `public.leads`.

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
│       ├── (auth)/login/       # Sign-in
│       └── dashboard/
│           ├── page.tsx        # Overview
│           ├── [module]/       # Generic module view (clients, projects, …)
│           ├── settings/
│           └── ai/[tool]/      # POWER AI tool workspaces
├── components/
│   ├── ui/                     # Button, Card, Badge, form controls, Container, SectionHeading
│   ├── brand/                  # Logo + BoltMark (SVG)
│   ├── site/                   # Header, footer, CTA band, page hero, contact & login forms
│   ├── dashboard/              # Sidebar, PageHeader, StatCard, DataTable, EmptyState, Panel
│   └── ai/                     # ToolWorkspace (form → API → output)
├── config/                     # site, navigation, dashboard nav, pricing
├── content/                    # Portfolio & testimonials (real, approved entries only)
├── i18n/                       # Locale config + en/ar dictionaries (typed)
└── lib/
    ├── env.ts / env.server.ts  # Public vs server-only env access
    ├── supabase/               # Browser, server and proxy clients
    ├── ai/                     # Tool registry (schemas, prompts) + provider abstraction
    ├── auth/actions.ts         # signIn / signOut server actions
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
- [ ] **Phase 2**: Supabase auth flows (sign-up, reset, invites), role-based UI, CRUD for clients, projects, campaigns, tasks, team and invoices
- [ ] **Phase 3**: AI provider adapters in `lib/ai/provider.ts` (streaming, usage logging to `ai_generations`, rate limiting, brand profiles)
- [ ] **Phase 4**: subscriptions and payments (Stripe plus Paymob, Moyasar or Tap for local methods), client portal
- [ ] **Phase 5**: tests (unit + Playwright), security review, CSP, performance, deployment (Vercel + Supabase)
