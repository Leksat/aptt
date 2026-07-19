import { useEffect, useState } from "react";
import { parseHistoryFilename } from "../core/history";
import { HistorySection } from "./HistorySection";
import { useCore } from "./useCore";
import { useMinuteTick } from "./useMinuteTick";

export const HistoryPane = () => {
  const core = useCore();
  const backend = core.config.snapshot.backend;
  const now = useMinuteTick();
  const [files, setFiles] = useState<HistoryFile[] | null>(null);
  const submitTag = core.submit.state.tag;

  useEffect(() => {
    if (submitTag === "submitting") return;
    let cancelled = false;
    void core.history.list().then((names) => {
      if (cancelled) return;
      setFiles(toHistoryFiles(names));
    });
    return () => {
      cancelled = true;
    };
  }, [core.history, submitTag]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex justify-end px-3 pb-2">
        <button
          type="button"
          onClick={core.history.open}
          className="rounded border border-[var(--color-border)] px-3 py-1"
        >
          Open history folder
        </button>
      </div>
      {files !== null && files.length === 0 && (
        <div className="px-3 py-6 text-center text-[var(--color-muted)]">No history yet.</div>
      )}
      {files !== null && files.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto border-[var(--color-border)] border-t">
          {files.map((file, index) => (
            <HistorySection
              key={file.filename}
              filename={file.filename}
              submittedAt={file.submittedAt}
              defaultExpanded={index === 0}
              now={now}
              backend={backend}
              read={core.history.read}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface HistoryFile {
  readonly filename: string;
  readonly submittedAt: Date;
}

const toHistoryFiles = (names: readonly string[]): HistoryFile[] => {
  const files: HistoryFile[] = [];
  for (const filename of names) {
    const submittedAt = parseHistoryFilename(filename);
    if (submittedAt !== null) files.push({ filename, submittedAt });
  }
  files.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  return files;
};
