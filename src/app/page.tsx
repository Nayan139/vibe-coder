import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  ArrowRight,
  Bot,
  ShieldCheck,
  Layers3,
  GitPullRequest,
  WandSparkles,
  Workflow,
  Check,
  CheckCircle2,
  CirclePlay,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      icon: Workflow,
      title: "Prompt-to-PR Workflow",
      description: "Give one clear instruction and get structured edits prepared for review.",
    },
    {
      icon: ShieldCheck,
      title: "Safe-by-Default Changes",
      description: "You can inspect every diff before branch push and pull request creation.",
    },
    {
      icon: Sparkles,
      title: "Design + Dev Speed",
      description: "Ship UI redesigns, fixes, and product iteration tasks without losing momentum.",
    },
  ];

  const useCases = [
    "Complete landing page redesigns",
    "Dashboard alignment and UX cleanup",
    "Small-to-medium product feature delivery",
    "Copy, docs, and flow refinements",
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(244,63,94,0.10),transparent_45%),radial-gradient(900px_circle_at_90%_10%,rgba(251,191,36,0.12),transparent_40%),linear-gradient(180deg,#fff8f8_0%,#fffdf7_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-amber-400 shadow-md shadow-rose-200 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-rose-300">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">VibeCode</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#features" className="cursor-pointer transition-colors duration-300 hover:text-rose-600">Features</a>
            <a href="#workflow" className="cursor-pointer transition-colors duration-300 hover:text-rose-600">Workflow</a>
            <a href="#use-cases" className="cursor-pointer transition-colors duration-300 hover:text-rose-600">Use cases</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-300 hover:bg-rose-50 hover:text-rose-600">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="cursor-pointer border-0 bg-linear-to-r from-rose-500 to-amber-400 text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg hover:shadow-rose-200">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="px-6 pb-20 pt-14">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <Badge className="mb-6 animate-fade-in-up border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-50">
              Modern AI-powered product engineering
            </Badge>
            <h1 className="mb-6 animate-fade-in-up text-5xl font-bold leading-tight tracking-tight text-slate-950 [animation-delay:100ms] md:text-6xl">
              Design, build, and ship{" "}
              <span className="bg-linear-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">web changes</span>{" "}
              at startup speed.
            </h1>
            <p className="mb-8 max-w-xl animate-fade-in-up text-lg leading-relaxed text-slate-600 [animation-delay:200ms]">
              VibeCode gives you a modern workflow from idea to pull request. Ask for UI redesigns, feature updates, and cleanup tasks in plain English and review production-ready diffs quickly.
            </p>
            <div className="mb-8 flex animate-fade-in-up flex-col items-start gap-3 [animation-delay:300ms] sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="h-12 cursor-pointer gap-2 border-0 bg-linear-to-r from-rose-500 to-amber-400 px-8 text-base text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-xl hover:shadow-rose-200/60">
                  Start building free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="h-12 cursor-pointer border-slate-200 bg-white px-8 text-base text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50">
                  Explore dashboard
                </Button>
              </Link>
            </div>
            <div className="grid animate-fade-in-up grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm [animation-delay:400ms]">
              <div>
                <p className="text-2xl font-semibold text-slate-900">2m</p>
                <p className="text-slate-500">average draft PR</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">85%</p>
                <p className="text-slate-500">faster UI iterations</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">100%</p>
                <p className="text-slate-500">human-reviewed diffs</p>
              </div>
            </div>
          </div>

          <Card className="animate-float overflow-hidden border-slate-200 bg-white text-left shadow-xl shadow-slate-200/70 transition-shadow duration-500 hover:shadow-2xl hover:shadow-rose-200/40">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-medium text-slate-900">Live AI workspace</p>
              <p className="text-xs text-slate-500">Instruction to code update to PR summary</p>
            </div>
            <CardContent className="space-y-4 p-5">
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">You:</span> Modernize landing page UI with clean hierarchy and better conversion sections.
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-slate-300">
                <p className="text-rose-300">Analyzing page structure and sections...</p>
                <p className="text-emerald-300">+ Updated hero to modern conversion layout</p>
                <p className="text-emerald-300">+ Added features, workflow, and social proof</p>
                <p className="text-emerald-300">+ Applied modern color and typography system</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Generated output</p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />Improved headline + call-to-action structure</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />Modern section flow for better storytelling</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />Visual consistency with updated design tokens</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="features" className="px-6 py-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold tracking-tight text-slate-900">Modern product workflow, one place</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Built for teams who care about speed and quality without compromising on control.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((item) => (
              <Card key={item.title} className="cursor-pointer border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-100">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-amber-400 text-white">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-white px-6 py-24">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-4xl font-bold tracking-tight">A cleaner workflow from idea to merge</h2>
            <p className="text-lg text-slate-600">Everything is designed to be smooth, quick, and predictable.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { step: "01", icon: Layers3, title: "Connect and choose repo", description: "Integrate GitHub or GitLab and select the project branch you want to update." },
              { step: "02", icon: WandSparkles, title: "Describe your request", description: "Write clear natural language instructions for redesigns, fixes, or product changes." },
              { step: "03", icon: Bot, title: "Review generated diffs", description: "Inspect every changed file with confidence before accepting edits." },
              { step: "04", icon: GitPullRequest, title: "Push and open PR", description: "Ship polished code changes with branch management and PR-ready summaries." },
            ].map((item) => (
              <div key={item.step} className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200/60 hover:shadow-md hover:shadow-rose-100/60">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-amber-400 text-white">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold tracking-widest text-slate-400">{item.step}</span>
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="bg-slate-100 px-6 py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border-slate-200">
            <CardContent className="p-8">
              <h3 className="mb-4 text-3xl font-bold tracking-tight">Built for modern web teams</h3>
              <p className="mb-6 text-slate-600">
                From startup MVP updates to ongoing UI quality improvements, VibeCode keeps your team shipping with less friction.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {useCases.map((item) => (
                  <div key={item} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 transition-all duration-200 hover:border-rose-200 hover:bg-rose-50/60">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-linear-to-br from-rose-500 to-amber-400 text-white">
            <CardContent className="p-8">
              <p className="mb-5 text-sm uppercase tracking-wider text-white/80">Team feedback</p>
              <p className="mb-6 text-lg leading-relaxed text-white">
                "The new flow helped us execute redesign tasks and dashboard improvements much faster, while still maintaining clean review standards."
              </p>
              <p className="text-sm text-white/80">Product Engineer, B2B SaaS Team</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-3xl text-center text-white">
          <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-950 to-slate-900 px-8 py-14">
            <h2 className="mb-4 text-4xl font-bold">Ready for a modern AI coding workflow?</h2>
            <p className="mb-8 text-lg text-slate-300">
              Start free and redesign, improve, and ship your product faster with clean and controlled execution.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="h-12 cursor-pointer gap-2 border-0 bg-linear-to-r from-rose-500 to-amber-400 px-10 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-xl hover:shadow-rose-500/30">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-12 cursor-pointer border-slate-600 bg-transparent text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-white/10">
                <CirclePlay className="mr-2 h-4 w-4" />
                Watch quick demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-rose-500 to-amber-400">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">VibeCode</span>
          </div>
          <p className="text-sm text-slate-500">Built with modern web standards and AI-assisted product workflows.</p>
          <div className="flex items-center gap-5 text-sm text-slate-500">
            <Link href="/login" className="cursor-pointer transition-colors duration-300 hover:text-rose-600">Log in</Link>
            <Link href="/signup" className="cursor-pointer transition-colors duration-300 hover:text-rose-600">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
