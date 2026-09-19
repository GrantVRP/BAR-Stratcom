import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  return handleToggle();
}

export async function POST() {
  return handleToggle();
}

function handleToggle() {
  try {
    const candidateDirs = [
      "D:\\BAR\\Beyond-All-Reason\\data",
      path.join(process.env.APPDATA || "", "bar-stratcom-overlay"),
    ];
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        fs.writeFileSync(path.join(dir, "overlay_cmd.txt"), "toggle", "utf8");
        break;
      }
    }
    return NextResponse.json({ success: true, message: "Toggle signal dispatched." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error dispatching toggle";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
