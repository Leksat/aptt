import { useFocusedSource } from "./FocusedSourceContext";
import { NotesEditor } from "./NotesEditor";
import { useCore } from "./useCore";

export const NotesPane = () => {
  const { notes } = useCore();
  const focused = useFocusedSource();
  return (
    <NotesEditor
      text={notes.text}
      onChange={notes.setText}
      onCaretChange={(caret) => focused.set({ source: "notes", caret })}
      onBlur={() => focused.set(null)}
    />
  );
};
