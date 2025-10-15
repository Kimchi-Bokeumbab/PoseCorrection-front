const { contextBridge, ipcRenderer } = require("electron");

const api = {
  minimizeToTray: () => ipcRenderer.invoke("app:minimize-to-tray"),
  restoreFromTray: () => ipcRenderer.invoke("app:restore-from-tray"),
  onTrayRestore: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = () => callback();
    ipcRenderer.on("posecare:tray-restored", listener);
    return () => {
      ipcRenderer.removeListener("posecare:tray-restored", listener);
    };
  },
};

contextBridge.exposeInMainWorld("posecare", api);
