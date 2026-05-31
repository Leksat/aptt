import { useEntries } from "./useEntries";
import { useTrayTitle } from "./useTrayTitle";

export default function App() {
  const { text, onChange } = useEntries();
  useTrayTitle(text);

  if (text === null) {
    return <main className="p-4">Loading…</main>;
  }

  return (
    <main className="h-screen p-4">
      <textarea
        value={text}
        onChange={onChange}
        className="h-full w-full resize-none border border-gray-300 p-2 font-mono"
        spellCheck={false}
      />
    </main>
  );
}
