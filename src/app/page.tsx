import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Workflow,
      title: 'Prompt-to-PR Workflow',
      description:
        'Give one clear instruction and get structured edits prepared for review.',
    },
    {
      icon: ShieldCheck,
      title: 'Safe-by-Default Changes',
      description:
        'You can inspect every diff before branch push and pull request creation.',
    },
    {
      icon: Sparkles,
      title: 'Design + Dev Speed',
      description:
        'Ship UI redesigns, fixes, and product iteration tasks without losing momentum.',
    },
  ];

  const useCases = [
    'Complete landing page redesigns',
    'Dashboard alignment and UX cleanup',
    'Small-to-medium product feature delivery',
    'Copy, docs, and flow refinements',
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(244,63,94,0.10),transparent_45%),radial-gradient(900px_circle_at_90%_10%,rgba(251,191,36,0.12),transparent_40%),linear-gradient(180deg,#fff8f8_0%,#fffdf7_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-amber-400 shadow-md shadow-rose-200 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-rose-300">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              VibeCode
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a
              href="#features"
              className="cursor-pointer transition-colors duration-300 hover:text-rose-600"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="cursor-pointer transition-colors duration-300 hover:text-rose-600"
            >
              Workflow
            </a>
            <a
              href="#use-cases"
              className="cursor-pointer transition-colors duration-300 hover:text-rose-600"
            >
              Use cases
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer transition-all duration-300 hover:bg-rose-50 hover:text-rose-600"
              >
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className="cursor-pointer border-0 bg-linear-to-r from-rose-500 to-amber-400 text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg hover:shadow-rose-200"
              >
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
            <h1 className="mb-6 animate-fade-in-up text-5xl font-bold leading-tight tracking-tight text-blue-600 [animation-delay:100ms] md:text-6xl">
              Design, build, and ship{' '}
              <span className="bg-linear-to-r from-blue-500 via-blue-400 to-blue-600 bg-clip-text text-transparent">
                web changes
              </span>{' '}
              at startup speed.
            </h1>
            <p className="mb-8 max-w-xl animate-fade-in-up text-lg leading-relaxed text-slate-600 [animation-delay:200ms]">
              VibeCode gives you a modern workflow from idea to pull request.
              Ask for UI redesigns, feature updates, and cleanup tasks in plain
              English and review production-ready diffs quickly.
            </p>
            <div className="mb-8 flex animate-fade-in-up flex-col items-start gap-3 [animation-delay:300ms] sm:flex-row">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="h-12 cursor-pointer gap-2 border-0 bg-linear-to-r from-rose-500 to-amber-400 px-8 text-base text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-xl hover:shadow-rose-200/60"
                >
                  Start building free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 cursor-pointer border-slate-200 bg-white px-8 text-base text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >
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
              <p className="text-sm font-medium text-slate-900">
                Live AI workspace
              </p>
              <p className="text-xs text-slate-500">
                Instruction to code update to PR summary
              </p>
            </div>
            <CardContent className="space-y-4 p-5">
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">You:</span> Modernize landing
                page UI with clean hierarchy and better conversion sections.
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-slate-300">
                <p className="text-rose-300">
                  Analyzing page structure and sections...
                </p>
                <p className="text-emerald-300">
                  + Updated hero to modern conversion layout
                </p>
                <p className="text-emerald-300">
                  + Added features, workflow, and social proof
                </p>
                <p className="text-emerald-300">
                  + Applied modern color and typography system
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Generated output
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    Improved headline + call-to-action structure
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    Modern section flow for better storytelling
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
