import { useEffect, useState, useCallback } from "react";
import { callable } from "@decky/api";

export interface MeshWatchSettings {
  poll_interval: number;
  ping_nodes: string[];
  alert_on_down: boolean;
}

const DEFAULT_SETTINGS: MeshWatchSettings = {
  poll_interval: 30,
  ping_nodes: [],
  alert_on_down: true,
};

const getSettings = callable<[], MeshWatchSettings>("get_settings");
const saveSettingsBackend = callable<[MeshWatchSettings], void>("save_settings");

export function useSettings() {
  const [settings, setSettings] = useState<MeshWatchSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings({ ...DEFAULT_SETTINGS, ...s });
    });
  }, []);

  const save = useCallback(async (newSettings: MeshWatchSettings) => {
    setSettings(newSettings);
    await saveSettingsBackend(newSettings);
  }, []);

  return { settings, save };
}
