export {};

type TrayRestoreHandler = () => void;

interface PosecareBridge {
  minimizeToTray: () => Promise<boolean>;
  restoreFromTray?: () => Promise<boolean>;
  onTrayRestore?: (handler: TrayRestoreHandler) => (() => void) | void;
}

declare global {
  interface Window {
    posecare?: PosecareBridge;
  }
}
