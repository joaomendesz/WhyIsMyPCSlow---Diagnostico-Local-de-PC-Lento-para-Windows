import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const commonOptions = {
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  minify: false,
  external: ["electron", "systeminformation"],
  logLevel: "info",
};

const projectPath = (...segments) => path.join(process.cwd(), ...segments);

export async function buildElectron() {
  await rm(projectPath("dist-electron"), { force: true, recursive: true });

  await Promise.all([
    build({
      ...commonOptions,
      entryPoints: [projectPath("src-electron", "main.ts")],
      outfile: projectPath("dist-electron", "main.cjs"),
    }),
    build({
      ...commonOptions,
      entryPoints: [projectPath("src-electron", "preload.ts")],
      outfile: projectPath("dist-electron", "preload.cjs"),
    }),
  ]);
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFile === executedFile) {
  await buildElectron();
}
