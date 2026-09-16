# Beyond All Reason (BAR) StratCom // Tactical Advisory & RTS Economic Engine

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-13.x-f08?style=flat-square&logo=framer)](https://www.framer.com/motion/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

A high-performance real-time tactical decision support system and economic runway simulation engine for the open-source RTS **[Beyond All Reason (BAR)](https://www.beyondallreason.info/)**.

The platform combines competitive meta heuristics, continuous physics-driven telemetry, algorithmic Catmull-Rom spline resource modeling, and schema-constrained LLM generation to synthesize tournament-viable opening build orders and expansion strategies.

---

## System Architecture

```
                                  [ Windows Host OS ]
                       ┌──────────────────────────────────────┐
                       │  spring.exe / Beyond-All-Reason.exe  │
                       │  _script.txt / infolog.txt           │
                       └──────────────────┬───────────────────┘
                                          │ Memory handles / File inspection
                       ┌──────────────────▼───────────────────┐
                       │   Python Telemetry Bridge Daemon     │
                       │   (scripts/bar_live_bridge.py)       │
                       │   FastAPI + Uvicorn + psutil on :5050│
                       └──────────────────┬───────────────────┘
                                          │ GET /api/live-status (CORS)
                                          │ (Silent 2s Polling)
┌─────────────────────────────────────────▼────────────────────────────────────────┐
│                      BAR StratCom Tactical Console                               │
├─────────────────────────────────┬────────────────────────────────────────────────┤
│  ┌───────────────────────────┐  │  ┌──────────────────────────┐                  │
│  │     useLiveGame Hook      │  │  │   MapCombobox & Database │                  │
│  │   (Memory Link Badge)     ├──┼──►   (Tactical Carbon)      │                  │
│  └───────────────────────────┘  │  └────────────┬─────────────┘                  │
│                                 │               │                                │
│  ┌───────────────────────────┐  │  ┌────────────▼─────────────┐                  │
│  │  Resource Economy Runway  │  │  │ Atmospheric Wind Turbine │                  │
│  │  Catmull-Rom Bezier 300s  │  │  │ useAnimationFrame Loop  │                  │
│  └──────────────┬────────────┘  │  └────────────┬─────────────┘                  │
└─────────────────┼───────────────┴───────────────┼────────────────────────────────┘
                  │                               │
   ┌──────────────▼───────────────────────────────▼──────────────┐
   │          Schema-Constrained LLM Streaming Pipeline          │
   │     Vercel AI SDK streamObject + Zod Schema Validation      │
   │    Google Gemini 1.5 Pro with Few-Shot Meta Grounding       │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                  ┌───────────────▼───────────────┐
                  │  Competitive Knowledge Store  │
                  │  Scraped High-ELO Transcripts │
                  │  Tournament Map Strategy Data │
                  └───────────────────────────────┘
```

---

## Core Engineering Features

### 1. Algorithmic Resource Runway Simulation (`ResourceGraph.tsx`)
- **Discrete Economic Modeling**: Simulates net metal ($+M/\text{s}$) and energy ($+E/\text{s}$) deltas across the critical opening window ($t = 0$ to $300\text{s}$) by evaluating commander build power, structure construction timings, and unit queues.
- **Catmull-Rom to Cubic Bezier Conversion**: Implements smooth $C^1$-continuous cubic spline interpolation across discrete sample intervals:
  $$\mathbf{CP}_1 = \mathbf{P}_1 + \frac{\mathbf{P}_2 - \mathbf{P}_0}{6}, \quad \mathbf{CP}_2 = \mathbf{P}_2 - \frac{\mathbf{P}_3 - \mathbf{P}_1}{6}$$
- **Stall Hazard Detection**: Analyzes power consumption thresholds to visually highlight grid deficit windows and alert players before queuing energy-intensive factories.
- **Interactive Scrubber**: Synchronized SVG hairline tracker exposing instantaneous resource output, storage thresholds, and peak telemetry at cursor position.

### 2. Physics-Driven Telemetry Engine (`WindmillTelemetry.tsx`)
- **Continuous Frame Loop**: Utilizes Framer Motion's `useAnimationFrame` and `useMotionValue` to calculate angular velocity frame-by-frame:
  $$\Delta \theta = \frac{\omega(v_{\text{wind}}) \cdot \Delta t}{1000} \pmod{360^{\circ}}$$
- **Zero Phase Discontinuity**: Preserves angular momentum across map switching; changing wind velocity smoothly scales rotation speed without visual hitching or keyframe resets.
- **Competitive Threshold Evaluation**: Evaluates live velocity against authentic Beyond All Reason meta heuristics:
  - $v \ge 8.5\text{ m/s}$: `"WIND HIGHLY VIABLE"` (Cyan status, high-efficiency turbine priority)
  - $v < 5.0\text{ m/s}$: `"SOLAR ONLY (STALL RISK)"` (Rose status, fixed solar priority)
  - $5.0 \le v < 8.5\text{ m/s}$: `"MARGINAL VARIANCE"` (Amber status, mixed power grid)

### 3. Schema-Constrained LLM Generation (`api/generate-build`)
- **Type-Safe Structured Streaming**: Leverages `streamObject` from the Vercel AI SDK paired with `zod` schemas (`buildPlanResponseSchema`) to ensure the model outputs valid JSON conforming strictly to the frontend's timeline parser.
- **Few-Shot Domain Grounding**: Integrates scraped competitive tournament transcripts directly into the prompt context to produce authentic tournament caster commentary and high-ELO timing analysis.
- **Meta Rule Enforcement**: Strictly grounds the AI in fundamental RTS principles:
  - Enforces minimum $+60\text{ E}$ grid capacity before factory placement.
  - Maintains the $100\text{ E} : 10\text{ M}$ golden macroeconomic ratio.
  - Generates commander reclaim queues (rock clusters, obsolete early solars).

### 4. Custom Procedural RTS Iconography (`BarIcon.tsx`)
- **Vector-Rendered Asset Pipeline**: Hand-crafted, responsive SVG representations of key BAR structures (Bot Labs, Vehicle Plants, Aircraft Plants, Shipyards, Solars, Wind Turbines, Fusion Reactors, Storages).
- **Faction Shader Adaptation**: Dynamic theme synchronization applying faction-authentic color calibration:
  - **Armada**: Electric Blue (`#48a2ef`) with cyan/ambient wing luminescence.
  - **Cortex**: Industrial Crimson (`#ff2a2a`) with angular thermal accents.
  - **Universal Metal**: Slate-silver (`#94a3b8`) for standardized resource visualization.

### 5. Searchable Map Strategy System (`MapCombobox.tsx`, `map-data.ts`)
- **Competitive Map Database**: Deep strategic schemas for premier tournament maps (*Supreme Isthmus*, *Glitter*, *Comet Catcher Redux*, *Eight Horses*, *All Metal / Speed Metal*) defining dimensions, wind velocity bands, oceanic tidal yield, metal density, tactical briefings, and choke points.
- **Tactical Carbon Combobox**: Live search filtering across name, dimensions, metal density, and choke point names with complete keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`) and ARIA combobox accessibility.
- **Dedicated Sector Briefing Stage**: Visualizes the strategic battlefield context with telemetry cards, tactical military briefing narrative, choke point defense grids, and faction-aligned doctrine recommendations (`OPTIMAL FIT`).

### 6. Local Process Memory & Telemetry Bridge (`bar_live_bridge.py`, `useLiveGame.ts`)

#### Architecture & Key Decisions
- **Hybrid Memory and Log Tailing**: Reading raw byte offsets from dynamic game memory (`ReadProcessMemory`) can crash or break between game engine patches. Combining Windows process handle verification with active `_script.txt` and `infolog.txt` parsing delivers rock-solid lobby and map detection without memory offset instability.
- **Decoupled IPC Daemon**: The Python FastAPI daemon runs locally on port 5050 with permissive localhost CORS. This bypasses browser sandboxing while ensuring the Next.js web application continues to work as a standalone theorycrafting tool even if the Python script is not running.
- **State-Driven UI Sync**: Selecting a map manually or receiving a map update via the live bridge triggers identical state handlers, keeping the `WindmillTelemetry` widget and Gemini API payload synchronized at all times.
- **Silent React Polling**: Frontend hook polls `/api/live-status` every 2000ms with timeout abort controllers and silent error handling, guaranteeing zero unhandled console spam or network churn when the game or daemon is offline.

---

## Project Structure

```
Theory-App/
├── data/
│   └── transcripts.json            # Scraped high-ELO tournament guide transcripts
├── public/
│   ├── armada-logo.png             # Faction brand assets
│   ├── cortex-logo.png
│   └── favicon.ico
├── scripts/
│   ├── bar_live_bridge.py          # Local process telemetry bridge daemon (FastAPI/psutil)
│   └── scrape_bar_transcripts.py   # Automated YouTube transcript extraction pipeline
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── generate-build/     # AI SDK structured streaming route
│   │   ├── globals.css             # Tailwind CSS v4 design tokens
│   │   ├── layout.tsx              # Root application shell & metadata
│   │   └── page.tsx                # Tactical StratCom operational console
│   ├── components/
│   │   ├── tactical/
│   │   │   ├── BarIcon.tsx         # Procedural SVG RTS unit & structure renderer
│   │   │   ├── MapCombobox.tsx     # Accessible tactical map selector combobox
│   │   │   ├── ResourceGraph.tsx   # Catmull-Rom spline economic runway graph
│   │   │   └── WindmillTelemetry.tsx# Physics-based rotating atmospheric telemetry
│   │   └── ui/                     # Primitives (badge, button, input, skeleton)
│   ├── hooks/
│   │   └── useLiveGame.ts          # Silent React polling hook for process telemetry
│   └── lib/
│       ├── game-data.ts            # Unit rosters, factory tiers, and economy constants
│       ├── map-data.ts             # Competitive tournament map database & doctrines
│       ├── timeline-parser.ts      # Monospace timestamp & resource delta parser
│       └── utils.ts                # Class merge & utility helpers
├── package.json                    # Project manifest & build scripts
├── tsconfig.json                   # Strict TypeScript compiler options
└── README.md
```

---

## Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** / **pnpm** / **yarn**
- **Google Gemini API Key** (optional: runs with fallback tactical rules if omitted)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/GrantVRP/BAR-Stratcom.git
   cd Theory-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (optional):
   Create a `.env.local` file in the project root:
   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
   ```
   *(Alternatively, configure your API key directly in the web UI via the **Link Key** modal).*

4. Launch development server:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000`.

---

## Testing and Integration Steps

1. **Install Python bridge dependencies:**
   ```bash
   pip install fastapi uvicorn psutil
   ```

2. **Start the telemetry daemon:**
   ```bash
   python scripts/bar_live_bridge.py
   ```
   *(Optional: pass `--mock` for offline synthetic match progression without launching the game).*

3. **Run the Next.js development server:**
   ```bash
   npm run dev
   ```

4. **Observe Live Synchronization:**
   Launch Beyond All Reason, join a lobby or start a skirmish, and observe the top telemetry bar transition from `[MEMORY LINK: STANDBY]` to `[MEMORY LINK: IN-GAME]` while auto-populating the active map.

---

## Verification & Build

```bash
# Run strict TypeScript typechecking
npm run type-check

# Run production build (Turbopack)
npm run build

# Start production server
npm run start
```

---

## Offline Data Extraction Pipeline

The repository includes a standalone Python utility to extract, clean, and structure competitive Beyond All Reason tutorial transcripts for few-shot prompt injection:

```bash
pip install youtube-transcript-api requests
python scripts/scrape_bar_transcripts.py
```
Output is validated and stored in `data/transcripts.json`.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
