import { caretOf, useFocusedSource } from "./FocusedSourceContext";
import { useCore } from "./useCore";

export const NotesPane = () => {
  const { notes } = useCore();
  const focused = useFocusedSource();
  const trackCaret = (el: HTMLTextAreaElement) =>
    focused.set({ source: "notes", caret: caretOf(el) });
  return (
    <textarea
      value={notes.text}
      onChange={notes.onChange}
      onFocus={(e) => trackCaret(e.currentTarget)}
      onSelect={(e) => trackCaret(e.currentTarget)}
      onBlur={() => focused.set(null)}
      className="h-full w-full resize-none"
      spellCheck={false}
    />
  );
};
