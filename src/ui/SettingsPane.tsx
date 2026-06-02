import { type ChangeEvent, Fragment, type ReactNode, useId } from "react";
import { type ThemeMode, ThemeModeSchema } from "../core/config";
import { pluginById, plugins } from "../core/services/submitters/registry";
import { useCore } from "./useCore";

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

const THEME_LABELS: Readonly<Record<ThemeMode, string>> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const isThemeMode = (value: string): value is ThemeMode =>
  ThemeModeSchema.literals.includes(value as ThemeMode);

const renderDescription = (description: string): ReactNode => {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of description.matchAll(LINK_RE)) {
    const start = match.index;
    if (start > cursor) {
      parts.push(<Fragment key={`t-${cursor}`}>{description.slice(cursor, start)}</Fragment>);
    }
    parts.push(
      <a key={`a-${start}`} href={match[2]} target="_blank" rel="noreferrer" className="underline">
        {match[1]}
      </a>,
    );
    cursor = start + match[0].length;
  }
  if (cursor < description.length) {
    parts.push(<Fragment key={`t-${cursor}`}>{description.slice(cursor)}</Fragment>);
  }
  return parts;
};

export const SettingsPane = () => {
  const submitterLabelId = useId();
  const themeLabelId = useId();
  const { config } = useCore();
  const active = pluginById(config.snapshot.config.activePluginId);
  const stored = config.snapshot.config.pluginSettings[active.id] ?? {};
  const themeMode = config.snapshot.config.themeMode;

  const onSelectPlugin = (e: ChangeEvent<HTMLSelectElement>) => {
    config.setActivePluginId(e.currentTarget.value);
  };

  const onSelectTheme = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.currentTarget.value;
    if (isThemeMode(value)) config.setThemeMode(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2" id={submitterLabelId}>
        <span className="font-medium">Submitter:</span>
        <select
          value={active.id}
          onChange={onSelectPlugin}
          className="flex-1 rounded border border-[var(--color-border)] px-2 py-1"
          aria-labelledby={submitterLabelId}
        >
          {plugins.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </label>

      {active.settings.length > 0 && (
        <div className="flex flex-col gap-2 pl-4">
          {active.settings.map((field) => (
            <label key={field.key} className="flex flex-col gap-1">
              <span>{field.label}</span>
              <input
                type={field.secret ? "password" : "text"}
                value={stored[field.key] ?? ""}
                onChange={(e) => config.setSetting(active.id, field.key, e.currentTarget.value)}
                className="rounded border border-[var(--color-border)] px-2 py-1"
                autoComplete="off"
                spellCheck={false}
              />
              {field.description !== undefined && field.description !== "" && (
                <span className="text-[var(--color-muted)] text-xs">
                  {renderDescription(field.description)}
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2" id={themeLabelId}>
        <span className="font-medium">Theme:</span>
        <select
          value={themeMode}
          onChange={onSelectTheme}
          className="flex-1 rounded border border-[var(--color-border)] px-2 py-1"
          aria-labelledby={themeLabelId}
        >
          {ThemeModeSchema.literals.map((mode) => (
            <option key={mode} value={mode}>
              {THEME_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
