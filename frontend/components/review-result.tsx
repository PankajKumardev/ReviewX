"use client";

import { useState } from "react";
import { ArrowDown, Check, CodeXml, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReviewData = {
  summary: string;
  points: { title: string; detail: string }[];
  cleanedCode: string;
  fileStats: {
    totalLines: number;
    nonBlankLines: number;
    blankLines: number;
    longestLine: number;
  };
  reportText: string;
};

export function isReview(value: unknown): value is ReviewData {
  if (!value || typeof value !== "object") return false;

  const { summary, points, cleanedCode, fileStats, reportText } = value as Partial<ReviewData>;
  return typeof summary === "string" && Boolean(summary.trim())
    && Array.isArray(points) && points.length >= 4 && points.length <= 5
    && points.every((point) => typeof point?.title === "string" && Boolean(point.title.trim())
      && typeof point.detail === "string" && Boolean(point.detail.trim()))
    && typeof cleanedCode === "string"
    && Number.isInteger(fileStats?.totalLines)
    && Number.isInteger(fileStats?.blankLines)
    && Number.isInteger(fileStats?.longestLine)
    && Number.isInteger(fileStats?.nonBlankLines)
    && typeof reportText === "string";
}

export function ReviewResult({ review }: { review: ReviewData }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "done" | "error">("idle");
  const code = review.cleanedCode.trimEnd().replace(/^```[^\n]*\n([\s\S]*?)\n```$/, "$1");

  const downloadUrl = "data:text/plain;charset=utf-8," + encodeURIComponent(review.reportText);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("done");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className={code ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""}>
      <div className="min-w-0 rounded-lg border border-border bg-card px-4 py-4 sm:px-5">
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">File stats</h3>
            <Button asChild size="sm" variant="outline">
              <a href={downloadUrl} download="reviewx-review.txt">
                <Download aria-hidden="true" />
                Download review
              </a>
            </Button>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="min-w-0 rounded-md bg-muted p-2.5">
              <dt className="text-xs text-muted-foreground">Total lines</dt>
              <dd className="mt-1 font-mono text-sm font-semibold">{review.fileStats.totalLines}</dd>
            </div>
            <div className="min-w-0 rounded-md bg-muted p-2.5">
              <dt className="text-xs text-muted-foreground">Non-blank lines</dt>
              <dd className="mt-1 font-mono text-sm font-semibold">{review.fileStats.nonBlankLines}</dd>
            </div>
            <div className="min-w-0 rounded-md bg-muted p-2.5">
              <dt className="text-xs text-muted-foreground">Blank lines</dt>
              <dd className="mt-1 font-mono text-sm font-semibold">{review.fileStats.blankLines}</dd>
            </div>
            <div className="min-w-0 rounded-md bg-muted p-2.5">
              <dt className="text-xs text-muted-foreground">Longest line</dt>
              <dd className="mt-1 font-mono text-sm font-semibold">{review.fileStats.longestLine} chars</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md bg-muted px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <h3 className="text-sm font-semibold">Summary</h3>
            {code && (
              <Button asChild variant="link" size="sm" className="h-auto px-0 py-1 font-medium text-highlight lg:hidden">
                <a href="#cleaned-code">
                  View code <ArrowDown className="size-3.5" aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed break-words">{review.summary}</p>
        </div>

        <div className="mt-5">
          <h3 className="text-base font-semibold tracking-tight">Review points</h3>
          <ol className="mt-1 divide-y divide-border">
            {review.points.map((point, index) => (
              <li key={index} className="grid grid-cols-[1.875rem_minmax(0,1fr)] items-start gap-3 py-3.5">
                <span aria-hidden="true" className="grid size-[1.875rem] place-items-center rounded-sm bg-secondary font-mono text-xs font-semibold text-highlight">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[0.9375rem] leading-[1.875rem] font-semibold break-words">{point.title}</p>
                  <p className="text-sm leading-relaxed break-words text-muted-foreground">{point.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

      </div>

      {code && (
        <div id="cleaned-code" tabIndex={-1} className="min-w-0 scroll-mt-4 overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-3.5 py-2.5 sm:px-4">
            <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <CodeXml className="size-[17px] shrink-0 text-highlight" aria-hidden="true" />
              Cleaned-up code
            </h3>
            <Button type="button" size="sm" variant="outline" onClick={copyCode}>
              {copyStatus === "done" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copyStatus === "done" ? "Copied" : "Copy code"}
            </Button>
          </div>
          {copyStatus === "error" && (
            <p className="px-4 pt-2 text-sm text-destructive" role="alert">
              Could not copy automatically. Select the code to copy it.
            </p>
          )}
          <pre tabIndex={0} aria-label="Cleaned-up code" className="max-h-[36rem] overflow-auto bg-muted p-4 font-mono text-[0.8125rem] leading-6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
