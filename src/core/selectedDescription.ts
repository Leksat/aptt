import type { FindTargetId } from "./billable";

export const selectedDescriptionFromTimeLog = (text: string, caret: number): string | null => {
  const lines = text.split("\n");
  const lineIndex = lineIndexAt(text, caret);
  if (lineIndex % 2 === 0) return null;
  const line = lines[lineIndex];
  if (line === undefined) return null;
  const trimmed = line.trim();
  return trimmed === "" ? null : trimmed;
};

export const selectedDescriptionFromNotes = (
  text: string,
  caret: number,
  findTargetId: FindTargetId,
): string | null => {
  const lines = text.split("\n");
  const line = lines[lineIndexAt(text, caret)];
  if (line === undefined) return null;
  const beforeComment = line.split("#", 1)[0] ?? "";
  const trimmed = beforeComment.trim();
  if (trimmed === "") return null;
  const firstToken = trimmed.split(/\s+/, 1)[0] ?? "";
  return findTargetId(firstToken) === null ? null : trimmed;
};

const lineIndexAt = (text: string, caret: number): number =>
  text.substring(0, caret).split("\n").length - 1;
