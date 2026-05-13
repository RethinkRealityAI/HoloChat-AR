import { ModelPreset } from "./types";

export const DEFAULT_MODELS: ModelPreset[] = [
  {
    name: "Robot Expressive",
    url: "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
    description: "A highly articulated robot capable of complex emotive animations.",
    avatarId: "robot"
  },
  {
    name: "Astronaut",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    description: "A standard issue space explorer suitable for extra-vehicular activity.",
    avatarId: "astronaut"
  },
  {
    name: "Cyber Drone",
    url: "https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb", // Using Neil as a placeholder for drone/suit
    description: "Advanced reconnaissance unit.",
    avatarId: "drone"
  }
];

export const UI_COLORS = {
    primary: "cyan-400",
    secondary: "fuchsia-500",
    bg: "slate-900",
    panel: "slate-800/80"
};