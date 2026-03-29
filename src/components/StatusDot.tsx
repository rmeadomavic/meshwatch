import { FC } from "react";

interface StatusDotProps {
  online: boolean;
  isSelf?: boolean;
}

export const StatusDot: FC<StatusDotProps> = ({ online, isSelf }) => {
  const color = online ? "#59bf40" : "#888";
  const glow = online ? "0 0 6px #59bf4080" : "none";
  return (
    <span
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: glow,
        border: isSelf ? "1px solid #fff" : "none",
        flexShrink: 0,
      }}
    />
  );
};
