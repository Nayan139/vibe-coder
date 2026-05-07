import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Sparkles,
  Bot,
  GitPullRequest,
  Play,
  Users,
  Layers3,
  WandSparkles,
  Globe,
  ShieldCheck,
  Rocket,
  CheckCircle2,
  Code2,
  Eye,
  Cpu,
  Database,
  Cloud,
  Monitor,
  Lightbulb,
  PenLine,
  TrendingUp,
  Package,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "VibeCode — Presentation",
  description: "See how VibeCode lets anyone build and ship web prototypes without writing code.",
};

export default function PresentationPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-slate-950 font-sans text-white">

      {/* ── Sticky nav ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-amber-400 shadow-md">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold tracking-tight">VibeCode</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
            <a href="#problem" className="transition-colors hover:text-white">Problem</a>
            <a href="#who" className="transition-colors hover:text-white">Who</a>
            <a href="#how" className="transition-colors hover:text-white">How</a>
            <a href="#tech" className="transition-colors hover:text-white">Tech</a>
            <a href="#models" className="transition-colors hover:text-white">AI Models</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-slate-400 hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="border-0 bg-linear-to-r from-rose-500 to-amber-400 text-white hover:opacity-90">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 1 — Hero
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-amber-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-sm text-rose-300">
            <Sparkles className="h-3.5 w-3.5" />
            No code needed · Build in minutes
          </div>

          <h1 className="mb-6 text-6xl font-bold leading-tight tracking-tight md:text-7xl lg:text-8xl">
            Turn{" "}
            <span className="bg-linear-to-r from-rose-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              ideas
            </span>
            <br />
            into live prototypes.
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-slate-400">
            VibeCode lets <strong className="text-white">anyone</strong> — founder, designer, marketer, or product manager —
            describe what they want in plain English and get a{" "}
            <strong className="text-white">real, running web app</strong> deployed to a live preview in minutes.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="h-12 gap-2 border-0 bg-linear-to-r from-rose-500 to-amber-400 px-10 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-xl hover:shadow-rose-500/30">
                Start building free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#problem">
              <Button variant="outline" size="lg" className="h-12 border-slate-700 bg-transparent px-10 text-base text-slate-300 transition-all duration-300 hover:border-slate-600 hover:bg-white/5">
                <Play className="mr-2 h-4 w-4" />
                See how it works
              </Button>
            </a>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
            {[
              { value: "< 5 min", label: "Idea to live prototype" },
              { value: "8+", label: "AI models to choose from" },
              { value: "0 lines", label: "Code you need to write" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="mt-1 text-sm text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 2 — The Problem
      ══════════════════════════════════════════════════════════════════ */}
      <section id="problem" className="px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-rose-400">
            The Problem
          </div>
          <h2 className="mb-16 text-center text-5xl font-bold tracking-tight">
            Great ideas get stuck<br />
            <span className="text-slate-500">because of one barrier: code.</span>
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Lightbulb,
                title: "You have the vision",
                body: "Product managers, founders, and designers know exactly what they want to build — but they can't write React or TypeScript.",
                color: "from-amber-500/20 to-amber-500/5",
                border: "border-amber-500/20",
                iconColor: "text-amber-400",
              },
              {
                icon: Code2,
                title: "Dev cycles are slow",
                body: "Getting engineers to implement a quick prototype or UI change takes days of back-and-forth, tickets, and waiting.",
                color: "from-rose-500/20 to-rose-500/5",
                border: "border-rose-500/20",
                iconColor: "text-rose-400",
              },
              {
                icon: Eye,
                title: "No way to verify",
                body: "Even after the build, there is no fast way to see a live, interactive version running in a real environment — not just screenshots.",
                color: "from-purple-500/20 to-purple-500/5",
                border: "border-purple-500/20",
                iconColor: "text-purple-400",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`rounded-2xl border bg-linear-to-b p-8 transition-all duration-300 hover:-translate-y-1 ${card.border} ${card.color}`}
              >
                <card.icon className={`mb-5 h-8 w-8 ${card.iconColor}`} />
                <h3 className="mb-3 text-xl font-bold">{card.title}</h3>
                <p className="leading-relaxed text-slate-400">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 3 — The Solution
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-6 py-28">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-rose-950/40 via-slate-950 to-amber-950/20" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-amber-400">
            The Solution
          </div>
          <h2 className="mb-8 text-5xl font-bold tracking-tight md:text-6xl">
            Describe it.{" "}
            <span className="bg-linear-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
              VibeCode builds it.
            </span>
            <br />
            You ship it.
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-xl text-slate-400">
            Write what you want in plain English. VibeCode uses AI to generate the code,
            shows you every change, and runs it live in a cloud sandbox — so you can
            prototype at the speed of thought.
          </p>

          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-left shadow-2xl shadow-rose-900/20">
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs text-slate-500">VibeCode AI workspace</span>
            </div>
            <div className="space-y-3 p-6 font-mono text-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 text-xs text-rose-300">YOU</span>
                <span className="text-slate-300">Add a hero section with a gradient background, a big headline, and a CTA button.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-300">AI</span>
                <div className="space-y-1 text-slate-400">
                  <p className="text-emerald-400">✓ Analysing project structure…</p>
                  <p className="text-emerald-400">✓ Generating hero in src/app/page.tsx</p>
                  <p className="text-emerald-400">✓ Applying Tailwind gradient + responsive layout</p>
                  <p className="text-emerald-400">✓ Live preview ready → https://3000-abc.e2b.app</p>
                </div>
              </div>
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                🔗 Live preview at{" "}
                <span className="text-rose-400">https://3000-&lt;sandbox&gt;.e2b.app</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 4 — Who Can Use It
      ══════════════════════════════════════════════════════════════════ */}
      <section id="who" className="px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-purple-400">
            Who Can Use It
          </div>
          <h2 className="mb-5 text-center text-5xl font-bold tracking-tight">
            Made for non-technical builders
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-xl text-slate-400">
            If you can describe what you want, VibeCode can build it.
            No computer science degree required.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                role: "Product Manager",
                description: "Prototype new features, validate UX ideas, and present stakeholders with working demos — without waiting on engineering.",
                example: '"Add a filter sidebar to the dashboard with status and date range options."',
                tag: "Prototype fast",
                tagColor: "bg-blue-500/15 text-blue-300",
              },
              {
                icon: PenLine,
                role: "UX / Product Designer",
                description: "Turn Figma mockups into interactive live prototypes that stakeholders can actually click through and test.",
                example: '"Make the card layout three columns, add hover shadows, and update the brand color."',
                tag: "Click-through demos",
                tagColor: "bg-purple-500/15 text-purple-300",
              },
              {
                icon: Rocket,
                role: "Startup Founder",
                description: "Launch an MVP landing page, connect it to your GitHub repo, and iterate 10× faster than hiring a dev.",
                example: '"Build a waitlist landing page with email capture and a hero section."',
                tag: "Ship fast",
                tagColor: "bg-rose-500/15 text-rose-300",
              },
              {
                icon: Globe,
                role: "Marketer",
                description: "Create landing pages, update copy, and A/B test layouts — all from plain language instructions.",
                example: '"Rewrite the pricing section to emphasise the free tier and add a FAQ accordion."',
                tag: "Iterate copy & layout",
                tagColor: "bg-amber-500/15 text-amber-300",
              },
              {
                icon: Layers3,
                role: "Entrepreneur",
                description: "Validate business ideas with working demos before spending money on a development team.",
                example: '"Create a booking form page with time slots and a confirmation message."',
                tag: "Validate ideas",
                tagColor: "bg-emerald-500/15 text-emerald-300",
              },
              {
                icon: Users,
                role: "Small Team / Agency",
                description: "Deliver client prototypes, internal tools, and UI updates faster without scaling headcount.",
                example: '"Rebuild the admin dashboard with a dark sidebar and data table layout."',
                tag: "Faster delivery",
                tagColor: "bg-sky-500/15 text-sky-300",
              },
            ].map((persona) => (
              <div
                key={persona.role}
                className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/4 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/7"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-rose-500/30 to-amber-500/20">
                    <persona.icon className="h-5 w-5 text-rose-300" />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${persona.tagColor}`}>
                    {persona.tag}
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-bold">{persona.role}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-slate-400">{persona.description}</p>
                </div>
                <div className="mt-auto rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-xs italic text-slate-400">
                  {persona.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 5 — How It Works
      ══════════════════════════════════════════════════════════════════ */}
      <section id="how" className="bg-white/3 px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-emerald-400">
            How It Works
          </div>
          <h2 className="mb-5 text-center text-5xl font-bold tracking-tight">
            From zero to live prototype in 4 steps
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-xl text-slate-400">
            No setup headaches. No local installs. No terminal commands.
          </p>

          <div className="relative">
            <div className="absolute left-8 top-10 hidden h-[calc(100%-5rem)] w-0.5 bg-linear-to-b from-rose-500/50 via-amber-500/50 to-emerald-500/30 md:block" />

            <div className="space-y-6">
              {[
                {
                  step: "01",
                  icon: GitPullRequest,
                  title: "Connect your GitHub or GitLab repo",
                  body: "Sign in with GitHub or GitLab OAuth. Pick any repository and branch. VibeCode securely reads your codebase so the AI understands the project before making any changes.",
                  badge: "OAuth login · 30 seconds",
                  color: "from-rose-500 to-pink-500",
                },
                {
                  step: "02",
                  icon: WandSparkles,
                  title: "Describe what you want in plain English",
                  body: 'Type your request like you\'re messaging a developer. "Add a hero section", "Fix the navbar alignment", "Create a pricing table with 3 tiers" — anything works.',
                  badge: "No technical knowledge needed",
                  color: "from-amber-500 to-orange-500",
                },
                {
                  step: "03",
                  icon: Eye,
                  title: "Review the diff — approve or adjust",
                  body: "VibeCode shows you every single file change in a side-by-side diff before anything is committed. You stay in full control. Accept, tweak the prompt, or discard entirely.",
                  badge: "100 % human-reviewed",
                  color: "from-purple-500 to-violet-500",
                },
                {
                  step: "04",
                  icon: Monitor,
                  title: "Run it live & push to your repo",
                  body: "Hit Start on the Live Preview panel. VibeCode spins up a real cloud VM, clones your repo, installs dependencies, and boots the dev server. Your running prototype appears live — then push the changes to a PR with one click.",
                  badge: "Live URL · E2B cloud sandbox",
                  color: "from-emerald-500 to-teal-500",
                },
              ].map((item) => (
                <div key={item.step} className="relative flex gap-6 pl-0 md:pl-20">
                  <div className={`absolute left-0 hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br md:flex ${item.color} shadow-lg`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>

                  <div className="flex-1 rounded-2xl border border-white/8 bg-white/4 p-7">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br md:hidden ${item.color}`}>
                          <item.icon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold">{item.title}</h3>
                      </div>
                      <span className="w-fit rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs text-slate-400">
                        {item.badge}
                      </span>
                    </div>
                    <p className="leading-relaxed text-slate-400">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 6 — Tech Stack
      ══════════════════════════════════════════════════════════════════ */}
      <section id="tech" className="px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-sky-400">
            Tech Stack
          </div>
          <h2 className="mb-5 text-center text-5xl font-bold tracking-tight">
            Built on battle-tested technology
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-xl text-slate-400">
            Every layer of VibeCode is powered by best-in-class tools — fast, secure, and
            production-grade.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Globe,
                name: "Next.js 16 (App Router)",
                category: "Frontend & Backend",
                description: "Full-stack React framework that powers the entire VibeCode application — routing, server components, API routes, and streaming responses.",
                color: "from-slate-700/50 to-slate-800/50",
                border: "border-slate-700/50",
                tag: "App framework",
              },
              {
                icon: Layers3,
                name: "React 19",
                category: "UI Runtime",
                description: "The latest React with concurrent features, Server Components, and optimistic UI for a fast, smooth editing experience.",
                color: "from-sky-800/30 to-slate-800/50",
                border: "border-sky-700/30",
                tag: "UI framework",
              },
              {
                icon: Database,
                name: "Supabase",
                category: "Auth & Database",
                description: "Postgres database and OAuth authentication (GitHub & GitLab). Securely stores repos, sessions, projects, and environment variables.",
                color: "from-emerald-800/30 to-slate-800/50",
                border: "border-emerald-700/30",
                tag: "Auth · DB",
              },
              {
                icon: GitPullRequest,
                name: "GitHub & GitLab APIs",
                category: "Git Integration",
                description: "Full OAuth integration. Read files, list branches, commit changes, and open pull requests — all without leaving VibeCode.",
                color: "from-purple-800/30 to-slate-800/50",
                border: "border-purple-700/30",
                tag: "Git providers",
              },
              {
                icon: Cloud,
                name: "E2B Sandbox",
                category: "Live Preview Runtime",
                description: "Spins up an isolated Linux VM for every preview session. Clones your repo, installs deps, and runs the dev server — real code, real URL, real environment.",
                color: "from-rose-800/30 to-slate-800/50",
                border: "border-rose-700/30",
                tag: "Cloud sandbox",
              },
              {
                icon: Cpu,
                name: "TypeScript + Tailwind CSS 4",
                category: "Code Quality & Styling",
                description: "Full type-safety across the entire codebase. Tailwind CSS 4 for utility-first, responsive styling — zero runtime CSS, ships fast.",
                color: "from-amber-800/30 to-slate-800/50",
                border: "border-amber-700/30",
                tag: "Type-safe · Styling",
              },
            ].map((tech) => (
              <div
                key={tech.name}
                className={`rounded-2xl border bg-linear-to-br p-7 transition-all duration-300 hover:-translate-y-1 ${tech.border} ${tech.color}`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <tech.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-xs text-slate-400">
                    {tech.tag}
                  </span>
                </div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                  {tech.category}
                </p>
                <h3 className="mb-3 text-lg font-bold leading-snug">{tech.name}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 7 — AI / LLM Models
      ══════════════════════════════════════════════════════════════════ */}
      <section id="models" className="bg-white/3 px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-rose-400">
            AI Models
          </div>
          <h2 className="mb-5 text-center text-5xl font-bold tracking-tight">
            8 world-class LLMs, your choice
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-xl text-slate-400">
            Pick the right balance of speed, quality, and cost for every task.
            Switch models in one click — no configuration needed.
          </p>

          <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                provider: "Anthropic",
                logo: "✦",
                color: "from-rose-600/30 to-rose-900/20",
                border: "border-rose-600/30",
                models: [
                  { name: "Claude Sonnet 4.6", note: "Smart · Best quality" },
                  { name: "Claude Haiku 4.5", note: "Fastest · Low cost" },
                ],
                badge: "Recommended",
                badgeColor: "bg-rose-500/20 text-rose-300",
              },
              {
                provider: "Google Gemini",
                logo: "◆",
                color: "from-sky-600/30 to-sky-900/20",
                border: "border-sky-600/30",
                models: [
                  { name: "Gemini 2.0 Flash", note: "Free · Fast" },
                  { name: "Gemini 2.0 Flash Lite", note: "Free · Fastest" },
                ],
                badge: "Free tier",
                badgeColor: "bg-sky-500/20 text-sky-300",
              },
              {
                provider: "Meta via Groq",
                logo: "⬡",
                color: "from-purple-600/30 to-purple-900/20",
                border: "border-purple-600/30",
                models: [
                  { name: "Llama 3.3 70B", note: "Balanced" },
                  { name: "Llama 3.1 8B Instant", note: "Ultra-fast" },
                  { name: "Gemma 2 9B IT", note: "Fast" },
                ],
                badge: "Open-source",
                badgeColor: "bg-purple-500/20 text-purple-300",
              },
              {
                provider: "NVIDIA",
                logo: "▲",
                color: "from-emerald-600/30 to-emerald-900/20",
                border: "border-emerald-600/30",
                models: [
                  { name: "Llama 3.1 70B", note: "Balanced · High quality" },
                ],
                badge: "NVIDIA Cloud",
                badgeColor: "bg-emerald-500/20 text-emerald-300",
              },
            ].map((p) => (
              <div
                key={p.provider}
                className={`rounded-2xl border bg-linear-to-br p-6 transition-all duration-300 hover:-translate-y-1 ${p.border} ${p.color}`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
                    {p.logo}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                </div>
                <h3 className="mb-4 font-bold">{p.provider}</h3>
                <div className="space-y-2">
                  {p.models.map((m) => (
                    <div key={m.name} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                      <span className="text-xs font-medium text-white">{m.name}</span>
                      <span className="text-xs text-slate-500">{m.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
            <Bot className="mx-auto mb-3 h-8 w-8 text-amber-400" />
            <h3 className="mb-2 text-lg font-bold">Switch models in one click</h3>
            <p className="mx-auto max-w-lg text-sm text-slate-400">
              Every prompt in the editor has a model selector. Use a fast model for quick iterations,
              switch to a smarter one for precise code generation — without leaving the workspace.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 8 — Live Preview deep-dive
      ══════════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-teal-400">
            Live Preview
          </div>
          <h2 className="mb-5 text-center text-5xl font-bold tracking-tight">
            Your code runs in a real server.
            <br />
            <span className="text-slate-500">Not a screenshot. Not a fake iframe.</span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-xl text-slate-400">
            When you click <strong className="text-white">Start Preview</strong>, VibeCode provisions a
            full Linux VM via E2B — clones your repo, runs{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-teal-300">npm install</code>,
            and starts your dev server. The live URL is served right inside the editor.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {[
                { icon: Cloud, label: "Sandbox boots in ~10 s", desc: "E2B provisions a fresh Ubuntu VM with Node.js pre-installed." },
                { icon: GitPullRequest, label: "Repo cloned from GitHub/GitLab", desc: "Your actual branch is cloned at the exact commit you are editing." },
                { icon: Package, label: "Dependencies installed automatically", desc: "npm / pnpm install runs. No manual setup, no local environment." },
                { icon: Play, label: "Dev server starts", desc: "Next.js, Vite, CRA — all supported. Bound to 0.0.0.0 for tunnel access." },
                { icon: Monitor, label: "Live HTTPS URL inside the editor", desc: "A public URL is injected into the preview panel — ready to share or test." },
                { icon: ShieldCheck, label: "Hot-sync on every approved change", desc: "AI changes are pushed to the sandbox and the preview auto-reloads." },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4 rounded-xl border border-white/8 bg-white/4 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/20">
                    <item.icon className="h-4 w-4 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-center rounded-2xl border border-teal-500/20 bg-linear-to-br from-teal-900/30 to-slate-900/60 p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-teal-500 to-emerald-400">
                  <Cloud className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold">E2B Cloud Sandbox</h3>
                <p className="text-sm text-slate-400">Isolated per-session · Ubuntu Linux · Node.js pre-installed</p>
              </div>
              <div className="space-y-3 font-mono text-xs">
                {[
                  { line: "$ git clone --depth 1 your-repo /home/user/vibe-preview", color: "text-slate-400" },
                  { line: "$ npm install --no-audit --legacy-peer-deps", color: "text-slate-400" },
                  { line: "$ next dev -H 0.0.0.0 --port 3000", color: "text-slate-400" },
                  { line: "✓  Ready in 2.3s — https://3000-xyz.e2b.app", color: "text-emerald-400 font-bold" },
                ].map((l) => (
                  <div key={l.line} className={`rounded-lg bg-black/30 px-3 py-2 ${l.color}`}>
                    {l.line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 9 — Old way vs VibeCode
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white/3 px-6 py-28">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-amber-400">
            Why VibeCode
          </div>
          <h2 className="mb-16 text-center text-5xl font-bold tracking-tight">
            The old way vs. the VibeCode way
          </h2>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-2 border-b border-white/10">
              <div className="border-r border-white/10 bg-white/3 p-5 text-center font-bold text-slate-500">
                Old way
              </div>
              <div className="bg-linear-to-br from-rose-900/30 to-amber-900/20 p-5 text-center font-bold text-white">
                VibeCode way ✦
              </div>
            </div>
            {[
              ["Write a ticket for a developer", "Type your request directly to AI"],
              ["Wait 1–3 days for a PR", "Get code changes in under 2 minutes"],
              ["No preview without a local setup", "Live URL in the editor, zero install"],
              ["Limited to people who can code", "Anyone with a good idea can build"],
              ["One AI model", "8 models — pick for speed or quality"],
              ["Separate Git workflow", "Push to PR from the same screen"],
            ].map(([old, vibe], i) => (
              <div
                key={old}
                className={`grid grid-cols-2 border-b border-white/8 last:border-0 ${i % 2 === 0 ? "" : "bg-white/2"}`}
              >
                <div className="flex items-center gap-2 border-r border-white/8 p-5 text-sm text-slate-500">
                  <span className="text-slate-700">✕</span>
                  {old}
                </div>
                <div className="flex items-center gap-2 p-5 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-rose-400" />
                  {vibe}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 10 — CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-6 py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-rose-600/25 blur-3xl" />
          <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-sm text-rose-300">
            <Sparkles className="h-3.5 w-3.5" />
            Free to start · No credit card
          </div>
          <h2 className="mb-6 text-6xl font-bold leading-tight tracking-tight">
            Ready to build your<br />
            <span className="bg-linear-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
              first prototype?
            </span>
          </h2>
          <p className="mb-10 text-xl text-slate-400">
            Connect your GitHub or GitLab repo, type what you want,
            and watch your idea come to life in under 5 minutes.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="h-14 gap-2 border-0 bg-linear-to-r from-rose-500 to-amber-400 px-12 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-2xl hover:shadow-rose-500/30">
                Start building free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg" className="h-14 border-slate-700 bg-transparent px-12 text-lg text-slate-300 transition-all duration-300 hover:border-slate-600 hover:bg-white/5">
                Back to home
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            {[
              "GitHub & GitLab OAuth",
              "E2B cloud sandboxes",
              "8 AI models",
              "No local install needed",
              "Free to start",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-600 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-rose-500 to-amber-400">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-400">VibeCode</span>
          </div>
          <p className="text-slate-600">Powered by E2B · Anthropic · Google Gemini · Meta Llama · NVIDIA · Groq</p>
          <div className="flex gap-5">
            <Link href="/" className="transition-colors hover:text-white">Home</Link>
            <Link href="/login" className="transition-colors hover:text-white">Log in</Link>
            <Link href="/signup" className="transition-colors hover:text-white">Sign up</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
