// electron/main.js
const {
  app,
  BrowserWindow,
  session,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
} = require("electron");
const path = require("path");

const isDev = process.env.NODE_ENV === "development";
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

let mainWindow = null;
let tray = null;

const TRAY_EVENT = "posecare:tray-restored";

function trayIconImage() {
  const dataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5wUBFRE3C/CnJwAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAABLSURBVFjD7dSxDQAgCERRgt5/pZMGSCwIW7K0KLu5AtTrdr7ZK7xQgAAAAAAAAAAB4Gz2M3nV6nw7XKPR0O12j0dDtdo9HQ7XaPR0O12j0dDtdo9HQ7XZfAADe8ABA4WTGwAAAABJRU5ErkJggg==";
  return nativeImage.createFromDataURL(dataUrl).resize({ width: 16, height: 16 });
}

function ensureTray() {
  if (tray) return tray;
  tray = new Tray(trayIconImage());
  tray.setToolTip("PostureCare");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "열기",
      click: () => {
        showWindow();
      },
    },
    { type: "separator" },
    {
      label: "종료",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      hideWindow();
    } else {
      showWindow();
    }
  });
  return tray;
}

function hideWindow() {
  if (!mainWindow) return false;
  ensureTray();
  mainWindow.hide();
  mainWindow.setSkipTaskbar(true);
  return true;
}

function showWindow() {
  if (!mainWindow) return false;
  ensureTray();
  mainWindow.show();
  mainWindow.setSkipTaskbar(false);
  mainWindow.focus();
  if (mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send(TRAY_EVENT);
  }
  return true;
}

ipcMain.handle("app:minimize-to-tray", () => hideWindow());
ipcMain.handle("app:restore-from-tray", () => showWindow());

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // ✅ 개발용: 카메라 권한 항상 허용
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media") return callback(true);
    callback(false);
  });

  createWindow();
  ensureTray();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
