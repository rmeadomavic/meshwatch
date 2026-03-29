import { FC } from "react";
import { StatusDot } from "./StatusDot";
import { MeshNode } from "../hooks/useMeshStatus";
import { osIcon } from "../utils/formatters";

interface NodeRowProps {
  node: MeshNode;
}

export const NodeRow: FC<NodeRowProps> = ({ node }) => {
  const rightText = node.is_self
    ? "local"
    : node.online
      ? node.latency_ms != null
        ? `${Math.round(node.latency_ms)}ms`
        : "online"
      : node.last_seen ?? "offline";

  const rightColor = node.online ? "#59bf40" : "#888";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 0",
        borderBottom: "1px solid #ffffff10",
        opacity: node.online ? 1 : 0.5,
      }}
    >
      <StatusDot online={node.online} isSelf={node.is_self} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {osIcon(node.os)} {node.hostname}
          {node.is_self && (
            <span style={{ fontSize: "11px", color: "#888", marginLeft: "6px" }}>
              (this device)
            </span>
          )}
          {node.exit_node && (
            <span style={{ fontSize: "11px", color: "#5e9eff", marginLeft: "6px" }}>
              EXIT
            </span>
          )}
        </div>
        <div style={{ fontSize: "11px", color: "#888" }}>{node.ip}</div>
      </div>
      <div
        style={{
          fontSize: "13px",
          color: rightColor,
          textAlign: "right",
          flexShrink: 0,
          minWidth: "60px",
        }}
      >
        {rightText}
      </div>
    </div>
  );
};
