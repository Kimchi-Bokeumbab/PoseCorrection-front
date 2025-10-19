// electron/main.js
const {
  app,
  BrowserWindow,
  session,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  Notification,
} = require("electron");
const path = require("path");

const isDev = process.env.NODE_ENV === "development";
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

let mainWindow = null;
let tray = null;
let hiddenToTray = false;

let badPostureSince = null;
let lastNotificationAt = 0;
let activeNotification = null;

const GOOD_LABEL_KEYS = new Set(["good_posture", "정상", "normal"]);

function normalizeLabel(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function closeActiveNotification() {
  if (activeNotification) {
    try {
      activeNotification.close();
    } catch (error) {
      console.warn("Failed to close notification", error);
    }
    activeNotification = null;
  }
}

function resetPostureTracking() {
  badPostureSince = null;
}

function handlePostureEvent(payload = {}) {
  if (!hiddenToTray) {
    resetPostureTracking();
    return;
  }

  const normalized = normalizeLabel(payload.label);
  const isGood = GOOD_LABEL_KEYS.has(normalized);

  if (isGood) {
    closeActiveNotification();
    resetPostureTracking();
    return;
  }

  const now = Date.now();
  if (badPostureSince === null) {
    badPostureSince = now;
    return;
  }

  const duration = now - badPostureSince;
  if (duration < 3000) return;

  const THROTTLE_MS = 60 * 1000;
  if (now - lastNotificationAt < THROTTLE_MS) return;

  lastNotificationAt = now;

  if (Notification.isSupported()) {
    closeActiveNotification();
    const notification = new Notification({
      title: "자세 주의",
      body: "나쁜 자세가 3초 이상 지속되고 있어요. 자세를 바로 잡아주세요!",
      silent: false,
    });
    notification.on("close", () => {
      if (activeNotification === notification) {
        activeNotification = null;
      }
    });
    notification.on("click", () => {
      if (activeNotification === notification) {
        activeNotification = null;
      }
    });
    activeNotification = notification;
    notification.show();
  }
}

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
  hiddenToTray = true;
  resetPostureTracking();
  lastNotificationAt = 0;
  closeActiveNotification();
  return true;
}

function showWindow() {
  if (!mainWindow) return false;
  ensureTray();
  mainWindow.show();
  mainWindow.setSkipTaskbar(false);
  hiddenToTray = false;
  resetPostureTracking();
  lastNotificationAt = 0;
  closeActiveNotification();
  mainWindow.focus();
  if (mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send(TRAY_EVENT);
  }
  return true;
}

ipcMain.handle("app:minimize-to-tray", () => hideWindow());
ipcMain.handle("app:restore-from-tray", () => showWindow());
ipcMain.on("posecare:posture-event", (_event, payload) => {
  try {
    handlePostureEvent(payload || {});
  } catch (error) {
    console.error("Failed to process posture event", error);
  }
});

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
