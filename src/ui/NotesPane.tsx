import { useCore } from "./useCore";

export const NotesPane = () => {
  const { notes } = useCore();
  return (
    <textarea
      value={notes.text}
      onChange={notes.onChange}
      className="h-full w-full resize-none"
      spellCheck={false}
    />
  );
};
