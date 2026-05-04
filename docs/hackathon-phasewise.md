# 🚀 VibeCode — AI-Powered No-Code Prototyping Platform

> **Goal:** Build a platform where non-developers can connect their GitHub/GitLab repo, describe changes in plain English, preview results, and raise a PR — all powered by AI.
> **Time Limit:** 12 Hours | **Total Phases:** 4 | **Total Steps:** 10
> **Stack:** Next.js 14, Supabase, GROQ / NVIDIA AI, GitHub API, GitLab API

---

## 📄 Project Files

| File | Purpose |
|---|---|
| `README.md` (this file) | Full roadmap, architecture, and implementation guide |
| `.env.sample` | Template for all environment variables — copy and fill in |
| `.env.local` | Your actual local secrets — **never commit this** |

> 💡 **Workflow:** Copy `.env.sample` → rename to `.env.local` → fill in your keys. Update both files whenever a new variable is added.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Database Schema](#database-schema)
4. [Environment Variables](#environment-variables)
5. [Phase-wise Execution Plan](#phase-wise-execution-plan)
   - [Phase 1 — Foundation (Hour 1–3)](#phase-1--foundation-hour-13)
     - [Hour 1–2: Project Setup & Auth](#-hour-12--project-setup--auth)
     - [Hour 2–3: Dashboard & Git OAuth Connection](#-hour-23--dashboard--git-oauth-connection)
   - [Phase 2 — Core AI Features (Hour 3–7)](#phase-2--core-ai-features-hour-37)
     - [Hour 3–4: Repo Selector & README Parser](#-hour-34--repo-selector--readme-parser)
     - [Hour 4–6: Core AI Editor](#-hour-46--core-ai-editor-most-critical)
     - [Hour 6–7: Preview System](#-hour-67--preview-system)
   - [Phase 3 — Git Automation (Hour 7–9)](#phase-3--git-automation-hour-79)
     - [Hour 7–8: Branch Creation & Push](#-hour-78--branch-creation--push)
     - [Hour 8–9: AI PR/MR Creation](#-hour-89--ai-prmr-creation)
   - [Phase 4 — Ship It (Hour 9–12)](#phase-4--ship-it-hour-912)
     - [Hour 9–10: UI/UX Polish](#-hour-910--uiux-polish)
     - [Hour 10–11: Testing & Bug Fixes](#-hour-1011--testing--bug-fixes)
     - [Hour 11–12: Demo Prep & Deploy](#-hour-1112--demo-prep--deploy)
6. [API Routes Reference](#api-routes-reference)
7. [AI Model Usage Guide](#ai-model-usage-guide)
8. [UI Component Checklist](#ui-component-checklist)
9. [Risk Management](#risk-management)
10. [Changelog](#-changelog)

---

## Project Overview

**What you're building:** "VibeCode" — a no-code AI prototyping platform where anyone can modify a real codebase visually, preview changes, and ship a PR without touching a terminal.

### Core User Flow

```
Landing Page
      ↓
Sign Up → Email + Password only  (Supabase Auth — no GitHub/GitLab here)
      ↓
Login  → Email + Password only
      ↓
Dashboard  ← user lands here after login
      ↓
Connect GitHub  →  GitHub OAuth  (repo access only — separate from login)
Connect GitLab  →  GitLab OAuth  (repo access only — separate from login)
      ↓
Select Repo → Select Branch
      ↓
AI reads README → Understands project setup
      ↓
User describes change in plain English
      ↓
AI modifies code → Shows diff preview
      ↓
User approves → New branch created
      ↓
Code pushed → AI raises PR/MR automatically ✅
```

### Auth vs Git Connection — Important Distinction

| | Supabase Auth (Login) | GitHub / GitLab OAuth (Git Connect) |
|---|---|---|
| **Purpose** | Log into VibeCode | Access the user's repos |
| **Where** | `/login` and `/signup` pages | `/dashboard` — after login |
| **Method** | Email + Password only | OAuth App flow |
| **Stores** | Supabase session cookie | `access_token` in `git_connections` table |
| **Used for** | Identifying who the user is | All Git API calls (read files, push, create PR) |
| **Required env vars** | Supabase URL + keys only | `GITHUB_CLIENT_ID/SECRET`, `GITLAB_CLIENT_ID/SECRET` |

> ✅ **Rule:** The login page has zero connection to GitHub/GitLab. The dashboard's "Connect" buttons are purely for granting repo access to the app.

---

## Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Full-stack framework |
| Database + Auth | Supabase | Auth, storage, real-time |
| AI (Fast) | GROQ `llama3-70b-8192` | Code edits, README parsing |
| AI (Complex) | NVIDIA `llama-3.1-nemotron-70b` | Multi-file reasoning |
| GitHub Integration | Octokit SDK | Repos, branches, commits, PRs |
| GitLab Integration | GitLab REST API | Repos, branches, commits, MRs |
| Styling | Tailwind CSS + shadcn/ui | UI components |
| Code Preview | react-diff-viewer | Before/after code diff |
| Deployment | Vercel | Instant Next.js deployment |

### Install Commands

```bash
npx create-next-app@latest vibecode --typescript --tailwind --app
cd vibecode

# Core dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @octokit/rest
npm install axios
npm install react-diff-viewer-continued
npm install react-syntax-highlighter
npm install @types/react-syntax-highlighter

# UI Components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label badge toast tabs dialog dropdown-menu
```

---

## Database Schema

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Git Connections (stores GitHub/GitLab OAuth tokens)
create table git_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  provider text not null,           -- 'github' | 'gitlab'
  access_token text not null,       -- encrypted OAuth token
  username text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Projects (repos the user has selected to work on)
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  connection_id uuid references git_connections on delete cascade,
  repo_name text not null,
  repo_full_name text not null,     -- e.g. "username/my-repo"
  repo_url text,
  selected_branch text default 'main',
  language text,
  created_at timestamptz default now()
);

-- AI Sessions (one session per "edit round")
create table ai_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  user_id uuid references auth.users on delete cascade,
  prompt text not null,
  status text default 'pending',    -- 'pending' | 'running' | 'done' | 'error'
  changes jsonb,                    -- { "path/to/file.tsx": "new content" }
  new_branch text,
  pr_url text,
  pr_title text,
  created_at timestamptz default now()
);

-- Chat Messages (conversation history per session)
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ai_sessions on delete cascade,
  role text not null,               -- 'user' | 'assistant'
  content text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table git_connections enable row level security;
alter table projects enable row level security;
alter table ai_sessions enable row level security;
alter table chat_messages enable row level security;

-- RLS Policies (users can only see their own data)
create policy "Users see own connections" on git_connections for all using (auth.uid() = user_id);
create policy "Users see own projects" on projects for all using (auth.uid() = user_id);
create policy "Users see own sessions" on ai_sessions for all using (auth.uid() = user_id);
create policy "Users see own messages" on chat_messages for all using (
  session_id in (select id from ai_sessions where user_id = auth.uid())
);
```

---

## Environment Variables

> 📁 See `.env.sample` for the full documented template.
> Copy it to `.env.local` and fill in your values. **Never commit `.env.local`.**

### Quick Reference — All Variables

```env
# ── SUPABASE ─────────────────────────────────────────────────────────────────
# https://supabase.com/dashboard → Project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ── GITHUB OAUTH ──────────────────────────────────────────────────────────────
# https://github.com/settings/developers → OAuth Apps → New OAuth App
# Callback URL: http://localhost:3000/api/auth/github/callback
# NOTE: This is for REPO ACCESS from the dashboard — NOT for login
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# ── GITLAB OAUTH ──────────────────────────────────────────────────────────────
# https://gitlab.com/-/profile/applications
# Redirect URI: http://localhost:3000/api/auth/gitlab/callback
# Scopes: api, read_user, read_repository, write_repository
# NOTE: This is for REPO ACCESS from the dashboard — NOT for login
GITLAB_CLIENT_ID=your_gitlab_client_id
GITLAB_CLIENT_SECRET=your_gitlab_client_secret

# ── AI PROVIDER ───────────────────────────────────────────────────────────────
# Set LLM_PROVIDER to "groq" or "nvidia" — only one API key is required.
LLM_PROVIDER=groq                        # "groq" | "nvidia"

GROQ_API_KEY=your_groq_api_key           # https://console.groq.com/keys
NVIDIA_API_KEY=your_nvidia_api_key       # https://integrate.api.nvidia.com

# ── LLM MODEL CONFIG ──────────────────────────────────────────────────────────
# GROQ models:   llama3-70b-8192 | llama3-8b-8192 | mixtral-8x7b-32768
# NVIDIA models: meta/llama-3.1-70b-instruct | nvidia/llama-3.1-nemotron-70b-instruct

LLM_MODEL_PRIMARY=llama3-70b-8192        # Used for: code modification
LLM_MODEL_FAST=llama3-8b-8192           # Used for: commit messages, PR descriptions
LLM_MODEL_AGENT=llama3-70b-8192         # Used for: multi-file reasoning, agent tasks

LLM_MAX_TOKENS_CODE=4000                 # Max tokens for code edits
LLM_MAX_TOKENS_TEXT=800                  # Max tokens for text generation
LLM_MAX_TOKENS_AGENT=6000               # Max tokens for agent/multi-step tasks
LLM_TEMPERATURE=0.1                      # Keep low (0.1) for consistent code output

# ── APP CONFIG ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### When to Use Which AI Provider

| Scenario | Set `LLM_PROVIDER` | Recommended Model |
|---|---|---|
| You have a GROQ key | `groq` | `LLM_MODEL_PRIMARY=llama3-70b-8192` |
| You have an NVIDIA key | `nvidia` | `LLM_MODEL_PRIMARY=meta/llama-3.1-70b-instruct` |
| Best code quality | `nvidia` | `LLM_MODEL_AGENT=nvidia/llama-3.1-nemotron-70b-instruct` |
| Fastest responses | `groq` | All models — GROQ inference is extremely fast |

---

## Phase-wise Execution Plan

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1          PHASE 2              PHASE 3        PHASE 4           │
│  Foundation       Core AI Features     Git Automation  Ship It          │
│  Hour 1–3         Hour 3–7             Hour 7–9        Hour 9–12        │
│                                                                         │
│  ✅ Auth           ✅ README Parser     ✅ Push Branch  ✅ UI Polish     │
│  ✅ Dashboard      ✅ AI Editor         ✅ Create PR    ✅ Testing       │
│  ✅ Git Connect    ✅ Diff Preview                      ✅ Deploy        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Foundation `Hour 1–3`

> **Outcome:** Users can sign up, log in, and connect their GitHub/GitLab account. Repo list is visible on the dashboard.

---

### ⏱ Hour 1–2 — Project Setup & Auth

**Goal:** Running app with email/password login/signup and protected routes.

> ⚠️ **Important:** Auth is email + password ONLY via Supabase. No "Login with GitHub/GitLab" here. GitHub and GitLab OAuth is handled separately in the dashboard for repo access — not for login.

#### Tasks Checklist

- [ ] Create Next.js app with TypeScript + Tailwind
- [ ] Install all dependencies (see above)
- [ ] Configure Supabase client (`lib/supabase.ts`)
- [ ] Create all DB tables (run schema above)
- [ ] Build landing page (`/`) — hero, features, CTA
- [ ] Build `/signup` page — email + password form only
- [ ] Build `/login` page — email + password form only
- [ ] On successful signup → redirect to `/dashboard`
- [ ] On successful login → redirect to `/dashboard`
- [ ] Add middleware to protect `/dashboard/*` routes

#### File: `lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

#### File: `app/(auth)/signup/page.tsx`

```typescript
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6">Create your account</h1>
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-3" />
        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-4" />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button onClick={handleSignup} disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
        <p className="text-center text-sm mt-4 text-gray-500">
          Already have an account? <a href="/login" className="text-blue-600">Log in</a>
        </p>
      </div>
    </div>
  );
}
```

#### File: `app/(auth)/login/page.tsx`

```typescript
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6">Welcome back</h1>
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-3" />
        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-4" />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button onClick={handleLogin} disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        <p className="text-center text-sm mt-4 text-gray-500">
          Don't have an account? <a href="/signup" className="text-blue-600">Sign up</a>
        </p>
      </div>
    </div>
  );
}
```

#### File: `middleware.ts`

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Not logged in → redirect to login
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Already logged in → skip login/signup pages
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
```

#### Landing Page Sections

```
Hero Section:    Headline + Subheadline + "Get Started Free" CTA → /signup
Features:        3 cards — Connect Git | AI Edits | Auto PR
How It Works:    4 steps with icons
Footer:          Links + Copyright
```

> 🚫 **Do NOT add "Login with GitHub" or "Login with GitLab" buttons anywhere on the landing, login, or signup pages. Those OAuth flows only exist inside the dashboard.**

#### ✅ Phase 1 / Hour 1–2 Done When:
- App runs at `localhost:3000`
- Signup with email creates a user in Supabase
- Login redirects to `/dashboard`
- Visiting `/dashboard` without login redirects to `/login`

---

### ⏱ Hour 2–3 — Dashboard & Git OAuth Connection

**Goal:** Logged-in user connects their GitHub/GitLab account to grant repo access.

> ✅ **Context:** The user is already logged into VibeCode via email/password. Now inside the dashboard, they connect their Git accounts so the app can read and write their repositories. This is a separate OAuth flow — it has nothing to do with login.

#### Tasks Checklist

- [ ] Build dashboard layout (sidebar + main content area)
- [ ] Show "Connect your Git account" empty state if nothing connected yet
- [ ] "Connect GitHub" button → initiates GitHub OAuth App flow (scope: `repo`)
- [ ] "Connect GitLab" button → initiates GitLab OAuth App flow (scope: `api`)
- [ ] Handle OAuth callbacks → exchange code for `access_token`
- [ ] Store `access_token` in `git_connections` table linked to `user_id`
- [ ] After connect → fetch and display all repos in card grid
- [ ] Add search/filter bar for repos
- [ ] Show connected account badge (avatar + username) in sidebar

#### File: `app/api/auth/github/route.ts`

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const { access_token } = await tokenResponse.json();

  // Get GitHub user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const githubUser = await userResponse.json();

  // Save to Supabase — link to the logged-in user_id from session
  // ... store in git_connections table

  return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
}
```

#### File: `app/api/git/repos/route.ts`

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

  // Fetch connection from Supabase
  // Use access_token to call GitHub/GitLab API
  // GitHub: GET https://api.github.com/user/repos?per_page=100&sort=updated
  // GitLab: GET https://gitlab.com/api/v4/projects?membership=true&per_page=100

  // Return repos array
}
```

#### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR                │  MAIN CONTENT                     │
│                         │                                   │
│  🏠 Dashboard           │  ── If no Git account connected ──│
│  📁 My Projects         │                                   │
│  ⚙️  Settings            │   Connect your Git account        │
│                         │   to start editing repos          │
│  ── Git Accounts ──     │                                   │
│  [+ Connect GitHub]     │   [Connect GitHub] [Connect GitLab]│
│  [+ Connect GitLab]     │                                   │
│                         │  ── After connecting ─────────────│
│  ── After connecting ── │                                   │
│  🐙 github / username   │   Your Repositories               │
│  🦊 gitlab / username   │   [Search bar]                    │
│                         │   ┌────────┐ ┌────────┐           │
│                         │   │ Repo 1 │ │ Repo 2 │           │
│                         │   └────────┘ └────────┘           │
└─────────────────────────────────────────────────────────────┘
```

> 💡 **UX Note:** First-time users see the empty state with Connect buttons front and center. Once they connect at least one account, the repos grid takes over the main area.

#### ✅ Phase 1 / Hour 2–3 Done When:
- "Connect GitHub" button redirects to GitHub OAuth
- After approving, user is redirected back to `/dashboard`
- `git_connections` row is created in Supabase
- Repos show up as cards in the dashboard

---

## Phase 2 — Core AI Features `Hour 3–7`

> **Outcome:** User can pick any repo and branch, give a plain-English prompt, and see AI-generated code changes side by side.

---

### ⏱ Hour 3–4 — Repo Selector & README Parser

**Goal:** User picks a repo → picks a branch → AI reads README to understand the project.

#### Tasks Checklist

- [ ] Repo detail page: `/dashboard/repo/[id]`
- [ ] Branch dropdown — fetches all branches from API
- [ ] On branch select → fetch `README.md` content from GitHub/GitLab
- [ ] Send README content to AI for command extraction
- [ ] Display parsed setup info card (install + start commands)
- [ ] Save project record to Supabase `projects` table
- [ ] "Start Editing with AI" button → navigate to editor

#### File: `app/api/ai/parse-readme/route.ts`

```typescript
import { callAI } from '@/lib/ai-client';

export async function POST(request: Request) {
  const { readmeContent } = await request.json();

  // Uses LLM_MODEL_PRIMARY and LLM_PROVIDER from .env.local automatically
  const text = await callAI([
    {
      role: 'system',
      content: `You are a developer assistant. Extract setup commands from README files.
                Return ONLY valid JSON with no explanation:
                {"install": "npm install", "start": "npm run dev", "notes": "any important notes"}`
    },
    {
      role: 'user',
      content: `Extract the install and start commands from this README:\n\n${readmeContent}`
    }
  ], { model: 'primary' });

  const clean = text.replace(/```json|```/g, '').trim();
  return Response.json(JSON.parse(clean));
}
```

#### Setup Info Card (UI)

```
┌─────────────────────────────────────────┐
│  📦 Project Setup Info                  │
│                                         │
│  Install:  npm install                  │
│  Start:    npm run dev                  │
│  Notes:    Requires Node 18+            │
│                                         │
│  [▶ Start Editing with AI]              │
└─────────────────────────────────────────┘
```

#### ✅ Phase 2 / Hour 3–4 Done When:
- User can click any repo card → see its branch list
- Selecting a branch triggers README fetch
- Setup Info card appears with AI-parsed install/start commands

---

### ⏱ Hour 4–6 — Core AI Editor (Most Critical)

**Goal:** User types what they want → AI modifies the code → diff is shown.

> 🔴 **This is the heart of the product. Budget the most time here.**

#### The AI Editing Flow

```
1. Fetch file tree from GitHub/GitLab API
2. User describes change in plain English
3. Smart context builder selects relevant files
4. Send to AI with strict JSON output prompt
5. Receive: { "src/app/page.tsx": "...new content..." }
6. Show diff view (old vs new) with syntax highlighting
7. User clicks "Apply Changes"
```

#### File: `app/api/ai/modify/route.ts`

```typescript
import { callAI } from '@/lib/ai-client';

const SYSTEM_PROMPT = `You are a precise code modification AI.
The user will describe a UI or code change they want to make.
You will return ONLY a valid JSON object where:
- Keys are file paths relative to the repo root
- Values are the COMPLETE new file content (not just the changed part)

Rules:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Only include files that actually need to change.
- Preserve all existing functionality unless asked to change it.
- Keep the same coding style and patterns as the original.

Example output format:
{"src/app/page.tsx": "complete file content here", "src/components/hero.tsx": "complete file content here"}`;

export async function POST(request: Request) {
  const { prompt, fileContents, projectContext } = await request.json();

  const userMessage = `
Project context: ${projectContext}

Files available (showing relevant ones):
${Object.entries(fileContents).map(([path, content]) =>
  `=== ${path} ===\n${content}`
).join('\n\n')}

User request: ${prompt}

Return the modified files as JSON.`;

  // Uses LLM_MODEL_PRIMARY (or LLM_MODEL_AGENT for large payloads) from .env.local
  const isLargeRequest = Object.keys(fileContents).length > 5;
  const text = await callAI(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    { model: isLargeRequest ? 'agent' : 'primary' }
  );

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const changes = JSON.parse(clean);
    return Response.json({ success: true, changes });
  } catch {
    return Response.json({ success: false, error: 'AI returned invalid JSON', raw: text });
  }
}
```

#### Smart Context Selection (keeps tokens low)

```typescript
function selectRelevantFiles(
  allFiles: string[],
  userPrompt: string,
  fileContents: Record<string, string>
) {
  const keywords = userPrompt.toLowerCase().split(' ');
  const alwaysInclude = ['package.json', 'app/page.tsx', 'app/layout.tsx'];

  const relevant = allFiles.filter(path => {
    if (alwaysInclude.some(f => path.includes(f))) return true;
    return keywords.some(kw => path.toLowerCase().includes(kw));
  });

  // Limit total context to ~4000 tokens (~16000 chars)
  let totalChars = 0;
  const selected: Record<string, string> = {};

  for (const path of relevant) {
    const content = fileContents[path] || '';
    if (totalChars + content.length > 16000) break;
    selected[path] = content;
    totalChars += content.length;
  }

  return selected;
}
```

#### Three-Panel Editor UI

```
┌──────────────┬──────────────────────────┬─────────────────┐
│  File Tree   │      AI Chat Panel       │  Diff Preview   │
│              │                          │                 │
│ 📁 src/      │  ┌────────────────────┐  │  OLD  │  NEW    │
│  📄 page.tsx │  │ AI: I've changed   │  │───────┼────────│
│  📄 layout   │  │ the hero title to  │  │ Hello │ Hello  │
│ 📁 components│  │ blue and updated   │  │ World │ World  │
│  📄 hero.tsx │  │ the button text.   │  │       │ (blue) │
│  📄 nav.tsx  │  └────────────────────┘  │                 │
│              │                          │                 │
│              │  ┌────────────────────┐  │  [Apply ✅]     │
│              │  │ What to change?    │  │  [Discard ❌]   │
│              │  │ [Send ▶]           │  │                 │
│              │  └────────────────────┘  │                 │
└──────────────┴──────────────────────────┴─────────────────┘
```

#### ✅ Phase 2 / Hour 4–6 Done When:
- User can type a prompt like "Make the hero title blue"
- AI returns a JSON diff of changed files
- Diff viewer shows old vs new code side by side
- Chat history is saved to `chat_messages` table

---

### ⏱ Hour 6–7 — Preview System

**Goal:** User sees exactly what changed visually before accepting.

#### Option A — Diff View ✅ Recommended for hackathon

Fast to implement, reliable, clearly shows what changed.

```bash
npm install react-diff-viewer-continued
```

```typescript
import ReactDiffViewer from 'react-diff-viewer-continued';

function DiffPreview({ originalFiles, changedFiles }) {
  const [activeFile, setActiveFile] = useState(Object.keys(changedFiles)[0]);

  return (
    <div>
      {/* File tabs */}
      <div className="flex gap-2 mb-4">
        {Object.keys(changedFiles).map(path => (
          <button key={path} onClick={() => setActiveFile(path)}
            className={`px-3 py-1 rounded text-sm ${
              activeFile === path ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}>
            {path.split('/').pop()}
          </button>
        ))}
      </div>
      <ReactDiffViewer
        oldValue={originalFiles[activeFile] || ''}
        newValue={changedFiles[activeFile] || ''}
        splitView={true}
        useDarkTheme={false}
        leftTitle="Before"
        rightTitle="After (AI Changes)"
      />
    </div>
  );
}
```

#### Option B — WebContainer Live Preview ⚡ Bonus if time allows

```bash
npm install @webcontainer/api
```

```typescript
import { WebContainer } from '@webcontainer/api';

async function startPreview(files: Record<string, string>) {
  const webcontainerInstance = await WebContainer.boot();

  for (const [path, content] of Object.entries(files)) {
    await webcontainerInstance.fs.writeFile(path, content);
  }

  const installProcess = await webcontainerInstance.spawn('npm', ['install']);
  await installProcess.exit;

  await webcontainerInstance.spawn('npm', ['run', 'dev']);

  webcontainerInstance.on('server-ready', (port, url) => {
    setPreviewUrl(url); // Embed in iframe
  });
}
```

> ⚠️ **Note:** WebContainers require `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers in `next.config.js`. Start with Option A. Add B only if you finish everything else early.

#### ✅ Phase 2 / Hour 6–7 Done When:
- Changed files render in the diff viewer with syntax highlighting
- User can tab between multiple changed files
- "Apply" and "Discard" buttons are wired up

---

## Phase 3 — Git Automation `Hour 7–9`

> **Outcome:** User clicks one button and VibeCode creates a branch, pushes all AI changes, and raises a PR/MR with an AI-written description.

---

### ⏱ Hour 7–8 — Branch Creation & Push

**Goal:** User approves changes → new branch created → all files pushed.

#### Tasks Checklist

- [ ] "Create Branch & Push" button with editable branch name input
- [ ] Pre-fill branch name: `ai-changes-[timestamp]`
- [ ] API route creates new branch from selected base branch
- [ ] Loop through every changed file → push via Contents API
- [ ] AI auto-generates the commit message
- [ ] Show success toast with link to new branch

#### File: `app/api/git/push/route.ts`

```typescript
import { Octokit } from '@octokit/rest';

export async function POST(request: Request) {
  const { repoFullName, baseBranch, newBranch, changes, commitMessage, accessToken } = await request.json();

  const octokit = new Octokit({ auth: accessToken });
  const [owner, repo] = repoFullName.split('/');

  // Step 1: Get base branch SHA
  const { data: baseRef } = await octokit.git.getRef({
    owner, repo,
    ref: `heads/${baseBranch}`
  });
  const baseSha = baseRef.object.sha;

  // Step 2: Create new branch
  await octokit.git.createRef({
    owner, repo,
    ref: `refs/heads/${newBranch}`,
    sha: baseSha
  });

  // Step 3: Push each changed file
  for (const [filePath, newContent] of Object.entries(changes)) {
    let fileSha: string | undefined;
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner, repo, path: filePath, ref: newBranch
      });
      if (!Array.isArray(existingFile)) fileSha = existingFile.sha;
    } catch { /* new file */ }

    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(newContent as string).toString('base64'),
      branch: newBranch,
      ...(fileSha ? { sha: fileSha } : {})
    });
  }

  return Response.json({ success: true, branch: newBranch });
}
```

#### AI-Generated Commit Message

```typescript
import { callAI } from '@/lib/ai-client';

async function generateCommitMessage(changes: Record<string, string>, userPrompt: string) {
  const fileList = Object.keys(changes).join(', ');

  // Uses LLM_MODEL_FAST — simple task, no need for the big model
  const message = await callAI([{
    role: 'user',
    content: `Write a concise git commit message (max 72 chars, conventional commits format):
    User asked: "${userPrompt}"
    Files changed: ${fileList}
    Return ONLY the commit message, nothing else.`
  }], { model: 'fast' });

  return message.trim() || 'feat: AI-powered changes';
}
```

#### ✅ Phase 3 / Hour 7–8 Done When:
- New branch appears on GitHub after clicking push
- All changed files are visible in the new branch
- Commit message is auto-generated and meaningful

---

### ⏱ Hour 8–9 — AI PR/MR Creation

**Goal:** PR is automatically raised with an AI-written title and description.

#### Tasks Checklist

- [ ] Auto-trigger PR creation after successful push
- [ ] AI generates a professional PR title + description
- [ ] Create PR via GitHub API / MR via GitLab API
- [ ] Save `pr_url` to `ai_sessions` table
- [ ] Show PR result card with title, URL, status badge
- [ ] "View PR on GitHub" button opens in new tab

#### File: `app/api/git/create-pr/route.ts`

```typescript
import { callAI } from '@/lib/ai-client';
import { Octokit } from '@octokit/rest';

export async function POST(request: Request) {
  const { repoFullName, baseBranch, newBranch, changes, userPrompt, accessToken } = await request.json();

  const prDescription = await generatePRDescription(changes, userPrompt);
  const prTitle = `AI Changes: ${userPrompt.slice(0, 60)}${userPrompt.length > 60 ? '...' : ''}`;

  const octokit = new Octokit({ auth: accessToken });
  const [owner, repo] = repoFullName.split('/');

  const { data: pr } = await octokit.pulls.create({
    owner, repo,
    title: prTitle,
    body: prDescription,
    head: newBranch,
    base: baseBranch,
  });

  return Response.json({
    success: true,
    prUrl: pr.html_url,
    prNumber: pr.number,
    prTitle: pr.title,
  });
}

async function generatePRDescription(changes: Record<string, string>, userPrompt: string) {
  const fileList = Object.keys(changes).map(f => `- ${f}`).join('\n');

  // Uses LLM_MODEL_FAST — text generation task
  return await callAI([{
    role: 'user',
    content: `Write a professional GitHub PR description in markdown.

User's request: "${userPrompt}"
Files changed:
${fileList}

Include sections:
## Summary
## Changes Made
## Testing Notes

Keep it professional and concise.`
  }], { model: 'fast' });
}
```

#### PR Result Card (UI)

```
┌─────────────────────────────────────────────────┐
│  ✅ Pull Request Created Successfully!           │
│                                                  │
│  Title: AI Changes: Make hero title blue         │
│  Branch: ai-changes-1703123456 → main            │
│  Status: Open 🟢                                 │
│                                                  │
│  [View PR on GitHub ↗]  [Start New Edit]         │
└─────────────────────────────────────────────────┘
```

#### ✅ Phase 3 / Hour 8–9 Done When:
- PR exists on GitHub with AI-written description
- `pr_url` is saved in `ai_sessions` in Supabase
- PR result card shows with working link

---

## Phase 4 — Ship It `Hour 9–12`

> **Outcome:** App looks polished, all flows tested end-to-end, deployed on Vercel and ready to demo.

---

### ⏱ Hour 9–10 — UI/UX Polish

**Goal:** Make it look and feel like a real product that judges will love.

#### Priority Fixes

- [ ] Loading skeleton screens (repos list, file tree, AI response)
- [ ] Toast notifications for all actions (success / error / info)
- [ ] Empty states with helpful CTAs ("Connect GitHub to get started")
- [ ] Step progress indicator showing current phase
- [ ] Error boundaries with friendly fallback UI
- [ ] Responsive layout (basic mobile support)
- [ ] Consistent colour scheme and spacing throughout

#### Step Progress Indicator Component

```typescript
const STEPS = [
  { id: 1, label: 'Connect Git' },
  { id: 2, label: 'Select Repo' },
  { id: 3, label: 'Choose Branch' },
  { id: 4, label: 'AI Edit' },
  { id: 5, label: 'Preview' },
  { id: 6, label: 'Push & PR' },
];

function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
            ${currentStep >= step.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {currentStep > step.id ? '✓' : step.id}
          </div>
          <span className={`ml-2 text-sm ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 mx-2 ${currentStep > step.id ? 'bg-blue-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
```

#### Key Landing Page Copy

```
HEADLINE:    "Ship Changes Without Writing Code"
SUBLINE:     "Connect your GitHub repo, describe what you want in plain English,
              and let AI build it, preview it, and raise the PR for you."
CTA:         "Start Building Free →"

FEATURE 1:   🔗 Connect Any Repo
             "Works with GitHub and GitLab. Select any repo and branch."

FEATURE 2:   🤖 AI Makes the Change
             "Just describe what you want. AI reads your code and modifies it precisely."

FEATURE 3:   🚀 Auto PR in Seconds
             "Review the diff, approve, and AI creates the branch and PR automatically."
```

#### ✅ Phase 4 / Hour 9–10 Done When:
- No blank white screens — every state has a loading or empty UI
- Toasts fire on success and error for all major actions
- Step progress bar reflects where the user is in the flow

---

### ⏱ Hour 10–11 — Testing & Bug Fixes

**Goal:** Every step of the demo flow works perfectly, end to end.

#### Full E2E Test Checklist

- [ ] **Signup:** New email → account created → lands on dashboard
- [ ] **Login:** Existing email → login → lands on dashboard
- [ ] **Auth guard:** Visit `/dashboard` logged out → redirected to `/login`
- [ ] **Connect GitHub:** OAuth flow completes → row in `git_connections` → repos load
- [ ] **Repo selection:** Click repo card → branch dropdown loads correctly
- [ ] **Branch select:** Choose branch → README fetched → setup card renders
- [ ] **AI edit:** Submit prompt → AI returns valid JSON → diff viewer renders
- [ ] **Apply changes:** "Apply" button saves changes to session state
- [ ] **Push:** New branch created on GitHub → files updated
- [ ] **PR:** PR created on GitHub → AI description looks good → URL opens
- [ ] **Supabase check:** `ai_sessions`, `chat_messages`, `projects` all have correct data
- [ ] **Error cases:** What if GROQ is slow? GitHub API fails? README doesn't exist?

#### Test Repo to Use

```
https://github.com/vercel/next.js/tree/canary/examples/hello-world
```

Test prompt: `"Change the main heading text to say Welcome to VibeCode"`

#### ✅ Phase 4 / Hour 10–11 Done When:
- Full demo flow runs without any manual intervention
- No console errors during the demo path
- All Supabase tables have the expected data

---

### ⏱ Hour 11–12 — Demo Prep & Deploy

**Goal:** Live app on the internet, polished demo script ready, practiced 3 times.

#### Deployment Steps

```bash
# Push to GitHub
git add . && git commit -m "feat: hackathon submission" && git push

# Deploy to Vercel
npx vercel --prod

# Or via Vercel dashboard:
# New Project → Import repo → Add all env vars → Deploy
```

#### All Vercel Environment Variables to Add

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITLAB_CLIENT_ID
GITLAB_CLIENT_SECRET
LLM_PROVIDER
GROQ_API_KEY
NVIDIA_API_KEY
LLM_MODEL_PRIMARY
LLM_MODEL_FAST
LLM_MODEL_AGENT
LLM_MAX_TOKENS_CODE
LLM_MAX_TOKENS_TEXT
LLM_MAX_TOKENS_AGENT
LLM_TEMPERATURE
NEXT_PUBLIC_APP_URL        ← set to your Vercel URL
NEXTAUTH_SECRET
NEXTAUTH_URL               ← set to your Vercel URL
NODE_ENV                   ← production
```

> ⚠️ After deploy, update GitHub OAuth App callback URL from `localhost:3000` to your Vercel production URL.

#### Demo Flow Script — Practice 3 Times

```
[0:00] Open landing page
       → "This is VibeCode. Non-developers can modify real repos without touching code."

[0:30] Click "Get Started Free" → signup with email → lands on dashboard

[0:45] Click "Connect GitHub" → authorize → repos appear as cards

[1:15] Click a repo → select main branch → README parses → setup card appears

[1:45] Type prompt: "Change the hero button color to green and text to Get Started Free"
       → Show AI thinking indicator

[2:15] Diff viewer appears
       → Walk through the before/after changes file by file

[3:15] Click "Create Branch & Push"
       → Branch name: ai-changes-[timestamp]
       → Show success toast

[3:30] PR auto-created
       → Open on GitHub
       → Show the AI-written description

[4:00] Wrap up
       → "One prompt. One click. Real PR. No terminal. No code knowledge needed."
```

#### 3-Slide Pitch Deck

```
Slide 1 — PROBLEM
"Non-developers on product teams can't make simple UI changes.
They wait days for dev tickets. This kills iteration speed."

Slide 2 — SOLUTION (Live Demo)
"VibeCode: Connect your repo, describe the change, ship the PR.
No terminal. No code knowledge. Fully AI-powered."

Slide 3 — TECH & IMPACT
Stack: Next.js 14 + Supabase + GROQ/NVIDIA + GitHub/GitLab API
Use cases: Copy changes, colour updates, layout tweaks, feature flags
Next steps: WebContainer live preview, multi-file agent, team workspaces
```

#### ✅ Phase 4 / Hour 11–12 Done When:
- App is live on a public Vercel URL
- OAuth callback URLs are updated to production domain
- Demo script rehearsed 3 times without errors

---

## API Routes Reference

| Route | Method | Phase | Purpose |
|---|---|---|---|
| `/api/auth/github` | GET | Phase 1 | GitHub OAuth callback — repo access only |
| `/api/auth/gitlab` | GET | Phase 1 | GitLab OAuth callback — repo access only |
| `/api/git/repos` | GET | Phase 1 | Fetch user's repos from connected account |
| `/api/git/branches` | GET | Phase 2 | Fetch all branches for a repo |
| `/api/git/files` | GET | Phase 2 | Fetch file tree and file content |
| `/api/ai/parse-readme` | POST | Phase 2 | Extract setup commands from README |
| `/api/ai/modify` | POST | Phase 2 | AI code modification — returns JSON diff |
| `/api/ai/commit-message` | POST | Phase 3 | Generate commit message |
| `/api/ai/pr-description` | POST | Phase 3 | Generate PR description |
| `/api/git/push` | POST | Phase 3 | Create branch + push all changed files |
| `/api/git/create-pr` | POST | Phase 3 | Create PR/MR via GitHub/GitLab API |

---

## AI Model Usage Guide

All AI calls are driven by the env variables `LLM_PROVIDER`, `LLM_MODEL_PRIMARY`, `LLM_MODEL_FAST`, and `LLM_MODEL_AGENT`. Swap providers by **only changing `.env.local`** — no code changes needed.

| Task | Phase | Env Variable | Default (GROQ) | Default (NVIDIA) |
|---|---|---|---|---|
| README parsing | Phase 2 | `LLM_MODEL_PRIMARY` | `llama3-70b-8192` | `meta/llama-3.1-70b-instruct` |
| Code modification | Phase 2 | `LLM_MODEL_PRIMARY` | `llama3-70b-8192` | `meta/llama-3.1-70b-instruct` |
| Multi-file agent | Phase 2 | `LLM_MODEL_AGENT` | `llama3-70b-8192` | `nvidia/llama-3.1-nemotron-70b-instruct` |
| Commit message | Phase 3 | `LLM_MODEL_FAST` | `llama3-8b-8192` | `meta/llama-3.1-8b-instruct` |
| PR description | Phase 3 | `LLM_MODEL_FAST` | `llama3-8b-8192` | `meta/llama-3.1-8b-instruct` |

### Unified AI Client (`lib/ai-client.ts`)

```typescript
interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIOptions {
  model?: 'primary' | 'fast' | 'agent';
  maxTokens?: number;
  temperature?: number;
}

export async function callAI(messages: AIMessage[], options: AIOptions = {}) {
  const provider = process.env.LLM_PROVIDER || 'groq';
  const modelKey = options.model || 'primary';

  const modelMap = {
    primary: process.env.LLM_MODEL_PRIMARY || 'llama3-70b-8192',
    fast:    process.env.LLM_MODEL_FAST    || 'llama3-8b-8192',
    agent:   process.env.LLM_MODEL_AGENT   || 'llama3-70b-8192',
  };

  const tokenMap = {
    primary: parseInt(process.env.LLM_MAX_TOKENS_CODE  || '4000'),
    fast:    parseInt(process.env.LLM_MAX_TOKENS_TEXT  || '800'),
    agent:   parseInt(process.env.LLM_MAX_TOKENS_AGENT || '6000'),
  };

  const model = modelMap[modelKey];
  const maxTokens = options.maxTokens || tokenMap[modelKey];
  const temperature = options.temperature ?? parseFloat(process.env.LLM_TEMPERATURE || '0.1');

  if (provider === 'groq') return callGroq(messages, model, maxTokens, temperature);
  if (provider === 'nvidia') return callNvidia(messages, model, maxTokens, temperature);

  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}

async function callGroq(messages: AIMessage[], model: string, maxTokens: number, temperature: number) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });
  const data = await response.json();
  return data.choices[0].message.content as string;
}

async function callNvidia(messages: AIMessage[], model: string, maxTokens: number, temperature: number) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });
  const data = await response.json();
  return data.choices[0].message.content as string;
}
```

---

## UI Component Checklist

| Component | File | Phase | Priority |
|---|---|---|---|
| `<StepProgress />` | `components/StepProgress.tsx` | Phase 1 | 🔴 High |
| `<ConnectGitCard />` | `components/ConnectGitCard.tsx` | Phase 1 | 🔴 High |
| `<RepoCard />` | `components/RepoCard.tsx` | Phase 1 | 🔴 High |
| `<BranchSelector />` | `components/BranchSelector.tsx` | Phase 2 | 🔴 High |
| `<SetupInfoCard />` | `components/SetupInfoCard.tsx` | Phase 2 | 🔴 High |
| `<AIChat />` | `components/AIChat.tsx` | Phase 2 | 🔴 High |
| `<DiffViewer />` | `components/DiffViewer.tsx` | Phase 2 | 🔴 High |
| `<PRResultCard />` | `components/PRResultCard.tsx` | Phase 3 | 🔴 High |
| `<FileTree />` | `components/FileTree.tsx` | Phase 2 | 🟡 Medium |
| `<LoadingSkeleton />` | `components/LoadingSkeleton.tsx` | Phase 4 | 🟢 Low |

---

## Risk Management

| Risk | Phase | Likelihood | Mitigation |
|---|---|---|---|
| GROQ returns invalid JSON | Phase 2 | Medium | Add retry logic + fallback error message |
| GitHub API rate limiting | Phase 1–3 | Low | Cache repo data, show friendly error |
| WebContainer setup too complex | Phase 2 | High | Skip it — use diff view instead ✅ |
| Supabase RLS blocks queries | Phase 1 | Medium | Test with service role key first, then add RLS |
| OAuth callback URL mismatch | Phase 1 | High | Double-check callback URLs in GitHub app settings |
| AI changes break syntax | Phase 2 | Medium | Show raw diff and let user accept/reject |
| File too large for AI context | Phase 2 | Medium | Truncate to first 200 lines, show warning |
| Deploy env vars missing | Phase 4 | High | Use checklist above — verify each one after deploy |

### The Golden Rule for Hackathons

> **A working end-to-end flow beats a broken fancy feature every time.**
>
> Priority order: `Phase 1` ✅ → `Phase 2` ✅ → `Phase 3` ✅ → `Phase 4` ✅
>
> If WebContainers are too complex → skip them. If GitLab OAuth is broken → demo with GitHub only. Keep the core flow working and polished.

---

## Quick Reference — Page Routes

```
/                             → Landing page (no auth required)
/login                        → Login — email + password ONLY
/signup                       → Sign up — email + password ONLY
/auth/callback                → Supabase auth callback (email confirm)

/dashboard                    → Main dashboard
                                (shows "Connect Git" empty state if no connection)
/dashboard/repo/[id]          → Repo detail + branch selector
/dashboard/repo/[id]/edit     → AI editor — 3-panel layout
/dashboard/repo/[id]/pr       → PR result page

/api/auth/github              → GitHub OAuth callback (repo access — Phase 1)
/api/auth/gitlab              → GitLab OAuth callback (repo access — Phase 1)
/api/git/*                    → Git operations (Phase 1, Phase 3)
/api/ai/*                     → AI operations (Phase 2, Phase 3)
```

> ⚠️ `/api/auth/github` and `/api/auth/gitlab` are **repo access callbacks only**, triggered from dashboard. They are NOT login callbacks.

---

## 📝 Changelog

All notable changes to the project setup and documentation are recorded here.
Update this section every time you add a new env variable, dependency, or architectural decision.

| Version | Date | What Changed |
|---|---|---|
| v1.0 | Day 0 | Initial setup — Supabase, GitHub OAuth, GitLab OAuth, GROQ, NVIDIA |
| v1.1 | Day 0 | Added `LLM_PROVIDER` — swap between GROQ and NVIDIA via env only |
| v1.2 | Day 0 | Added `LLM_MODEL_PRIMARY`, `LLM_MODEL_FAST`, `LLM_MODEL_AGENT` — model per task type |
| v1.3 | Day 0 | Added `LLM_MAX_TOKENS_*` and `LLM_TEMPERATURE` — fine-tune without code changes |
| v1.4 | Day 0 | Created `lib/ai-client.ts` — unified provider-agnostic AI client |
| v1.5 | Day 0 | Created `.env.sample` and `.env.local` as separate tracked/untracked files |
| v1.6 | Day 0 | Auth clarification — email+password only for login; GitHub/GitLab OAuth is repo access only from dashboard |
| v1.7 | Day 0 | **Restructured into 4 phases** — Phase 1 Foundation, Phase 2 Core AI, Phase 3 Git Automation, Phase 4 Ship It. Added phase labels to all API routes, components, risk table, and done-when checklists per hour. |

### How to Update This Changelog

When you add a new env variable or make an architectural change:
1. Add it to `.env.sample` with documentation comments
2. Add the blank key to `.env.local`
3. Add a row to this changelog table
4. Update the Quick Reference env table in the [Environment Variables](#environment-variables) section

---

*Built for Hackathon — Good luck! 🏆*
*Stack: Next.js 14 + Supabase + GROQ / NVIDIA AI + GitHub/GitLab API*
*4 Phases · 10 Steps · 12 Hours*