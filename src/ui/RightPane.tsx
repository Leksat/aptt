import { HistoryPane } from "./HistoryPane";
import { NotesPane } from "./NotesPane";
import { SettingsPane } from "./SettingsPane";

export const RIGHT_TABS = ["Notes", "History", "Settings"] as const;
export type RightTab = (typeof RIGHT_TABS)[number];

interface Props {
  readonly active: RightTab;
  readonly onSelect: (tab: RightTab) => void;
}

export const RightPane = ({ active, onSelect }: Props) => {
  return (
    <aside className="flex flex-1 flex-col">
      <div className="flex border-[var(--color-border)] border-b">
        {RIGHT_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onSelect(tab)}
            className={tabClass(tab === active)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto py-3">
        {active === "Notes" && <NotesPane />}
        {active === "History" && <HistoryPane />}
        {active === "Settings" && <SettingsPane />}
      </div>
    </aside>
  );
};

const tabClass = (isActive: boolean): string =>
  isActive
    ? "border-[var(--color-text)] border-b-2 px-3 pb-2 font-medium"
    : "border-transparent border-b-2 px-3 pb-2 text-[var(--color-muted)]";
