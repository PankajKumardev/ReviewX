import { Badge } from "@/components/ui/badge";
import type { Finding } from "@/lib/types";

const WORD_START = /[A-Za-z_]/;
const WORD_PART = /[A-Za-z0-9_]/;

const KEYWORDS = new Set([
  "public",
  "class",
  "static",
  "void",
  "return",
  "if",
  "else",
  "for",
  "while",
  "new",
  "import",
  "const",
  "let",
  "function",
  "def",
  "int",
  "true",
  "false",
  "null",
]);

export function FindingCard({ finding, snippet }: { finding: Finding; snippet: string | null }) {
  const tone = severityTone(finding.severity);

  return (
    <article className="rounded-xl border border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={tone.badge}>{finding.severity}</Badge>
        <span className="text-sm text-[var(--muted)]">{finding.category}</span>
      </div>
      <p className="mt-3 font-mono text-xs text-[#667588]">
        {finding.file} · Line {finding.line}
      </p>
      <h3 className="mt-2 text-base font-semibold tracking-tight">{finding.message}</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-[#1c2430]">Explanation</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{finding.explanation}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-[#1c2430]">Suggested fix</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{finding.suggestion}</p>
        </div>
      </div>

      {snippet ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[#f7f9fb]">
          <div className="flex">
            <span className="shrink-0 border-r border-[var(--line)] px-3 py-2 font-mono text-xs text-[#667588]">
              {finding.line}
            </span>
            <pre className="overflow-x-auto px-3 py-2 font-mono text-[13px] leading-5">
              <HighlightedLine code={snippet} />
            </pre>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-[#667588]">Detected by: {sourceLabel(finding.source)}</p>
    </article>
  );
}

function HighlightedLine({ code }: { code: string }) {
  return (
    <code>
      {tokenize(code).map((token, index) => (
        <span
          key={`${token.kind}-${index}`}
          className={token.kind === "keyword" ? "text-[var(--accent)]" : token.kind === "comment" ? "text-[#667588]" : undefined}
        >
          {token.text}
        </span>
      ))}
    </code>
  );
}

function tokenize(line: string) {
  const tokens: Array<{ text: string; kind: "plain" | "keyword" | "comment" }> = [];
  let index = 0;
  while (index < line.length) {
    if (line.startsWith("//", index) || (index === 0 && line[index] === "#")) {
      tokens.push({ text: line.slice(index), kind: "comment" });
      break;
    }
    const quote = line[index];
    if (quote === "\"" || quote === "'" || quote === "`") {
      let end = index + 1;
      while (end < line.length && line[end] !== quote) {
        if (line[end] === "\\") {
          end += 1;
        }
        end += 1;
      }
      tokens.push({ text: line.slice(index, Math.min(end + 1, line.length)), kind: "plain" });
      index = end + 1;
      continue;
    }
    if (WORD_START.test(line[index])) {
      let end = index + 1;
      while (end < line.length && WORD_PART.test(line[end])) {
        end += 1;
      }
      const word = line.slice(index, end);
      tokens.push({ text: word, kind: KEYWORDS.has(word) ? "keyword" : "plain" });
      index = end;
      continue;
    }
    tokens.push({ text: line[index], kind: "plain" });
    index += 1;
  }
  return tokens;
}

function sourceLabel(source: string) {
  if (source === "LOCAL") {
    return "Local Review";
  }
  if (source === "AI") {
    return "Groq AI";
  }
  return source;
}

function severityTone(severity: string) {
  if (severity === "HIGH") {
    return { badge: "bg-[#fdf2f2] text-[#9d2c2c]" };
  }
  if (severity === "MEDIUM") {
    return { badge: "bg-[#fbf6ea] text-[#8a5a10]" };
  }
  return { badge: "bg-[#eef8f2] text-[#1f6b45]" };
}
