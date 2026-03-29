import { definePlugin } from "@decky/api";
import { FaNetworkWired } from "react-icons/fa";
import { MeshPanel } from "./components/MeshPanel";

export default definePlugin(() => {
  return {
    name: "MeshWatch",
    icon: <FaNetworkWired />,
    content: <MeshPanel />,
    onDismount() {},
  };
});
