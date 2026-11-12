const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const os = require("node:os");
const dns = require("node:dns");
const { Resolver } = require("node:dns").promises;
const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs");

const isDev = !app.isPackaged;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500, height: 940, minWidth: 1120, minHeight: 720,
    backgroundColor: "#090e18",
    title: "MIXO GAME",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  if (isDev) mainWindow.loadURL("http://127.0.0.1:5173");
  else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

function validHost(v) {
  return typeof v === "string" && v.length > 0 && v.length < 254 &&
    /^[a-zA-Z0-9.:-]+$/.test(v) && !v.includes("..");
}
function validIp(v) {
  return typeof v === "string" && (require("node:net").isIP(v) !== 0);
}

ipcMain.handle("dns:test", async (_event, ip, domain) => {
  if (!validIp(ip) || !validHost(domain)) return { ok:false, ms:null, answers:{}, error:"آدرس DNS یا دامنه معتبر نیست." };
  const resolver = new Resolver({ timeout: 2200, tries: 1 });
  resolver.setServers([ip]);
  const tasks = [
    ["A", () => resolver.resolve4(domain)],
    ["AAAA", () => resolver.resolve6(domain)],
    ["MX", () => resolver.resolveMx(domain)]
  ];
  const started = Date.now();
  const answers = {};
  let successful = 0;
  for (const [type, run] of tasks) {
    try {
      const value = await run();
      answers[type] = value.map((x) => typeof x === "string" ? x : (x.exchange || JSON.stringify(x)));
      successful++;
    } catch (e) {
      answers[type] = [];
      if (e.code === "ETIMEOUT" || e.code === "ECONNREFUSED" || e.code === "EAI_AGAIN") {
        // One record family can be absent while DNS itself is working.
      }
    }
  }
  const ms = Date.now() - started;
  const ok = successful > 0;
  return { ok, ms, answers, error: ok ? undefined : "پاسخی از resolver دریافت نشد." };
});

ipcMain.handle("network:ping", async (_event, host) => {
  if (!validHost(host)) return { ok:false, avgMs:null, minMs:null, maxMs:null, loss:100, raw:"مقصد معتبر نیست." };
  return new Promise((resolve) => {
    execFile("ping.exe", ["-n", "4", "-w", "1200", host], { windowsHide:true, timeout:7000 }, (error, stdout) => {
      const raw = String(stdout || "");
      const times = [...raw.matchAll(/time[=<]([0-9]+)ms/gi)].map(m => Number(m[1]));
      const lost = raw.match(/\((\d+)% loss\)/i);
      const avg = raw.match(/Average = (\d+)ms/i);
      const min = raw.match(/Minimum = (\d+)ms/i);
      const max = raw.match(/Maximum = (\d+)ms/i);
      resolve({
        ok: times.length > 0 && !error,
        avgMs: avg ? Number(avg[1]) : (times.length ? times.reduce((a,b)=>a+b,0)/times.length : null),
        minMs: min ? Number(min[1]) : (times.length ? Math.min(...times) : null),
        maxMs: max ? Number(max[1]) : (times.length ? Math.max(...times) : null),
        loss: lost ? Number(lost[1]) : Math.max(0,100-times.length*25),
        raw: raw.slice(-1200)
      });
    });
  });
});

ipcMain.handle("network:info", async () => {
  const interfaces = Object.entries(os.networkInterfaces()).flatMap(([name, records]) =>
    (records || []).filter(r => !r.internal).map(r => ({ name, address:r.address, family:r.family, internal:r.internal }))
  );
  return { hostname:os.hostname(), platform:process.platform, dns:dns.getServers(), interfaces };
});

ipcMain.handle("game:pick", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title:"انتخاب فایل اجرایی بازی",
    properties:["openFile"],
    filters:[{ name:"برنامه ویندوز", extensions:["exe"] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle("game:launch", async (_event, filePath, argsText = "") => {
  if (typeof filePath !== "string" || !path.isAbsolute(filePath) || path.extname(filePath).toLowerCase() !== ".exe") return { ok:false, error:"مسیر فایل اجرایی معتبر نیست." };
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return { ok:false, error:"فایل انتخاب‌شده معتبر نیست." };
    const args = typeof argsText === "string" ? argsText.trim().split(/\s+/).filter(Boolean).slice(0,30) : [];
    const child = spawn(filePath, args, { detached:true, stdio:"ignore", windowsHide:false, shell:false });
    child.unref();
    return { ok:true };
  } catch (e) {
    return { ok:false, error:e instanceof Error ? e.message : "اجرای بازی ناموفق بود." };
  }
});