const {
  app,
  BrowserWindow,
  nativeTheme,
  Tray,
  Menu,
  ipcMain,
  shell,
} = require("electron");
const path = require("path");
const url = require("url");
const { autoUpdater } = require("electron-updater");
const { version } = require("../package");

const lock = app.requestSingleInstanceLock();

if (!lock) {
  app.quit();
}

nativeTheme.themeSource = "dark";

app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("ignore-gpu-blacklist");
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
app.commandLine.appendSwitch("enable-media-foundation-video-capture");
app.commandLine.appendSwitch("zero-copy-video-capture");
app.commandLine.appendSwitch("enable-accelerated-video-decode");
app.commandLine.appendSwitch("enable-accelerated-video-encode");

//prevent scary messages from flags above.
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 1;

let mainWindow;
let quitting;
let tray;
let startHidden;

const start = () => {
  app.setAppUserModelId("xyz.hyalus");

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      experimentalFeatures: true,
    },
    frame: false,
  });

  const entryPath = path.join(__dirname, "../build/index.html");
  const entryUrl = `${url.pathToFileURL(entryPath)}#/app`;

  mainWindow.loadURL(entryUrl);
  mainWindow.removeMenu();

  mainWindow.once("ready-to-show", () => {
    if (!startHidden) {
      mainWindow.show();
    }
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
      app.relaunch();
      app.exit();
    }
  });

  mainWindow.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on("new-window", (e, arg) => {
    e.preventDefault();
    shell.openExternal(arg);
  });

  setTimeout(() => {
    if (mainWindow) {
      mainWindow.webContents.session.flushStorageData();
    }
  }, 1000 * 5); //5s

  tray = new Tray(path.join(__dirname, "../resources/icon.png"));

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
        click() {
          app.relaunch();
          app.exit();
        },
      },
      {
        label: "Quit",
        click() {
          app.exit();
        },
      },
    ])
  );

  tray.on("click", () => {
    mainWindow.show();
  });
};

app.on("ready", () => {
  if (process.env.NODE_ENV === "development") {
    return start();
  }

  const { launchItems, wasOpenedAsHidden } = app.getLoginItemSettings();

  if (!launchItems) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      args: ["-h"],
      name: "Hyalus",
    });
  }

  if (wasOpenedAsHidden || process.argv.find((a) => a === "-h")) {
    startHidden = true;
  }

  autoUpdater.checkForUpdates();
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
  autoUpdater.quitAndInstall(true, true);
});

autoUpdater.on("update-not-available", start);

ipcMain.on("close", () => {
  mainWindow.close();
});

ipcMain.on("maximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on("minimize", () => {
  mainWindow.minimize();
});
