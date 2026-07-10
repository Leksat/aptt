export const commentStart = (line: string): number | null => {
  const i = line.indexOf("#");
  return i === -1 ? null : i;
};

export interface Link {
  readonly from: number;
  readonly to: number;
  readonly url: string;
}

const urlPattern = /https?:\/\/\S+/g;
const strippableTail = ".,;:";
const closerToOpener: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

const countChar = (text: string, char: string): number => {
  let count = 0;
  for (const c of text) if (c === char) count++;
  return count;
};

const trimTrailingPunctuation = (url: string): string => {
  let end = url.length;
  while (end > 0) {
    const char = url.charAt(end - 1);
    if (strippableTail.includes(char)) {
      end--;
      continue;
    }
    const opener = closerToOpener[char];
    if (opener !== undefined) {
      const head = url.slice(0, end);
      if (countChar(head, char) > countChar(head, opener)) {
        end--;
        continue;
      }
    }
    break;
  }
  return url.slice(0, end);
};

export const findLinks = (text: string): ReadonlyArray<Link> => {
  const links: Link[] = [];
  for (const match of text.matchAll(urlPattern)) {
    if (match.index === undefined) continue;
    const from = match.index;
    const url = trimTrailingPunctuation(match[0]);
    links.push({ from, to: from + url.length, url });
  }
  return links;
};
