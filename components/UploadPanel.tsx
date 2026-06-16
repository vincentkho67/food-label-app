"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button";

const MAX_BYTES = 12 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface UploadPanelProps {
  /** "analyzing" disables controls and spins the button; "error" surfaces `error`. */
  status: "idle" | "analyzing" | "error";
  error?: string | null;
  onSubmit: (dataUrl: string, fileName: string) => void;
  /** Called when the user picks a new file, so the parent can clear a stale error. */
  onReset?: () => void;
  /** A file loaded from outside (e.g. a sample); flows through the same validation/preview. */
  presetFile?: File | null;
}

export function UploadPanel({
  status,
  error,
  onSubmit,
  onReset,
  presetFile,
}: UploadPanelProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = status === "analyzing";

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      setLocalError(null);
      onReset?.();
      if (!file.type.startsWith("image/")) {
        setLocalError("That's not an image — pick a JPG, PNG, or WEBP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setLocalError("That photo's a bit big — keep it under 12 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onerror = () =>
        setLocalError("Couldn't read that file — try another shot.");
      reader.onload = () => {
        setPreview(reader.result as string);
        setFileName(file.name);
        setFileSize(file.size);
      };
      reader.readAsDataURL(file);
    },
    [onReset],
  );

  // A sample chosen elsewhere flows through the same validation + preview path.
  useEffect(() => {
    if (presetFile) handleFile(presetFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetFile]);

  // Paste an image straight from the clipboard.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (busy || preview) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      if (item) handleFile(item.getAsFile());
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [busy, preview, handleFile]);

  function clear() {
    if (busy) return;
    setPreview(null);
    setFileName("");
    setFileSize(0);
    setLocalError(null);
    onReset?.();
    if (inputRef.current) inputRef.current.value = "";
  }

  const shownError = localError ?? error;

  return (
    <div className="w-full">
      {!preview ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center transition-colors ${
            dragging
              ? "border-accent bg-accent/[0.06]"
              : "border-line-strong bg-surface hover:border-ink-3 hover:bg-surface-2"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <ScanIcon
            className={`size-9 transition-colors ${dragging ? "text-accent" : "text-ink-3 group-hover:text-ink-2"}`}
          />
          <div className="space-y-1">
            <p className="text-base font-medium text-ink">
              Drop a food photo here
            </p>
            <p className="text-sm text-ink-2">
              or{" "}
              <span className="font-medium text-accent underline underline-offset-2">
                browse
              </span>{" "}
              — you can paste one too
            </p>
          </div>
          <p className="font-mono text-xs text-ink-3">JPG · PNG · WEBP · up to 12 MB</p>
        </label>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="relative aspect-[4/3] w-full bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Selected food"
              className="h-full w-full object-contain"
            />
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/70 backdrop-blur-[1px]">
                <ScanSweep />
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-2">
                  Reading the plate…
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{fileName}</p>
              <p className="font-mono text-xs text-ink-3">{formatSize(fileSize)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" onClick={clear} disabled={busy}>
                Remove
              </Button>
              <Button
                variant="primary"
                loading={busy}
                onClick={() => onSubmit(preview, fileName)}
              >
                {busy ? "Analyzing" : "Analyze photo"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {shownError && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm text-bad"
        >
          <span aria-hidden className="mt-px font-mono">!</span>
          {shownError}
        </p>
      )}
    </div>
  );
}

function ScanIcon({ className }: { className?: string }) {
  // Four corner brackets — a viewfinder. Reads "scan this", not "upload a doc".
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ScanSweep() {
  return (
    <svg className="size-7 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
