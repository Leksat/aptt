import { useFocusedSource } from "./FocusedSourceContext";
import { NotesEditor } from "./NotesEditor";
import { useCore } from "./useCore";

export const NotesPane = () => {
  const { notes, config } = useCore();
  const backend = config.snapshot.backend;
  const focused = useFocusedSource();
  return (
    <NotesEditor
      text={notes.text}
      findTicketId={backend.findTicketId}
      ticketUrl={backend.ticketUrl}
      onChange={notes.setText}
      onCaretChange={(caret) => focused.set({ source: "notes", caret })}
      onBlur={() => focused.set((s) => (s?.source === "notes" ? null : s))}
    />
  );
};
