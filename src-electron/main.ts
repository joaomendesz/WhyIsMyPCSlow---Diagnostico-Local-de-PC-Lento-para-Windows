import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import type { DiagnosticSummary, StartDiagnosticRequest } from "./types";
import { DiagnosticManager } from "./diagnostics/manager";
import { IpcChannels } from "./ipc";
import { MetricsService } from "./services/metricsService";

const metricsService = new MetricsService();
const diagnosticManager = new DiagnosticManager(metricsService);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 940,
    minHeight: 620,
    title: "WhyIsMyPCSlow",
    backgroundColor: "#f6f7f9",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    metricsService.stop();
    mainWindow = null;
  });

  if (isDev()) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL ?? "http://127.0.0.1:1420");
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function registerIpcHandlers() {
  ipcMain.handle(IpcChannels.getSystemInfo, () => metricsService.getSystemInfo());
  ipcMain.handle(IpcChannels.getLatestMetrics, () => metricsService.getLatestMetrics());
  ipcMain.handle(IpcChannels.getProcesses, () => metricsService.getProcesses());
  ipcMain.handle(IpcChannels.startMetricsStream, (event) =>
    metricsService.start((snapshot) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IpcChannels.metricsSnapshot, snapshot);
      }
    }),
  );
  ipcMain.handle(IpcChannels.stopMetricsStream, () => metricsService.stop());
  ipcMain.handle(
    IpcChannels.startDiagnostic,
    async (event, request: StartDiagnosticRequest): Promise<DiagnosticSummary> => {
      const summary = await diagnosticManager.start(request, (progress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IpcChannels.diagnosticProgress, progress);
        }
      });

      if (!event.sender.isDestroyed()) {
        event.sender.send(IpcChannels.diagnosticFinished, summary);
      }

      return summary;
    },
  );
  ipcMain.handle(IpcChannels.cancelDiagnostic, () => diagnosticManager.cancel());
}

function isDev() {
  return process.env.NODE_ENV === "development";
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  metricsService.stop();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  metricsService.stop();
});
