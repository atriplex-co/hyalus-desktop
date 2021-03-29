const { app, BrowserWindow, nativeTheme } = require("electron");
const path = require("path");
const url = require("url");
const { autoUpdater } = require("electron-updater");

app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("ignore-gpu-blacklist");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-accelerated-video");
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");

//prevent scary messages from flags above.
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 1;

const openMainWindow = () => {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      experimentalFeatures: true,
    },
  });

  const entryPath = path.join(__dirname, "../build/index.html");
  const entryUrl = `${url.pathToFileURL(entryPath)}#/app`;

  win.loadURL(entryUrl);
  win.removeMenu();

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.on("before-input-event", (e, input) => {
    if (input.key === "F12") {
      win.webContents.openDevTools();
    }
  });
};

app.on("ready", () => {
  nativeTheme.themeSource = "dark";

  if (process.env.DEV) {
    openMainWindow();
    return;
  }

  autoUpdater.checkForUpdates();
});

autoUpdater.on("update-available", () => {
  autoUpdater.downloadUpdate();
});

autoUpdater.on("update-downloaded", () => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on("update-not-available", () => {
  openMainWindow();
});
