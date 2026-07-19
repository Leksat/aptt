import { type FindTicketId, parseBillable } from "./billable";
import { commentStart } from "./notes";

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
  findTicketId: FindTicketId,
): string | null => {
  const lines = text.split("\n");
  const line = lines[lineIndexAt(text, caret)];
  if (line === undefined) return null;
  const at = commentStart(line);
  const beforeComment = at === null ? line : line.slice(0, at);
  const trimmed = beforeComment.trim();
  return parseBillable(trimmed, findTicketId) === null ? null : trimmed;
};

const lineIndexAt = (text: string, caret: number): number =>
  text.substring(0, caret).split("\n").length - 1;
