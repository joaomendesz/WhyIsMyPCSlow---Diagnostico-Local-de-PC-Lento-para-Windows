export const DIAGNOSTIC_ENGINE_VERSION = "electron-diagnostic-engine-v1";

export const DiagnosticThresholds = {
  cpu: {
    sustainedHighPercent: 85,
    severePercent: 95,
    requiredHighSampleRatio: 0.6,
    hogAveragePercent: 30,
    hogPeakPercent: 45,
  },
  memory: {
    sustainedHighPercent: 90,
    lowAvailableBytes: 1 * 1024 ** 3,
    severeAvailableBytes: 512 * 1024 ** 2,
    requiredPressureSampleRatio: 0.5,
    hogAbsoluteBytes: 1.5 * 1024 ** 3,
    hogTotalMemoryRatio: 0.25,
  },
  storage: {
    lowFreePercent: 10,
    severeFreePercent: 5,
    lowAvailableBytes: 15 * 1024 ** 3,
    severeAvailableBytes: 5 * 1024 ** 3,
  },
} as const;
