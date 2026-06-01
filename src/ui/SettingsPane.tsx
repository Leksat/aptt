import { type ChangeEvent, Fragment, type ReactNode, useId } from "react";
import { pluginById, plugins } from "../core/services/submitters/registry";
import { useCore } from "./useCore";

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

const renderDescription = (description: string): ReactNode => {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of description.matchAll(LINK_RE)) {
    const start = match.index;
    if (start > cursor) {
      parts.push(<Fragment key={`t-${cursor}`}>{description.slice(cursor, start)}</Fragment>);
    }
    parts.push(
      <a
        key={`a-${start}`}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline"
      >
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
  const { config } = useCore();
  const active = pluginById(config.snapshot.config.activePluginId);
  const stored = config.snapshot.config.pluginSettings[active.id] ?? {};

  const onSelectPlugin = (e: ChangeEvent<HTMLSelectElement>) => {
    config.setActivePluginId(e.currentTarget.value);
  };

  return (
    <aside className="flex flex-1 flex-col gap-3 border border-gray-300 p-3 text-sm">
      <label className="flex items-center gap-2" id={submitterLabelId}>
        <span className="font-medium">Submitter:</span>
        <select
          value={active.id}
          onChange={onSelectPlugin}
          className="flex-1 rounded border border-gray-300 px-2 py-1"
          aria-labelledby={submitterLabelId}
        >
          {plugins.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </label>

      {active.settings.length === 0 ? (
        <p className="text-gray-500 italic">No settings.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {active.settings.map((field) => (
            <label key={field.key} className="flex flex-col gap-1">
              <span className="text-gray-700">{field.label}</span>
              <input
                type={field.secret ? "password" : "text"}
                value={stored[field.key] ?? ""}
                onChange={(e) => config.setSetting(active.id, field.key, e.currentTarget.value)}
                className="rounded border border-gray-300 px-2 py-1"
                autoComplete="off"
                spellCheck={false}
              />
              {field.description !== undefined && field.description !== "" && (
                <span className="text-gray-500 text-xs">
                  {renderDescription(field.description)}
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </aside>
  );
};
