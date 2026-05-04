import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GitBranch,
  Bot,
  Zap,
  ArrowRight,
  Code2,
  GitPullRequest,
  Link2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-blue-500 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">VibeCode</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-linear-to-r from-violet-600 to-blue-500 text-white border-0 hover:opacity-90">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <Badge className="mb-6 bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50">
            Powered by NVIDIA AI
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6 bg-linear-to-r from-gray-900 via-violet-800 to-blue-700 bg-clip-text text-transparent">
            Ship Changes Without Writing Code
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect your GitHub repo, describe what you want in plain English, and let AI build it,
            preview it, and raise the PR for you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-linear-to-r from-violet-600 to-blue-500 text-white border-0 hover:opacity-90 px-8 h-12 text-base gap-2">
                Start Building Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-8 h-12 text-base">
                Log in
              </Button>
            </Link>
          </div>

          {/* Terminal mockup */}
          <div className="mt-16 bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl text-left overflow-hidden max-w-2xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-gray-500 text-xs font-mono">VibeCode AI Editor</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-2">
              <div className="text-gray-400">You: <span className="text-white">Change the hero button color to green and update the text to "Get Started Free"</span></div>
              <div className="text-violet-400 mt-3">AI: Analyzing your codebase...</div>
              <div className="text-green-400">✓ Modified src/components/hero.tsx</div>
              <div className="text-green-400">✓ Branch ai-changes-1703123456 created</div>
              <div className="text-green-400">✓ Pull Request #42 opened on GitHub</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">Everything you need to ship faster</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              From repo connection to merged PR — all without touching a terminal.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Link2,
                title: "Connect Any Repo",
                description: "Works with GitHub and GitLab. Connect your account and select any repo and branch in seconds.",
                color: "from-violet-500 to-violet-600",
              },
              {
                icon: Bot,
                title: "AI Makes the Change",
                description: "Just describe what you want. AI reads your code and modifies exactly the right files — nothing more.",
                color: "from-blue-500 to-blue-600",
              },
              {
                icon: GitPullRequest,
                title: "Auto PR in Seconds",
                description: "Review the diff, approve, and AI creates the branch, commits, and PR with a professional description.",
                color: "from-emerald-500 to-emerald-600",
              },
            ].map((f) => (
              <Card key={f.title} className="border-gray-200 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${f.color} flex items-center justify-center mb-4`}>
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">How it works</h2>
            <p className="text-gray-500 text-lg">Four steps from idea to merged PR.</p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: "01",
                icon: Link2,
                title: "Connect your Git account",
                description: "Sign up with email, then connect GitHub or GitLab to grant repo access. Your login is separate from your Git connection.",
              },
              {
                step: "02",
                icon: GitBranch,
                title: "Select a repo & branch",
                description: "Pick any repo from your account. AI reads the README to understand the project structure automatically.",
              },
              {
                step: "03",
                icon: Bot,
                title: "Describe your change",
                description: "Type what you want in plain English. AI selects the relevant files, makes the changes, and shows you a side-by-side diff.",
              },
              {
                step: "04",
                icon: Zap,
                title: "Push & raise the PR",
                description: "Review the diff, click push, and AI creates the branch, commits your changes, and raises a PR with a professional description.",
              },
            ].map((item, i) => (
              <div key={item.step} className="flex gap-8 items-start">
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-linear-to-br from-violet-50 to-blue-50 border border-violet-100 flex items-center justify-center">
                  <span className="text-xl font-bold text-violet-600">{item.step}</span>
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="w-5 h-5 text-violet-500" />
                    <h3 className="font-semibold text-xl">{item.title}</h3>
                  </div>
                  <p className="text-gray-500 leading-relaxed max-w-lg">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6 bg-linear-to-r from-violet-600 to-blue-600">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to ship without code?</h2>
          <p className="text-violet-100 text-lg mb-8">
            Join developers and non-developers who are shipping changes faster with AI.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 px-10 h-12 text-base font-semibold gap-2">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-600 to-blue-500 flex items-center justify-center">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold">VibeCode</span>
          </div>
          <p className="text-gray-400 text-sm">
            Built with Next.js · Supabase · NVIDIA AI · GitHub API
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Link href="/login" className="hover:text-gray-600 transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-gray-600 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
