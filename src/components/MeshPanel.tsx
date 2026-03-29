import { FC } from "react";
import { ButtonItem, PanelSection, PanelSectionRow, Spinner } from "@decky/ui";
import { useMeshStatus } from "../hooks/useMeshStatus";
import { NodeRow } from "./NodeRow";

export const MeshPanel: FC = () => {
  const { status, loading, refresh } = useMeshStatus(10000);

  if (loading && !status) {
    return (
      <PanelSection title="MESHWATCH">
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
            <Spinner />
          </div>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  if (!status || status.error) {
    return (
      <PanelSection title="MESHWATCH">
        <PanelSectionRow>
          <div style={{ color: "#ff6b6b", fontSize: "13px", padding: "10px 0" }}>
            {status?.error ?? "Unable to reach Tailscale"}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={refresh}>
            Retry
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  const lastRefresh = status.timestamp
    ? new Date(status.timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "never";

  return (
    <PanelSection
      title={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>MESHWATCH</span>
          <span style={{ fontSize: "13px", color: "#59bf40" }}>
            {status.online_count}/{status.total_count}
          </span>
        </div>
      }
    >
      {/* Self node */}
      {status.self && (
        <PanelSectionRow>
          <NodeRow node={status.self} />
        </PanelSectionRow>
      )}

      {/* Peer nodes */}
      {status.nodes.map((node) => (
        <PanelSectionRow key={node.ip}>
          <NodeRow node={node} />
        </PanelSectionRow>
      ))}

      {/* Footer */}
      <PanelSectionRow>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11px",
            color: "#666",
            paddingTop: "8px",
          }}
        >
          <span>Last refresh: {lastRefresh}</span>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={refresh}>
          Refresh Now
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};
