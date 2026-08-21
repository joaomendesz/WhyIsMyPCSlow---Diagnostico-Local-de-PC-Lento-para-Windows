import { create } from "zustand";
import type { MetricsSnapshot, SystemInfo } from "../types/metrics";
import {
  getLatestMetrics,
  getSystemInfo,
  startMetricsStream,
  stopMetricsStream,
  subscribeToMetricSnapshots,
} from "../services/metrics";
import { canUseDesktopBackend } from "../services/desktop";

let activeUnlisten: (() => void) | null = null;

interface MetricsState {
  metrics: MetricsSnapshot | null;
  systemInfo: SystemInfo | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refreshOnce: () => Promise<void>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  metrics: null,
  systemInfo: null,
  isLoading: false,
  isStreaming: false,
  error: null,

  initialize: async () => {
    if (!canUseDesktopBackend()) {
      set({
        error: "Backend Electron indisponivel. Execute com npm run dev para ler metricas reais.",
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const [systemInfo, metrics] = await Promise.all([getSystemInfo(), getLatestMetrics()]);
      set({ systemInfo, metrics, isLoading: false });
      await get().startMonitoring();
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  refreshOnce: async () => {
    if (!canUseDesktopBackend()) {
      return;
    }

    try {
      const metrics = await getLatestMetrics();
      set({ metrics, error: null });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  startMonitoring: async () => {
    if (!canUseDesktopBackend() || activeUnlisten) {
      return;
    }

    try {
      activeUnlisten = await subscribeToMetricSnapshots((metrics) => {
        set({ metrics, error: null });
      });
      const status = await startMetricsStream();
      set({ isStreaming: status.isRunning, error: null });
    } catch (error) {
      if (activeUnlisten) {
        activeUnlisten();
        activeUnlisten = null;
      }
      set({ error: getErrorMessage(error), isStreaming: false });
    }
  },

  stopMonitoring: async () => {
    const unlisten = activeUnlisten;
    activeUnlisten = null;

    if (unlisten) {
      unlisten();
    }

    if (!canUseDesktopBackend()) {
      set({ isStreaming: false });
      return;
    }

    try {
      const status = await stopMetricsStream();
      set({ isStreaming: status.isRunning });
    } catch (error) {
      set({ error: getErrorMessage(error), isStreaming: false });
    }
  },
}));
