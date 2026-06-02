import { useState } from "react";
import { NotesPane } from "./NotesPane";
import { SettingsPane } from "./SettingsPane";

const TABS = ["Notes", "Settings"] as const;
type Tab = (typeof TABS)[number];

export const RightPane = () => {
  const [active, setActive] = useState<Tab>("Notes");

  return (
    <aside className="flex flex-1 flex-col">
      <div className="flex border-[var(--color-border)] border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={tabClass(tab === active)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto py-3">
        {active === "Notes" && <NotesPane />}
        {active === "Settings" && <SettingsPane />}
      </div>
    </aside>
  );
};

const tabClass = (isActive: boolean): string =>
  isActive
    ? "border-[var(--color-text)] border-b-2 px-3 pb-2 font-medium"
    : "border-transparent border-b-2 px-3 pb-2 text-[var(--color-muted)]";
