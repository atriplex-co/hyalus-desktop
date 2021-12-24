const {
  app,
  BrowserWindow,
  nativeTheme,
  Tray,
  Menu,
  ipcMain,
  shell,
  desktopCapturer,
} = require("electron");
const path = require("path");
const os = require("os");
const { autoUpdater } = require("electron-updater");
const { version } = require("../package.json");
const fs = require("fs");

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

nativeTheme.themeSource = "dark";

let mainWindow;
let quitting;
let started;
let win32AudioCapturer;

const start = () => {
  if (started) {
    return;
  }

  started = true;

  app.setAppUserModelId("app.hyalus");

  const initPath = path.join(app.getPath("userData"), "init");
  if (!fs.existsSync(initPath)) {
    fs.writeFileSync(initPath, ""); // so this only runs on the first start.

    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true,
      });
    } catch {
      //
    }
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    autoHideMenuBar: true,
    ...(["win32", "darwin"].indexOf(os.platform())
      ? {
          titleBarStyle: "hidden",
        }
      : {
          frame: false,
        }),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (app.isPackaged) {
    mainWindow.loadURL("https://hyalus.app/app");
  } else {
    mainWindow.loadURL("http://localhost:3000/app");
  }

  mainWindow.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") {
      return;
    }

    if (input.key === "F12") {
      mainWindow.webContents.openDevTools();
    }

    if (input.key === "F5") {
      mainWindow.reload();
    }

    if (input.key === "F6") {
      quitting = true;
      app.relaunch();
      app.quit();
    }
  });

  mainWindow.webContents.on("did-fail-load", () => {
    mainWindow.loadFile(path.join(__dirname, "error.html"));
  });

  mainWindow.removeMenu();
};

const restart = () => {
  quitting = true;
  app.releaseSingleInstanceLock();
  app.relaunch();
  app.quit();
};

const stopWin32AudioCapture = () => {
  if (!win32AudioCapturer) {
    return;
  }

  win32AudioCapturer.stop();
  win32AudioCapturer = null;

  for (const k of Object.keys(require.cache)) {
    if (k.includes("@hyalusapp/win32-audio")) {
      delete require.cache[k];
    }
  }
};

app.on("ready", () => {
  const tray = new Tray(path.join(__dirname, "../build/icon.png"));

  tray.setToolTip(`Hyalus ${version}`);

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open",
        click() {
          mainWindow.show();
        },
      },
      {
        label: "Restart",
        click: restart,
      },
      {
        label: "Quit",
        click() {
          quitting = true;
          app.quit();
        },
      },
    ])
  );

  tray.on("click", () => {
    mainWindow.show();
  });

  if (!app.isPackaged) {
    return start();
  }

  autoUpdater.checkForUpdates();

  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 1000 * 60 * 10);
});

app.on("second-instance", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on("web-contents-created", (e, webContents) => {
  webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
  });
});

autoUpdater.on("update-downloaded", () => {
  if (!started) {
    autoUpdater.quitAndInstall(true, true);
  } else {
    //TODO: notify renderer process via IPC of update.
  }
});

autoUpdater.on("update-not-available", start);

autoUpdater.on("error", start);

ipcMain.handle("close", () => {
  mainWindow.close();
});

ipcMain.handle("maximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle("minimize", () => {
  mainWindow.minimize();
});

ipcMain.handle("restart", () => {
  restart();
});

ipcMain.handle("quit", () => {
  quitting = true;
  app.quit();
});

ipcMain.handle("getSources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
  });

  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
  }));
});

ipcMain.on("startWin32AudioCapture", (e, handle) => {
  stopWin32AudioCapture();

  win32AudioCapturer = require("@hyalusapp/win32-audio");
  win32AudioCapturer.start(handle, (val) => {
    e.reply("win32AudioCaptureData", val);
  });
});

ipcMain.on("stopWin32AudioCapture", () => {
  stopWin32AudioCapture();
});

ipcMain.handle("getOpenAtLogin", () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle("setOpenAtLogin", (e, val) => {
  app.setLoginItemSettings({
    openAtLogin: val,
  });
});

ipcMain.handle("getWasOpenedAtLogin", () => {
  return app.getLoginItemSettings().wasOpenedAtLogin;
});
