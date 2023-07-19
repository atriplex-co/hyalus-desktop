import { contextBridge, ipcRenderer } from "electron";
import os from "os";
import path from "path";

declare const addEventListener: (arg0: string, arg1: () => void) => void; // gets TS to shut up.

const win32: {
  startCapture(...args: unknown[]): void;
  stopCapture(...args: unknown[]): void;
  msgCapture(...args: unknown[]): void;
  startEvents(...args: unknown[]): void;
  stopEvents(...args: unknown[]): void;
} | null =
  os.platform() === "win32"
    ? require(path.join(__dirname, "../../build/addon.node"))
    : null;

let keybinds: {
  keys: string;
  cb: () => void;
}[] = [];

const resetKeybinds = () => {
  ipcRenderer.invoke("resetKeybinds");
  keybinds = [];
};

const setKeybinds = (
  _keybinds: {
    keys: string;
    cb: () => void;
  }[],
) => {
  resetKeybinds();

  ipcRenderer.invoke(
    "setKeybinds",
    _keybinds.map((keybind) => keybind.keys),
  );
  keybinds = _keybinds;
};

ipcRenderer.on("keybind", (e, keys) => {
  const keybind = keybinds.find((keybind) => keybind.keys === keys);

  if (!keybind) {
    return;
  }

  keybind.cb();
});

addEventListener("beforeunload", () => {
  win32?.stopEvents();
  win32?.stopCapture();
  resetKeybinds();
});

contextBridge.exposeInMainWorld("HyalusDesktop", {
  close: () => ipcRenderer.invoke("close"),
  maximize: () => ipcRenderer.invoke("maximize"),
  minimize: () => ipcRenderer.invoke("minimize"),
  restart: () => ipcRenderer.invoke("restart"),
  quit: () => ipcRenderer.invoke("quit"),
  getSources: () => ipcRenderer.invoke("getSources"),
  getStartupSettings: () => ipcRenderer.invoke("getStartupSettings"),
  setStartupSettings: (val: unknown) =>
    ipcRenderer.invoke("setStartupSettings", val),
  resetKeybinds,
  setKeybinds,
  osPlatform: os.platform(),
  osRelease: os.release(),
  win32,
  checkForUpdates: () => ipcRenderer.invoke("checkForUpdates"),
});
