import React, { useState } from 'react';
import {
  Button,
  Dialog,
  Drawer,
  EnergyIcon,
  Input,
  Inset,
  Kbd,
  MetalIcon,
  Num,
  Panel,
  Provenance,
  Select,
  Slider,
  Tabs,
  Tag,
  Toggle
} from '../components/ui';

export function DevUiGallery(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('primitives');
  const [sliderVal, setSliderVal] = useState(65);
  const [toggleVal, setToggleVal] = useState(true);
  const [inputVal, setInputVal] = useState('Sample text');
  const [selectVal, setSelectVal] = useState('option-a');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div
      data-testid="dev-ui-gallery"
      className="min-h-screen bg-[#0a0c14] p-6 text-[#e4e4e7]"
      style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
    >
      <header className="mb-6 flex items-center justify-between border-b-2 border-zinc-800 pb-4">
        <div>
          <h1
            style={{ fontFamily: "'Press Start 2P', monospace" }}
            className="text-xl uppercase tracking-wider text-white"
          >
            UI PRIMITIVES GALLERY
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            BAR StratCom tactical design system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Provenance kind="MEASURED" />
          <Provenance kind="SIMULATED" />
          <Provenance kind="ESTIMATED" />
          <Provenance kind="AI DRAFT" />
          <Provenance kind="UNKNOWN" />
        </div>
      </header>

      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'primitives', label: 'PRIMITIVES', count: 14 },
            { id: 'hud', label: 'HUD ELEMENTS', count: 4 },
            { id: 'overlays', label: 'OVERLAYS', count: 2 }
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Buttons & Actions */}
        <Panel title="TACTICAL BUTTONS" variant="default">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="default">DEFAULT</Button>
              <Button variant="armada">ARMADA</Button>
              <Button variant="cortex">CORTEX</Button>
              <Button variant="danger">DANGER</Button>
              <Button variant="ghost">GHOST</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">SMALL</Button>
              <Button size="md">MEDIUM</Button>
              <Button size="lg">LARGE ACTION</Button>
              <Button disabled>DISABLED</Button>
            </div>
          </div>
        </Panel>

        {/* Tags & Badges */}
        <Panel title="TAGS & BADGES" variant="armada">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Tag variant="default">DEFAULT</Tag>
              <Tag variant="armada">ARMADA</Tag>
              <Tag variant="cortex">CORTEX</Tag>
              <Tag variant="ai">AI GENERATED</Tag>
              <Tag variant="good">READY</Tag>
              <Tag variant="warn">STALL RISK</Tag>
              <Tag variant="danger">IDLE ALERT</Tag>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-400">Hotkeys:</span>
              <Kbd>Ctrl</Kbd>
              <Kbd>Shift</Kbd>
              <Kbd>Alt+1</Kbd>
              <Kbd>Space</Kbd>
            </div>
          </div>
        </Panel>

        {/* Inputs & Form Controls */}
        <Panel title="DATA CONTROLS" variant="cortex">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">UNIT SEARCH</label>
              <Input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Filter units..."
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">
                FACTION SELECTION
              </label>
              <Select
                value={selectVal}
                onChange={(e) => setSelectVal(e.target.value)}
                options={[
                  { value: 'option-a', label: 'Option A' },
                  { value: 'option-b', label: 'Option B' },
                  { value: 'option-c', label: 'Option C' }
                ]}
                className="w-full"
              />
            </div>
            <Slider
              label="WIND SENSITIVITY"
              min={0}
              max={100}
              value={sliderVal}
              onChange={setSliderVal}
              unit="%"
            />
            <div className="flex items-center justify-between">
              <Toggle label="LIVE OVERLAY MODE" checked={toggleVal} onChange={setToggleVal} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  OPEN DIALOG
                </Button>
                <Button size="sm" onClick={() => setDrawerOpen(true)}>
                  OPEN DRAWER
                </Button>
              </div>
            </div>
          </div>
        </Panel>

        {/* Inset & Live Telemetry Readout */}
        <Panel title="LIVE TELEMETRY INSET" variant="default">
          <Inset className="space-y-3 p-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="flex items-center gap-2">
                <MetalIcon className="h-4 w-4" />
                <span className="font-bold text-zinc-300">METAL RESERVE</span>
              </span>
              <div className="flex items-center gap-2">
                <Num value={1420} className="text-lg text-white" />
                <span className="text-sm text-emerald-400">+14.2/s</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="flex items-center gap-2">
                <EnergyIcon className="h-4 w-4" />
                <span className="font-bold text-zinc-300">ENERGY FLUX</span>
              </span>
              <div className="flex items-center gap-2">
                <Num value={280} className="text-lg text-amber-400" />
                <span className="text-sm text-rose-400">-32.0/s</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-zinc-400">FABRICATION THROUGHPUT</span>
              <div className="flex items-center gap-2">
                <Num value={340} className="text-zinc-200" />
                <span className="text-xs text-zinc-400">/ 420 BP</span>
              </div>
            </div>
          </Inset>
        </Panel>
      </div>

      {/* Interactive Overlays */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="PLAN CONFIRMATION">
        <div className="space-y-4">
          <p className="text-base text-zinc-300">
            Activate the selected opening plan &quot;Armada Rocketeer 1v1&quot; for the upcoming match?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              CANCEL
            </Button>
            <Button variant="armada" size="sm" onClick={() => setDialogOpen(false)}>
              CONFIRM
            </Button>
          </div>
        </div>
      </Dialog>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="UNIT DOSSIER">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 border-2 border-zinc-700 bg-zinc-900 p-2">
              <MetalIcon className="h-full w-full" />
            </div>
            <div>
              <div
                style={{ fontFamily: "'Press Start 2P', monospace" }}
                className="text-sm font-bold text-white"
              >
                ARMPW
              </div>
              <div className="text-sm text-zinc-400">Pawn (Light Infantry Bot)</div>
            </div>
          </div>
          <Inset className="p-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Metal Cost:</span>
              <Num value={54} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Energy Cost:</span>
              <Num value={480} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Build Time:</span>
              <Num value={12.4} />
            </div>
          </Inset>
          <Button variant="default" size="sm" className="w-full" onClick={() => setDrawerOpen(false)}>
            CLOSE DOSSIER
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
