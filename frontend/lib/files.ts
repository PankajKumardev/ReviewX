import type { ChosenFile, SkippedFile } from "@/lib/types";

export const SUPPORTED_EXTENSIONS = [".java", ".js", ".jsx", ".ts", ".tsx", ".py", ".c", ".cpp"];
export const MAX_FILES = 20;
export const MAX_FILE_BYTES = 50 * 1024;
export const MAX_TOTAL_BYTES = 300 * 1024;

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "target",
  "coverage",
  ".venv",
  "__pycache__",
]);

const LOCKFILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock"]);

const NON_SOURCE = [
  ".class",
  ".jar",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".mp4",
  ".mov",
  ".zip",
  ".exe",
  ".dll",
  ".o",
  ".pdf",
];

const LANGUAGES: Record<string, string> = {
  java: "Java",
  js: "JavaScript",
  jsx: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  py: "Python",
  c: "C",
  cpp: "C++",
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function languageFromPath(path: string) {
  return LANGUAGES[extensionOf(path)] ?? "Unknown";
}

export function relativePath(file: File) {
  const relative = file.webkitRelativePath?.replaceAll("\\", "/");
  if (relative && relative.length > 0) {
    return relative;
  }
  return file.name;
}

export function folderName(files: File[]) {
  const relative = files[0]?.webkitRelativePath ?? "";
  const top = relative.split(/[/\\]/)[0];
  return top || "Selected folder";
}

export async function collectFiles(fileList: File[]) {
  const skipped: SkippedFile[] = [];
  const files: ChosenFile[] = [];
  let total = 0;

  for (const file of fileList) {
    const path = relativePath(file);
    const reason = skipReason(file, path, files.length, total);
    if (reason) {
      skipped.push({ path, reason });
      continue;
    }

    const content = await file.text();
    files.push({ path, content, size: file.size });
    total += file.size;
  }

  return { files, skipped, totalBytes: total };
}

export function groupSkips(skipped: SkippedFile[]) {
  const counts = new Map<string, number>();
  for (const item of skipped) {
    counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
  }
  return Array.from(counts.entries());
}

function skipReason(file: File, path: string, accepted: number, total: number) {
  const parts = path.split("/");
  if (parts.some((part) => IGNORED_DIRS.has(part))) {
    return "Ignored folder";
  }

  const name = (parts[parts.length - 1] ?? path).toLowerCase();
  if (name === ".env" || name.endsWith(".env") || name.startsWith(".env.") || name.endsWith(".pem") || name.endsWith(".key") || name.includes("id_rsa")) {
    return "Private or secret file";
  }
  if (LOCKFILES.has(name) || NON_SOURCE.some((ext) => name.endsWith(ext))) {
    return "Not a source file";
  }
  if (!SUPPORTED_EXTENSIONS.includes(`.${extensionOf(path)}`)) {
    return "Unsupported file type";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Larger than 50 KB";
  }
  if (accepted >= MAX_FILES) {
    return "Only 20 source files can be reviewed at once";
  }
  if (total + file.size > MAX_TOTAL_BYTES) {
    return "Total source limit of 300 KB was reached";
  }
  return null;
}

function extensionOf(path: string) {
  const name = path.split(/[/\\]/).pop() ?? path;
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) {
    return "";
  }
  return name.slice(dot + 1).toLowerCase();
}
