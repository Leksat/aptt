import { type ChangeEvent, useId } from "react";
import { pluginById, plugins } from "../core/services/submitters/registry";
import { useCore } from "./useCore";

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
            </label>
          ))}
        </div>
      )}
    </aside>
  );
};
