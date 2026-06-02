import { WidgetType } from "@codemirror/view";
import { formatDurationShort } from "../../core/billable";

export class DurationWidget extends WidgetType {
  constructor(readonly minutes: number) {
    super();
  }

  override eq(other: DurationWidget): boolean {
    return other.minutes === this.minutes;
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-aptt-duration";
    span.textContent = ` ${formatDurationShort(this.minutes)}`;
    return span;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}
