import { useEffect, useState, useCallback } from "react";
import { callable } from "@decky/api";

export interface MeshNode {
  hostname: string;
  dns_name: string;
  ip: string;
  os: string;
  online: boolean;
  is_self: boolean;
  latency_ms: number | null;
  relay: string;
  last_seen: string | null;
  exit_node: boolean;
}

export interface MeshStatus {
  self: MeshNode | null;
  nodes: MeshNode[];
  online_count: number;
  total_count: number;
  backend_state: string;
  timestamp: number;
  error: string | null;
}

const getMeshStatus = callable<[], MeshStatus>("get_mesh_status");
const refreshNow = callable<[], MeshStatus>("refresh_now");

export function useMeshStatus(pollIntervalMs: number = 10000) {
  const [status, setStatus] = useState<MeshStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const result = await getMeshStatus();
      setStatus(result);
    } catch (e) {
      console.error("MeshWatch: failed to get status", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await refreshNow();
      setStatus(result);
    } catch (e) {
      console.error("MeshWatch: failed to refresh", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetch, pollIntervalMs]);

  return { status, loading, refresh };
}
