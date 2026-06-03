import type { ReactNode } from "react";
import { openExternal } from "./openExternal";

interface Props {
  readonly href: string;
  readonly children: ReactNode;
}

export const Link = ({ href, children }: Props) => (
  <button type="button" onClick={() => openExternal(href)} className="cursor-pointer text-left">
    {children} <span aria-hidden="true">↗</span>
  </button>
);
