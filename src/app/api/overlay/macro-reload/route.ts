import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "bar_macro.py");
    
    return new Promise<NextResponse>((resolve) => {
      exec(`py "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error("Macro error:", stderr || error.message);
          return resolve(
            NextResponse.json(
              { success: false, error: stderr || error.message, output: stdout },
              { status: 500 }
            )
          );
        }
        return resolve(
          NextResponse.json({
            success: true,
            message: "In-game reload macro executed successfully",
            output: stdout.trim(),
          })
        );
      });
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
