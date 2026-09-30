import { spawn } from "child_process";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function POST() {
  try {
    const cwd = process.cwd();
    const electronMain = path.join(cwd, "electron", "main.js");
    const localElectron = path.join(cwd, "node_modules", ".bin", "electron.cmd");

    const executable = fs.existsSync(localElectron) ? localElectron : "npx.cmd";
    const args = fs.existsSync(localElectron) ? [electronMain] : ["electron", electronMain];

    // Spawn native Electron overlay process in detached mode
    const child = spawn(executable, args, {
      cwd,
      detached: true,
      stdio: "ignore",
      shell: true,
    });

    child.unref();

    return NextResponse.json({
      success: true,
      message: "BAR StratCom Always-on-Top Tactical Overlay launched successfully.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to launch overlay process";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
