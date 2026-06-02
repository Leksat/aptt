export const commentStart = (line: string): number | null => {
  const i = line.indexOf("#");
  return i === -1 ? null : i;
};
