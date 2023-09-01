require("v8-compile-cache");

import {
  app,
  BrowserWindow,
  nativeTheme,
  Tray,
  Menu,
  ipcMain,
  shell,
  desktopCapturer,
  globalShortcut,
  nativeImage,
} from "electron";
import path from "path";
import os from "os";
import { autoUpdater } from "electron-updater";
import fs from "fs";
import contextMenu from "electron-context-menu";
import Registry from "winreg";

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let baseUrl = "";
let appId = "";
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json")).toString());

if (pkg.name === "Hyalus") {
  baseUrl = "http://hyalus.app";
  appId = "app.hyalus";
}

if (pkg.name === "HyalusStaging") {
  baseUrl = "https://staging.atriplex.co";
  appId = "app.hyalus.dev";
}

app.setAppUserModelId(appId);

app.commandLine.appendSwitch(
  "disable-features",
  [
    // disabled features list:
    "HardwareMediaKeyHandling",
    "MediaCapabilitiesQueryGpuFactories",
  ].join(","),
);
app.commandLine.appendSwitch(
  "enable-features",
  [
    // enabled features list:
    "TurnOffStreamingMediaCachingOnBattery",
    "MediaFoundationD3D11VideoCapture",
    "MediaFoundationD3D11VideoCaptureZeroCopy",
    "PlatformHEVCDecoderSupport",
    "PlatformHEVCEncoderSupport",
  ].join(","),
);
app.commandLine.appendSwitch("video-capture-use-gpu-memory-buffer");
nativeTheme.themeSource = "dark";
Menu.setApplicationMenu(null);

if (!app.requestSingleInstanceLock() && !process.argv.includes("--dupe")) {
  app.exit();
}

const updatePromise = new Promise((resolve) => {
  if (process.argv.includes("--updated")) {
    resolve(0);
  }

  autoUpdater.on("update-not-available", () => resolve(0));
  autoUpdater.on("update-downloaded", () => autoUpdater.quitAndInstall());
  autoUpdater.on("error", () => resolve(0));
  autoUpdater.checkForUpdates();
});

contextMenu({
  showSaveImage: true,
  showSaveImageAs: true,
  showCopyImageAddress: true,
});

