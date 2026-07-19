import { ViewPlugin } from "@codemirror/view";

export const cmdDownClass = "cm-aptt-cmd-down";

export const cmdDownState = ViewPlugin.define((view) => {
  const setArmed = (armed: boolean): void => {
    view.dom.classList.toggle(cmdDownClass, armed);
  };
  const onKey = (event: KeyboardEvent): void => setArmed(event.metaKey);
  const disarm = (): void => setArmed(false);

  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", disarm);
  view.contentDOM.addEventListener("blur", disarm);

  return {
    destroy() {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", disarm);
      view.contentDOM.removeEventListener("blur", disarm);
    },
  };
});
