import { CodeXml } from "lucide-react";
import { ReviewWorkspace } from "@/components/review-workspace";

export default function Home() {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-2.5 px-5 sm:px-6">
        <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <CodeXml className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold tracking-tight">ReviewX</span>
      </header>

      <main className="mx-auto max-w-[1120px] px-5 pt-6 pb-16 sm:px-6 sm:pt-9">
        <h1 className="text-[2.125rem] leading-[1.12] font-semibold tracking-[-0.045em] sm:text-[2.75rem]">
          Review your code
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Upload one file to get feedback and a cleaned-up version.
        </p>
        <ReviewWorkspace />
      </main>
    </>
  );
}
