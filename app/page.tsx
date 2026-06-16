"use client";

import { useState } from "react";
import { UploadPanel } from "@/components/UploadPanel";
import type { Nutrition } from "@/lib/types";

type Phase = "idle" | "analyzing" | "ready" | "error";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  // Held for the next checkpoints (label + chat); set once /api/analyze answers.
  const [, setNutrition] = useState<Nutrition | null>(null);
  const [, setImage] = useState<string | null>(null);

  async function analyze(dataUrl: string, _fileName: string) {
    setPhase("analyzing");
    setError(null);
    setImage(dataUrl);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
      const data = (await res.json()) as Nutrition;
      setNutrition(data);
      setPhase("ready");
    } catch {
      setPhase("error");
      setError("Couldn't read that photo — try a clearer shot.");
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-lg font-bold tracking-[-0.02em] text-ink">
              Nutrition Facts
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 sm:inline">
              photo&nbsp;scanner
            </span>
          </div>
          <span className="font-mono text-[11px] text-ink-3">gpt-4o&nbsp;·&nbsp;vision</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-xl">
          <h1 className="text-balance font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-4xl">
            What&apos;s on the plate?
          </h1>
          <p className="mt-3 text-pretty text-[15px] leading-relaxed text-ink-2">
            Drop in a food photo and get an FDA-style Nutrition Facts label —
            then ask it anything.
          </p>

          <div className="mt-7">
            <UploadPanel
              status={
                phase === "analyzing"
                  ? "analyzing"
                  : phase === "error"
                    ? "error"
                    : "idle"
              }
              error={error}
              onSubmit={analyze}
              onReset={() => {
                if (phase === "error") setPhase("idle");
                setError(null);
              }}
            />
          </div>

          {/* Label + chat land here in the next checkpoints. */}
          {phase === "ready" && (
            <p className="mt-6 font-mono text-sm text-ink-2">
              Analyzed ✓ — label &amp; chat coming in the next checkpoint.
            </p>
          )}
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-5xl px-5 py-4">
          <p className="font-mono text-[11px] text-ink-3">
            Estimates from a photo — not medical or dietary advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
