import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BAR_DATA_PATHS = [
  String.raw`D:\BAR\Beyond-All-Reason\data`,
  path.join(process.env.LOCALAPPDATA || "", "Programs", "Beyond-All-Reason", "data"),
  path.join(process.env.APPDATA || "", "Beyond All Reason", "data"),
  path.join(process.cwd(), "public"),
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { strategyTitle, faction, steps } = body;

    const payload = {
      strategyTitle: strategyTitle || "Custom Strategy",
      faction: faction || "Armada",
      timestamp: Date.now(),
      steps: Array.isArray(steps) ? steps : [],
    };

    const jsonContent = JSON.stringify(payload, null, 2);
    const writtenTo: string[] = [];

    for (const dir of BAR_DATA_PATHS) {
      try {
        if (fs.existsSync(dir)) {
          const targetFile = path.join(dir, "bar_active_build_order.json");
          fs.writeFileSync(targetFile, jsonContent, "utf-8");
          writtenTo.push(targetFile);
        }
      } catch (err) {
        console.warn(`Could not write build order to ${dir}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      writtenTo,
      stepCount: payload.steps.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  for (const dir of BAR_DATA_PATHS) {
    const targetFile = path.join(dir, "bar_active_build_order.json");
    if (fs.existsSync(targetFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(targetFile, "utf-8"));
        return NextResponse.json({ success: true, file: targetFile, data });
      } catch {}
    }
  }
  return NextResponse.json({ success: false, message: "No active build order file found" });
}
