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
const os = require("os");
const crypto = require("crypto");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const { version } = require("../package.json");

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

if (!app.isPackaged) {
  app.commandLine.appendSwitch("ignore-certificate-errors", "true");
}

nativeTheme.themeSource = "dark";

let mainWindow;
let quitting;
let started;

const generatePreload = () => {
  const file = path.join(
    os.tmpdir(),
    `${crypto.randomBytes(16).toString("hex")}.js`
  );

  fs.writeFileSync(
    file,
    fs
      .readFileSync(path.join(__dirname, "preload.js"))
      .toString()
      .replace("__isPackaged", app.isPackaged)
  );

  return file;
};

const start = () => {
  if (started) {
    return;
  }

  started = true;

  app.setAppUserModelId("app.hyalus");

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    webPreferences: {
      preload: generatePreload(),
    },
  });

  if (app.isPackaged) {
    const entryPath = path.join(__dirname, "../dist/index.html");
    const entryUrl = `${url.pathToFileURL(entryPath)}#/app`;

    mainWindow.loadURL(entryUrl);
  } else {
    mainWindow.loadURL("https://localhost:3000#/app");
  }

  mainWindow.removeMenu();

  mainWindow.once("ready-to-show", () => {
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
          app.quit();
        },
      },
    ])
  );

  tray.on("click", () => {
    mainWindow.show();
  });
};

const restart = () => {
  app.releaseSingleInstanceLock();
  app.relaunch();
  app.quit();
};

app.on("ready", () => {
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

ipcMain.on("restart", restart);
