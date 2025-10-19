export {};

type TrayRestoreHandler = () => void;

interface PosecareBridge {
  minimizeToTray: () => Promise<boolean>;
  restoreFromTray?: () => Promise<boolean>;
  reportPostureEvent?: (payload: { label?: string }) => void;
  onTrayRestore?: (handler: TrayRestoreHandler) => (() => void) | void;
}

declare global {
  interface Window {
    posecare?: PosecareBridge;
  }
}
