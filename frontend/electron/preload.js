const { contextBridge, desktopCapturer, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("HyalusDesktop", {
  isPackaged: __isPackaged,
  close: () => ipcRenderer.send("close"),
  maximize: () => ipcRenderer.send("maximize"),
  minimize: () => ipcRenderer.send("minimize"),
  restart: () => ipcRenderer.send("restart"),
  async getSources() {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
    });

    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
    }));
  },
});
