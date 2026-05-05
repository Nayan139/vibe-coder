# 🚀 VibeCode — AI-Powered No-Code Prototyping Platform

> **Goal:** Build a platform where non-developers can connect their GitHub/GitLab repo, describe changes in plain English, preview results live, and raise a PR — all powered by AI.
> **Total Phases:** 5 | **Total Steps:** 14 | **Phases 1–4: ✅ Complete | Phase 5: 🔲 In Progress**
> **Stack:** Next.js 14, Supabase, GROQ / NVIDIA AI, GitHub API, GitLab API, WebContainers

---

## ENV Policy Update

- ENV variables are managed in DB (`project_env_vars`) and injected before preview boot.
- Creating/editing `.env` from chatbot prompts is no longer supported.
- Any prior `.env` editor/diff flow is deprecated and removed.

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

-- RLS
alter table git_connections enable row level security;
alter table projects enable row level security;
alter table ai_sessions enable row level security;
alter table chat_messages enable row level security;
alter table created_files enable row level security;

create policy "Users see own connections" on git_connections for all using (auth.uid() = user_id);
create policy "Users see own projects" on projects for all using (auth.uid() = user_id);
create policy "Users see own sessions" on ai_sessions for all using (auth.uid() = user_id);
create policy "Users see own messages" on chat_messages for all using (
  session_id in (select id from ai_sessions where user_id = auth.uid())
);
create policy "Users see own created files" on created_files for all using (
  session_id in (select id from ai_sessions where user_id = auth.uid())
);
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
┌──────────────┬──────────────────┬─────────────────┬─────────────┬─────────────────────────────────────────────┐
│  PHASE 1 ✅  │   PHASE 2 ✅     │   PHASE 3 ✅    │  PHASE 4 ✅ │  PHASE 5 🆕                                 │
│  Foundation  │  Core AI         │  Git Automation  │  Ship It    │  Power Features                             │
│  Hour 1–3    │  Hour 3–7        │  Hour 7–9        │  Hour 9–12  │  Post-Hackathon                             │
├──────────────┼──────────────────┼─────────────────┼─────────────┼─────────────────────────────────────────────┤
│  ✅ Auth     │  ✅ README Parse │  ✅ Push Branch  │  ✅ Polish  │  🔲 Step 1: File Creation + .env            │
│  ✅ Dashboard│  ✅ AI Editor    │  ✅ Create PR    │  ✅ Testing │  🔲 Step 2: Run Command Override            │
│  ✅ Git OAuth│  ✅ Diff Preview │                  │  ✅ Deploy  │  🔲 Step 3: File Chip Selector              │
│              │                  │                  │             │  🔲 Step 4: Whole-Project AI Mode           │
│              │                  │                  │             │  🎯 Step 5: Live Local Preview (MAIN GOAL)  │
│              │                  │                  │             │  🔲 Step 6: Multi-Prompt Sessions           │
│              │                  │                  │             │  🔲 Step 7: LLM Model Switcher in UI        │
│              │                  │                  │             │  🔲 Step 8: New Chat + Commit & Raise MR    │
└──────────────┴──────────────────┴─────────────────┴─────────────┴─────────────────────────────────────────────┘
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
> **Outcome:** VibeCode becomes a fully capable local-first AI editor. Users create files, run projects live, chat across multiple turns, switch AI models, and raise PRs only when satisfied.

```
Build steps in this order:
Step 5 (Live Preview) → Step 6 (Multi-Prompt) → Step 3 (Chips) → Step 7 (Model Switcher)
→ Step 8 (Commit Panel) → Step 1 (.env Files) → Step 2 (Run Cmd) → Step 4 (Whole Project)
```

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
- [ ] `.env` files written locally for WebContainer preview but excluded from git push
- [ ] `created_files` table stores all new files per session

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

**Solution:** Boot a WebContainer in the browser, run the project using the saved install/start commands, and show it in an embedded iframe. Auto-updates when AI applies changes.

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

export async function updateFileInContainer(path: string, content: string) {
  const wc = await getWebContainer();
  await wc.fs.writeFile(path, content);
  // Dev server hot-reloads automatically (Vite, Next.js, CRA all support this)
}
```

#### `components/LivePreview.tsx`

```typescript
'use client';
import { useState, useEffect, useRef } from 'react';
import { mountProjectFiles, startDevServer, updateFileInContainer } from '@/lib/webcontainer';

type Status = 'idle' | 'mounting' | 'installing' | 'starting' | 'ready' | 'error';

export function LivePreview({ allFiles, changedFiles, installCommand, startCommand }) {
  const [status, setStatus] = useState<Status>('idle');
  const [previewUrl, setPreviewUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

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

  // Hot-update files when AI makes changes
  useEffect(() => {
    if (status !== 'ready') return;
    Object.entries(changedFiles).forEach(([path, content]) => updateFileInContainer(path, content));
  }, [changedFiles, status]);

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
              className="text-xs bg-gray-600 text-gray-300 px-3 py-1 rounded">↺ Restart</button>
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
          <iframe src={previewUrl} className="w-full h-full border-0" title="Live Preview" />
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
│             │  (shows when ready)  │  ┌─────────────────────────┐  │
│             │                      │  │   iframe: running app    │  │
│             │                      │  └─────────────────────────┘  │
└─────────────┴──────────────────────┴─────────────────────────────────┘
```

#### ✅ Step 5 Done When:
- [ ] "Start" button boots WebContainer and runs the project in browser
- [ ] Project visible in iframe using the saved install/start commands
- [ ] When AI applies changes → iframe hot-reloads automatically
- [ ] Terminal log panel shows install/start output
- [ ] Diff View and Live Preview are tabs on the right panel
- [ ] Requires COOP/COEP headers — `next.config.js` updated

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
  // Hot-update WebContainer if preview is running
  if (previewStatus === 'ready') {
    Object.entries(newChanges).forEach(([p, c]) => updateFileInContainer(p, c));
  }
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
- [ ] WebContainer hot-reloads after each new change applied

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

### Phase 5 Build Priority

> Build in this order to maximise impact per hour:
>
> `Step 5 (Live Preview)` 🎯 → `Step 6 (Multi-Prompt)` → `Step 3 (Chips)` → `Step 7 (Model Switcher)` → `Step 8 (Commit Panel)` → `Step 1 (.env)` → `Step 2 (Run Cmd)` → `Step 4 (Whole Project)`

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

---

*Stack: Next.js 14 + Supabase + GROQ / NVIDIA AI + GitHub/GitLab API + WebContainers*
*5 Phases · 14 Steps · Phases 1–4 Complete ✅ · Phase 5 In Progress 🔲*