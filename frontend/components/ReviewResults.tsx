"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { FindingCard } from "@/components/FindingCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ChosenFile, Finding, ReviewResponse } from "@/lib/types";

const SEVERITIES = ["ALL", "HIGH", "MEDIUM", "LOW"] as const;

export function ReviewResults({
  result,
  files,
}: {
  result: ReviewResponse;
  files: ChosenFile[];
}) {
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("ALL");
  const [source, setSource] = useState("ALL");

  const counts = useMemo(() => countFindings(result.findings), [result.findings]);
  const visible = result.findings.filter((finding) => {
    if (severity !== "ALL" && finding.severity !== severity) {
      return false;
    }
    if (source !== "ALL" && finding.source !== source) {
      return false;
    }
    return true;
  });

  return (
    <section className="rise mt-8" aria-live="polite">
      <h2 className="text-2xl font-semibold tracking-tight">Review results</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        These checks look for simple text patterns. They can miss real bugs and sometimes flag safe code.
      </p>

      {result.aiStatus === "failed" ? (
        <p className="mt-4 rounded-xl border border-[#ead9b2] bg-[#fbf6ea] px-4 py-3 text-sm leading-relaxed text-[#8a5a10]">
          {result.aiMessage || "Local review completed. AI review unavailable."}
        </p>
      ) : null}
      {result.aiStatus === "completed" ? (
        <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
          {result.aiMessage || "AI review completed. These findings are suggestions, not guaranteed bugs."}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Files Reviewed" value={result.filesReviewed} />
        <Metric label="Total Issues" value={counts.total} />
        <Metric label="High Severity" value={counts.high} tone="text-[#9d2c2c]" />
        <Metric label="Medium Severity" value={counts.medium} tone="text-[#8a5a10]" />
        <Metric label="Low Severity" value={counts.low} tone="text-[#1f6b45]" className="col-span-2 md:col-span-1" />
      </div>

      {result.filesSkipped > 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          The Java server skipped {result.filesSkipped} file{result.filesSkipped === 1 ? "" : "s"}.
          {result.skipped && result.skipped.length > 0
            ? ` ${result.skipped.map((item) => `${item.path}: ${item.reason}`).slice(0, 3).join(" ")}`
            : ""}
        </p>
      ) : null}

      {result.findings.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[#d7eadf] bg-[#f4fbf7] px-5 py-6">
          <div className="flex items-center gap-2 text-[#1f6b45]">
            <Check aria-hidden="true" size={18} strokeWidth={1.75} />
            <h3 className="text-lg font-semibold">No issues detected.</h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#315c45]">
            This means no issues were found by the checks performed. It does not guarantee the code is error-free.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by severity">
              {SEVERITIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={severity === item}
                  onClick={() => setSeverity(item)}
                  className={cn(
                    "h-9 rounded-xl px-3 text-sm font-medium transition-colors",
                    severity === item
                      ? "bg-[#1c2430] text-white"
                      : "border border-[#d5dde7] bg-white text-[#1c2430] hover:bg-[#f7f9fb]",
                  )}
                >
                  {item === "ALL" ? "All Issues" : item === "HIGH" ? "High" : item === "MEDIUM" ? "Medium" : "Low"}
                </button>
              ))}
            </div>
            <Tabs value={source} onValueChange={setSource}>
              <TabsList aria-label="Filter by detector">
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="LOCAL">Local</TabsTrigger>
                <TabsTrigger value="AI">AI</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {visible.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--muted)]">No issues match this filter.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {visible.map((finding, index) => (
                <FindingCard
                  key={`${finding.file}-${finding.line}-${finding.source}-${index}`}
                  finding={finding}
                  snippet={snippetFor(finding, files)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: number;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-[var(--line)] bg-white px-4 py-3", className)}>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight", tone)}>{value}</p>
    </div>
  );
}

function countFindings(findings: Finding[]) {
  return {
    total: findings.length,
    high: findings.filter((finding) => finding.severity === "HIGH").length,
    medium: findings.filter((finding) => finding.severity === "MEDIUM").length,
    low: findings.filter((finding) => finding.severity === "LOW").length,
  };
}

function snippetFor(finding: Finding, files: ChosenFile[]) {
  if (finding.category.toLowerCase() === "security") {
    return null;
  }
  const file = files.find((item) => item.path === finding.file);
  if (!file) {
    return null;
  }
  const line = file.content.split("\n")[finding.line - 1];
  if (line == null || mightContainSecret(line)) {
    return null;
  }
  const trimmed = line.trimEnd();
  return trimmed.length > 240 ? trimmed.slice(0, 240) : trimmed;
}

// Hides a line from the screen. The review decision itself is made in Java.
function mightContainSecret(line: string) {
  const lower = line.toLowerCase();
  const named = ["password", "secret", "api_key", "apikey", "api-key", "token"].some((word) =>
    lower.includes(word),
  );
  const quoted = line.includes("\"") || line.includes("'") || line.includes("`");
  return named && quoted;
}
