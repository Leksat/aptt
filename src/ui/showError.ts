import { message } from "@tauri-apps/plugin-dialog";

export const showError = (text: string): void => {
  void message(text, { title: "aptt", kind: "error" });
};
