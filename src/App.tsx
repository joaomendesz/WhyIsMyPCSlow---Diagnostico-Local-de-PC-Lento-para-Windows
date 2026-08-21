import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { MonitorPage } from "./pages/MonitorPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useMetricsStore } from "./stores/metricsStore";

export default function App() {
  const initialize = useMetricsStore((state) => state.initialize);
  const stopMonitoring = useMetricsStore((state) => state.stopMonitoring);

  useEffect(() => {
    void initialize();

    return () => {
      void stopMonitoring();
    };
  }, [initialize, stopMonitoring]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <Sidebar />
        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/monitor" element={<MonitorPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
