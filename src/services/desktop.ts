export function canUseDesktopBackend(): boolean {
  return typeof window !== "undefined" && Boolean(window.whyPcSlow?.metrics);
}

export function requireDesktopBackend(): NonNullable<typeof window.whyPcSlow> {
  if (!canUseDesktopBackend() || !window.whyPcSlow) {
    throw new Error("Abra o aplicativo via Electron para ler metricas reais do Windows.");
  }

  return window.whyPcSlow;
}
