import { spawn } from "node:child_process";
import electronPath from "electron";
import { buildElectron } from "./build-electron.mjs";

await buildElectron();

const child = spawn(electronPath, ["dist-electron/main.cjs"], {
  env: {
    ...process.env,
    NODE_ENV: "development",
    ELECTRON_RENDERER_URL: "http://127.0.0.1:1420",
  },
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
