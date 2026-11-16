"use client";

import { useRef } from "react";
import { ArrowRight, FileCode, FolderOpen, X } from "lucide-react";
import { collectFiles, folderName, formatBytes, groupSkips, languageFromPath } from "@/lib/files";
import type { Selection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type FileSelectorProps = {
  selection: Selection | null;
  useAI: boolean;
  busy: boolean;
  aiConfigured: boolean | null;
  onUseAI: (value: boolean) => void;
  onSelection: (selection: Selection | null) => void;
  onNotice: (message: string | null) => void;
  onStart: () => void;
};

export function FileSelector({
  selection,
  useAI,
  busy,
  aiConfigured,
  onUseAI,
  onSelection,
  onNotice,
  onStart,
}: FileSelectorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const list = takeFiles(event);
    if (list.length === 0) {
      return;
    }
    const collected = await collectFiles(list);
    if (collected.files.length === 0) {
      onSelection(null);
      onNotice(singleFileMessage(collected.skipped[0]?.reason));
      return;
    }
    onNotice(null);
    onSelection({
      mode: "file",
      label: collected.files[0].path,
      files: collected.files,
      skipped: collected.skipped,
      totalBytes: collected.totalBytes,
    });
  }

  async function handleFolder(event: React.ChangeEvent<HTMLInputElement>) {
    const list = takeFiles(event);
    if (list.length === 0) {
      return;
    }
    const collected = await collectFiles(list);
    onNotice(null);
    onSelection({
      mode: "folder",
      label: folderName(list),
      files: collected.files,
      skipped: collected.skipped,
      totalBytes: collected.totalBytes,
    });
  }

  const canReview = Boolean(selection && selection.files.length > 0 && !busy);

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col rounded-xl border border-[var(--line)] bg-white p-6 shadow-[0_1px_2px_rgba(28,36,48,0.04)] transition-colors duration-150 hover:border-[#c5d4e6]">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <FileCode aria-hidden="true" strokeWidth={1.75} />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Review a File</h2>
          <p className="mt-2 max-w-[36ch] text-[15px] leading-relaxed text-[var(--muted)]">
            Analyze a single source code file.
          </p>
          <p className="mt-4 font-mono text-xs text-[#667588]">.java .js .jsx .ts .tsx .py .c .cpp</p>
          <div className="mt-6">
            <Button disabled={busy} onClick={() => fileInput.current?.click()}>
              Choose File
            </Button>
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-[var(--line)] bg-white p-6 shadow-[0_1px_2px_rgba(28,36,48,0.04)] transition-colors duration-150 hover:border-[#c5d4e6]">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <FolderOpen aria-hidden="true" strokeWidth={1.75} />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Review a Project</h2>
          <p className="mt-2 max-w-[36ch] text-[15px] leading-relaxed text-[var(--muted)]">
            Scan supported source files from a project folder.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-[#667588]">
            Folders such as node_modules, .git, and build output are ignored.
          </p>
          <div className="mt-6">
            <Button disabled={busy} onClick={() => folderInput.current?.click()}>
              Choose Folder
            </Button>
          </div>
        </section>
      </div>

      <p className="mt-4 text-sm text-[var(--muted)]">
        Up to 20 source files. 50 KB each. 300 KB total.
      </p>

      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept=".java,.js,.jsx,.ts,.tsx,.py,.c,.cpp,text/x-java-source,text/plain"
        aria-label="Choose a source file"
        onChange={(event) => void handleFile(event)}
      />
      <input
        ref={folderInput}
        className="sr-only"
        type="file"
        multiple
        aria-label="Choose a project folder"
        onChange={(event) => void handleFolder(event)}
        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
      />

      {selection ? (
        <section className="rise mt-6 rounded-xl border border-[var(--line)] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted)]">
                {selection.mode === "file" ? "Selected file" : "Selected folder"}
              </p>
              <h2 className="mt-1 break-all text-lg font-semibold tracking-tight">{selection.label}</h2>
            </div>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                onSelection(null);
                onNotice(null);
              }}
            >
              <X aria-hidden="true" size={16} strokeWidth={1.75} />
              Clear
            </Button>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-[var(--line)] py-4 sm:grid-cols-4">
            <Stat label="Supported files" value={String(selection.files.length)} />
            <Stat label="Skipped files" value={String(selection.skipped.length)} />
            <Stat label="Source size" value={formatBytes(selection.totalBytes)} />
            <Stat
              label={selection.mode === "file" ? "Language" : "Selection"}
              value={selection.mode === "file" ? languageFromPath(selection.label) : "Folder"}
            />
          </dl>

          {selection.files.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-[#8a5a10]" role="status">
              No supported source files were found in that folder. Choose another folder, or pick a single source file.
            </p>
          ) : null}

          {selection.skipped.length > 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
              Skipped: {groupSkips(selection.skipped).map(([reason, count]) => `${reason} (${count})`).join(", ")}.
            </p>
          ) : null}

          {selection.mode === "folder" && selection.files.length > 0 ? (
            <ul className="mt-4 max-h-48 space-y-1 overflow-auto rounded-xl bg-[#f7f9fb] p-3 font-mono text-xs leading-5 text-[#1c2430]">
              {selection.files.map((file) => (
                <li key={file.path} className="break-all">
                  {file.path}
                  <span className="ml-2 text-[#667588]">{formatBytes(file.size)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 rounded-xl bg-[#f7f9fb] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label htmlFor="ai-review" className="text-sm font-semibold">
                  Include AI Review
                </label>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                  Off by default. Turn this on only if you want selected code excerpts sent to Groq.
                </p>
              </div>
              <Switch
                id="ai-review"
                checked={useAI}
                disabled={busy}
                onCheckedChange={onUseAI}
                aria-label="Include AI Review"
              />
            </div>
            {useAI ? (
              <p className="mt-3 text-sm leading-relaxed text-[#1f4e89]">
                Selected code excerpts will be sent to Groq. Obvious credential lines are redacted first. The API key stays in the Java program and is never sent to the browser.
                {aiConfigured === false
                  ? " No Groq API key is configured right now, so local results will still be shown."
                  : ""}
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button size="lg" disabled={!canReview} onClick={onStart}>
              {busy ? "Reviewing" : "Start Review"}
              {busy ? null : <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />}
            </Button>
            {!canReview && !busy ? (
              <p className="text-sm text-[var(--muted)]">Choose at least one supported source file.</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

function takeFiles(event: React.ChangeEvent<HTMLInputElement>) {
  const list = event.target.files ? Array.from(event.target.files) : [];
  event.target.value = "";
  return list;
}

function singleFileMessage(reason: string | undefined) {
  if (reason === "Larger than 50 KB") {
    return "This file is larger than 50 KB. Choose a smaller source file.";
  }
  if (reason === "Private or secret file") {
    return "This file looks private, so ReviewX will not read it. Choose a source file instead.";
  }
  if (reason === "Unsupported file type" || reason === "Not a source file") {
    return "This file type is not supported. Choose a Java, JavaScript, TypeScript, Python, C, or C++ file.";
  }
  return "This file cannot be reviewed. Choose a supported source file.";
}
