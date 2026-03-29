import asyncio
import json
import os
import subprocess
import time
from datetime import datetime, timezone

import decky

TAILSCALE_BIN = "/home/deck/bin/tailscale"
DEFAULT_POLL_INTERVAL = 30  # seconds
SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")


class Plugin:
    mesh_cache: dict = {}
    poll_task: asyncio.Task | None = None

    # ── Settings ──────────────────────────────────────────────

    def _load_settings(self) -> dict:
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_settings(self, settings: dict):
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings, f, indent=2)

    async def get_settings(self) -> dict:
        return self._load_settings()

    async def save_settings(self, settings: dict):
        self._save_settings(settings)

    # ── Tailscale Status ──────────────────────────────────────

    def _run_tailscale_status(self) -> dict:
        """Run `tailscale status --json` and return parsed JSON."""
        try:
            result = subprocess.run(
                [TAILSCALE_BIN, "status", "--json"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode != 0:
                decky.logger.error(f"tailscale status failed: {result.stderr}")
                return {"error": result.stderr.strip()}
            return json.loads(result.stdout)
        except FileNotFoundError:
            return {"error": f"tailscale binary not found at {TAILSCALE_BIN}"}
        except subprocess.TimeoutExpired:
            return {"error": "tailscale status timed out"}
        except json.JSONDecodeError as e:
            return {"error": f"JSON parse error: {e}"}

    def _ping_node(self, ip: str) -> float | None:
        """Ping a Tailscale node and return latency in ms, or None on failure."""
        try:
            result = subprocess.run(
                [TAILSCALE_BIN, "ping", "--c", "1", "--timeout", "3s", ip],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                # Output like: "pong from hostname (100.x.x.x) via DERP(iad) in 24ms"
                # or "pong from hostname (100.x.x.x) via 1.2.3.4:41641 in 4ms"
                line = result.stdout.strip().split("\n")[0]
                if " in " in line:
                    latency_str = line.split(" in ")[-1].strip()
                    # Parse "24ms" or "1.5ms"
                    return float(latency_str.replace("ms", ""))
            return None
        except (subprocess.TimeoutExpired, Exception):
            return None

    def _parse_mesh_status(self, raw: dict, ping_nodes: list[str]) -> dict:
        """Parse tailscale status JSON into our simplified format."""
        if "error" in raw:
            return {"error": raw["error"], "nodes": [], "self": None, "timestamp": time.time()}

        self_node = raw.get("Self", {})
        peers = raw.get("Peer", {})

        nodes = []
        online_count = 0

        # Add self
        self_info = {
            "hostname": self_node.get("HostName", "unknown"),
            "dns_name": self_node.get("DNSName", "").rstrip("."),
            "ip": self_node.get("TailscaleIPs", [""])[0],
            "os": self_node.get("OS", ""),
            "online": True,
            "is_self": True,
            "latency_ms": None,
            "relay": self_node.get("Relay", ""),
            "last_seen": None,
            "exit_node": self_node.get("ExitNode", False),
        }
        online_count += 1

        # Add peers
        for _key, peer in peers.items():
            ip = peer.get("TailscaleIPs", [""])[0]
            is_online = peer.get("Online", False)

            if is_online:
                online_count += 1

            # Ping if in watched list
            latency = None
            if is_online and ip in ping_nodes:
                latency = self._ping_node(ip)

            # Parse last seen
            last_seen_raw = peer.get("LastSeen", "")
            last_seen = None
            if last_seen_raw and last_seen_raw != "0001-01-01T00:00:00Z":
                try:
                    dt = datetime.fromisoformat(last_seen_raw.replace("Z", "+00:00"))
                    ago_s = (datetime.now(timezone.utc) - dt).total_seconds()
                    last_seen = self._format_ago(ago_s)
                except ValueError:
                    last_seen = last_seen_raw

            nodes.append({
                "hostname": peer.get("HostName", "unknown"),
                "dns_name": peer.get("DNSName", "").rstrip("."),
                "ip": ip,
                "os": peer.get("OS", ""),
                "online": is_online,
                "is_self": False,
                "latency_ms": latency,
                "relay": peer.get("Relay", ""),
                "last_seen": last_seen,
                "exit_node": peer.get("ExitNode", False),
            })

        # Sort: online first, then alphabetical by hostname
        nodes.sort(key=lambda n: (not n["online"], n["hostname"].lower()))

        return {
            "self": self_info,
            "nodes": nodes,
            "online_count": online_count,
            "total_count": len(nodes) + 1,  # +1 for self
            "backend_state": raw.get("BackendState", "Unknown"),
            "timestamp": time.time(),
            "error": None,
        }

    @staticmethod
    def _format_ago(seconds: float) -> str:
        """Format seconds-ago into a human readable string."""
        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            m = int(seconds / 60)
            return f"{m}m ago"
        elif seconds < 86400:
            h = int(seconds / 3600)
            return f"{h}h ago"
        else:
            d = int(seconds / 86400)
            return f"{d}d ago"

    # ── Polling ───────────────────────────────────────────────

    async def _poll_loop(self):
        """Background polling loop."""
        while True:
            try:
                settings = self._load_settings()
                interval = settings.get("poll_interval", DEFAULT_POLL_INTERVAL)
                ping_nodes = settings.get("ping_nodes", [])

                raw = self._run_tailscale_status()
                self.mesh_cache = self._parse_mesh_status(raw, ping_nodes)

                # Check for nodes that went down — emit alert
                alert_on_down = settings.get("alert_on_down", True)
                if alert_on_down and hasattr(self, "_prev_online"):
                    for node in self.mesh_cache.get("nodes", []):
                        was_online = self._prev_online.get(node["ip"], None)
                        if was_online is True and not node["online"]:
                            await decky.emit(
                                "node_down",
                                node["hostname"],
                                node["ip"],
                            )

                # Track online state for next comparison
                self._prev_online = {
                    n["ip"]: n["online"]
                    for n in self.mesh_cache.get("nodes", [])
                }

            except Exception as e:
                decky.logger.error(f"Poll error: {e}")
                self.mesh_cache = {"error": str(e), "nodes": [], "timestamp": time.time()}

            await asyncio.sleep(interval)

    # ── API Methods (called from frontend) ────────────────────

    async def get_mesh_status(self) -> dict:
        """Return cached mesh status."""
        return self.mesh_cache

    async def refresh_now(self) -> dict:
        """Force an immediate refresh and return the result."""
        settings = self._load_settings()
        ping_nodes = settings.get("ping_nodes", [])
        raw = self._run_tailscale_status()
        self.mesh_cache = self._parse_mesh_status(raw, ping_nodes)
        return self.mesh_cache

    async def ping_node(self, ip: str) -> float | None:
        """Ping a specific node on demand."""
        return self._ping_node(ip)

    # ── Lifecycle ─────────────────────────────────────────────

    async def _main(self):
        decky.logger.info("MeshWatch starting")
        self._prev_online = {}

        # Initial fetch
        settings = self._load_settings()
        ping_nodes = settings.get("ping_nodes", [])
        raw = self._run_tailscale_status()
        self.mesh_cache = self._parse_mesh_status(raw, ping_nodes)
        self._prev_online = {
            n["ip"]: n["online"]
            for n in self.mesh_cache.get("nodes", [])
        }

        # Start background polling
        self.poll_task = asyncio.create_task(self._poll_loop())

    async def _unload(self):
        decky.logger.info("MeshWatch unloading")
        if self.poll_task:
            self.poll_task.cancel()
            try:
                await self.poll_task
            except asyncio.CancelledError:
                pass
