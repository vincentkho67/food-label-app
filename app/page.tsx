"use client";

import { useState } from "react";
import { UploadPanel } from "@/components/UploadPanel";
import { NutritionLabel } from "@/components/NutritionLabel";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Chat } from "@/components/Chat";
import { Button } from "@/components/ui/Button";
import type { Nutrition } from "@/lib/types";

type Phase = "idle" | "analyzing" | "ready" | "error";

const SAMPLES = [
  { src: "/samples/apple.png", label: "Apples" },
  { src: "/samples/avocado.png", label: "Avocado" },
  { src: "/samples/banana.png", label: "Bananas" },
];

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [nutrition, setNutrition] = useState<Nutrition | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [scanId, setScanId] = useState(0); // bumped per analysis → fresh chat session
  const [presetFile, setPresetFile] = useState<File | null>(null);

  async function analyze(dataUrl: string) {
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
      setScanId((n) => n + 1);
      setPhase("ready");
    } catch {
      setPhase("error");
      setError("Couldn't read that photo — try a clearer shot.");
    }
  }

  function reset() {
    setPhase("idle");
    setError(null);
    setNutrition(null);
    setImage(null);
    setPresetFile(null);
  }

  // Load a bundled sample into the upload preview (same validation path as a real pick).
  async function pickSample(src: string, label: string) {
    if (phase === "analyzing") return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      setPresetFile(new File([blob], `${label}.png`, { type: blob.type || "image/png" }));
    } catch {
      setError("Couldn't load that sample — try uploading your own.");
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <button
            onClick={reset}
            className="flex items-baseline gap-2.5 text-left"
            aria-label="Start over"
          >
            <span className="font-display text-lg font-bold tracking-[-0.02em] text-ink">
              Nutrition Facts
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 sm:inline">
              photo&nbsp;scanner
            </span>
          </button>
          <span className="font-mono text-[11px] text-ink-3">gpt-4o&nbsp;·&nbsp;vision</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-8 sm:py-12">
        {phase === "ready" && nutrition ? (
          <div className="grid flex-1 gap-8 lg:grid-cols-[21rem_minmax(0,1fr)] lg:gap-12">
            {/* Left: the food + its label, kept in view beside the chat. */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-balance font-display text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink">
                    {nutrition.food_name}
                  </h1>
                  <ConfidenceBadge level={nutrition.confidence} className="mt-2" />
                </div>
                <Button variant="subtle" onClick={reset} className="shrink-0">
                  Scan another
                </Button>
              </div>

              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={nutrition.food_name}
                  className="mt-4 max-h-44 w-full rounded-md border border-line object-cover"
                />
              )}

              {nutrition.notes && (
                <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                    Note&nbsp;
                  </span>
                  {nutrition.notes}
                </p>
              )}

              <div className="mt-6 flex justify-center lg:justify-start">
                <NutritionLabel data={nutrition} />
              </div>
            </div>

            {/* Right: streaming chat grounded in this food. */}
            <Chat key={scanId} nutrition={nutrition} />
          </div>
        ) : (
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
                presetFile={presetFile}
                onReset={() => {
                  if (phase === "error") setPhase("idle");
                  setError(null);
                }}
              />
            </div>

            <div className="mt-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                or try a sample
              </p>
              <div className="mt-2.5 flex gap-3">
                {SAMPLES.map((s) => (
                  <button
                    key={s.src}
                    type="button"
                    disabled={phase === "analyzing"}
                    onClick={() => pickSample(s.src, s.label)}
                    aria-label={`Use sample: ${s.label}`}
                    className="overflow-hidden rounded-md border border-line transition-colors hover:border-accent focus-visible:border-accent disabled:opacity-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt={s.label} className="h-16 w-24 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-4">
          <p className="font-mono text-[11px] text-ink-3">
            Estimates from a photo — not medical or dietary advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
