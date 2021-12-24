const { contextBridge, ipcRenderer } = require("electron");
const os = require("os");

contextBridge.exposeInMainWorld("HyalusDesktop", {
  close: () => ipcRenderer.invoke("close"),
  maximize: () => ipcRenderer.invoke("maximize"),
  minimize: () => ipcRenderer.invoke("minimize"),
  restart: () => ipcRenderer.invoke("restart"),
  quit: () => ipcRenderer.invoke("quit"),
  getSources: () => ipcRenderer.invoke("getSources"),
  osPlatform: os.platform(),
  osRelease: os.release(),
  startWin32AudioCapture(handle, cb) {
    ipcRenderer.on("win32AudioCaptureData", (e, val) => {
      cb(val);
    });

    ipcRenderer.send("startWin32AudioCapture", handle);
  },
  stopWin32AudioCapture: () => ipcRenderer.send("stopWin32AudioCapture"),
  getOpenAtLogin: () => ipcRenderer.invoke("getOpenAtLogin"),
  getOpenAsHidden: () => ipcRenderer.invoke("getOpenAsHidden"),
  setOpenAtLogin: (val) => ipcRenderer.invoke("setOpenAtLogin", val),
  setOpenAsHidden: (val) => ipcRenderer.invoke("setOpenAsHidden", val),
});

addEventListener("beforeunload", () => {
  ipcRenderer.send("stopWin32AudioCapture");
});
