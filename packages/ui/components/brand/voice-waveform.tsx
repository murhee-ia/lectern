import { cn } from "cn";

// Relative peak height per bar, shaping a natural center-tall wave rather
// than uniform bars. Purely decorative — a nod to Lectern's live-voice
// product, not driven by any real audio signal.
const BAR_PEAKS = [0.35, 0.55, 0.8, 1, 0.8, 1, 0.8, 0.55, 0.35];

export function VoiceWaveform({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-9 items-end justify-center gap-1.5", className)} aria-hidden>
      {BAR_PEAKS.map((peak, index) => (
        <span
          key={index}
          className="w-1.5 rounded-full bg-gradient-to-t from-highlight to-highlight-secondary"
          style={
            {
              height: "0.4rem",
              animation: `voice-waveform 1.1s ease-in-out ${index * 0.12}s infinite`,
              "--voice-waveform-peak": `${peak * 2.25}rem`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
