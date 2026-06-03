import { WidgetType } from "@codemirror/view";
import { formatDurationShort } from "../../core/billable";
import type { DurationClickHandler } from "./stateField";

export class DurationWidget extends WidgetType {
  constructor(
    readonly minutes: number,
    readonly line: number,
    readonly onClick: DurationClickHandler | null,
  ) {
    super();
  }

  override eq(other: DurationWidget): boolean {
    return (
      other.minutes === this.minutes && other.line === this.line && other.onClick === this.onClick
    );
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-aptt-duration";
    span.textContent = ` ${formatDurationShort(this.minutes)}`;
    const handler = this.onClick;
    if (handler !== null) {
      span.style.cursor = "pointer";
      span.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      span.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(this.line, span.getBoundingClientRect());
      });
    }
    return span;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}
