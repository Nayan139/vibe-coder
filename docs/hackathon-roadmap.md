# 🚀 Hackathon Roadmap — AI-Powered No-Code Prototyping Platform

> **Goal:** Build a platform where non-developers can connect their GitHub/GitLab repo, describe changes in plain English, preview results, and raise a PR — all powered by AI.
> **Time Limit:** 12 Hours
> **Stack:** Next.js 14, Supabase, GROQ, NVIDIA AI, GitHub API, GitLab API

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Database Schema](#database-schema)
4. [Environment Variables](#environment-variables)
5. [Hour-by-Hour Execution Plan](#hour-by-hour-execution-plan)
   - [Hour 1–2: Project Setup & Auth](#hour-12--project-setup--auth)
   - [Hour 2–3: Dashboard & Git OAuth](#hour-23--dashboard--git-oauth)
   - [Hour 3–4: Repo Selector & README Parser](#hour-34--repo-selector--readme-parser)
   - [Hour 4–6: Core AI Editor](#hour-46--core-ai-editor)
   - [Hour 6–7: Preview System](#hour-67--preview-system)
   - [Hour 7–8: Branch Creation & Push](#hour-78--branch-creation--push)
   - [Hour 8–9: AI PR/MR Creation](#hour-89--ai-prmr-creation)
   - [Hour 9–10: UI/UX Polish](#hour-910--uiux-polish)
   - [Hour 10–11: Testing & Bug Fixes](#hour-1011--testing--bug-fixes)
   - [Hour 11–12: Demo Prep & Deploy](#hour-1112--demo-prep--deploy)
6. [API Routes Reference](#api-routes-reference)
7. [AI Model Usage Guide](#ai-model-usage-guide)
8. [UI Component Checklist](#ui-component-checklist)
9. [Risk Management](#risk-management)

---

## Project Overview

**What you're building:** "VibeCode" — a no-code AI prototyping platform where anyone can modify a real codebase visually, preview changes, and ship a PR without touching a terminal.

### Core User Flow

```
Sign Up / Login
      ↓
Connect GitHub or GitLab
      ↓
Select Repo → Select Branch
      ↓
AI reads README → Understands project
      ↓
User describes change in plain English
      ↓
AI modifies code → Shows diff preview
      ↓
User approves → New branch created
      ↓
Code pushed → AI raises PR/MR automatically ✅
```

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

Create a `.env.local` file in your project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# GitHub OAuth App (create at github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# GitLab OAuth App (create at gitlab.com/-/profile/applications)
GITLAB_CLIENT_ID=your_gitlab_client_id
GITLAB_CLIENT_SECRET=your_gitlab_client_secret

# AI Keys
GROQ_API_KEY=your_groq_api_key
NVIDIA_API_KEY=your_nvidia_api_key

# App
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Hour-by-Hour Execution Plan

---

### Hour 1–2 — Project Setup & Auth

**Goal:** Running app with login/signup and protected routes.

#### Tasks Checklist

- [ ] Create Next.js app with TypeScript + Tailwind
- [ ] Install all dependencies (see above)
- [ ] Configure Supabase client
- [ ] Create all DB tables (run schema above)
- [ ] Build landing page (`/`)
- [ ] Build `/login` page with email/password
- [ ] Build `/signup` page with email/password
- [ ] Add middleware to protect `/dashboard/*` routes

#### File: `middleware.ts`

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

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
Hero Section:    Headline + Subheadline + "Get Started Free" CTA
Features:        3 cards — Connect Git | AI Edits | Auto PR
How It Works:    4 steps with icons
Footer:          Links + Copyright
```

---

### Hour 2–3 — Dashboard & Git OAuth

**Goal:** User connects GitHub/GitLab and sees their repos.

#### Tasks Checklist

- [ ] Build dashboard layout (sidebar + main content area)
- [ ] Create "Connect GitHub" OAuth button + callback route
- [ ] Create "Connect GitLab" OAuth button + callback route
- [ ] Store `access_token` in `git_connections` table
- [ ] Fetch and display all repos in card grid
- [ ] Add search/filter bar for repos

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

  // Save to Supabase (get user_id from session cookie)
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
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR              │  MAIN CONTENT                   │
│                       │                                 │
│  🏠 Dashboard         │  Connected Accounts             │
│  📁 My Projects       │  [GitHub ✅] [GitLab + Connect] │
│  ⚙️  Settings          │                                 │
│                       │  Your Repositories              │
│  Connected:           │  [Search bar]                   │
│  GitHub (username)    │                                 │
│                       │  ┌────────┐ ┌────────┐          │
│                       │  │ Repo 1 │ │ Repo 2 │          │
│                       │  └────────┘ └────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

### Hour 3–4 — Repo Selector & README Parser

**Goal:** User picks a repo → picks a branch → AI reads README.

#### Tasks Checklist

- [ ] Repo detail page: `/dashboard/repo/[id]`
- [ ] Branch dropdown fetching from API
- [ ] On branch select → fetch `README.md` content
- [ ] Send README to GROQ for command extraction
- [ ] Display parsed setup info card
- [ ] Save project record to Supabase

#### File: `app/api/ai/parse-readme/route.ts`

```typescript
import Groq from 'groq-sdk';

export async function POST(request: Request) {
  const { readmeContent } = await request.json();

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const response = await groq.chat.completions.create({
    model: 'llama3-70b-8192',
    messages: [
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
    ],
    max_tokens: 500,
  });

  const text = response.choices[0].message.content || '{}';
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

---

### Hour 4–6 — Core AI Editor (Most Critical)

**Goal:** User types what they want → AI modifies the code.

This is the **heart of the product**. Budget the most time here.

#### The AI Editing Flow

```
1. Fetch file tree from GitHub/GitLab API
2. User describes change in plain English
3. Smart context builder selects relevant files
4. Send to GROQ with strict JSON output prompt
5. Receive: { "src/app/page.tsx": "...new content..." }
6. Show diff view (old vs new) with syntax highlighting
7. User clicks "Apply Changes"
```

#### File: `app/api/ai/modify/route.ts`

```typescript
import Groq from 'groq-sdk';

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

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const userMessage = `
Project context: ${projectContext}

Files available (showing relevant ones):
${Object.entries(fileContents).map(([path, content]) =>
  `=== ${path} ===\n${content}`
).join('\n\n')}

User request: ${prompt}

Return the modified files as JSON.`;

  const response = await groq.chat.completions.create({
    model: 'llama3-70b-8192',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 4000,
    temperature: 0.1, // Low temperature for consistent code output
  });

  const text = response.choices[0].message.content || '{}';
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    const changes = JSON.parse(clean);
    return Response.json({ success: true, changes });
  } catch {
    return Response.json({ success: false, error: 'AI returned invalid JSON', raw: text });
  }
}
```

#### Smart Context Selection (keeps tokens low)

```typescript
function selectRelevantFiles(allFiles: string[], userPrompt: string, fileContents: Record<string, string>) {
  const keywords = userPrompt.toLowerCase().split(' ');
  const alwaysInclude = ['package.json', 'app/page.tsx', 'app/layout.tsx'];

  const relevant = allFiles.filter(path => {
    // Always include core files
    if (alwaysInclude.some(f => path.includes(f))) return true;
    // Include if filename matches prompt keywords
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

---

### Hour 6–7 — Preview System

**Goal:** User sees changes visually before accepting.

#### Option A — Diff View (Recommended for hackathon)

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
            className={`px-3 py-1 rounded text-sm ${activeFile === path ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            {path.split('/').pop()}
          </button>
        ))}
      </div>

      {/* Diff viewer */}
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

#### Option B — WebContainer Live Preview (Bonus if time allows)

```bash
npm install @webcontainer/api
```

```typescript
import { WebContainer } from '@webcontainer/api';

async function startPreview(files: Record<string, string>) {
  const webcontainerInstance = await WebContainer.boot();

  // Write all files
  for (const [path, content] of Object.entries(files)) {
    await webcontainerInstance.fs.writeFile(path, content);
  }

  // Install and start
  const installProcess = await webcontainerInstance.spawn('npm', ['install']);
  await installProcess.exit;

  const serverProcess = await webcontainerInstance.spawn('npm', ['run', 'dev']);

  // Get preview URL
  webcontainerInstance.on('server-ready', (port, url) => {
    setPreviewUrl(url); // Show in iframe
  });
}
```

> ⚠️ **Note:** WebContainers require `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers. Add to `next.config.js`. Start with Option A and add B if time permits.

---

### Hour 7–8 — Branch Creation & Push

**Goal:** User is satisfied → create branch → push changed files.

#### Tasks Checklist

- [ ] "Create Branch & Push" button with branch name input
- [ ] Pre-fill branch name: `ai-changes-[timestamp]`
- [ ] API route to create branch via GitHub/GitLab API
- [ ] Loop through changed files and update each via Contents API
- [ ] Auto-generate commit message using AI
- [ ] Show success with link to branch

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
    // Get current file SHA (needed for update)
    let fileSha: string | undefined;
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner, repo, path: filePath, ref: newBranch
      });
      if (!Array.isArray(existingFile)) {
        fileSha = existingFile.sha;
      }
    } catch { /* file doesn't exist yet */ }

    // Create or update file
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
async function generateCommitMessage(changes: Record<string, string>, userPrompt: string) {
  const fileList = Object.keys(changes).join(', ');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const response = await groq.chat.completions.create({
    model: 'llama3-8b-8192', // Use smaller model for simple task
    messages: [{
      role: 'user',
      content: `Write a concise git commit message (max 72 chars, conventional commits format) for these changes:
      User asked: "${userPrompt}"
      Files changed: ${fileList}
      Return ONLY the commit message, nothing else.`
    }],
    max_tokens: 100,
  });

  return response.choices[0].message.content?.trim() || 'feat: AI-powered changes';
}
```

---

### Hour 8–9 — AI PR/MR Creation

**Goal:** AI writes and raises the Pull Request automatically.

#### Tasks Checklist

- [ ] Auto-trigger PR creation after successful push
- [ ] Send changes summary to GROQ for PR description
- [ ] Create PR via GitHub API / MR via GitLab API
- [ ] Show PR result card with title, URL, status badge

#### File: `app/api/git/create-pr/route.ts`

```typescript
export async function POST(request: Request) {
  const { repoFullName, baseBranch, newBranch, changes, userPrompt, accessToken } = await request.json();

  // Generate PR description with AI
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
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const fileList = Object.keys(changes).map(f => `- ${f}`).join('\n');

  const response = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [{
      role: 'user',
      content: `Write a professional GitHub PR description in markdown for these AI-generated changes.

User's request: "${userPrompt}"
Files changed:
${fileList}

Include these sections:
## Summary
## Changes Made
## Testing Notes

Keep it professional and concise.`
    }],
    max_tokens: 600,
  });

  return response.choices[0].message.content || 'AI-generated changes based on user request.';
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

---

### Hour 9–10 — UI/UX Polish

**Goal:** Make it look like a real product that judges will love.

#### Priority Fixes

- [ ] Loading skeleton screens (repos list, file tree)
- [ ] Toast notifications for all actions (success/error/info)
- [ ] Empty states with helpful CTAs ("Connect GitHub to get started")
- [ ] Step progress indicator
- [ ] Error boundaries with fallback UI
- [ ] Responsive layout (basic mobile support)

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

---

### Hour 10–11 — Testing & Bug Fixes

**Goal:** End-to-end flow works perfectly for the demo.

#### Test Checklist

- [ ] **Auth flow:** Signup → email verification → login → redirect to dashboard
- [ ] **GitHub OAuth:** Connect → see repos → repo cards load correctly
- [ ] **Repo selection:** Click repo → branch dropdown loads → select branch
- [ ] **README parsing:** GROQ returns valid JSON with install/start commands
- [ ] **AI editing:** Submit prompt → changes returned → diff renders correctly
- [ ] **Branch push:** New branch created → files updated → no API errors
- [ ] **PR creation:** PR created on GitHub with AI description → URL works
- [ ] **Supabase:** All data saved correctly — sessions, messages, changes
- [ ] **Error handling:** What happens if GROQ is slow? If GitHub API fails?

#### Use This Test Repo

Use a small, simple Next.js repo (your own or a public one) for demo testing:
```
https://github.com/vercel/next.js/tree/canary/examples/hello-world
```

A simple prompt to test: `"Change the main heading text to say Welcome to VibeCode"`

---

### Hour 11–12 — Demo Prep & Deploy

**Goal:** Live app on the internet, ready to demo.

#### Deployment Steps

```bash
# Push to GitHub
git add . && git commit -m "feat: hackathon submission" && git push

# Deploy to Vercel
npx vercel --prod

# Or connect via vercel.com dashboard:
# New Project → Import GitHub repo → Add env vars → Deploy
```

#### Required Vercel Environment Variables

Add all variables from `.env.local` to the Vercel dashboard under:
`Project Settings → Environment Variables`

#### Demo Flow Script (Practice 3 Times)

```
1. Open landing page → explain the problem (30 sec)
2. Sign up / log in → show dashboard (15 sec)
3. Click "Connect GitHub" → authorize → repos load (30 sec)
4. Select a repo → pick main branch → show README parse result (30 sec)
5. Type prompt: "Change the hero button color to green and text to Get Started Free"
6. Show AI thinking → diff appears → walk through changes (60 sec)
7. Click "Create Branch & Push" → branch created (15 sec)
8. PR auto-created → open it on GitHub → show AI description (30 sec)
9. Wrap up with the value prop (30 sec)
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
Stack: Next.js + Supabase + GROQ + GitHub API
Use cases: Design tweaks, copy changes, color updates, layout shifts
Next: Add preview with WebContainers, support more languages
```

---

## API Routes Reference

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/github` | GET | GitHub OAuth callback |
| `/api/auth/gitlab` | GET | GitLab OAuth callback |
| `/api/git/repos` | GET | Fetch user's repos |
| `/api/git/branches` | GET | Fetch branches for a repo |
| `/api/git/files` | GET | Fetch file tree and content |
| `/api/git/push` | POST | Create branch + push changes |
| `/api/git/create-pr` | POST | Create PR/MR via API |
| `/api/ai/parse-readme` | POST | Extract setup commands from README |
| `/api/ai/modify` | POST | AI code modification |
| `/api/ai/commit-message` | POST | Generate commit message |
| `/api/ai/pr-description` | POST | Generate PR description |

---

## AI Model Usage Guide

| Task | Provider | Model | Why |
|---|---|---|---|
| README parsing | GROQ | `llama3-70b-8192` | Fast, accurate extraction |
| Code modification | GROQ | `llama3-70b-8192` | Best speed/quality for code |
| Commit message | GROQ | `llama3-8b-8192` | Simple task, use smaller model |
| PR description | GROQ | `llama3-8b-8192` | Simple text generation |
| Complex multi-file | NVIDIA | `llama-3.1-nemotron-70b` | Better reasoning, large context |

### NVIDIA API Usage (for complex changes)

```typescript
const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'meta/llama-3.1-70b-instruct',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096,
    temperature: 0.1,
  }),
});
```

---

## UI Component Checklist

| Component | File | Priority |
|---|---|---|
| `<StepProgress />` | `components/StepProgress.tsx` | High |
| `<RepoCard />` | `components/RepoCard.tsx` | High |
| `<BranchSelector />` | `components/BranchSelector.tsx` | High |
| `<AIChat />` | `components/AIChat.tsx` | High |
| `<DiffViewer />` | `components/DiffViewer.tsx` | High |
| `<PRResultCard />` | `components/PRResultCard.tsx` | High |
| `<FileTree />` | `components/FileTree.tsx` | Medium |
| `<SetupInfoCard />` | `components/SetupInfoCard.tsx` | Medium |
| `<ConnectGitCard />` | `components/ConnectGitCard.tsx` | Medium |
| `<LoadingSkeleton />` | `components/LoadingSkeleton.tsx` | Low |

---

## Risk Management

| Risk | Likelihood | Mitigation |
|---|---|---|
| GROQ returns invalid JSON | Medium | Add retry logic + fallback error message |
| GitHub API rate limiting | Low | Cache repo data, show friendly error |
| WebContainer setup too complex | High | Skip it — use diff view instead |
| Supabase RLS blocks queries | Medium | Test with service role key first, then add RLS |
| OAuth callback URL mismatch | High | Double-check callback URLs in GitHub app settings |
| AI changes break syntax | Medium | Show raw diff and let user accept/reject |
| File too large for GROQ context | Medium | Truncate to first 200 lines, show warning |

### The Golden Rule for Hackathons

> **A working end-to-end flow beats a broken fancy feature every time.**
>
> Priority order: Auth ✅ → Git connection ✅ → AI edit ✅ → Push ✅ → PR ✅ → Pretty UI
>
> If WebContainers are taking too long, skip them. If GitLab OAuth is broken, demo with GitHub only. Keep the core flow working and polished.

---

## Quick Reference — Page Routes

```
/                           → Landing page
/login                      → Login with email/password
/signup                     → Sign up with email/password
/auth/callback              → Supabase auth callback
/dashboard                  → Main dashboard (repos grid)
/dashboard/repo/[id]        → Repo detail + branch selector
/dashboard/repo/[id]/edit   → AI editor (3-panel layout)
/dashboard/repo/[id]/pr     → PR result page
/api/auth/github            → GitHub OAuth callback
/api/auth/gitlab            → GitLab OAuth callback
/api/git/*                  → Git operations
/api/ai/*                   → AI operations
```

---

*Built for Hackathon — Good luck! 🏆*
*Stack: Next.js 14 + Supabase + GROQ + NVIDIA AI + GitHub/GitLab API*
