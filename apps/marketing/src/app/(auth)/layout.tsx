import { FileText, AudioLines, Link2, Users } from "lucide-react";
import { LecternLogo } from "@repo/ui/components/brand/lectern-logo";

const PITCH_FEATURES = [
  { icon: FileText, text: "Reads the whole document, not indexed snippets" },
  { icon: AudioLines, text: "Spoken, turn-by-turn — jump in and redirect anytime" },
  { icon: Link2, text: "Every claim traceable to a live source" },
  { icon: Users, text: "Team sessions — one presenter, an audience that listens" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Soft color glows across the page. Purple leads; yellow pop. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-0 h-[36rem] w-[36rem] -translate-x-1/3 rounded-full bg-lectern-accent-purple/30 blur-[130px]"
      />

      {/* Left: the pitch — desktop/wide viewports only. Sized up to actually
          fill the column rather than float as a small centered block. */}
      <div className="relative hidden shrink-0 flex-col justify-center px-12 lg:flex lg:w-1/2 xl:px-20">
        <div className="max-w-xl">
          <span className="section-eyebrow">AI explainer, not a chatbot</span>
          <h1 className="mt-6 font-heading text-5xl font-semibold tracking-tight text-foreground xl:text-6xl">
            Give it a file or a topic.{" "}
            <span className="bg-gradient-to-r from-highlight to-highlight-secondary bg-clip-text text-transparent">
              Lectern reads, researches, and explains it out loud.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/70">
            Live captions. Cited sources. A real conversation you can interrupt —
            solo, or with your whole team listening in.
          </p>

          <ul className="mt-14 flex flex-col gap-7">
            {PITCH_FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-lectern-white/10 bg-lectern-accent-purple/40 text-highlight">
                  <Icon className="size-5" />
                </span>
                <span className="mt-2 text-base text-foreground/80">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: brand header above the card, then the card itself. */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <LecternLogo />
            <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Lectern
            </span>
          </div>
          <p className="mt-4 text-sm text-foreground/50">
            Any file. Any topic. Explained out loud, to you or to the team.
          </p>
        </div>

        <div className="relative w-full max-w-md">
          {/* A tighter halo right behind the card, on top of the page-wide
              glows, so the glass itself pops rather than just floating on
              the ambient background. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-5 rounded-[calc(var(--radius-panel)+1.25rem)] bg-gradient-to-br from-lectern-accent-purple/45 via-lectern-accent-purple/10 to-highlight/15 blur-2xl"
          />
          <div className="glass-card relative overflow-hidden border-lectern-white/20 shadow-[0_30px_90px_-25px_rgba(61,24,105,0.7)] backdrop-blur-2xl backdrop-saturate-150">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-highlight to-transparent" />
            <div className="relative">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
