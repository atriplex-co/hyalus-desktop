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
  startWin32AudioCapture(handle) {
    ipcRenderer.on("win32AudioCaptureData", (e, val) => {
      cb(val);
    });

    ipcRenderer.send("startWin32AudioCapture", handle);
  },
  stopWin32AudioCapture: () => ipcRenderer.send("stopWin32AudioCapture"),
});

addEventListener("beforeunload", () => {
  ipcRenderer.send("stopWin32AudioCapture");
});
