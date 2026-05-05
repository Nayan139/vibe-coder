# 🚀 VibeCode — AI-Powered No-Code Prototyping Platform

> **Goal:** Build a platform where non-developers can connect their GitHub/GitLab repo, describe changes in plain English, preview results live, and raise a PR — all powered by AI.
> **Total Phases:** 5 | **Total Steps:** 16 | **Phases 1–4: ✅ Complete | Phase 5: 🔲 In Progress**
> **Stack:** Next.js 14, Supabase, GROQ / NVIDIA AI, GitHub API, GitLab API, WebContainers

---

## ENV Policy Update

- ENV variables are now managed only through `project_env_vars` (DB-backed UI on repo detail page).
- ENV values are injected before project clone/boot for preview flows.
- Chatbot-based `.env` creation/editing is removed and not supported.

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
   - [Phase 1 — Foundation ✅](#phase-1--foundation-hour-13-)
   - [Phase 2 — Core AI Features ✅](#phase-2--core-ai-features-hour-37-)
   - [Phase 3 — Git Automation ✅](#phase-3--git-automation-hour-79-)
   - [Phase 4 — Ship It ✅](#phase-4--ship-it-hour-912-)
   - [Phase 5 — Power Features 🆕](#phase-5--power-features-)
     - [Step 1: File Creation & .env Handling](#-step-1--file-creation--env-handling)
     - [Step 2: Custom Run Command Override](#-step-2--custom-run-command-override)
     - [Step 3: File Selector → Prompt Chip UI](#-step-3--file-selector--prompt-chip-ui)
     - [Step 4: Whole-Project AI Mode](#-step-4--whole-project-ai-mode)
     - [Step 5: Local Dev Server + Live Preview 🎯](#-step-5--local-dev-server--live-preview-)
     - [Step 6: Multi-Prompt Sessions & Chat History](#-step-6--multi-prompt-sessions--chat-history)
     - [Step 7: LLM Model Switcher in Prompt Box](#-step-7--llm-model-switcher-in-prompt-box)
     - [Step 8: New Chat + Commit & Raise MR](#-step-8--new-chat--commit--raise-mr)
     - [Step 9: Hot File Sync (Live Reload Without Restart) 🆕](#-step-9--hot-file-sync-live-reload-without-server-restart)
     - [Step 10: Project-wise ENV Variable Manager 🆕](#-step-10--project-wise-env-variable-manager)
6. [API Routes Reference](#api-routes-reference)
7. [AI Model Usage Guide](#ai-model-usage-guide)
8. [UI Component Checklist](#ui-component-checklist)
9. [Risk Management](#risk-management)
10. [Changelog](#-changelog)

---

## Project Overview

**What you're building:** "VibeCode" — a no-code AI prototyping platform where anyone can modify a real codebase visually, preview it running live in the browser, and ship a PR without touching a terminal.

### Core User Flow (Updated for Phase 5)

```
Landing Page
      ↓
Sign Up / Login  →  Email + Password only  (Supabase Auth)
      ↓
Dashboard
      ↓
Connect GitHub / GitLab  →  OAuth for repo access only (not login)
      ↓
Select Repo → Select Branch
      ↓
AI reads README → Understands project
User can override install/run commands if needed  ← NEW Phase 5
      ↓
[Optional] Click files → appear as chips above prompt  ← NEW Phase 5
OR leave blank → AI reviews entire project automatically  ← NEW Phase 5
      ↓
Select LLM model from prompt box dropdown  ← NEW Phase 5
Type prompt → Send
      ↓
AI modifies code → Prettier formats → Diff shows only changed lines
      ↓
Files hot-synced into WebContainer FS → iframe updates instantly  ← NEW Phase 5 Step 9
      ↓
Live Preview: WebContainer runs the project in browser  ← NEW Phase 5
      ↓
Send more prompts → changes accumulate across turns  ← NEW Phase 5
      ↓
Satisfied? → Click "Commit & Raise PR"  ← NEW Phase 5
      ↓
Branch created → All accumulated changes pushed → PR raised ✅
```

### Auth vs Git Connection — Key Distinction

| | Supabase Auth (Login) | GitHub / GitLab OAuth (Git Connect) |
|---|---|---|
| **Purpose** | Log into VibeCode | Access the user's repos |
| **Where** | `/login` and `/signup` pages | `/dashboard` — after login |
| **Method** | Email + Password only | OAuth App flow |
| **Stores** | Supabase session cookie | `access_token` in `git_connections` table |
| **Used for** | Identifying the user | All Git API calls (read files, push, create PR) |

> ✅ **Rule:** Login page = zero GitHub/GitLab. Dashboard "Connect" buttons = repo access only.

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
| Code Preview | react-diff-viewer-continued | Before/after code diff (changed lines only) |
| Live Preview | WebContainers API 🆕 | Run project in browser — no server needed |
| Hot File Sync | WebContainers FS API 🆕 | Write files into running container for instant HMR |
| Code Formatting | Prettier 🆕 | Format AI output before showing diff |
| Linting | ESLint + eslint-plugin-prettier 🆕 | Enforce code style |
| Deployment | Vercel | Instant Next.js deployment |

### Install Commands

```bash
npx create-next-app@latest vibecode --typescript --tailwind --app
cd vibecode

# Core
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @octokit/rest axios
npm install react-diff-viewer-continued react-syntax-highlighter
npm install @types/react-syntax-highlighter

# Phase 5 additions
npm install @webcontainer/api
npm install prettier --save-dev
npm install eslint-config-prettier eslint-plugin-prettier --save-dev

# UI
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label badge toast tabs dialog dropdown-menu select
```

### Config Files — Add to Project Root

#### `.prettierrc`
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "arrowParens": "always"
}
```

#### `.eslintrc.json`
```json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "error"
  }
}
```

---

## Database Schema

```sql
-- Git Connections
create table git_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  provider text not null,
  access_token text not null,
  username text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  connection_id uuid references git_connections on delete cascade,
  repo_name text not null,
  repo_full_name text not null,
  repo_url text,
  selected_branch text default 'main',
  language text,
  run_command text,           -- 🆕 Phase 5: user-overridable run command
  install_command text,       -- 🆕 Phase 5: user-overridable install command
  created_at timestamptz default now()
);

-- AI Sessions (one per chat conversation)
create table ai_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  user_id uuid references auth.users on delete cascade,
  title text,                         -- 🆕 Phase 5: auto-generated title
  status text default 'active',       -- 'active' | 'committed' | 'closed'
  accumulated_changes jsonb,          -- 🆕 Phase 5: merged changes across all prompts
  new_branch text,
  pr_url text,
  pr_title text,
  llm_provider text,                  -- 🆕 Phase 5: provider used
  llm_model text,                     -- 🆕 Phase 5: model used
  created_at timestamptz default now()
);

-- Chat Messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ai_sessions on delete cascade,
  role text not null,
  content text not null,
  selected_files jsonb,               -- 🆕 Phase 5: files attached to this message
  changes_snapshot jsonb,             -- 🆕 Phase 5: what changed after this prompt
  created_at timestamptz default now()
);

-- Created Files (NEW files AI creates, including .env)
create table created_files (          -- 🆕 Phase 5: new table
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ai_sessions on delete cascade,
  project_id uuid references projects on delete cascade,
  file_path text not null,
  content text not null,
  is_env_file boolean default false,
  committed boolean default false,
  created_at timestamptz default now()
);

-- Project ENV Variables (stored per project, never committed to git)
create table project_env_vars (       -- 🆕 Phase 5 Step 10: new table
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  user_id uuid references auth.users on delete cascade,
  key text not null,
  value text not null,               -- store encrypted in production
  is_secret boolean default false,   -- true = masked in UI (password input)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, key)            -- one value per key per project
);

-- RLS
alter table git_connections enable row level security;
alter table projects enable row level security;
alter table ai_sessions enable row level security;
alter table chat_messages enable row level security;
alter table created_files enable row level security;
alter table project_env_vars enable row level security;

create policy "Users see own connections" on git_connections for all using (auth.uid() = user_id);
create policy "Users see own projects" on projects for all using (auth.uid() = user_id);
create policy "Users see own sessions" on ai_sessions for all using (auth.uid() = user_id);
create policy "Users see own messages" on chat_messages for all using (
  session_id in (select id from ai_sessions where user_id = auth.uid())
);
create policy "Users see own created files" on created_files for all using (
  session_id in (select id from ai_sessions where user_id = auth.uid())
);
create policy "Users see own env vars" on project_env_vars for all using (auth.uid() = user_id);
```

---

## Environment Variables

```env
# ── SUPABASE ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ── GITHUB OAUTH (repo access — dashboard only, NOT login) ────────────────────
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# ── GITLAB OAUTH (repo access — dashboard only, NOT login) ────────────────────
GITLAB_CLIENT_ID=your_gitlab_client_id
GITLAB_CLIENT_SECRET=your_gitlab_client_secret

# ── AI PROVIDER ───────────────────────────────────────────────────────────────
# Server-side defaults. Users can override per-prompt from the UI (Phase 5).
LLM_PROVIDER=groq                        # "groq" | "nvidia"
GROQ_API_KEY=your_groq_api_key
NVIDIA_API_KEY=your_nvidia_api_key

# ── LLM MODEL CONFIG ──────────────────────────────────────────────────────────
# GROQ:   llama3-70b-8192 | llama3-8b-8192 | mixtral-8x7b-32768
# NVIDIA: meta/llama-3.1-70b-instruct | nvidia/llama-3.1-nemotron-70b-instruct
LLM_MODEL_PRIMARY=llama3-70b-8192        # code modification
LLM_MODEL_FAST=llama3-8b-8192           # commit messages, PR descriptions, planning
LLM_MODEL_AGENT=llama3-70b-8192         # multi-file reasoning
LLM_MAX_TOKENS_CODE=4000
LLM_MAX_TOKENS_TEXT=800
LLM_MAX_TOKENS_AGENT=6000
LLM_TEMPERATURE=0.1

# ── APP CONFIG ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

---

## Phase-wise Execution Plan

```
┌──────────────┬──────────────────┬─────────────────┬─────────────┬─────────────────────────────────────────────────┐
│  PHASE 1 ✅  │   PHASE 2 ✅     │   PHASE 3 ✅    │  PHASE 4 ✅ │  PHASE 5 🆕                                     │
│  Foundation  │  Core AI         │  Git Automation  │  Ship It    │  Power Features                                 │
│  Hour 1–3    │  Hour 3–7        │  Hour 7–9        │  Hour 9–12  │  Post-Hackathon                                 │
├──────────────┼──────────────────┼─────────────────┼─────────────┼─────────────────────────────────────────────────┤
│  ✅ Auth     │  ✅ README Parse │  ✅ Push Branch  │  ✅ Polish  │  🔲 Step 1: File Creation + .env                │
│  ✅ Dashboard│  ✅ AI Editor    │  ✅ Create PR    │  ✅ Testing │  🔲 Step 2: Run Command Override                │
│  ✅ Git OAuth│  ✅ Diff Preview │                  │  ✅ Deploy  │  🔲 Step 3: File Chip Selector                  │
│              │                  │                  │             │  🔲 Step 4: Whole-Project AI Mode               │
│              │                  │                  │             │  🎯 Step 5: Live Local Preview (MAIN GOAL)      │
│              │                  │                  │             │  🔲 Step 6: Multi-Prompt Sessions               │
│              │                  │                  │             │  🔲 Step 7: LLM Model Switcher in UI            │
│              │                  │                  │             │  🔲 Step 8: New Chat + Commit & Raise MR        │
│              │                  │                  │             │  🔲 Step 9: Hot File Sync (No-Restart Reload)   │
│              │                  │                  │             │  🔲 Step 10: Project-wise ENV Variable Manager  │
└──────────────┴──────────────────┴─────────────────┴─────────────┴─────────────────────────────────────────────────┘
```

---

## Phase 1 — Foundation `Hour 1–3` ✅

> **Status: COMPLETE** — Auth, dashboard, GitHub/GitLab OAuth repo connection all working.

### ⏱ Hour 1–2 — Project Setup & Auth ✅

- [x] Next.js app + Supabase configured
- [x] `/signup` and `/login` — email + password only
- [x] Middleware protects `/dashboard/*`
- [x] Successful login/signup → redirects to `/dashboard`

> 🚫 No GitHub/GitLab buttons on login or signup pages. OAuth is only inside the dashboard.

### ⏱ Hour 2–3 — Dashboard & Git OAuth Connection ✅

- [x] Dashboard layout (sidebar + main content)
- [x] "Connect GitHub" / "Connect GitLab" buttons → OAuth flow
- [x] `access_token` stored in `git_connections` table
- [x] Repos grid loads after connecting

---

## Phase 2 — Core AI Features `Hour 3–7` ✅

> **Status: COMPLETE** — Repo/branch selector, README parser, AI editor, diff viewer all working.

### ⏱ Hour 3–4 — Repo Selector & README Parser ✅
- [x] `/dashboard/repo/[id]` with branch dropdown
- [x] README fetched and parsed by AI
- [x] Setup info card shows install/start commands

### ⏱ Hour 4–6 — Core AI Editor ✅
- [x] Three-panel layout (File Tree | Chat | Diff)
- [x] AI returns `{ "filepath": "new content" }` JSON
- [x] Smart context selection keeps tokens low
- [x] Prettier formats AI output before showing diff
- [x] Diff viewer shows only changed lines (`showDiffOnly: true`)
- [x] Horizontal scroll on diff panel

### ⏱ Hour 6–7 — Preview System ✅
- [x] `react-diff-viewer-continued` with file tabs
- [x] Apply / Discard buttons
- [x] `extraLinesSurroundingDiff: 3` — 3 lines context around each change

---

## Phase 3 — Git Automation `Hour 7–9` ✅

> **Status: COMPLETE** — Branch creation, file push, AI PR creation all working.

### ⏱ Hour 7–8 — Branch Creation & Push ✅
- [x] `ai-changes-[timestamp]` branch auto-created
- [x] Files pushed via GitHub/GitLab Contents API
- [x] AI-generated commit message

### ⏱ Hour 8–9 — AI PR/MR Creation ✅
- [x] AI generates PR title and description
- [x] PR created via Octokit
- [x] `pr_url` saved to `ai_sessions`
- [x] PR result card with link

---

## Phase 4 — Ship It `Hour 9–12` ✅

> **Status: COMPLETE** — App deployed, tested, demo-ready.

### ⏱ Hour 9–10 — UI/UX Polish ✅
- [x] Loading skeletons, toasts, empty states
- [x] Step progress indicator (6 steps)
- [x] Error boundaries

### ⏱ Hour 10–11 — Testing ✅
- [x] Full E2E flow verified
- [x] All Supabase tables have correct data

### ⏱ Hour 11–12 — Deploy ✅
- [x] Deployed to Vercel
- [x] OAuth callbacks updated to production URL
- [x] Demo script rehearsed

---

## Phase 5 — Power Features 🆕

> **Status: IN PROGRESS**
> **Outcome:** VibeCode becomes a fully capable local-first AI editor. Users create files, run projects live, chat across multiple turns, switch AI models, and raise PRs only when satisfied. File changes from AI sync instantly to the running preview — no restarts needed.

```
Build steps in this order:
Step 5 (Live Preview) → Step 9 (Hot File Sync) → Step 6 (Multi-Prompt) → Step 3 (Chips)
→ Step 7 (Model Switcher) → Step 8 (Commit Panel) → Step 10 (ENV Manager) ← DO THIS EARLY
→ Step 1 (.env AI creation) → Step 2 (Run Cmd) → Step 4 (Whole Project)
```

> ⚠️ **Step 10 should be built right after Step 5** — ENV variables are needed for the WebContainer to boot projects that require secrets. Without them the dev server fails immediately.

---

### 🆕 Step 1 — File Creation & .env Handling

**Problem:** AI can only edit existing files. Projects often need a `.env` file to run correctly. Without it, the dev server fails with missing environment variable errors.

**Solution:** AI can create new code files using a `CREATE:` prefix in the JSON key. `.env` keys/files are excluded from chatbot edits; environment variables are managed only in project settings.

#### Updated AI System Prompt

```typescript
const SYSTEM_PROMPT = `You are a precise code modification AI.
Return ONLY a valid JSON object where:
- Keys are file paths for EXISTING files to modify (e.g. "src/app/page.tsx")
- For NEW files, prefix the key with "CREATE:" (e.g. "CREATE:src/utils/api.ts")
- Values are the COMPLETE file content

Rules:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Never create or modify `.env` / `.env.*` files. Environment variables are managed in project settings.
- Only include files that actually need to change or be created.

Example:
{
  "src/app/page.tsx": "...modified content...",
  "CREATE:src/utils/helper.ts": "export const helper = () => {}"
}`;
```

#### Processing AI Changes — Separate New vs Modified

```typescript
function processAIChanges(changes: Record<string, string>) {
  const modifiedFiles: Record<string, string> = {};
  const createdFiles: Record<string, string> = {};

  for (const [key, content] of Object.entries(changes)) {
    if (key.startsWith('CREATE:')) {
      createdFiles[key.replace('CREATE:', '')] = content;
    } else {
      modifiedFiles[key] = content;
    }
  }
  return { modifiedFiles, createdFiles };
}
```

#### DiffViewer — Handle New Files & .env

```typescript
function DiffPreview({ originalFiles, changedFiles }) {
  const [activeFile, setActiveFile] = useState(Object.keys(changedFiles)[0]);

  const isNewFile = (path: string) => !originalFiles[path];
  const isEnvFile = (path: string) => path.includes('.env');

  return (
    <div>
      {/* File tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.keys(changedFiles).map(path => (
          <button key={path} onClick={() => setActiveFile(path)}
            className={`px-3 py-1 rounded text-sm flex items-center gap-1
              ${activeFile === path ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            {isNewFile(path) && (
              <span className="bg-green-500 text-white text-xs px-1 rounded">NEW</span>
            )}
            {isEnvFile(path) && <span>🔒</span>}
            {path.split('/').pop()}
          </button>
        ))}
      </div>

      {/* .env files → special masked editor */}
      {isEnvFile(activeFile) ? (
        <div className="border rounded-lg p-4 bg-yellow-50">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-semibold text-yellow-700">🔒 Environment File</span>
            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
              Will NOT be committed to git
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Fill in your actual values. This file is only used for local preview.
          </p>
          <EnvEditor content={changedFiles[activeFile]} />
        </div>
      ) : (
        /* Normal diff with horizontal scroll */
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', minWidth: 0 }}>
          <ReactDiffViewer
            oldValue={originalFiles[activeFile] || ''}
            newValue={changedFiles[activeFile] || ''}
            splitView={true}
            useDarkTheme={false}
            leftTitle={isNewFile(activeFile) ? '(new file)' : 'Before'}
            rightTitle="After (AI Changes)"
            showDiffOnly={true}
            extraLinesSurroundingDiff={3}
          />
        </div>
      )}
    </div>
  );
}
```

#### Removed: EnvEditor Component

```typescript
'use client';
import { useState } from 'react';

// Deprecated: env editing from chatbot/diff viewer is removed.
export function EnvEditor({ content }: { content: string }) {
  const [vars, setVars] = useState(() =>
    content.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => {
        const [key, ...rest] = line.split('=');
        return { key: key.trim(), value: rest.join('=').trim() };
      })
  );

  return (
    <div className="space-y-2">
      {vars.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-700 w-48 shrink-0">{v.key}</span>
          <span className="text-gray-400">=</span>
          <input
            type={v.key.toLowerCase().includes('secret') || v.key.toLowerCase().includes('key')
              ? 'password' : 'text'}
            value={v.value}
            onChange={e => setVars(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
            placeholder="Enter value..."
            className="flex-1 border rounded px-3 py-1 text-sm font-mono"
          />
        </div>
      ))}
    </div>
  );
}
```

#### ✅ Step 1 Done When:
- [ ] AI can create new files — shown with "NEW" badge in diff viewer
- [ ] Chatbot does not create or edit `.env` files
- [ ] `.env` files are assembled from `project_env_vars` table (Step 10) before WebContainer boot — not stored as raw file content
- [ ] `created_files` table stores all new non-env files per session

---

### 🆕 Step 2 — Custom Run Command Override

**Problem:** AI parses README to get commands, but this is sometimes wrong. Users may also want different flags (e.g. `npm run dev -- --port 4000`).

**Solution:** Show AI-parsed commands in editable fields. User can change them anytime. Saved to `projects` table and used by WebContainer.

#### RunCommandsCard Component

```typescript
'use client';
import { useState } from 'react';

export function RunCommandsCard({ projectId, initialInstall, initialStart }) {
  const [install, setInstall] = useState(initialInstall || 'npm install');
  const [start, setStart] = useState(initialStart || 'npm run dev');
  const [saved, setSaved] = useState(true);

  async function save() {
    await fetch('/api/projects/update-commands', {
      method: 'POST',
      body: JSON.stringify({ projectId, install, start }),
    });
    setSaved(true);
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">⚙️ Run Commands</h3>
        <span className="text-xs text-gray-400">AI-parsed from README · editable</span>
      </div>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Install</label>
          <input value={install} onChange={e => { setInstall(e.target.value); setSaved(false); }}
            className="w-full font-mono text-sm border rounded px-3 py-1.5" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Start / Dev</label>
          <input value={start} onChange={e => { setStart(e.target.value); setSaved(false); }}
            className="w-full font-mono text-sm border rounded px-3 py-1.5" />
        </div>
      </div>
      {!saved && (
        <button onClick={save}
          className="mt-3 text-sm bg-blue-500 text-white px-3 py-1 rounded">
          Save Commands
        </button>
      )}
    </div>
  );
}
```

#### ✅ Step 2 Done When:
- [ ] Run Commands card shows in repo detail page with editable inputs
- [ ] Saving updates `projects.run_command` and `projects.install_command`
- [ ] WebContainer (Step 5) uses these saved values to start the server

---

### 🆕 Step 3 — File Selector → Prompt Chip UI

**Problem:** Clicking a file in the tree just shows a dot. There's no visible list of selected files and no way to remove them.

**Solution:** Selected files appear as removable chips directly above the prompt input — like email attachments.

#### Updated Editor Layout

```
┌──────────────┬──────────────────────────────────────────────┐
│  File Tree   │   AI Chat Area                               │
│              │                                              │
│ 📁 src/      │   [Chat message history scrolls here]        │
│  📄 page.tsx │                                              │
│  📄 layout   │   ┌──────────────────────────────────────┐  │
│ 📁 components│   │ 📎 Files: [hero.tsx ×] [page.tsx ×]  │  │
│  📄 hero.tsx ←── │ (clear all)                           │  │
│  📄 nav.tsx  │   │ ── or ──                              │  │
│              │   │ 💡 No files — AI reviews whole project│  │
│ Click file   │   │                                       │  │
│ to add chip  │   │ What would you like to change?        │  │
│              │   │ [textarea________________] [⚙️] [▶]   │  │
│              │   └──────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────┘
```

#### PromptBox Component

```typescript
'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { ModelSelector } from './ModelSelector';

export function PromptBox({ selectedFiles, onRemoveFile, onSubmit, isLoading, selectedModel, onModelChange }) {
  const [prompt, setPrompt] = useState('');

  function handleSubmit() {
    if (!prompt.trim()) return;
    onSubmit(prompt, selectedFiles);
    setPrompt('');
  }

  return (
    <div className="border rounded-xl p-3 bg-white shadow-sm">

      {/* File chips */}
      {selectedFiles.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b">
          <span className="text-xs text-gray-400 self-center">📎</span>
          {selectedFiles.map(path => (
            <span key={path}
              className="flex items-center gap-1 bg-blue-50 border border-blue-200
                         text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {path.split('/').pop()}
              <button onClick={() => onRemoveFile(path)} className="hover:text-red-500">
                <X size={10} />
              </button>
            </span>
          ))}
          <button onClick={() => selectedFiles.forEach(onRemoveFile)}
            className="text-xs text-gray-400 hover:text-red-400 ml-1">
            Clear all
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-2">
          💡 No files selected — AI will review the entire project
        </p>
      )}

      {/* Prompt + model selector + send */}
      <div className="flex items-end gap-2">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
          placeholder="Describe what you want to change..."
          rows={2}
          className="flex-1 resize-none text-sm outline-none"
        />
        <div className="flex flex-col gap-1 shrink-0">
          <ModelSelector selected={selectedModel} onChange={onModelChange} />
          <button onClick={handleSubmit} disabled={isLoading || !prompt.trim()}
            className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-50">
            {isLoading ? '...' : '▶ Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### FileTree — Toggle Selection

```typescript
function FileTree({ files, selectedFiles, onToggleFile }) {
  return (
    <div className="text-sm">
      {files.map(file => (
        <div key={file.path} onClick={() => onToggleFile(file.path)}
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100
            ${selectedFiles.includes(file.path) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0
            ${selectedFiles.includes(file.path) ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span className="truncate">{file.name}</span>
          {selectedFiles.includes(file.path) && <span className="ml-auto text-blue-400 text-xs">✓</span>}
        </div>
      ))}
    </div>
  );
}
```

#### ✅ Step 3 Done When:
- [ ] Clicking a file adds a chip above the prompt input
- [ ] `×` on chip removes it from selection
- [ ] "Clear all" removes all chips
- [ ] Hint shows "AI will review entire project" when no files selected
- [ ] Selected files highlighted in tree (filled blue dot + checkmark, not just grey dot)

---

### 🆕 Step 4 — Whole-Project AI Mode

**Problem:** Non-developers don't know which files to select. They should just describe what they want and let AI figure out the relevant files.

**Solution:** When no files selected, AI does a two-pass analysis — first picks which files to read, then makes the changes.

#### Two-Pass API Strategy

```typescript
// Pass 1 — planning (fast model, returns file list)
const planText = await callAI([
  {
    role: 'system',
    content: `Given a file tree and user request, return ONLY a JSON array of file paths
    you need to read (max 8). Example: ["src/app/page.tsx", "package.json"]`
  },
  {
    role: 'user',
    content: `File tree:\n${fileTree.join('\n')}\n\nRequest: ${prompt}\n\nWhich files do you need?`
  }
], { model: 'fast' });

const filesToRead = JSON.parse(planText);

// Pass 2 — fetch those files from GitHub, then run normal modify
const fileContents = await fetchFilesFromGithub(filesToRead);
const changes = await callModifyAPI({ prompt, fileContents, projectContext });
```

#### ✅ Step 4 Done When:
- [ ] Sending prompt with no files selected triggers two-pass mode
- [ ] AI correctly identifies relevant files from the file tree
- [ ] Changes are returned and displayed as normal
- [ ] No extra UI needed — hint in PromptBox is sufficient

---

### 🆕 Step 5 — Local Dev Server + Live Preview 🎯 MAIN GOAL

**Problem:** Users can see code diffs but not the running app. A non-developer needs to see the visual result to know if they're happy with the changes.

**Solution:** Boot a WebContainer in the browser, run the project using the saved install/start commands, and show it in an embedded iframe. Auto-updates when AI applies changes (see Step 9).

#### Required Header in `next.config.js`

```javascript
const nextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ],
    }];
  },
};
module.exports = nextConfig;
```

#### `lib/webcontainer.ts`

```typescript
import { WebContainer } from '@webcontainer/api';

let instance: WebContainer | null = null;

export async function getWebContainer() {
  if (!instance) instance = await WebContainer.boot();
  return instance;
}

export async function mountProjectFiles(files: Record<string, string>) {
  const wc = await getWebContainer();
  const fsTree = buildFsTree(files);
  await wc.mount(fsTree);
  return wc;
}

function buildFsTree(files: Record<string, string>) {
  const tree: Record<string, any> = {};
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/');
    let cur = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = { directory: {} };
      cur = cur[parts[i]].directory;
    }
    cur[parts[parts.length - 1]] = { file: { contents: content } };
  }
  return tree;
}

export async function startDevServer(
  wc: WebContainer,
  installCmd: string,
  startCmd: string,
  onReady: (url: string) => void,
  onLog: (line: string) => void
) {
  const [installBin, ...installArgs] = installCmd.split(' ');
  const install = await wc.spawn(installBin, installArgs);
  install.output.pipeTo(new WritableStream({ write: (d) => onLog(d) }));
  if (await install.exit !== 0) throw new Error('Install failed');

  const [startBin, ...startArgs] = startCmd.split(' ');
  const server = await wc.spawn(startBin, startArgs);
  server.output.pipeTo(new WritableStream({ write: (d) => onLog(d) }));

  wc.on('server-ready', (_, url) => onReady(url));
}
```

#### `components/LivePreview.tsx`

```typescript
'use client';
import { useState, useEffect, useRef } from 'react';
import { mountProjectFiles, startDevServer } from '@/lib/webcontainer';
import { HotSyncIndicator } from './HotSyncIndicator';

type Status = 'idle' | 'mounting' | 'installing' | 'starting' | 'ready' | 'error';

export function LivePreview({ allFiles, changedFiles, installCommand, startCommand, syncStatus, lastSyncedFiles }) {
  const [status, setStatus] = useState<Status>('idle');
  const [previewUrl, setPreviewUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const addLog = (line: string) => setLogs(p => [...p.slice(-100), line]);

  async function startPreview() {
    try {
      setStatus('mounting'); addLog('📦 Mounting files...');
      const merged = { ...allFiles, ...changedFiles };
      const wc = await mountProjectFiles(merged);

      setStatus('installing'); addLog(`⬇️ ${installCommand}`);
      await startDevServer(wc, installCommand, startCommand,
        (url) => { setPreviewUrl(url); setStatus('ready'); addLog(`✅ Ready: ${url}`); },
        (line) => addLog(line)
      );
      setStatus('starting'); addLog(`🚀 ${startCommand}`);
    } catch (err) {
      setStatus('error'); addLog(`❌ ${err}`);
    }
  }

  return (
    <div className="flex flex-col h-full border rounded-xl overflow-hidden bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 shrink-0">
        <span className="text-sm text-gray-300 font-medium">🖥️ Live Preview</span>
        <div className="flex items-center gap-2">
          {status === 'ready' && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Live
            </span>
          )}

          {/* Hot sync status indicator (Step 9) */}
          <HotSyncIndicator status={syncStatus} lastSyncedFiles={lastSyncedFiles} />

          <button onClick={() => setShowLogs(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded bg-gray-700">
            {showLogs ? 'Hide Logs' : 'Logs'}
          </button>
          {(status === 'idle' || status === 'error') && (
            <button onClick={startPreview}
              className="text-xs bg-blue-500 text-white px-3 py-1 rounded">▶ Start</button>
          )}
          {status === 'ready' && (
            <button onClick={startPreview}
              className="text-xs bg-gray-600 text-gray-300 px-3 py-1 rounded">↺ Hard Restart</button>
          )}
          {['mounting','installing','starting'].includes(status) && (
            <span className="text-xs text-yellow-400">
              {status === 'mounting' && '📦 Mounting...' }
              {status === 'installing' && '⬇️ Installing...'}
              {status === 'starting' && '🚀 Starting...'}
            </span>
          )}
        </div>
      </div>

      {/* Terminal logs */}
      {showLogs && (
        <div className="bg-black text-green-400 font-mono text-xs p-3 h-32 overflow-y-auto shrink-0">
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {/* Iframe */}
      <div className="flex-1 bg-white">
        {status === 'ready' && previewUrl ? (
          <iframe ref={iframeRef} src={previewUrl} className="w-full h-full border-0" title="Live Preview" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            {status === 'idle' && <>
              <span className="text-4xl">🖥️</span>
              <p className="text-sm">Click "Start" to run the project in your browser</p>
              <p className="text-xs">Powered by WebContainers — no server required</p>
            </>}
            {status === 'error' && <>
              <span className="text-4xl">❌</span>
              <p className="text-sm text-red-400">Preview failed — check logs</p>
            </>}
            {['mounting','installing','starting'].includes(status) && <>
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">
                {status === 'mounting' && 'Mounting files...'}
                {status === 'installing' && 'Installing dependencies (this may take a minute)...'}
                {status === 'starting' && 'Starting dev server...'}
              </p>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Updated Four-Panel Editor Layout

```
┌─────────────┬──────────────────────┬─────────────────────────────────┐
│  File Tree  │   AI Chat Panel      │  Right Panel (tabbed)           │
│             │                      │                                 │
│ 📁 src/     │  [Chat messages]     │  [Diff View] [Live Preview]     │
│  📄 page    │                      │                                 │
│  📄 layout  │  [File chips / hint] │  ── Diff View ─────────────── │
│ 📁 comp/    │  [Prompt input    ]  │  [file tabs]                   │
│  📄 hero ✓  │  [Model ▾] [▶ Send] │  OLD     │     NEW             │
│  📄 nav     │                      │  (horizontal scroll)           │
│             │  [+ New Chat]        │  ── Live Preview ─────────── │
│             │  [Commit & Raise MR] │  [▶ Start] [● Live] [Logs]   │
│             │  (shows when ready)  │  [⚡ Syncing... / ✅ 2 reloaded]│
│             │                      │  ┌─────────────────────────┐  │
│             │                      │  │   iframe: running app    │  │
│             │                      │  └─────────────────────────┘  │
└─────────────┴──────────────────────┴─────────────────────────────────┘
```

#### ✅ Step 5 Done When:
- [ ] "Start" button boots WebContainer and runs the project in browser
- [ ] Project visible in iframe using the saved install/start commands
- [ ] Terminal log panel shows install/start output
- [ ] Diff View and Live Preview are tabs on the right panel
- [ ] Requires COOP/COEP headers — `next.config.js` updated
- [ ] `iframeRef` wired up for plain-HTML fallback reload (Step 9)

---

### 🆕 Step 6 — Multi-Prompt Sessions & Chat History

**Problem:** Each prompt is currently isolated. Users need multiple prompts to perfect their changes ("make button green" → "now larger" → "add shadow"). All changes should build on each other within a session.

**Solution:** Each session tracks `accumulated_changes` — a merged map of ALL file changes across ALL prompts. The diff always shows total delta from the original.

#### Accumulated Changes Logic

```typescript
// Editor state:
const [baselineFiles, setBaselineFiles] = useState<Record<string, string>>({});
// ↑ Original files from GitHub — never mutated during session

const [accumulatedChanges, setAccumulatedChanges] = useState<Record<string, string>>({});
// ↑ Grows with each prompt — latest version of each changed file

function applyNewChanges(newChanges: Record<string, string>) {
  setAccumulatedChanges(prev => ({ ...prev, ...newChanges }));
  // Hot-sync into WebContainer (Step 9) — no restart needed
  hotSyncChanges(newChanges);
}

// Send AI the CURRENT accumulated state as context (not baseline):
async function sendPrompt(prompt: string, selectedFiles: string[]) {
  const currentFileContents = selectedFiles.length > 0
    ? Object.fromEntries(selectedFiles.map(p => [p, accumulatedChanges[p] || baselineFiles[p] || '']))
    : {};

  const { changes } = await callModifyAPI({ prompt, fileContents: currentFileContents, projectContext });
  applyNewChanges(changes);
  await saveMessageToSupabase({ prompt, changes, sessionId });
}
```

#### Chat Message with File Change Summary

```typescript
function ChatMessage({ message }) {
  return (
    <div className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
        message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
      }`}>
        {message.content}
        {/* Show changed files for this specific prompt */}
        {message.changes_snapshot && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Object.keys(message.changes_snapshot).map(path => (
              <span key={path} className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                {path.split('/').pop()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### ✅ Step 6 Done When:
- [ ] 3 prompts in sequence correctly build on each other
- [ ] Diff viewer shows total change from original baseline (not just last prompt)
- [ ] AI receives current accumulated file state as context
- [ ] Chat messages show which files changed per prompt
- [ ] WebContainer hot-reloads after each new change applied (via Step 9)

---

### 🆕 Step 7 — LLM Model Switcher in Prompt Box

**Problem:** AI model is fixed in env vars. Users should be able to switch between GROQ and NVIDIA, and pick model size, from the UI.

**Solution:** A compact dropdown in the prompt box toolbar. Selection is used for the next prompt. Saved in `ai_sessions.llm_model`.

#### Model Options

```typescript
export const MODEL_OPTIONS = [
  { provider: 'groq',   model: 'llama3-70b-8192',                               label: 'Llama 3 70B',   badge: 'GROQ',   note: 'Fast' },
  { provider: 'groq',   model: 'llama3-8b-8192',                                label: 'Llama 3 8B',    badge: 'GROQ',   note: 'Fastest' },
  { provider: 'groq',   model: 'mixtral-8x7b-32768',                            label: 'Mixtral 8x7B',  badge: 'GROQ',   note: 'Long ctx' },
  { provider: 'nvidia', model: 'meta/llama-3.1-70b-instruct',                   label: 'Llama 3.1 70B', badge: 'NVIDIA', note: 'Balanced' },
  { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct',        label: 'Nemotron 70B',  badge: 'NVIDIA', note: 'Best quality' },
];
```

#### ModelSelector Component

```typescript
'use client';
import { useState } from 'react';
import { MODEL_OPTIONS } from '@/lib/models';

export function ModelSelector({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const current = MODEL_OPTIONS.find(o => o.model === selected.model) || MODEL_OPTIONS[0];

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1.5 bg-gray-50 hover:bg-gray-100">
        <span className={`text-xs px-1 rounded font-bold
          ${current.badge === 'GROQ' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
          {current.badge}
        </span>
        <span className="text-gray-700">{current.label}</span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 bg-white border rounded-xl shadow-lg z-50 w-64">
          <div className="px-3 py-2 text-xs text-gray-400 border-b uppercase tracking-wide">Choose Model</div>
          {MODEL_OPTIONS.map(opt => (
            <button key={opt.model} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50
                ${opt.model === current.model ? 'bg-blue-50' : ''}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold
                  ${opt.badge === 'GROQ' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                  {opt.badge}
                </span>
                <span>{opt.label}</span>
              </div>
              <span className="text-xs text-gray-400">{opt.note}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Pass Model Override to API

```typescript
// lib/ai-client.ts — add override support:
export async function callAI(messages, options = {}) {
  const provider = options.overrideProvider || process.env.LLM_PROVIDER || 'groq';
  const model = options.overrideModel || modelMap[options.model || 'primary'];
  // rest unchanged...
}

// app/api/ai/modify/route.ts — read override from request:
const { prompt, fileContents, projectContext, overrideProvider, overrideModel } = await request.json();
const text = await callAI(messages, { model: 'primary', overrideProvider, overrideModel });
```

#### ✅ Step 7 Done When:
- [ ] Model dropdown appears in prompt box, between textarea and send button
- [ ] Switching model uses that model for next prompt
- [ ] GROQ models show orange badge, NVIDIA models show green badge
- [ ] Selected model saved in `ai_sessions.llm_model`

---

### 🆕 Step 8 — New Chat + Commit & Raise MR

**Problem:** No way to start a fresh session. And the commit/PR action should only happen when the user is fully satisfied — after potentially many prompts. Currently it's triggered too early.

**Solution:** "New Chat" button starts a clean session with confirmation. "Commit & Raise MR" is a deliberate end-of-session action that only appears when there are accumulated changes.

#### New Chat Button

```typescript
function NewChatButton({ hasChanges, onNewChat }) {
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!hasChanges) { onNewChat(); return; }
    if (confirming) { onNewChat(); setConfirming(false); return; }
    setConfirming(true);
    setTimeout(() => setConfirming(false), 3000);
  }

  return (
    <button onClick={handleClick}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all
        ${confirming ? 'border-red-300 text-red-500 bg-red-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
      {confirming ? '⚠️ Confirm — changes will be lost' : '+ New Chat'}
    </button>
  );
}

function handleNewChat() {
  setAccumulatedChanges({});
  setChatMessages([]);
  setSelectedFiles([]);
  createNewSessionInSupabase();
}
```

#### Commit & Raise MR Panel

```typescript
function CommitPanel({ accumulatedChanges, baseBranch, projectId, onSuccess }) {
  const [branchName, setBranchName] = useState(`ai-changes-${Date.now()}`);
  const [status, setStatus] = useState<'idle' | 'pushing' | 'pr' | 'done'>('idle');
  const [prUrl, setPrUrl] = useState('');

  const hasChanges = Object.keys(accumulatedChanges).length > 0;
  if (!hasChanges) return null; // hidden when nothing changed

  async function commit() {
    setStatus('pushing');
    await fetch('/api/git/push', {
      method: 'POST',
      body: JSON.stringify({ changes: accumulatedChanges, newBranch: branchName, baseBranch, projectId }),
    });
    setStatus('pr');
    const res = await fetch('/api/git/create-pr', {
      method: 'POST',
      body: JSON.stringify({ newBranch: branchName, baseBranch, changes: accumulatedChanges, projectId }),
    });
    const { prUrl } = await res.json();
    setPrUrl(prUrl);
    setStatus('done');
    onSuccess(prUrl);
  }

  if (status === 'done') return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
      <p className="text-green-700 font-semibold mb-2">✅ PR Created!</p>
      <a href={prUrl} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 text-sm underline">View Pull Request ↗</a>
    </div>
  );

  return (
    <div className="border-t pt-3 mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Ready to commit?</p>
        <span className="text-xs text-gray-400">{Object.keys(accumulatedChanges).length} file(s) changed</span>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-1">
        {Object.keys(accumulatedChanges).map(path => (
          <span key={path} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {path.split('/').pop()}
          </span>
        ))}
      </div>

      {/* Branch name */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Branch name</label>
        <input value={branchName} onChange={e => setBranchName(e.target.value)}
          className="w-full border rounded-lg px-3 py-1.5 text-sm font-mono" />
      </div>

      <button onClick={commit} disabled={status !== 'idle'}
        className="w-full bg-green-500 text-white py-2 rounded-lg text-sm font-semibold
                   hover:bg-green-600 disabled:opacity-50">
        {status === 'idle' && '🚀 Commit & Raise PR'}
        {status === 'pushing' && '⬆️ Pushing changes...'}
        {status === 'pr' && '📝 Creating PR...'}
      </button>
    </div>
  );
}
```

#### ✅ Step 8 Done When:
- [ ] "New Chat" button shown in chat panel header
- [ ] Clicking it when changes exist asks for confirmation first
- [ ] "Commit & Raise MR" panel appears only when `accumulatedChanges` is non-empty
- [ ] Panel shows all changed files as chips + editable branch name
- [ ] One click pushes ALL accumulated changes and creates PR
- [ ] PR success state shows link

---

### 🆕 Step 9 — Hot File Sync (Live Reload Without Server Restart)

**Problem:** When AI applies changes to files, the user currently has to restart the WebContainer dev server to see the updates reflected in the live preview iframe. This breaks the flow — non-developers shouldn't have to think about servers at all.

**Solution:** Whenever AI applies changes to any file, write those files directly into the running WebContainer filesystem using `wc.fs.writeFile()`. Modern dev servers (Vite, Next.js, CRA) have built-in HMR (Hot Module Replacement) — they detect filesystem changes and push updates to the browser automatically, with zero restart needed.

#### How It Works

```
AI returns changed files
        ↓
applyNewChanges() called
        ↓
Update React state (accumulatedChanges)
        ↓
Write each changed file into WebContainer FS  ← hotSyncFiles()
        ↓
Dev server detects file change via HMR watcher
        ↓
Browser iframe updates automatically ✅  (no restart!)
```

#### `lib/webcontainer.ts` — Hot Sync Helper (add to existing file)

```typescript
/**
 * Write one or more files into the running WebContainer filesystem.
 * The dev server's HMR watcher picks up changes automatically.
 * No restart needed for Vite, Next.js, CRA, or Parcel projects.
 */
export async function hotSyncFiles(
  files: Record<string, string>,
  onSynced?: (path: string) => void
): Promise<void> {
  const wc = await getWebContainer();

  await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      // Ensure parent directories exist before writing
      const parts = path.split('/');
      if (parts.length > 1) {
        const dir = parts.slice(0, -1).join('/');
        await wc.fs.mkdir(dir, { recursive: true }).catch(() => {
          // Directory may already exist — silently ignore
        });
      }
      await wc.fs.writeFile(path, content, 'utf-8');
      onSynced?.(path);
    })
  );
}
```

#### Integration in Editor State

```typescript
// editor page state
const [syncedFiles, setSyncedFiles] = useState<Set<string>>(new Set());
const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');

async function hotSyncChanges(newChanges: Record<string, string>) {
  if (previewStatus !== 'ready') return; // only sync if preview is running

  // .env files need a full restart — warn and skip hot sync for them
  // The actual .env is assembled from project_env_vars table (Step 10),
  // so if user adds/changes a key there, we restart rather than hot-sync
  const envFilesChanged = Object.keys(newChanges).filter(p => p.includes('.env'));
  if (envFilesChanged.length > 0) {
    toast({
      title: '⚠️ .env file changed',
      description: 'Environment variables require a full server restart to take effect.',
      action: <button onClick={startPreview}>Restart Now</button>,
    });
  }

  // Only hot-sync non-.env files
  const safeChanges = Object.fromEntries(
    Object.entries(newChanges).filter(([p]) => !p.includes('.env'))
  );
  if (Object.keys(safeChanges).length === 0) return;

  setSyncStatus('syncing');
  await hotSyncFiles(safeChanges, (path) => {
    setSyncedFiles(prev => new Set([...prev, path]));
  });
  setSyncStatus('done');
  // Reset status after short delay for UX feedback
  setTimeout(() => setSyncStatus('idle'), 2500);
}

async function applyNewChanges(newChanges: Record<string, string>) {
  // 1. Update accumulated changes in React state
  setAccumulatedChanges(prev => ({ ...prev, ...newChanges }));
  // 2. Hot-sync into WebContainer (no restart!)
  await hotSyncChanges(newChanges);
}
```

#### `components/HotSyncIndicator.tsx`

Show users when files have been silently pushed to the running preview:

```typescript
'use client';

type SyncStatus = 'idle' | 'syncing' | 'done';

export function HotSyncIndicator({
  status,
  lastSyncedFiles,
}: {
  status: SyncStatus;
  lastSyncedFiles: string[];
}) {
  if (status === 'idle') return null;

  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition-all
      ${status === 'syncing' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : ''}
      ${status === 'done'    ? 'bg-green-50  text-green-700  border border-green-200'  : ''}`}>

      {status === 'syncing' && (
        <>
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          Syncing changes to preview...
        </>
      )}

      {status === 'done' && (
        <>
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Preview updated — {lastSyncedFiles.length} file{lastSyncedFiles.length !== 1 ? 's' : ''} hot-reloaded
        </>
      )}
    </div>
  );
}
```

#### Plain HTML / No-Bundler Fallback — Force Iframe Reload

For projects without a bundler that don't support HMR, force the iframe to reload after sync:

```typescript
// In LivePreview.tsx — detect plain HTML projects and force-reload iframe
const iframeRef = useRef<HTMLIFrameElement>(null);
const isPlainHtmlProject = !allFiles['package.json']; // no package.json = no bundler

useEffect(() => {
  if (previewStatus !== 'ready' || !isPlainHtmlProject) return;
  if (syncStatus === 'done' && iframeRef.current) {
    // Force iframe reload after hot sync completes
    iframeRef.current.src = iframeRef.current.src;
  }
}, [syncStatus, isPlainHtmlProject, previewStatus]);
```

#### HMR Compatibility by Framework

| Framework | HMR Support | Restart Needed? | Notes |
|---|---|---|---|
| **Vite** (React, Vue, Svelte) | ✅ Automatic | Never | Fastest — sub-second updates |
| **Next.js** (App / Pages Router) | ✅ Automatic | Never | Fast Refresh works out of the box |
| **Create React App** | ✅ Automatic | Never | Webpack HMR — slightly slower |
| **Parcel** | ✅ Automatic | Never | Works with WebContainer |
| **Plain HTML + no bundler** | ⚠️ Iframe reload | Never | `iframeRef.src` trick above |
| **`.env` files** | ❌ Not supported | Always | Toast warning + manual restart button |

#### ✅ Step 9 Done When:
- [ ] AI applies changes → `hotSyncFiles()` writes files into WebContainer FS
- [ ] Vite / Next.js / CRA projects hot-reload in iframe with no restart
- [ ] `HotSyncIndicator` shows "Syncing..." then "X files hot-reloaded" in the Live Preview toolbar
- [ ] "Hard Restart" button still available as fallback (replaces old "Restart")
- [ ] Plain HTML projects fall back to iframe `src` reload after sync
- [ ] `.env` file changes show a toast warning and are excluded from hot sync
- [ ] `syncStatus` and `lastSyncedFiles` props passed from editor page → `LivePreview`

---

### 🆕 Step 10 — Project-wise ENV Variable Manager

**Problem:** `.env` files hold secrets (API keys, DB URLs, tokens) that must never be committed to git. Currently there's no structured way to store, manage, or inject these per project. AI-suggested `.env` placeholders are useless until the user fills in real values — and there's no good place in the UI to do this.

**Solution:** Add a dedicated ENV Variable Manager UI that appears on the repo detail page — right after the user selects a branch and sets run commands. Variables are stored encrypted per project in the `project_env_vars` Supabase table. Before WebContainer boots, all saved variables are assembled into a `.env` file and written into the container. Variables are **never committed to git**.

#### Where It Appears in the User Flow

```
/dashboard/repo/[id]
        ↓
① Select Branch           ← existing
        ↓
② Run Commands Card       ← Step 2
        ↓
③ ENV Variables Card      ← Step 10 (NEW — shown here, before entering editor)
   [+ Add Variable]
   KEY              VALUE          SECRET?
   VITE_API_URL     http://...     [ ]
   VITE_SECRET      ••••••••       [✓]
        ↓
④ [Open Editor →]         ← only enabled after env setup (or skipped)
```

#### Database — `project_env_vars` Table

```sql
-- Already added in DB Schema section above.
-- Key points:
--   unique(project_id, key)   → upsert by key, no duplicates
--   is_secret boolean         → controls whether UI masks the value
--   value text                → store encrypted at rest in production
--                               (use Supabase Vault or pgcrypto for prod)
```

**Production encryption note:** For production, encrypt values with `pgcrypto` before storing:

```sql
-- Extension (enable once in Supabase dashboard):
create extension if not exists pgcrypto;

-- Encrypt on insert/update (use your own passphrase from env):
insert into project_env_vars (project_id, user_id, key, value, is_secret)
values (
  $1, $2, $3,
  pgp_sym_encrypt($4, current_setting('app.encryption_key')),
  $5
)
on conflict (project_id, key) do update
  set value = pgp_sym_encrypt(excluded.value, current_setting('app.encryption_key')),
      updated_at = now();

-- Decrypt on read:
select key, pgp_sym_decrypt(value::bytea, current_setting('app.encryption_key')) as value
from project_env_vars
where project_id = $1;
```

#### API Routes for ENV Vars

```
GET  /api/projects/[id]/env-vars     → list all keys (values masked for secrets)
POST /api/projects/[id]/env-vars     → upsert a variable (key + value + is_secret)
DELETE /api/projects/[id]/env-vars/[key] → delete a variable
GET  /api/projects/[id]/env-vars/dotenv  → assemble & return full .env file content
                                           (server-side only — never sent to client as plaintext for secrets)
```

#### `app/api/projects/[id]/env-vars/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET — list all vars for this project (mask secret values)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('project_env_vars')
    .select('id, key, value, is_secret, updated_at')
    .eq('project_id', params.id)
    .eq('user_id', user.id)
    .order('key');

  if (error) return NextResponse.json({ error }, { status: 500 });

  // Mask secret values before sending to client
  const masked = data.map(v => ({
    ...v,
    value: v.is_secret ? '••••••••' : v.value,
  }));

  return NextResponse.json({ vars: masked });
}

// POST — upsert a variable
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key, value, is_secret } = await req.json();

  if (!key || typeof key !== 'string' || !/^[A-Z0-9_]+$/.test(key.toUpperCase())) {
    return NextResponse.json({ error: 'Key must be uppercase alphanumeric with underscores' }, { status: 400 });
  }

  const { error } = await supabase
    .from('project_env_vars')
    .upsert({
      project_id: params.id,
      user_id: user.id,
      key: key.toUpperCase().trim(),
      value: value ?? '',
      is_secret: is_secret ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,key' });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove a variable by key
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key } = await req.json();

  const { error } = await supabase
    .from('project_env_vars')
    .delete()
    .eq('project_id', params.id)
    .eq('user_id', user.id)
    .eq('key', key);

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

#### `app/api/projects/[id]/env-vars/dotenv/route.ts`

Assembles all saved variables into a `.env` file string — called server-side before WebContainer boot:

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch unmasked values (server-side only)
  const { data, error } = await supabase
    .from('project_env_vars')
    .select('key, value')
    .eq('project_id', params.id)
    .eq('user_id', user.id)
    .order('key');

  if (error) return NextResponse.json({ error }, { status: 500 });

  // Build .env file content
  const dotenv = [
    '# Auto-generated by VibeCode — do not commit',
    ...data.map(v => `${v.key}=${v.value}`),
  ].join('\n');

  return new Response(dotenv, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
```

#### `components/EnvVarsCard.tsx` — The UI Component

Shown on `/dashboard/repo/[id]` between RunCommandsCard and the "Open Editor" button:

```typescript
'use client';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, Plus, Trash2, Lock, Globe } from 'lucide-react';

type EnvVar = {
  id: string;
  key: string;
  value: string;    // '••••••••' for secrets from server
  is_secret: boolean;
  updated_at: string;
};

type NewVar = { key: string; value: string; is_secret: boolean };

export function EnvVarsCard({ projectId }: { projectId: string }) {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newVar, setNewVar] = useState<NewVar>({ key: '', value: '', is_secret: false });
  const [saving, setSaving] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => { fetchVars(); }, [projectId]);

  async function fetchVars() {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/env-vars`);
    const { vars } = await res.json();
    setVars(vars || []);
    setLoading(false);
  }

  async function saveVar() {
    if (!newVar.key.trim()) { setError('Key is required'); return; }
    if (!/^[A-Za-z0-9_]+$/.test(newVar.key)) {
      setError('Key can only contain letters, numbers, and underscores');
      return;
    }
    setSaving(true); setError('');
    await fetch(`/api/projects/${projectId}/env-vars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: newVar.key.toUpperCase(),
        value: newVar.value,
        is_secret: newVar.is_secret,
      }),
    });
    setNewVar({ key: '', value: '', is_secret: false });
    setAdding(false);
    setSaving(false);
    fetchVars();
  }

  async function deleteVar(key: string) {
    await fetch(`/api/projects/${projectId}/env-vars`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    fetchVars();
  }

  function toggleReveal(key: string) {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <span className="text-base">🔐</span>
          <div>
            <h3 className="font-semibold text-sm text-gray-800">Environment Variables</h3>
            <p className="text-xs text-gray-400">Stored securely · never committed to git</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vars.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {vars.length} variable{vars.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => { setAdding(true); setError(''); }}
            className="flex items-center gap-1.5 text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">
            <Plus size={12} /> Add Variable
          </button>
        </div>
      </div>

      {/* Add new variable form */}
      {adding && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-xs font-medium text-blue-700 mb-2">New Environment Variable</p>
          <div className="flex gap-2 items-start">
            {/* Key */}
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Key</label>
              <input
                value={newVar.key}
                onChange={e => setNewVar(p => ({ ...p, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                placeholder="VITE_API_URL"
                className="w-full font-mono text-sm border rounded-lg px-3 py-1.5 bg-white uppercase placeholder:normal-case"
                autoFocus
              />
            </div>
            {/* Value */}
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Value</label>
              <input
                type={newVar.is_secret ? 'password' : 'text'}
                value={newVar.value}
                onChange={e => setNewVar(p => ({ ...p, value: e.target.value }))}
                placeholder="your-value-here"
                className="w-full font-mono text-sm border rounded-lg px-3 py-1.5 bg-white"
              />
            </div>
            {/* Secret toggle */}
            <div className="shrink-0">
              <label className="text-xs text-gray-500 mb-1 block">Secret?</label>
              <button
                onClick={() => setNewVar(p => ({ ...p, is_secret: !p.is_secret }))}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all
                  ${newVar.is_secret
                    ? 'bg-orange-50 border-orange-200 text-orange-600'
                    : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                {newVar.is_secret ? <Lock size={12} /> : <Globe size={12} />}
                {newVar.is_secret ? 'Secret' : 'Public'}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={saveVar} disabled={saving}
              className="text-xs bg-blue-500 text-white px-4 py-1.5 rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Variable'}
            </button>
            <button onClick={() => { setAdding(false); setError(''); setNewVar({ key: '', value: '', is_secret: false }); }}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Variables list */}
      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">Loading...</div>
      ) : vars.length === 0 && !adding ? (
        <div className="px-4 py-8 text-center">
          <p className="text-2xl mb-2">🔑</p>
          <p className="text-sm text-gray-500 mb-1">No environment variables yet</p>
          <p className="text-xs text-gray-400">
            Add variables your project needs to run (API keys, DB URLs, etc.)
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {vars.map(v => (
            <div key={v.key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
              {/* Secret/public badge */}
              <span className={`shrink-0 ${v.is_secret ? 'text-orange-400' : 'text-gray-300'}`}>
                {v.is_secret ? <Lock size={13} /> : <Globe size={13} />}
              </span>

              {/* Key */}
              <span className="font-mono text-sm text-gray-700 w-52 shrink-0 truncate">
                {v.key}
              </span>

              {/* Value */}
              <span className={`flex-1 font-mono text-sm truncate
                ${v.is_secret && !revealedKeys.has(v.key) ? 'text-gray-400 tracking-widest' : 'text-gray-600'}`}>
                {v.is_secret && !revealedKeys.has(v.key) ? '••••••••' : v.value}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {v.is_secret && (
                  <button onClick={() => toggleReveal(v.key)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                    {revealedKeys.has(v.key) ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                )}
                <button onClick={() => deleteVar(v.key)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      {vars.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t">
          <p className="text-xs text-gray-400">
            🔒 These variables are injected into the WebContainer as a <code className="font-mono">.env</code> file at runtime — never pushed to your repository.
          </p>
        </div>
      )}
    </div>
  );
}
```

#### Inject ENV Vars into WebContainer Before Boot

Before `startDevServer()` is called in Step 5, fetch the assembled `.env` and write it into the container:

```typescript
// In the editor page — before calling startPreview():
async function getProjectEnvFile(projectId: string): Promise<string> {
  const res = await fetch(`/api/projects/${projectId}/env-vars/dotenv`);
  if (!res.ok) return ''; // no vars set — that's fine
  return res.text();
}

async function startPreview() {
  try {
    setStatus('mounting');
    const merged = { ...allFiles, ...accumulatedChanges };

    // 🆕 Inject project ENV vars as .env before mounting
    const envContent = await getProjectEnvFile(projectId);
    if (envContent.trim()) {
      merged['.env'] = envContent;
      // Also support .env.local for Next.js projects
      if (merged['package.json']?.includes('"next"')) {
        merged['.env.local'] = envContent;
      }
      addLog('🔐 Environment variables loaded from project settings');
    }

    const wc = await mountProjectFiles(merged);
    // ... rest of startPreview unchanged
  }
}
```

#### Updated Repo Detail Page Layout

```
/dashboard/repo/[id]

┌─────────────────────────────────────────────────────────────┐
│  📁 my-awesome-repo                    [⚙️ Settings]        │
│  github.com/user/my-awesome-repo                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ① Branch                                                   │
│  ┌──────────────────────────────┐                          │
│  │ main ▾                       │                          │
│  └──────────────────────────────┘                          │
│                                                             │
│  ② Run Commands                  AI-parsed from README      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Install   npm install                                 │  │
│  │ Start     npm run dev                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ③ Environment Variables         Stored securely · not git  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔐  VITE_API_URL      http://api.example.com    🗑️  │  │
│  │ 🔒  VITE_SECRET       ••••••••              👁️  🗑️  │  │
│  │ 🔐  DATABASE_URL      postgres://...           🗑️  │  │
│  │                                                      │  │
│  │ [+ Add Variable]                                     │  │
│  │                                                      │  │
│  │ 🔒 Injected as .env at runtime · never committed    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│                         [Open Editor →]                    │
└─────────────────────────────────────────────────────────────┘
```

#### AI-Suggested ENV Keys (Optional Enhancement)

When AI parses the README and detects references to environment variables, surface them as suggestions in the card:

```typescript
// In /api/ai/parse-readme route — add env key detection:
const ENV_KEY_REGEX = /\b([A-Z][A-Z0-9_]{2,})\b(?=.*=|.*your[- ]|.*replace)/g;

function extractEnvKeysFromReadme(readmeText: string): string[] {
  const matches = readmeText.matchAll(ENV_KEY_REGEX);
  const keys = [...new Set([...matches].map(m => m[1]))];
  // Filter out common non-env words
  const ignore = ['README', 'TODO', 'NOTE', 'WARNING', 'IMPORTANT', 'HTTP', 'HTTPS'];
  return keys.filter(k => !ignore.includes(k) && k.length > 3);
}

// Return alongside install/start commands:
return {
  installCommand: '...',
  startCommand: '...',
  suggestedEnvKeys: extractEnvKeysFromReadme(readmeText),
  // e.g. ['VITE_API_KEY', 'DATABASE_URL', 'NEXTAUTH_SECRET']
};
```

```typescript
// In EnvVarsCard — show suggestions if any keys aren't yet saved:
{suggestedEnvKeys.filter(k => !vars.find(v => v.key === k)).length > 0 && (
  <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
    <p className="text-xs text-amber-700 font-medium mb-1.5">
      💡 README mentions these variables — add them:
    </p>
    <div className="flex flex-wrap gap-1.5">
      {suggestedEnvKeys
        .filter(k => !vars.find(v => v.key === k))
        .map(k => (
          <button key={k}
            onClick={() => { setNewVar({ key: k, value: '', is_secret: true }); setAdding(true); }}
            className="font-mono text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded hover:bg-amber-200">
            + {k}
          </button>
        ))}
    </div>
  </div>
)}
```

#### ✅ Step 10 Done When:
- [ ] `project_env_vars` table created with correct RLS policies
- [ ] `EnvVarsCard` appears on `/dashboard/repo/[id]` between RunCommandsCard and Open Editor button
- [ ] User can add a variable with key + value + secret toggle
- [ ] Key is auto-uppercased and validated (alphanumeric + underscores only)
- [ ] Secret values show `••••••••` by default with reveal toggle (👁️)
- [ ] Variables persist per project across sessions (stored in Supabase)
- [ ] `/api/projects/[id]/env-vars/dotenv` assembles a `.env` file server-side
- [ ] WebContainer boot fetches and injects the `.env` before `mountProjectFiles()`
- [ ] Next.js projects also get `.env.local`
- [ ] Variables are **never** included in git push (excluded at `CommitPanel` level)
- [ ] README-suggested env keys appear as one-click suggestions
- [ ] Changing a variable and restarting WebContainer picks up new values

---

## API Routes Reference

| Route | Method | Phase | Purpose |
|---|---|---|---|
| `/api/auth/github` | GET | Phase 1 | GitHub OAuth callback — repo access only |
| `/api/auth/gitlab` | GET | Phase 1 | GitLab OAuth callback — repo access only |
| `/api/git/repos` | GET | Phase 1 | Fetch repos from connected account |
| `/api/git/branches` | GET | Phase 2 | Fetch all branches for a repo |
| `/api/git/files` | GET | Phase 2 | Fetch file tree and content |
| `/api/ai/parse-readme` | POST | Phase 2 | Extract setup commands from README |
| `/api/ai/modify` | POST | Phase 2+5 | AI code modification — returns JSON diff |
| `/api/ai/commit-message` | POST | Phase 3 | Generate commit message |
| `/api/ai/pr-description` | POST | Phase 3 | Generate PR description |
| `/api/git/push` | POST | Phase 3+5 | Create branch + push accumulated changes |
| `/api/git/create-pr` | POST | Phase 3+5 | Create PR/MR — end-of-session action |
| `/api/projects/update-commands` | POST | Phase 5 | Save custom run/install commands |
| `/api/projects/[id]/env-vars` | GET | Phase 5 Step 10 | List project env vars (secrets masked) |
| `/api/projects/[id]/env-vars` | POST | Phase 5 Step 10 | Upsert an env variable |
| `/api/projects/[id]/env-vars` | DELETE | Phase 5 Step 10 | Delete an env variable by key |
| `/api/projects/[id]/env-vars/dotenv` | GET | Phase 5 Step 10 | Assemble `.env` file (server-side only) |
| `/api/sessions/new` | POST | Phase 5 | Create new chat session |
| `/api/sessions/accumulate` | POST | Phase 5 | Save accumulated changes to session |

---

## AI Model Usage Guide

Server-side defaults via env vars. Users can override per-prompt from the model switcher UI (Phase 5 Step 7).

| Task | Phase | Default Env Var | GROQ Default | NVIDIA Default |
|---|---|---|---|---|
| README parsing | Phase 2 | `LLM_MODEL_PRIMARY` | `llama3-70b-8192` | `meta/llama-3.1-70b-instruct` |
| Code modification | Phase 2+5 | `LLM_MODEL_PRIMARY` | `llama3-70b-8192` | `meta/llama-3.1-70b-instruct` |
| File planning (whole-project) | Phase 5 | `LLM_MODEL_FAST` | `llama3-8b-8192` | `meta/llama-3.1-8b-instruct` |
| Multi-file agent | Phase 5 | `LLM_MODEL_AGENT` | `llama3-70b-8192` | `nvidia/llama-3.1-nemotron-70b-instruct` |
| Commit message | Phase 3+5 | `LLM_MODEL_FAST` | `llama3-8b-8192` | `meta/llama-3.1-8b-instruct` |
| PR description | Phase 3+5 | `LLM_MODEL_FAST` | `llama3-8b-8192` | `meta/llama-3.1-8b-instruct` |

---

## UI Component Checklist

| Component | File | Phase | Priority | Status |
|---|---|---|---|---|
| `<StepProgress />` | `components/StepProgress.tsx` | Phase 1 | 🔴 High | ✅ Done |
| `<ConnectGitCard />` | `components/ConnectGitCard.tsx` | Phase 1 | 🔴 High | ✅ Done |
| `<RepoCard />` | `components/RepoCard.tsx` | Phase 1 | 🔴 High | ✅ Done |
| `<BranchSelector />` | `components/BranchSelector.tsx` | Phase 2 | 🔴 High | ✅ Done |
| `<SetupInfoCard />` | `components/SetupInfoCard.tsx` | Phase 2 | 🔴 High | ✅ Done |
| `<AIChat />` | `components/AIChat.tsx` | Phase 2 | 🔴 High | ✅ Done |
| `<DiffViewer />` | `components/DiffViewer.tsx` | Phase 2 | 🔴 High | ✅ Done |
| `<PRResultCard />` | `components/PRResultCard.tsx` | Phase 3 | 🔴 High | ✅ Done |
| `<FileTree />` | `components/FileTree.tsx` | Phase 2 | 🟡 Medium | ✅ Done |
| `<LoadingSkeleton />` | `components/LoadingSkeleton.tsx` | Phase 4 | 🟢 Low | ✅ Done |
| `<EnvEditor />` | `components/EnvEditor.tsx` | Phase 5 Step 1 | 🔴 High | ❌ Removed (env now DB-managed) |
| `<RunCommandsCard />` | `components/RunCommandsCard.tsx` | Phase 5 Step 2 | 🔴 High | 🔲 Todo |
| `<PromptBox />` (updated) | `components/PromptBox.tsx` | Phase 5 Step 3 | 🔴 High | 🔲 Todo |
| `<ModelSelector />` | `components/ModelSelector.tsx` | Phase 5 Step 7 | 🔴 High | 🔲 Todo |
| `<LivePreview />` | `components/LivePreview.tsx` | Phase 5 Step 5 | 🔴 High | 🔲 Todo |
| `<ChatHistory />` | `components/ChatHistory.tsx` | Phase 5 Step 6 | 🔴 High | 🔲 Todo |
| `<CommitPanel />` | `components/CommitPanel.tsx` | Phase 5 Step 8 | 🔴 High | 🔲 Todo |
| `<NewChatButton />` | `components/NewChatButton.tsx` | Phase 5 Step 8 | 🟡 Medium | 🔲 Todo |
| `<HotSyncIndicator />` | `components/HotSyncIndicator.tsx` | Phase 5 Step 9 | 🔴 High | 🔲 Todo |
| `<EnvVarsCard />` | `components/EnvVarsCard.tsx` | Phase 5 Step 10 | 🔴 High | 🔲 Todo |

---

## Risk Management

| Risk | Phase | Likelihood | Mitigation |
|---|---|---|---|
| GROQ returns invalid JSON | Phase 2+5 | Medium | Retry + fallback error message |
| WebContainer COOP/COEP headers break other routes | Phase 5 | Medium | Scope headers to `/editor` path only |
| WebContainer npm install takes too long | Phase 5 | High | Show live logs; use lockfile if available |
| `.env` file accidentally pushed to git | Phase 5 | Medium | Check `is_env_file` flag before push; auto-add to `.gitignore` |
| Accumulated changes overwrite incorrectly | Phase 5 | Medium | Always use object spread merge (`{...prev, ...new}`), never replace |
| GitHub API rate limiting | Phase 1–3 | Low | Cache repo/file data, show friendly error |
| Supabase RLS blocks queries | Phase 1 | Medium | Test with service role key first |
| OAuth callback URL mismatch on deploy | Phase 1 | High | Update callback URLs after every deploy |
| HMR not triggering after `wc.fs.writeFile()` | Phase 5 Step 9 | Low | Verify dev server watches the correct paths; fall back to iframe reload |
| `.env` hot sync silently fails or corrupts env state | Phase 5 Step 9 | Low | Always exclude `.env` from hot sync; require full restart for env changes |
| ENV var values exposed in client bundle | Phase 5 Step 10 | Medium | Secret values only returned unmasked via server-side `/dotenv` route — never via client-side listing API |
| User forgets to add ENV vars before starting preview | Phase 5 Step 10 | High | Show warning banner in LivePreview if server crashes and `project_env_vars` is empty |

### Phase 5 Build Priority

> Build in this order to maximise impact per hour:
>
> `Step 5 (Live Preview)` 🎯 → `Step 10 (ENV Manager)` 🔐 → `Step 9 (Hot File Sync)` ⚡ → `Step 6 (Multi-Prompt)` → `Step 3 (Chips)` → `Step 7 (Model Switcher)` → `Step 8 (Commit Panel)` → `Step 1 (.env AI creation)` → `Step 2 (Run Cmd)` → `Step 4 (Whole Project)`

---

## Quick Reference — Page Routes

```
/                             → Landing page
/login                        → Login — email + password ONLY
/signup                       → Sign up — email + password ONLY
/auth/callback                → Supabase auth callback

/dashboard                    → Repos grid (empty state if no Git connected)
/dashboard/repo/[id]          → Repo detail + branch selector + run commands (Phase 5)
/dashboard/repo/[id]/edit     → AI editor — 4-panel layout (Phase 5)
/dashboard/repo/[id]/pr       → PR result page

/api/auth/github              → GitHub OAuth callback (repo access — NOT login)
/api/auth/gitlab              → GitLab OAuth callback (repo access — NOT login)
/api/git/*                    → Git operations
/api/ai/*                     → AI operations
/api/projects/*               → Project settings (Phase 5)
/api/sessions/*               → Session management (Phase 5)
```

---

## 📝 Changelog

| Version | Date | What Changed |
|---|---|---|
| v1.0 | Day 0 | Initial setup — Supabase, GitHub OAuth, GitLab OAuth, GROQ, NVIDIA |
| v1.1 | Day 0 | Added `LLM_PROVIDER` — swap providers via env |
| v1.2 | Day 0 | Added `LLM_MODEL_PRIMARY/FAST/AGENT` env vars |
| v1.3 | Day 0 | Added `LLM_MAX_TOKENS_*` and `LLM_TEMPERATURE` |
| v1.4 | Day 0 | Created `lib/ai-client.ts` — unified provider-agnostic AI client |
| v1.5 | Day 0 | Created `.env.sample` and `.env.local` |
| v1.6 | Day 0 | Auth clarification — email+password only; GitHub/GitLab OAuth is repo access only |
| v1.7 | Day 0 | Restructured into 4 phases with hour labels and done-when checklists |
| v1.8 | Day 1 | **Phase 5 added** — 8 power features: file creation + .env handling, run command override, file chip selector, whole-project AI mode, WebContainer live preview (main goal), multi-prompt sessions with accumulated changes, LLM model switcher in UI, new chat + commit & raise MR. DB schema updated: `created_files` table, `run_command`/`install_command` on projects, `accumulated_changes`/`llm_model` on sessions, `changes_snapshot`/`selected_files` on messages. |
| v1.9 | Day 2 | **Step 9 added** — Hot File Sync: AI-applied file changes are written directly into the running WebContainer FS via `hotSyncFiles()`, triggering HMR in Vite/Next.js/CRA with zero restart. Added `HotSyncIndicator` component, `.env` change toast warning, and plain-HTML iframe reload fallback. Updated `LivePreview` to accept `syncStatus`/`lastSyncedFiles` props. Build priority updated to place Step 9 immediately after Step 5. |
| v2.0 | Day 2 | **Step 10 added** — Project-wise ENV Variable Manager: `project_env_vars` Supabase table stores env vars per project (never committed). `EnvVarsCard` UI added to repo detail page between RunCommandsCard and Open Editor. Supports key/value entry, secret masking (password input + reveal toggle), upsert, delete. Server-side `/dotenv` route assembles `.env` file — injected into WebContainer before boot. README-based env key suggestions. Production encryption guide via pgcrypto. Step count updated to 16. |

---

*Stack: Next.js 14 + Supabase + GROQ / NVIDIA AI + GitHub/GitLab API + WebContainers*
*5 Phases · 16 Steps · Phases 1–4 Complete ✅ · Phase 5 In Progress 🔲*