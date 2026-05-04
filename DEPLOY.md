# Deploying VibeCode (Vercel)

This matches **Phase 4 — Hour 11–12** in `docs/hackathon-phasewise.md`.

## 1. Build locally (optional sanity check)

```bash
npm ci
npm run build
```

## 2. Create the Vercel project

- Import this repository in the [Vercel dashboard](https://vercel.com/new).
- Framework preset: **Next.js** (default).

## 3. Environment variables

Add these in **Project → Settings → Environment Variables** (Production and Preview as needed):

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; never expose to the browser |
| `GITHUB_CLIENT_ID` | OAuth app for **repo access** (dashboard), not login |
| `GITHUB_CLIENT_SECRET` | |
| `GITLAB_CLIENT_ID` | Optional if you demo GitLab |
| `GITLAB_CLIENT_SECRET` | |
| `LLM_PROVIDER` | `groq` or `nvidia` |
| `GROQ_API_KEY` | If using Groq |
| `NVIDIA_API_KEY` | If using NVIDIA |
| `LLM_MODEL_PRIMARY` | e.g. `llama3-70b-8192` |
| `LLM_MODEL_FAST` | |
| `LLM_MODEL_AGENT` | |
| `LLM_MAX_TOKENS_CODE` | |
| `LLM_MAX_TOKENS_TEXT` | |
| `LLM_MAX_TOKENS_AGENT` | |
| `LLM_TEMPERATURE` | e.g. `0.1` |
| `NEXT_PUBLIC_APP_URL` | **Production:** `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Strong random string |
| `NEXTAUTH_URL` | Same as public app URL in production |
| `NODE_ENV` | `production` on Vercel (usually set automatically) |

## 4. OAuth callback URLs

After you have a production URL:

- **GitHub OAuth App:** set **Authorization callback URL** to  
  `https://your-app.vercel.app/api/auth/github/callback`  
  (replace with your real host; remove or keep localhost for local dev in a separate app if you prefer).
- **GitLab application:** set **Redirect URI** to  
  `https://your-app.vercel.app/api/auth/gitlab/callback`.

## 5. Deploy

```bash
npx vercel --prod
```

Or push to the connected Git branch and let Vercel build from Git.

## 6. Smoke tests (Playwright)

One-time browser install:

```bash
npx playwright install chromium
```

With the dev server (Playwright can start it automatically):

```bash
npm run test:e2e
```

Against an already running app:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test
```

CI tip: run `npm run build` then `npm run start` in the workflow, set `PLAYWRIGHT_BASE_URL`, and run `npx playwright test` with `webServer` disabled or pointed at `start` (see `playwright.config.ts`).

## 7. Demo script

Rehearse the flow in `docs/hackathon-phasewise.md` (demo script under **Hour 11–12**) so signup → connect Git → repo → branch → AI edit → push → PR works end-to-end on production.
