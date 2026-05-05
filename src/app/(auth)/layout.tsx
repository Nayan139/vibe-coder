import Link from "next/link";
import { Zap, Check, Sparkles } from "lucide-react";

const FEATURES = [
  "Prompt to production-ready PR in minutes",
  "Review every diff before it ships to prod",
  "Connect GitHub or GitLab in seconds",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left branded panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-115 xl:w-130 shrink-0 flex-col bg-linear-to-br from-rose-500 via-rose-500 to-amber-400 p-12 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-48 right-8 h-32 w-32 rounded-full bg-amber-300/20" />

        <Link href="/" className="flex w-fit items-center gap-2.5 relative z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/25 shadow-sm backdrop-blur-sm">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">VibeCode</span>
        </Link>

        <div className="relative z-10 flex flex-1 flex-col justify-center">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-white/70" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70">AI-powered workflow</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold leading-snug">
            Ship web changes<br />at startup speed.
          </h2>
          <p className="mb-8 text-base leading-relaxed text-white/80">
            From idea to pull request in minutes. Human-reviewed diffs, zero guesswork.
          </p>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm text-white/90">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 rounded-2xl bg-white/15 p-5 backdrop-blur-sm">
          <p className="text-sm italic leading-relaxed text-white/90">
            &ldquo;The new flow helped us ship redesigns and dashboard improvements much faster, while keeping clean review standards.&rdquo;
          </p>
          <p className="mt-2 text-xs text-white/65">— Product Engineer, B2B SaaS Team</p>
        </div>
      </div>

      {/* Right: form area */}
      <div className="flex flex-1 flex-col bg-[radial-gradient(800px_circle_at_20%_0%,rgba(244,63,94,0.07),transparent_50%),radial-gradient(600px_circle_at_80%_100%,rgba(251,191,36,0.08),transparent_50%),linear-gradient(180deg,#fff8f8_0%,#fffdf7_100%)]">
        <header className="flex items-center px-6 py-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-amber-400 shadow-md shadow-rose-200">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-slate-900">VibeCode</span>
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-12">
          {children}
        </main>

        <footer className="px-6 py-4 text-center text-xs text-slate-400">
          © 2025 VibeCode · Built with modern AI workflows.
        </footer>
      </div>
    </div>
  );
}
