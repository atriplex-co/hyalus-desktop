import { contextBridge, ipcRenderer } from "electron";
import os from "os";
import path from "node:path";
import fs from "node:fs";

declare const addEventListener: (arg0: string, arg1: () => void) => void; // gets TS to shut up.

const win32: {
  startCapture(...args: unknown[]): void;
  stopCapture(...args: unknown[]): void;
  msgCapture(...args: unknown[]): void;
  startEvents(...args: unknown[]): void;
  stopEvents(...args: unknown[]): void;
} | null =
  os.platform() === "win32"
    ? require(path.join(__dirname, "../../build/platform/addon.node"))
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
  setStartupSettings: (val: unknown) => ipcRenderer.invoke("setStartupSettings", val),
  resetKeybinds,
  setKeybinds,
  osPlatform: os.platform(),
  osRelease: os.release(),
  win32,
  checkForUpdates: () => ipcRenderer.invoke("checkForUpdates"),
  getBoostrapConfig() {
    // TODO: remove @ August 2023
    try {
      if (
        os.platform() === "win32" &&
        fs.existsSync(`${process.env.APPDATA}\\hyalus_boostrap.dat`)
      ) {
        const config = fs.readFileSync(`${process.env.APPDATA}\\hyalus_boostrap.dat`).toString();
        fs.rmSync(`${process.env.APPDATA}\\hyalus_boostrap.dat`);
        return config;
      }
    } catch {
      //
    }
    return "";
  },
  setContentProtection: (val: boolean) => ipcRenderer.invoke("setContentProtection", val),
  setExperiments: (val: Record<string, string>) => ipcRenderer.invoke("setExperiments", val),
  moveTop: () => ipcRenderer.invoke("moveTop"),
  flushStorageData: () => ipcRenderer.invoke("flushStorageData"),
});
