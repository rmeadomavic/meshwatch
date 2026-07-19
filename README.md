# MeshWatch

MeshWatch shows Tailscale mesh status in the Steam Deck Quick Access Menu.

## Features

- Shows Tailscale peers as online or offline.
- Shows when an offline peer was last seen.
- Collects Tailscale relay metadata for distinguishing direct and relayed connections.
- Measures latency for user-configured ping nodes.
- Supports manual refresh and periodically polls for updated status.

## Status

MeshWatch is currently v0 software. The backend emits `node_down` events, but the frontend does not yet provide notification UI or subscribe to those events. Settings persistence and hooks exist, but no settings screen is currently wired into the plugin UI; consequently, ping nodes, polling interval, and node-down alert preferences cannot yet be configured through the Quick Access Menu. Direct-versus-relay metadata is collected by the backend but is not currently displayed in node rows. The default ping-node list is empty, so latency is not shown until `ping_nodes` is configured in the plugin settings file.

## Requirements

- Decky Loader
- Tailscale installed and authenticated on the Steam Deck. MeshWatch first expects the CLI at `/home/deck/bin/tailscale`, then falls back to a `tailscale` executable available on `PATH`.

## Manual installation

1. Copy the plugin directory to `~/homebrew/plugins/MeshWatch`.
2. Restart Decky Loader.
3. Open the Quick Access Menu and select MeshWatch.

## Build from source

```sh
pnpm install
pnpm build
```

## License

MeshWatch is licensed under the MIT License. See [LICENSE](LICENSE).
