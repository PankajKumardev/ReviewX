export type ChosenFile = {
  path: string;
  content: string;
  size: number;
};

export type SkippedFile = {
  path: string;
  reason: string;
};

export type Selection = {
  mode: "file" | "folder";
  label: string;
  files: ChosenFile[];
  skipped: SkippedFile[];
  totalBytes: number;
};

export type Finding = {
  file: string;
  line: number;
  severity: string;
  category: string;
  message: string;
  explanation: string;
  suggestion: string;
  source: string;
};

export type ReviewResponse = {
  filesReviewed: number;
  filesSkipped: number;
  localIssueCount: number;
  aiIssueCount: number;
  aiStatus: string;
  aiMessage?: string;
  findings: Finding[];
  skipped?: SkippedFile[];
};

export type HealthResponse = {
  status: string;
  aiConfigured?: boolean;
};
