import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  DiagnosticReportFormat,
  DiagnosticSummary,
  ExportDiagnosticReportRequest,
  ExportDiagnosticReportResult,
  StartDiagnosticRequest,
} from "./types";
import { createHistoryRepository, type HistoryRepository } from "./database/historyRepository";
import { DiagnosticManager } from "./diagnostics/manager";
import { IpcChannels } from "./ipc";
import { buildDiagnosticReport } from "./reports/diagnosticReport";
import { MetricsService } from "./services/metricsService";

const metricsService = new MetricsService();
const diagnosticManager = new DiagnosticManager(metricsService);

let mainWindow: BrowserWindow | null = null;
let historyRepository: HistoryRepository | null = null;

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

      historyRepository?.saveSummary(summary);

      if (!event.sender.isDestroyed()) {
        event.sender.send(IpcChannels.diagnosticFinished, summary);
      }

      return summary;
    },
  );
  ipcMain.handle(IpcChannels.cancelDiagnostic, () => diagnosticManager.cancel());
  ipcMain.handle(IpcChannels.listHistory, () => getHistoryRepository().listSessions());
  ipcMain.handle(IpcChannels.getHistory, (_event, id: string) => {
    if (!id || typeof id !== "string") {
      return null;
    }

    return getHistoryRepository().getSession(id);
  });
  ipcMain.handle(
    IpcChannels.exportHistoryReport,
    async (_event, request: ExportDiagnosticReportRequest): Promise<ExportDiagnosticReportResult> => {
      const exportRequest = parseExportDiagnosticReportRequest(request);
      const detail = getHistoryRepository().getSession(exportRequest.id);

      if (!detail) {
        throw new Error("Diagnostico nao encontrado no historico.");
      }

      const report = buildDiagnosticReport(detail, exportRequest.format);
      const saveDialogOptions = {
        title: "Exportar relatorio de diagnostico",
        defaultPath: report.fileName,
        filters: [
          {
            name: exportRequest.format === "html" ? "Relatorio HTML" : "Relatorio Markdown",
            extensions: [report.extension],
          },
          {
            name: "Todos os arquivos",
            extensions: ["*"],
          },
        ],
      };
      const saveResult =
        mainWindow && !mainWindow.isDestroyed()
          ? await dialog.showSaveDialog(mainWindow, saveDialogOptions)
          : await dialog.showSaveDialog(saveDialogOptions);

      if (saveResult.canceled || !saveResult.filePath) {
        return {
          cancelled: true,
          filePath: null,
          format: exportRequest.format,
        };
      }

      await writeFile(saveResult.filePath, report.content, "utf8");

      return {
        cancelled: false,
        filePath: saveResult.filePath,
        format: exportRequest.format,
      };
    },
  );
  ipcMain.handle(IpcChannels.clearHistory, () => ({
    deletedCount: getHistoryRepository().clearSessions(),
  }));
}

function parseExportDiagnosticReportRequest(request: unknown): ExportDiagnosticReportRequest {
  if (!isRecord(request) || typeof request.id !== "string") {
    throw new Error("Solicitacao de exportacao invalida.");
  }

  const format = parseDiagnosticReportFormat(request.format);

  if (!format || request.id.trim().length === 0) {
    throw new Error("Solicitacao de exportacao invalida.");
  }

  return {
    id: request.id.trim(),
    format,
  };
}

function parseDiagnosticReportFormat(format: unknown): DiagnosticReportFormat | null {
  return format === "markdown" || format === "html" ? format : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getHistoryRepository(): HistoryRepository {
  if (!historyRepository) {
    throw new Error("History database is not ready.");
  }

  return historyRepository;
}

function isDev() {
  return process.env.NODE_ENV === "development";
}

app.whenReady().then(() => {
  historyRepository = createHistoryRepository(app.getPath("userData"));
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
  historyRepository?.close();
});
