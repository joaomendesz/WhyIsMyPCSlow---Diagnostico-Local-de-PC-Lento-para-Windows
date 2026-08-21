import { describe, expect, it } from "vitest";
import { friendlyProcessName, normalizedProcessKey } from "./processNames";

describe("processNames", () => {
  it("maps common process names to human friendly labels", () => {
    expect(friendlyProcessName("chrome.exe")).toBe("Google Chrome");
    expect(friendlyProcessName("MsMpEng.exe")).toBe("Microsoft Defender Antivirus");
  });

  it("normalizes unknown process names without implying suspicion", () => {
    expect(normalizedProcessKey(" Some_App.EXE ")).toBe("some_app.exe");
    expect(friendlyProcessName("unknown-tool.exe")).toBe("Unknown Tool");
  });
});
