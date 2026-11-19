"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  ArrowUpRight,
  CircleAlert,
  FileCode2,
  FileUp,
  Info,
  ListChecks,
  X,
} from "lucide-react";
import { isReview, ReviewResult, type ReviewData } from "@/components/review-result";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const fileTypes = [".java", ".js", ".jsx", ".ts", ".tsx", ".py", ".c", ".cpp", ".txt"];
const maxFileSize = 20 * 1024;

type Review =
  | { status: "idle" | "loading" }
  | { status: "success"; data: ReviewData }
  | { status: "error"; text: string };

const emptyReview: Review = { status: "idle" };

export function ReviewWorkspace() {
  const picker = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [review, setReview] = useState<Review>(emptyReview);
  const busy = review.status === "loading";

  function selectFile(selected?: File) {
    setReview(emptyReview);
    setFile(undefined);
    setFileError("");

    if (!selected) return;

    if (!fileTypes.some((type) => selected.name.toLowerCase().endsWith(type))) {
      setFileError("Choose a supported source or .txt file.");
    } else if (selected.size > maxFileSize) {
      setFileError("Choose a file that is 20 KB or smaller.");
    } else if (selected.size === 0) {
      setFileError("This file is empty. Choose a different file.");
    } else {
      setFile(selected);
    }
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;

    const files = event.dataTransfer.files;
    if (files.length > 1) {
      selectFile();
      setFileError("Drop one file at a time.");
    } else if (files.length === 1) {
      selectFile(files[0]);
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;

    setReview({ status: "loading" });
    let response: Response;
    try {
      response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
      });

    } catch {
      setReview({ status: "error", text: "Could not reach the review server. Try again." });
      return;
    }

    try {
      if (!response.ok) {
        const error = response.headers.get("content-type")?.startsWith("text/plain")
          && response.status !== 500 ? await response.text() : "";
        setReview({ status: "error", text: error || "The review server is unavailable. Try again." });
        return;
      }

      const data: unknown = await response.json();
      if (!isReview(data)) throw new Error("Invalid review");
      setReview({ status: "success", data });
    } catch {
      setReview({ status: "error", text: "The AI reply could not be displayed. Try the review again." });
    }
  }

  return (
    <div className="mt-7">
      <form onSubmit={submitReview}>
        <h2 className="text-sm font-medium">Source file</h2>
        <Card className="mt-2.5 gap-0 border-border py-0 shadow-none">
          <div
            className={cn(
              "grid gap-4 rounded-lg p-4 transition-colors motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5",
              dragging && "bg-accent ring-2 ring-highlight ring-inset",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={dropFile}
          >
            <input
              ref={picker}
              type="file"
              aria-label="Source file"
              tabIndex={-1}
              className="sr-only"
              accept={fileTypes.join(",")}
              disabled={busy}
              onChange={(event) => {
                selectFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-muted text-highlight">
                {file ? <FileCode2 className="size-5" aria-hidden="true" /> : <FileUp className="size-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={file?.name}>
                  {file ? file.name : "Drop one file here"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {file ? `${Math.max(1, Math.ceil(file.size / 1024))} KB` : "Java, JS, TS, Python, C/C++, TXT · 20 KB max"}
                </p>
              </div>
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove file"
                  disabled={busy}
                  onClick={() => selectFile()}
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="h-10 px-3.5"
                disabled={busy}
                onClick={() => picker.current?.click()}
              >
                {file ? "Change file" : "Choose file"}
              </Button>
              <Button type="submit" size="lg" className="h-10 disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100" disabled={!file || busy}>
                {busy ? "Reviewing…" : "Review with AI"}
                <ArrowUpRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Card>
        {fileError && <p className="mt-3 text-sm text-destructive" role="alert">{fileError}</p>}
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" aria-hidden="true" />
          Your file is sent to Groq for review.
        </p>
      </form>

      {review.status !== "idle" && (
        <section aria-labelledby="review-heading" aria-busy={busy} className="mt-8 min-w-0">
          <h2 id="review-heading" className="mb-3 flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ListChecks className="size-5 text-highlight" aria-hidden="true" />
            AI review
          </h2>
          {busy && (
            <Card className="gap-0 border-border px-5 py-5 shadow-none" role="status">
              <p className="text-sm font-medium">Reviewing your file…</p>
              <div className="mt-4 space-y-3" aria-hidden="true">
                {[96, 84, 91].map((width) => (
                  <div
                    key={width}
                    className="h-3 rounded-sm bg-secondary motion-safe:animate-pulse"
                    style={{ width: width + "%" }}
                  />
                ))}
              </div>
            </Card>
          )}
          {review.status === "error" && (
            <Card className="gap-0 border-destructive/25 px-5 py-4 shadow-none">
              <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {review.text}
              </p>
            </Card>
          )}
          {review.status === "success" && <ReviewResult review={review.data} />}
        </section>
      )}
      <p className="sr-only" role="status">{review.status === "success" ? "Your review is ready." : ""}</p>
    </div>
  );
}
