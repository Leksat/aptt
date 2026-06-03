import { getCurrentWindow } from "@tauri-apps/api/window";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  readonly anchor: DOMRect;
  readonly onDismiss: () => void;
  readonly children: ReactNode;
}

interface Layout {
  readonly left: number;
  readonly top: number;
  readonly maxHeight: number;
  readonly arrowY: number;
}

const TOOLTIP_WIDTH = 320;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 10;
const ARROW_SIZE = 8;

export const EntryTooltip = ({ anchor, onDismiss, children }: Props) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Layout>(() => initialLayout(anchor));

  const reposition = useCallback(() => {
    const el = boxRef.current;
    if (el === null) return;
    const maxHeight = Math.max(0, window.innerHeight - 2 * VIEWPORT_MARGIN);
    const effectiveHeight = Math.min(el.scrollHeight, maxHeight);
    const anchorCenterY = (anchor.top + anchor.bottom) / 2;
    const top = clamp(
      anchorCenterY - effectiveHeight / 2,
      VIEWPORT_MARGIN,
      window.innerHeight - VIEWPORT_MARGIN - effectiveHeight,
    );
    const left = Math.min(
      anchor.right + ANCHOR_GAP,
      window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
    );
    const arrowY = clamp(
      anchorCenterY - top - ARROW_SIZE / 2,
      ARROW_SIZE,
      Math.max(ARROW_SIZE, effectiveHeight - ARROW_SIZE * 2),
    );
    setLayout({ left, top, maxHeight, arrowY });
  }, [anchor]);

  useLayoutEffect(() => {
    reposition();
  }, [reposition]);

  useEffect(() => {
    const el = boxRef.current;
    if (el === null) return;
    const observer = new ResizeObserver(() => reposition());
    observer.observe(el);
    return () => observer.disconnect();
  }, [reposition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (boxRef.current?.contains(target) === true) return;
      if (target instanceof Element && target.closest(".cm-aptt-duration") !== null) return;
      onDismiss();
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [onDismiss]);

  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused) onDismiss();
    });
    return () => {
      void unlistenPromise.then((unlisten) => {
        unlisten();
      });
    };
  }, [onDismiss]);

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: layout.left,
        top: layout.top,
        width: TOOLTIP_WIDTH,
        zIndex: 1000,
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        style={{ maxHeight: layout.maxHeight, overflowY: "auto" }}
        className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg"
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -ARROW_SIZE / 2 - 1,
          top: layout.arrowY,
          width: ARROW_SIZE,
          height: ARROW_SIZE,
          background: "var(--color-bg)",
          borderLeft: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
          transform: "rotate(45deg)",
        }}
      />
    </div>,
    document.body,
  );
};

const initialLayout = (anchor: DOMRect): Layout => {
  const maxHeight = Math.max(0, window.innerHeight - 2 * VIEWPORT_MARGIN);
  return {
    left: Math.min(anchor.right + ANCHOR_GAP, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN),
    top: clamp(
      (anchor.top + anchor.bottom) / 2,
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, window.innerHeight - VIEWPORT_MARGIN),
    ),
    maxHeight,
    arrowY: ARROW_SIZE,
  };
};

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(Math.max(lo, v), Math.max(lo, hi));
