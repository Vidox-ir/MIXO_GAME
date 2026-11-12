const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  isDesktop: true,
  testDns: (ip, domain) => ipcRenderer.invoke("dns:test", ip, domain),
  pingHost: (host) => ipcRenderer.invoke("network:ping", host),
  networkInfo: () => ipcRenderer.invoke("network:info"),
  pickExecutable: () => ipcRenderer.invoke("game:pick"),
  launchGame: (path, args) => ipcRenderer.invoke("game:launch", path, args)
});