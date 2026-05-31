export const entryCount = (text: string): number =>
  text.split("\n").filter((line) => line.trim().length > 0).length;
