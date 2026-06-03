import { EditorView } from "@codemirror/view";
import { notesDecorationsPlugin } from "./notesEditor/decorations";
import { useCodeMirror } from "./useCodeMirror";

interface Props {
  readonly text: string;
  readonly onChange: (text: string) => void;
  readonly onCaretChange: (caret: number) => void;
  readonly onBlur: () => void;
}

const editorTheme = EditorView.theme({
  ".cm-aptt-comment": { color: "var(--color-muted)" },
});

export const NotesEditor = (props: Props) => {
  const { hostRef } = useCodeMirror({
    text: props.text,
    extensions: [notesDecorationsPlugin, editorTheme],
    onChange: props.onChange,
    onCaretChange: props.onCaretChange,
    onBlur: props.onBlur,
  });
  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
};