const getStartupSettings = async () => {
  const settings = app.getLoginItemSettings();

  let enabled = settings.openAtLogin;
  let minimized = settings.openAsHidden;

  if (os.platform() === "win32") {
    enabled = !!settings.launchItems[0]?.enabled;

    const reg = new Registry({
      hive: Registry.HKCU,
      key: "\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    });

    await new Promise((resolve) => {
      reg.get(appId, (err, v) => {
        if (err) {
          minimized = false;
        } else {
          minimized = v.value.includes("--minimized");
        }

        resolve(0);
      });
    });
  }

  return {
    enabled,
    minimized,
  };
};

const setStartupSettings = async (opts: { enabled: boolean; minimized: boolean }) => {
  app.setLoginItemSettings({
    openAtLogin: os.platform() === "win32" ? true : opts.enabled,
    openAsHidden: opts.minimized,
    enabled: opts.enabled,
  });

  if (os.platform() === "win32") {
    const reg = new Registry({
      hive: Registry.HKCU,
      key: "\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    });

    await new Promise((resolve) => {
      reg.set(
        appId,
        Registry.REG_SZ,
        `"${process.execPath}"${opts.minimized ? " --minimized" : ""}`,
        resolve,
      );
    });
  }
};

const exit = () => {
  if (tray) {
    tray.destroy();
  }

  if (mainWindow) {
    //mainWindow.webContents.forcefullyCrashRenderer();
    mainWindow.destroy();
  }

  app.exit();
};

const restart = () => {
  app.relaunch(
    mainWindow
      ? {
          args: [`--resume=${mainWindow.webContents.getURL()}`],
        }
      : {},
  );

  exit();
};

const saveState = async () => {
  if (!mainWindow) {
    return;
  }

  let state: Record<string, unknown> = {};

  try {
    state = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "state.json")) + "");
  } catch {
    //
  }

  state.maximized = mainWindow.isMaximized();

  if (!state.maximized) {
    const bounds = mainWindow.getBounds();
    state.x = bounds.x;
    state.y = bounds.y;
    state.width = bounds.width;
    state.height = bounds.height;
  }

  fs.writeFileSync(path.join(app.getPath("userData"), "state.json"), JSON.stringify(state));
};

app.on("ready", async () => {
  let trayIcon = path.join(__dirname, "../../build/resources/icon.png");
  if (os.platform() === "darwin") {
    trayIcon = path.join(__dirname, "../../build/resources/trayTemplate.png"); // use template icon for macOS
  }
  tray = new Tray(nativeImage.createFromPath(trayIcon));

  tray.setToolTip(`${app.getName()} ${app.getVersion()}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open",
        click() {
          if (mainWindow) {
            mainWindow.show();
          }
        },
      },
      {
        label: "Restart",
        click: restart,
      },
      {
        label: "Quit",
        click() {
          exit();
        },
      },
    ]),
  );

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  const initPath = path.join(app.getPath("userData"), "init2");
  if (!fs.existsSync(initPath)) {
    fs.writeFileSync(initPath, ""); // so this only runs on the first start.

    try {
      await setStartupSettings({
        enabled: true,
        minimized: true,
      });
    } catch {
      //
    }
  }

  let maximized = false;
  const mainWindowOpts: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false,
      sandbox: false, // we know what we're doing, it's fine.
    },
    show: false,
    backgroundColor: "#121212",
  };

  try {
    const state: {
      x: number;
      y: number;
      width: number;
      height: number;
      maximized: boolean;
    } = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "state.json")) + "");

    mainWindowOpts.x = state.x;
    mainWindowOpts.y = state.y;
    mainWindowOpts.width = state.width;
    mainWindowOpts.height = state.height;
    maximized = state.maximized;
  } catch {
    //
  }

  mainWindow = new BrowserWindow(mainWindowOpts);

  let saveStateTimeout = 0;

  mainWindow.on("resize", () => {
    clearInterval(saveStateTimeout);
    saveStateTimeout = +setTimeout(saveState, 1000); // prevent tons of FS writes.
  });

  mainWindow.on("maximize", () => {
    saveState();
  });

  mainWindow.on("unmaximize", () => {
    saveState();
  });

  mainWindow.on("close", (e) => {
    e.preventDefault();
    saveState();

    if (mainWindow) {
      mainWindow.hide();
    }
  });

  mainWindow.on("ready-to-show", () => {
    if (mainWindow && !maximized) {
      mainWindow.show();
    }

    if (mainWindow && maximized) {
      mainWindow.maximize();
    }
  });

  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.type === "keyDown" && input.key === "F12" && mainWindow) {
      mainWindow.webContents.openDevTools();
    }

    if (input.type === "keyDown" && input.key === "F5" && mainWindow) {
      mainWindow.reload();
    }

    if (input.type === "keyDown" && input.key === "F6") {
      restart();
    }

    if (input.type === "keyDown" && input.key === "F3" && input.alt) {
      new BrowserWindow().loadURL("chrome://webrtc-internals");
    }
  });

  mainWindow.webContents.on("did-fail-load", () => {
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, "../../public/error.html"));
    }
  });

  mainWindow.webContents.on("render-process-gone", (e, details) => {
    if (details.reason === "crashed" && mainWindow) {
      mainWindow.reload();
    }
  });

  if (app.getLoginItemSettings().wasOpenedAsHidden || process.argv.includes("--minimized")) {
    mainWindow.hide();
  }

  const resumeArg = process.argv.find((arg) => arg.startsWith("--resume="));

  if (resumeArg && resumeArg.startsWith(baseUrl)) {
    mainWindow.loadURL(resumeArg.split("--resume=")[1]);
  } else {
    mainWindow.loadURL(`${baseUrl}/app`);
  }
});

app.on("second-instance", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on("web-contents-created", (e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);

    return {
      action: "deny",
    };
  });

  contents.on("will-navigate", (e, url) => {
    const parsedURL = new URL(url);

    if (parsedURL.origin !== baseUrl && pkg.name === "Hyalus") {
      e.preventDefault();
    }
  });
});

ipcMain.handle("close", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle("maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle("restart", () => {
  restart();
});

ipcMain.handle("quit", () => {
  exit();
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

ipcMain.handle("getStartupSettings", async () => {
  return await getStartupSettings();
});

ipcMain.handle("setStartupSettings", async (e, val) => {
  await setStartupSettings(val);
});

ipcMain.handle("resetKeybinds", () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle("setKeybinds", (e, val) => {
  globalShortcut.unregisterAll();

  for (const keys of val) {
    globalShortcut.register(keys, () => {
      e.sender.send("keybind", keys);
    });
  }
});

ipcMain.handle("checkForUpdates", async () => {
  await updatePromise;
});

ipcMain.handle("setContentProtection", (e, val: boolean) => {
  if (!mainWindow) {
    return;
  }

  mainWindow.setContentProtection(val);
});
