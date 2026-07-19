import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  readonly anchor: DOMRect;
  readonly onDismiss: () => void;
  readonly onMouseEnter: () => void;
  readonly onMouseLeave: () => void;
  readonly children: ReactNode;
}

type Placement = "bottom" | "top" | "right" | "left";

interface Layout {
  readonly left: number;
  readonly top: number;
  readonly maxHeight: number;
  readonly placement: Placement;
  readonly arrowLeft: number;
  readonly arrowTop: number;
}

const TOOLTIP_WIDTH = 320;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 10;
const ARROW_SIZE = 8;

const BORDER = "1px solid var(--color-border)";

const arrowBorders = (placement: Placement) => ({
  borderLeft: placement === "right" ? BORDER : undefined,
  borderBottom: placement === "right" || placement === "top" ? BORDER : undefined,
  borderTop: placement === "left" || placement === "bottom" ? BORDER : undefined,
  borderRight: placement === "left" || placement === "top" ? BORDER : undefined,
});

export const EntryTooltip = ({
  anchor,
  onDismiss,
  onMouseEnter,
  onMouseLeave,
  children,
}: Props) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Layout>(() => computeLayout(anchor, 0));

  const reposition = useCallback(() => {
    const el = boxRef.current;
    if (el === null) return;
    const maxHeight = Math.max(0, window.innerHeight - 2 * VIEWPORT_MARGIN);
    setLayout(computeLayout(anchor, Math.min(el.scrollHeight, maxHeight)));
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
      if (target instanceof Node && boxRef.current?.contains(target) === true) return;
      onDismiss();
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
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
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ maxHeight: layout.maxHeight, overflowY: "auto" }}
        className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg"
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: layout.arrowLeft,
          top: layout.arrowTop,
          width: ARROW_SIZE,
          height: ARROW_SIZE,
          background: "var(--color-bg)",
          ...arrowBorders(layout.placement),
          transform: "rotate(45deg)",
        }}
      />
    </div>,
    document.body,
  );
};

const choosePlacement = (anchor: DOMRect, height: number): Placement => {
  if (anchor.bottom + ANCHOR_GAP + height <= window.innerHeight - VIEWPORT_MARGIN) return "bottom";
  if (anchor.top - ANCHOR_GAP - height >= VIEWPORT_MARGIN) return "top";
  if (anchor.right + ANCHOR_GAP + TOOLTIP_WIDTH <= window.innerWidth - VIEWPORT_MARGIN)
    return "right";
  return "left";
};

const computeLayout = (anchor: DOMRect, height: number): Layout => {
  const maxHeight = Math.max(0, window.innerHeight - 2 * VIEWPORT_MARGIN);
  const placement = choosePlacement(anchor, height);
  const centerX = (anchor.left + anchor.right) / 2;
  const centerY = (anchor.top + anchor.bottom) / 2;

  if (placement === "bottom" || placement === "top") {
    const left = clamp(
      centerX - TOOLTIP_WIDTH / 2,
      VIEWPORT_MARGIN,
      window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
    );
    const top =
      placement === "bottom" ? anchor.bottom + ANCHOR_GAP : anchor.top - ANCHOR_GAP - height;
    const arrowLeft = clamp(
      centerX - left - ARROW_SIZE / 2,
      ARROW_SIZE,
      Math.max(ARROW_SIZE, TOOLTIP_WIDTH - ARROW_SIZE * 2),
    );
    const arrowTop = placement === "bottom" ? -ARROW_SIZE / 2 - 1 : height - ARROW_SIZE / 2 - 1;
    return { left, top, maxHeight, placement, arrowLeft, arrowTop };
  }

  const left =
    placement === "right"
      ? Math.min(anchor.right + ANCHOR_GAP, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN)
      : Math.max(anchor.left - ANCHOR_GAP - TOOLTIP_WIDTH, VIEWPORT_MARGIN);
  const top = clamp(
    centerY - height / 2,
    VIEWPORT_MARGIN,
    window.innerHeight - VIEWPORT_MARGIN - height,
  );
  const arrowTop = clamp(
    centerY - top - ARROW_SIZE / 2,
    ARROW_SIZE,
    Math.max(ARROW_SIZE, height - ARROW_SIZE * 2),
  );
  const arrowLeft =
    placement === "right" ? -ARROW_SIZE / 2 - 1 : TOOLTIP_WIDTH - ARROW_SIZE / 2 - 1;
  return { left, top, maxHeight, placement, arrowLeft, arrowTop };
};

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(Math.max(lo, v), Math.max(lo, hi));
