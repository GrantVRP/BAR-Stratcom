import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const BAR_CANDIDATE_DIRS = [
  "D:\\BAR\\Beyond-All-Reason\\data",
  path.join(process.env.LOCALAPPDATA || "", "Programs", "Beyond-All-Reason", "data"),
  path.join(process.env.APPDATA || "", "Beyond All Reason", "data"),
  path.join(process.env.LOCALAPPDATA || "", "Beyond-All-Reason"),
  "C:\\Games\\Beyond All Reason\\data",
];

export async function GET() {
  // 1. First attempt to fetch from local Python bridge daemon (http://127.0.0.1:5050)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 350);
    const bridgeRes = await fetch("http://127.0.0.1:5050/api/live-status", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (bridgeRes.ok) {
      const data = await bridgeRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Bridge daemon is offline or didn't answer fast enough; use native Node.js scanner fallback
  }

  // 2. Direct Node.js filesystem & process inspection (Zero dependency on Python!)
  try {
    let activeDir: string | null = null;
    let telemData: any = null;

    for (const dir of BAR_CANDIDATE_DIRS) {
      if (fs.existsSync(dir)) {
        const telemPath = path.join(dir, "bar_live_telemetry.json");
        if (fs.existsSync(telemPath)) {
          const stats = fs.statSync(telemPath);
          const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
          if (ageSeconds < 45) {
            activeDir = dir;
            try {
              const raw = fs.readFileSync(telemPath, "utf-8");
              telemData = JSON.parse(raw);
              break;
            } catch {
              // Ignore corrupt read
            }
          }
        }
        if (!activeDir) {
          activeDir = dir;
        }
      }
    }

    // Check if spring.exe is running via tasklist on Windows
    let springRunning = false;
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq spring.exe" /NH /FO CSV');
      springRunning = stdout.toLowerCase().includes("spring.exe");
    } catch {
      springRunning = telemData !== null;
    }

    if (telemData && telemData.gameTimeSeconds !== undefined) {
      // 100% ground-truth live in-game match!
      let mapName = "Battlefield";
      if (activeDir) {
        const scriptPath = path.join(activeDir, "_script.txt");
        if (fs.existsSync(scriptPath)) {
          try {
            const script = fs.readFileSync(scriptPath, "utf-8");
            const mapMatch = script.match(/mapname\s*=\s*([^;\r\n]+)/i);
            if (mapMatch) {
              mapName = mapMatch[1].trim().replace(/\s+v?\d+(\.\d+)*.*$/i, "");
            }
          } catch {}
        }
      }

      const friendlyTotal = telemData.friendlyUnits?.total ?? 1;
      const enemyTotal = telemData.enemyUnits?.total ?? 0;

      return NextResponse.json({
        isRunning: true,
        gameStatus: "IN_GAME",
        lobbyName: `Live Match [${mapName}]`,
        mapName,
        faction: telemData.faction || "Armada",
        gameTimeSeconds: telemData.gameTimeSeconds || 0,
        battleIntel: {
          friendlyUnitsCount: friendlyTotal,
          friendlyBreakdown: telemData.friendlyUnits || { raiders: 0, skirmishers: 0, assault: 0, air: 0 },
          enemyUnitsCount: enemyTotal,
          enemyBreakdown: telemData.enemyUnits || { raiders: 0, skirmishers: 0, assault: 0, air: 0 },
          teammates: telemData.teammates || [],
          enemyPush: null,
          playerName: telemData.playerName || "Grant_P",
          enemyName: "Hostile Force",
          playerMetalIncome: telemData.metal?.income ?? 2,
          playerEnergyIncome: telemData.energy?.income ?? 30,
          completedUnits: telemData.completedUnits || {},
        },
      });
    }

    if (springRunning) {
      return NextResponse.json({
        isRunning: true,
        gameStatus: "IN_LOBBY",
        lobbyName: "Chobby Active",
        mapName: "Battlefield",
        faction: "Armada",
        gameTimeSeconds: 0,
      });
    }

    return NextResponse.json({
      isRunning: false,
      gameStatus: "OFFLINE",
      lobbyName: "",
      mapName: "",
      faction: "Spectator",
      gameTimeSeconds: 0,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Scanner error";
    return NextResponse.json(
      { isRunning: false, gameStatus: "OFFLINE", error: msg },
      { status: 500 }
    );
  }
}
