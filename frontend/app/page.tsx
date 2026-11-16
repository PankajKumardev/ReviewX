"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, ScanSearch } from "lucide-react";
import { FileSelector } from "@/components/FileSelector";
import { ReviewResults } from "@/components/ReviewResults";
import { Button } from "@/components/ui/button";
import type { HealthResponse, ReviewResponse, Selection } from "@/lib/types";

type Phase = "idle" | "review";
type LinkState = "checking" | "online" | "offline";

export default function HomePage() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [link, setLink] = useState<LinkState>("checking");
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("offline");
        }
        const data = (await response.json()) as HealthResponse;
        if (!cancelled) {
          setLink(data.status === "ok" ? "online" : "offline");
          setAiConfigured(Boolean(data.aiConfigured));
        }
      } catch {
        if (!cancelled) {
          setLink("offline");
          setAiConfigured(null);
        }
      }
    }

    void loadHealth();
    const timer = window.setInterval(() => void loadHealth(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!result) {
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("review-results")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [result]);

  async function startReview() {
    if (!selection || selection.files.length === 0) {
      setNotice("Choose a supported source file or a folder with supported source files.");
      setResult(null);
      return;
    }

    setNotice(null);
    setResult(null);
    setPhase("review");

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          useAI,
          files: selection.files.map((file) => ({
            path: file.path,
            content: file.content,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const serverMessage =
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "";
        if (serverMessage) {
          throw new Error(serverMessage);
        }
        if (response.status >= 500) {
          throw new Error("The Java backend is not running. In the backend folder, run ./setup.sh and then ./run.sh.");
        }
        throw new Error("The review could not be completed.");
      }
      if (!isReview(payload)) {
        throw new Error("The Java server returned an unexpected response.");
      }
      setResult(payload);
      setPhase("idle");
    } catch (error) {
      setPhase("idle");
      if (error instanceof TypeError) {
        setNotice("The Java backend is not running. In the backend folder, run ./setup.sh and then ./run.sh.");
        setLink("offline");
        return;
      }
      setNotice(error instanceof Error ? error.message : "The review could not be completed.");
    }
  }

  const canRetry = Boolean(selection && selection.files.length > 0);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#1f4e89] text-white">
              <ScanSearch aria-hidden="true" size={18} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[15px] leading-none font-semibold tracking-tight">ReviewX</p>
              <p className="mt-1 text-xs text-[var(--muted)]">AI-Powered Code Review</p>
            </div>
          </div>
          <Status link={link} aiConfigured={aiConfigured} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pt-10 pb-16">
        <section>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[#1c2430] sm:text-5xl sm:leading-[1.08]">
            Better code starts with better reviews.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
            Review your files or entire project, spot potential issues, and get clear suggestions before you ship.
          </p>
        </section>

        <div className="mt-8">
          <FileSelector
            selection={selection}
            useAI={useAI}
            busy={phase === "review"}
            aiConfigured={aiConfigured}
            onUseAI={setUseAI}
            onSelection={(next) => {
              setSelection(next);
              setResult(null);
              setPhase("idle");
            }}
            onNotice={setNotice}
            onStart={() => void startReview()}
          />
        </div>

        {phase === "review" ? <ReviewProgress useAI={useAI} /> : null}

        {notice ? (
          <section className="rise mt-6 rounded-xl border border-[#f0d0d0] bg-[#fdf2f2] px-5 py-4" role="alert">
            <div className="flex items-start gap-3">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-[#9d2c2c]" size={18} strokeWidth={1.75} />
              <div>
                <p className="text-sm leading-relaxed text-[#7d2424]">{notice}</p>
                <div className="mt-3">
                  {canRetry ? (
                    <Button variant="secondary" onClick={() => void startReview()}>
                      Try again
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => setNotice(null)}>
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {result ? (
          <div id="review-results" className="scroll-mt-24">
            <ReviewResults result={result} files={selection?.files ?? []} />
          </div>
        ) : null}

        <p className="mt-12 max-w-2xl text-sm leading-relaxed text-[#667588]">
          Source files are read in the browser and sent to Java as text. The server does not open folders on your computer. Code is never executed or changed.
        </p>
      </main>
    </div>
  );
}

function Status({ link, aiConfigured }: { link: LinkState; aiConfigured: boolean | null }) {
  const label =
    link === "checking" ? "Checking local review" : link === "online" ? "Local review ready" : "Java backend offline";
  const ai =
    link !== "online" ? "" : aiConfigured ? "Groq key detected" : "Groq key not set";
  const dot =
    link === "online" ? "bg-[#1f6b45]" : link === "offline" ? "bg-[#9d2c2c]" : "bg-[#8a94a3]";

  return (
    <p className="flex items-center gap-2 text-sm text-[#4a596b]">
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span>
        {label}
        {ai ? <span className="hidden sm:inline"> · {ai}</span> : null}
      </span>
    </p>
  );
}

function ReviewProgress({ useAI }: { useAI: boolean }) {
  return (
    <section className="rise mt-6 rounded-xl border border-[var(--line)] bg-white p-5" aria-live="polite">
      <ol className="space-y-3">
        <ProgressItem state="done" label="Preparing source files" />
        <ProgressItem state="active" label="Running Java local checks" />
        <ProgressItem
          state={useAI ? "active" : "skipped"}
          label={useAI ? "Requesting Groq review" : "AI review not selected"}
        />
        <ProgressItem state="waiting" label="Displaying findings" />
      </ol>
    </section>
  );
}

function ProgressItem({ state, label }: { state: "done" | "active" | "waiting" | "skipped"; label: string }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="flex size-6 items-center justify-center rounded-full border border-[#d5dde7] text-[#1f4e89]">
        {state === "done" ? (
          <Check aria-hidden="true" size={14} strokeWidth={1.75} />
        ) : state === "active" ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={14} strokeWidth={1.75} />
        ) : null}
      </span>
      <span className={state === "waiting" || state === "skipped" ? "text-[#667588]" : "text-[#1c2430]"}>
        {label}
      </span>
    </li>
  );
}

function isReview(value: unknown): value is ReviewResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as ReviewResponse;
  return Array.isArray(record.findings) && typeof record.filesReviewed === "number";
}
